'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Loader, MessageCircle, User, Clipboard, Info, Download, Loader2, Trash2, UserPlus, XCircle } from 'lucide-react';
import apiService from '@/services/api';
import { IntegrationMember } from '@/types';
import { DeleteIntegrationModal } from './DeleteIntegrationModal';
import { formatMemberName } from '@/utils/formatMemberName';

interface ViewIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrationMemberId: string | null;
  onDelete?: () => void;
  onConvert?: () => void;
  onDiscard?: () => void;
}

const statusLabels: Record<string, string> = {
  em_progresso: 'Em progresso',
  integrado: 'Integrado',
  descartado: 'Descartado'
};

const statusClasses: Record<string, string> = {
  em_progresso: 'bg-blue-100 text-blue-700',
  integrado: 'bg-emerald-100 text-emerald-700',
  descartado: 'bg-gray-200 text-gray-600'
};

const genderLabels: Record<string, string> = {
  masculino: 'Masculino',
  feminino: 'Feminino'
};

const maritalLabels: Record<string, string> = {
  solteiro: 'Solteiro',
  casado: 'Casado',
  divorciado: 'Divorciado',
  viuvo: 'Viúvo',
  outro: 'Outro'
};

const admissionLabels: Record<string, string> = {
  batismo: 'Batismo',
  transferencia: 'Transferência',
  'profissao de fe': 'Profissão de Fé',
  outro: 'Outro'
};

