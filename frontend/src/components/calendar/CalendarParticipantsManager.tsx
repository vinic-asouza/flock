'use client';

import { useState, useEffect, forwardRef, useImperativeHandle, useMemo, useCallback } from 'react';
import { CalendarParticipant, CreateParticipantData } from '@/types/calendar';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useMemberOptions, MemberOption } from '@/hooks/useMemberOptions';
import { Users, UserPlus, X, User, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CalendarParticipantsManagerProps {
  calendarItemId?: string; // undefined quando está criando (ainda não tem ID)
  congregationId?: string | null;
  onParticipantsChange?: (participants: CalendarParticipant[]) => void;
  // Props para o botão de adicionar membros do grupo
  showAddGroupButton?: boolean;
  onAddGroupMembers?: () => void;
  isAddingGroupMembers?: boolean;
  // Props para modo de criação (sem calendarItemId)
  tempParticipants?: CreateParticipantData[];
  onTempParticipantsChange?: (participants: CreateParticipantData[]) => void;
}

export interface CalendarParticipantsManagerRef {
  loadParticipants: () => Promise<void>;
}

type ParticipantType = 'member' | 'guest';

export const CalendarParticipantsManager = forwardRef<CalendarParticipantsManagerRef, CalendarParticipantsManagerProps>(({
  calendarItemId,
  congregationId,
  onParticipantsChange,
  showAddGroupButton = false,
  onAddGroupMembers,
  isAddingGroupMembers = false,
  tempParticipants = [],
  onTempParticipantsChange
}, ref) => {
  const [participants, setParticipants] = useState<CalendarParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [participantType, setParticipantType] = useState<ParticipantType>('member');
  
  // Dados do formulário
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedMemberName, setSelectedMemberName] = useState(''); // Armazenar o nome do membro
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestWhatsapp, setGuestWhatsapp] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Buscar membros da congregação
  const congregationIdForSearch = congregationId === 'sede' ? null : congregationId || undefined;
  const {
    options: memberOptionsData,
    loading: membersLoading,
    setSearch: setMemberSearchDebounced,
  } = useMemberOptions({
    enabled: congregationId !== undefined,
    congregationId: congregationIdForSearch,
  });

  // Garantir que o membro selecionado sempre esteja nas opções
  const memberOptions = (() => {
    const options = [
      { value: '', label: 'Selecione um membro...' },
      ...memberOptionsData.map((m: { id: string; name: string }) => ({
        value: m.id,
        label: m.name
      }))
    ];

    // Se há um membro selecionado e ele não está nas opções atuais, adicionar
    if (selectedMemberId && selectedMemberName && !options.some(opt => opt.value === selectedMemberId)) {
      options.push({
        value: selectedMemberId,
        label: selectedMemberName
      });
    }

    return options;
  })();

  const loadParticipants = useCallback(async () => {
    if (!calendarItemId) return;
    
    try {
      setLoading(true);
      const data = await apiService.listCalendarParticipants(calendarItemId);
      setParticipants(data);
      onParticipantsChange?.(data);
    } catch (error) {
      toast.error('Erro ao carregar participantes');
    } finally {
      setLoading(false);
    }
  }, [calendarItemId, onParticipantsChange]);

  // Carregar participantes quando o item existir
  useEffect(() => {
    if (calendarItemId) {
      loadParticipants();
    }
  }, [calendarItemId, loadParticipants]);

  // Expor método loadParticipants via ref para ser chamado externamente
  useImperativeHandle(ref, () => ({
    loadParticipants
  }));

  // Paginação de participantes (ordem reversa: último adicionado primeiro)
  const paginatedParticipants = useMemo(() => {
    const itemsPerPage = 10;
    const list = calendarItemId ? [...participants].reverse() : [...tempParticipants].reverse();
    const totalPages = Math.ceil(list.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const items = list.slice(startIndex, endIndex);
    
    return { items, totalPages };
  }, [participants, tempParticipants, currentPage, calendarItemId]);

  // Resetar página ao adicionar/remover participante
  useEffect(() => {
    setCurrentPage(1);
  }, [participants.length, tempParticipants.length]);

  const resetForm = () => {
    setSelectedMemberId('');
    setSelectedMemberName('');
    setGuestName('');
    setGuestEmail('');
    setGuestPhone('');
    setGuestWhatsapp('');
  };

  const handleAddParticipant = async () => {
    // Validar dados
    if (participantType === 'member' && !selectedMemberId) {
      toast.error('Selecione um membro');
      return;
    }

    if (participantType === 'guest' && !guestName.trim()) {
      toast.error('Informe o nome do convidado');
      return;
    }

    const data: CreateParticipantData = participantType === 'member'
      ? { 
          member_id: selectedMemberId,
          // Adicionar dados temporários para exibição
          _tempMemberName: selectedMemberName,
          _tempMemberContact: memberOptionsData.find((m: MemberOption) => m.id === selectedMemberId)?.whatsapp || 
                              memberOptionsData.find((m: MemberOption) => m.id === selectedMemberId)?.phone || ''
        }
      : {
          guest_name: guestName,
          guest_email: guestEmail || undefined,
          guest_phone: guestPhone || undefined,
          guest_whatsapp: guestWhatsapp || undefined,
        };

    // Modo de criação (sem calendarItemId): adicionar ao tempParticipants
    if (!calendarItemId) {
      if (onTempParticipantsChange) {
        // Verificar duplicatas (apenas para membros)
        if (data.member_id) {
          const isDuplicate = tempParticipants.some(p => p.member_id === data.member_id);
          if (isDuplicate) {
            toast.error('Este membro já foi adicionado');
            return;
          }
        }
        
        onTempParticipantsChange([...tempParticipants, data]);
        toast.success('Participante adicionado!');
        resetForm();
        // NÃO fechar o formulário
      }
      return;
    }

    // Modo de edição (com calendarItemId): adicionar via API
    try {
      setLoading(true);
      // Remover campos temporários antes de enviar ao backend
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _tempMemberName: _, _tempMemberContact: __, ...dataToSend } = data;
      await apiService.addCalendarParticipant(calendarItemId, dataToSend);
      toast.success('Participante adicionado com sucesso');
      resetForm();
      // NÃO fechar o formulário, mantê-lo aberto para adicionar outro
      await loadParticipants();
    } catch (error: unknown) {
      const err = error as {response?: {data?: {details?: string}}};
      toast.error(err.response?.data?.details || 'Erro ao adicionar participante');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveParticipant = async (participantId: string, index?: number) => {
    // Determinar nome do participante para mensagem de confirmação
    let participantName = 'este participante';
    
    if (!calendarItemId && index !== undefined) {
      // Modo criação: buscar do tempParticipants
      const participant = tempParticipants[index];
      if (participant) {
        participantName = participant._tempMemberName || participant.guest_name || 'este participante';
      }
    } else if (calendarItemId) {
      // Modo edição: buscar dos participants
      const participant = participants.find(p => p.id === participantId);
      if (participant) {
        participantName = getParticipantName(participant);
      }
    }

    // Confirmação antes de remover
    if (!confirm(`Tem certeza que deseja remover ${participantName} da lista de participantes?`)) {
      return;
    }

    // Modo de criação (sem calendarItemId): remover do tempParticipants
    if (!calendarItemId && index !== undefined && onTempParticipantsChange) {
      const updated = tempParticipants.filter((_, i) => i !== index);
      onTempParticipantsChange(updated);
      toast.success('Participante removido');
      return;
    }

    // Modo de edição (com calendarItemId): remover via API
    if (!calendarItemId) return;

    try {
      setLoading(true);
      await apiService.removeCalendarParticipant(calendarItemId, participantId);
      toast.success('Participante removido');
      await loadParticipants();
    } catch (error) {
      toast.error('Erro ao remover participante');
    } finally {
      setLoading(false);
    }
  };

  const getParticipantName = (participant: CalendarParticipant): string => {
    if (participant.member) {
      return participant.member.name;
    }
    return participant.guest_name || 'Sem nome';
  };

  const getParticipantContact = (participant: CalendarParticipant): string => {
    // Prioridade: WhatsApp > Telefone > Email
    if (participant.member) {
      return participant.member.whatsapp || participant.member.phone || participant.member.email || '';
    }
    return participant.guest_whatsapp || participant.guest_phone || participant.guest_email || '';
  };

  // Função para formatar telefone (00) 00000-0000 ou (00) 0000-0000
  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  const handlePhoneChange = (value: string, setter: (val: string) => void) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    setter(formatPhone(numbers));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-gray-700" />
          <h3 className="text-sm font-medium text-gray-900">
            Participantes ({calendarItemId ? participants.length : tempParticipants.length})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Botão adicionar membros do grupo - funciona em ambos os modos */}
          {showAddGroupButton && onAddGroupMembers && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onAddGroupMembers}
              disabled={loading || isAddingGroupMembers}
            >
              <Users size={16} />
              {isAddingGroupMembers ? 'Adicionando...' : 'Adicionar membros do grupo'}
            </Button>
          )}
          {/* Mostrar botão Adicionar se há calendarItemId OU se há suporte para tempParticipants */}
          {(calendarItemId || onTempParticipantsChange) && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              disabled={loading}
            >
              <UserPlus size={16} />
              Adicionar
            </Button>
          )}
        </div>
      </div>

      {/* Formulário de adicionar participante */}
      {showAddForm && (calendarItemId || onTempParticipantsChange) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4 relative">
          {/* Botão X para fechar */}
          <button
            type="button"
            onClick={() => {
              setShowAddForm(false);
              resetForm();
            }}
            className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Fechar"
          >
            <X size={18} />
          </button>

          {/* Escolher tipo de participante */}
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="participant-type"
                value="member"
                checked={participantType === 'member'}
                onChange={() => {
                  setParticipantType('member');
                  resetForm();
                }}
                className="h-4 w-4 accent-primary focus:ring-primary border-gray-300 cursor-pointer"
              />
              <span className="ml-2 text-sm text-gray-700">Membro</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="participant-type"
                value="guest"
                checked={participantType === 'guest'}
                onChange={() => {
                  setParticipantType('guest');
                  resetForm();
                }}
                className="h-4 w-4 accent-primary focus:ring-primary border-gray-300 cursor-pointer"
              />
              <span className="ml-2 text-gray-700">Convidado</span>
            </label>
          </div>

          {/* Formulário para membro */}
          {participantType === 'member' && (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selecione o Membro
                </label>
                <Select
                  value={selectedMemberId}
                  onChange={(value) => {
                    setSelectedMemberId(value);
                    // Armazenar o nome do membro selecionado para manter nas opções
                    const selectedOption = memberOptions.find(opt => opt.value === value);
                    if (selectedOption) {
                      setSelectedMemberName(selectedOption.label);
                    }
                  }}
                  options={memberOptions}
                  disabled={membersLoading}
                  searchable
                  onSearchChange={(term) => {
                    // Só atualiza a busca se houver termo (não limpa ao fechar o Select)
                    if (term) {
                      setMemberSearchDebounced(term);
                    }
                  }}
                  placeholder="Digite para buscar..."
                />
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={handleAddParticipant}
                disabled={loading}
                className="flex-shrink-0 h-[42px]"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Adicionar'}
              </Button>
            </div>
          )}

          {/* Formulário para convidado */}
          {participantType === 'guest' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Nome completo do convidado"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 255) {
                      setGuestEmail(value);
                    }
                  }}
                  placeholder="email@exemplo.com"
                  maxLength={255}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <Input
                    value={guestPhone}
                    onChange={(e) => handlePhoneChange(e.target.value, setGuestPhone)}
                    placeholder="(00) 0000-0000"
                    maxLength={15}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp
                  </label>
                  <Input
                    value={guestWhatsapp}
                    onChange={(e) => handlePhoneChange(e.target.value, setGuestWhatsapp)}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botão do formulário para convidado */}
          {participantType === 'guest' && (
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleAddParticipant}
                disabled={loading}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Adicionar'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Lista de participantes */}
      {/* Modo de edição: mostrar participants do backend */}
      {calendarItemId && participants.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {paginatedParticipants.items.map((participant) => {
              const typedParticipant = participant as CalendarParticipant;
              const name = getParticipantName(typedParticipant);
              const contact = getParticipantContact(typedParticipant);
              const isMember = !!typedParticipant.member;

              return (
                <div
                  key={typedParticipant.id}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <User size={16} className="text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {name}
                        </p>
                        {!isMember && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                            Convidado
                          </span>
                        )}
                      </div>
                      {contact && (
                        <p className="text-xs text-gray-500 truncate">{contact}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(typedParticipant.id)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 transition-colors"
                    disabled={loading}
                    title="Remover participante"
                  >
                    <X size={18} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Paginação */}
          {paginatedParticipants.totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600">
                Página {currentPage} de {paginatedParticipants.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} className="text-gray-700" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(paginatedParticipants.totalPages, p + 1))}
                  disabled={currentPage === paginatedParticipants.totalPages}
                  className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} className="text-gray-700" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modo de criação: mostrar tempParticipants */}
      {!calendarItemId && tempParticipants.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {paginatedParticipants.items.map((participant, index) => {
              const typedParticipant = participant as CreateParticipantData;
              // Determinar nome e contato
              let name: string;
              let contact: string;
              
              if (typedParticipant.member_id) {
                // É um membro: usar dados temporários se disponíveis
                name = typedParticipant._tempMemberName || 'Membro';
                contact = typedParticipant._tempMemberContact || '';
              } else {
                // É um convidado: usar dados do próprio participant
                name = typedParticipant.guest_name || 'Convidado';
                contact = typedParticipant.guest_whatsapp || typedParticipant.guest_phone || typedParticipant.guest_email || '';
              }
              
              const isMember = !!typedParticipant.member_id;
              // Encontrar o índice real no array original (reverso)
              const originalIndex = tempParticipants.length - 1 - ((currentPage - 1) * 10 + index);

              return (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <User size={16} className="text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {name}
                        </p>
                        {!isMember && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                            Convidado
                          </span>
                        )}
                      </div>
                      {contact && (
                        <p className="text-xs text-gray-500 truncate">{contact}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant('', originalIndex)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remover participante"
                  >
                    <X size={18} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Paginação */}
          {paginatedParticipants.totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600">
                Página {currentPage} de {paginatedParticipants.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} className="text-gray-700" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(paginatedParticipants.totalPages, p + 1))}
                  disabled={currentPage === paginatedParticipants.totalPages}
                  className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} className="text-gray-700" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mensagem quando não há participantes */}
      {((calendarItemId && participants.length === 0) || (!calendarItemId && tempParticipants.length === 0)) && (
        <div className="text-center py-6 bg-gray-50 border border-gray-200 rounded-lg">
          <Users size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">Nenhum participante adicionado</p>
        </div>
      )}
    </div>
  );
});

CalendarParticipantsManager.displayName = 'CalendarParticipantsManager';