export function ViewIntegrationModal({ isOpen, onClose, integrationMemberId, onDelete, onConvert, onDiscard }: ViewIntegrationModalProps) {
  const [member, setMember] = useState<IntegrationMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  useEffect(() => {
    if (isOpen && integrationMemberId) {
      loadMember();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, integrationMemberId]);

  const loadMember = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getIntegrationMember(integrationMemberId!);
      setMember(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados do integrante';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setMember(null);
      setError(null);
      onClose();
    }
  };

  const handleExportPDF = async () => {
    if (!integrationMemberId) return;
    try {
      setExporting(true);
      const blob = await apiService.exportIntegrationMemberPDF(integrationMemberId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `integrante-${member?.name?.replace(/\s+/g, '-').toLowerCase() || 'integrante'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('Erro ao exportar integrante:', err);
      alert('Erro ao exportar PDF. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  const handleDeleteSuccess = () => {
    if (onDelete) {
      onDelete();
    }
    setDeleteModalOpen(false);
    handleClose();
  };

  const handleDiscard = async () => {
    if (!integrationMemberId) return;
    
    const confirmed = window.confirm(
      `Tem certeza de que deseja descartar ${member?.name ? formatMemberName(member.name) : 'este integrante'}? Essa ação não poderá ser desfeita.`
    );
    
    if (!confirmed) return;

    try {
      setDiscarding(true);
      setError(null);
      await apiService.updateIntegrationMember(integrationMemberId, {
        ...member!,
        status: 'descartado'
      });
      if (onDiscard) {
        onDiscard();
      }
      handleClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao descartar integrante';
      setError(errorMessage);
    } finally {
      setDiscarding(false);
    }
  };

  const handleConvert = () => {
    if (onConvert) {
      onConvert();
    }
  };

  const age = member?.birth ? calculateAge(member.birth) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Detalhes da Integração"
      size="lg"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <div className="flex flex-col min-h-[60vh]">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-primary" size={32} />
          </div>
        )}

        {error && (
          <div className="flex-shrink-0 p-4 bg-red-50 border border-red-200 rounded-md mx-6 mt-6">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        {member && !loading && (
          <div className="flex-1 p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 uppercase">{formatMemberName(member.name)}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[member.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {statusLabels[member.status] ?? member.status}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {member.expected_congregation?.name || 'Sede'}
                  </span>
                  {member.expected_admission_type && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {admissionLabels[member.expected_admission_type] || member.expected_admission_type}
                    </span>
                  )}
                  {member.updated_at && (
                    <span className="text-xs text-gray-400">
                      Atualizado em {formatDate(member.updated_at)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="inline-flex items-center gap-2"
                >
                  {exporting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Exportar PDF
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoSection
                title="Informações Pessoais"
                icon={<User size={20} />}
                items={[
                  { label: 'Data de Nascimento', value: formatDate(member.birth) },
                  { label: 'Idade', value: age !== null ? `${age} anos` : '—' },
                  { label: 'Gênero', value: member.gender ? (genderLabels[member.gender] || member.gender) : '—' },
                  { label: 'Estado civil', value: member.marital_status ? (maritalLabels[member.marital_status] || member.marital_status) : '—' },
                  { label: 'Notas', value: member.notes || '—' }
                ]}
              />

              <InfoSection
                title="Processo de Integração"
                icon={<Clipboard size={20} />}
                items={[
                  { label: 'Tipo de admissão previsto', value: member.expected_admission_type ? (admissionLabels[member.expected_admission_type] || member.expected_admission_type) : '—' },
                  { label: 'Congregação prevista', value: member.expected_congregation?.name || 'Sede' },
                  { label: 'Responsável/Discipulador', value: member.mentor?.name || '—' },
                  { label: 'Contato do responsável', value: member.mentor?.phone || member.mentor?.whatsapp || '—' }
                ]}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoSection
                title="Contato"
                icon={<MessageCircle size={20} />}
                items={[
                  { label: 'Telefone', value: formatPhone(member.phone) },
                  {
                    label: 'WhatsApp',
                    value: member.whatsapp ? formatPhone(member.whatsapp) : '—',
                    href: member.whatsapp ? `https://wa.me/${member.whatsapp.replace(/\D/g, '')}` : undefined
                  }
                ]}
              />

              <InfoSection
                title="Notas"
                icon={<Info size={20} />}
                items={[
                  { label: 'Observações', value: member.notes || 'Nenhuma anotação registrada' }
                ]}
              />
            </div>

            {/* Footer com ações para integrantes em progresso */}
            {member && member.status === 'em_progresso' && (
              <div className="border-t border-gray-200 pt-4 mt-6">
                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDiscard}
                    disabled={discarding}
                    className="inline-flex items-center gap-2"
                  >
                    {discarding ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Descartando...
                      </>
                    ) : (
                      <>
                        <XCircle size={16} />
                        Descartar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleConvert}
                    className="inline-flex items-center gap-2"
                  >
                    <UserPlus size={16} />
                    Integrar
                  </Button>
                </div>
              </div>
            )}

            {/* Footer com ações para integrantes integrados */}
            {member && member.status === 'integrado' && (
              <div className="border-t border-gray-200 pt-4 mt-6">
                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDeleteClick}
                    className="inline-flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Remover da lista
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <DeleteIntegrationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        memberId={integrationMemberId || undefined}
        memberName={member?.name}
        onSuccess={handleDeleteSuccess}
        title="Remover da lista"
        message="Esta ação remove o membro já integrado da listagem de integração. O membro continuará existindo no sistema, apenas não aparecerá mais na lista de integrantes."
        buttonLabel="Remover da lista"
        errorMessage="Erro ao remover integrante da lista"
      />
    </Modal>
  );
}

function InfoSection({
  title,
  icon,
  items
}: {
  title: string;
  icon: React.ReactNode;
  items: { label: string; value: string; href?: string }[];
}) {
  return (
    <div className="space-y-4">
      <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
        {icon}
        {title}
      </h4>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.label}>
            <div className="text-sm font-medium text-gray-500">{item.label}</div>
            {item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {item.value}
              </a>
            ) : (
              <div className="text-gray-900">{item.value}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function calculateAge(birth?: string | null): number | null {
  if (!birth) return null;
  const date = new Date(birth);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const diffMonth = today.getMonth() - date.getMonth();
  if (diffMonth < 0 || (diffMonth === 0 && today.getDate() < date.getDate())) {
    age--;
  }
  return age;
}

function formatDate(date?: string | null): string {
  if (!date) return '—';
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('pt-BR');
}

function formatPhone(phone?: string | null): string {
  if (!phone) return '—';
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

