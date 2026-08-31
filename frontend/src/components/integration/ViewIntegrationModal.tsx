'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Loader, User, Clipboard, Info, Download, Loader2, Trash2, UserPlus, XCircle } from 'lucide-react';
import apiService, { formatApiError } from '@/services/api';
import { IntegrationMember } from '@/types';
import { DeleteIntegrationModal } from './DeleteIntegrationModal';
import { formatMemberName } from '@/utils/formatMemberName';
import { formatPhone } from '@/utils';
import { getCongregationDisplayName } from '@/utils/congregation';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

interface ViewIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrationMemberId: string | null;
  canEdit?: boolean;
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

const sundayAttendanceLabels: Record<string, string> = {
  todos_os_domingos: 'Todos os domingos',
  regularmente: 'Regularmente',
  as_vezes: 'Às vezes',
  nao: 'Não'
};

const baptismTypeLabels: Record<string, string> = {
  catolica: 'Na igreja católica',
  adulto_nesta_igreja: 'Adulto — nesta igreja',
  adulto_outra_igreja: 'Adulto — em outra igreja',
  crianca_nesta_igreja: 'Criança — nesta igreja',
  crianca_outra_igreja: 'Criança — em outra igreja',
  novo_convertido: 'Novo convertido',
  sem_religiao: 'Novo convertido — sem religião anterior'
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function simNao(value: boolean | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  return value ? 'Sim' : 'Não';
}

function buildEcclesiasticalItems(member: IntegrationMember): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];

  if (member.expected_admission_type) {
    items.push({
      label: 'Tipo de recebimento previsto',
      value: admissionLabels[member.expected_admission_type] || member.expected_admission_type
    });
  }
  if (member.expected_congregation || member.expected_congregation_id) {
    items.push({
      label: 'Congregação prevista',
      value: getCongregationDisplayName(member.expected_congregation) || 'Não definida'
    });
  }
  if (hasValue(member.years_evangelical)) {
    const yearsLabel = member.years_evangelical === '1' ? 'ano' : 'anos';
    items.push({ label: 'Cristão evangélico há', value: `${member.years_evangelical} ${yearsLabel}` });
  }
  const evangelicalFamily = simNao(member.evangelical_family);
  if (evangelicalFamily) items.push({ label: 'Família cristã evangélica', value: evangelicalFamily });
  if (member.is_baptized !== undefined && member.is_baptized !== null) {
    let baptized = member.is_baptized ? 'Sim' : 'Não';
    if (member.is_baptized && member.baptism_type) {
      baptized += ` — ${baptismTypeLabels[member.baptism_type] || member.baptism_type}`;
    }
    items.push({ label: 'Batizado(a)', value: baptized });
  }
  if (hasValue(member.baptism_other_church_name)) {
    items.push({ label: 'Igreja em que foi batizado(a)', value: member.baptism_other_church_name as string });
  }
  if (hasValue(member.previous_religion)) {
    items.push({ label: 'Religião anterior', value: member.previous_religion as string });
  }
  const previousActive = simNao(member.previous_church_active);
  if (previousActive) items.push({ label: 'Era membro ativo da igreja anterior', value: previousActive });
  if (hasValue(member.time_attending)) {
    items.push({ label: 'Frequenta a igreja há', value: member.time_attending as string });
  }
  if (hasValue(member.sunday_attendance)) {
    items.push({
      label: 'Cultos',
      value: sundayAttendanceLabels[member.sunday_attendance as string] || (member.sunday_attendance as string)
    });
  }
  if (member.weekly_activities !== undefined && member.weekly_activities !== null) {
    items.push({
      label: 'Atividades semanais',
      value: member.weekly_activities
        ? `Sim${member.weekly_activities_which ? ` — ${member.weekly_activities_which}` : ''}`
        : 'Não'
    });
  }
  if (hasValue(member.reason_joining)) {
    items.push({ label: 'Motivo de tornar-se membro', value: member.reason_joining as string });
  }

  return items;
}

export function ViewIntegrationModal({ isOpen, onClose, integrationMemberId, canEdit = true, onDelete, onConvert, onDiscard }: ViewIntegrationModalProps) {
  const readOnly = canEdit === false;
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
      const errorMessage = formatApiError(err);
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
      const errorMessage = formatApiError(err);
      alert(errorMessage);
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
        name: member!.name,
        status: 'descartado'
      });
      if (onDiscard) {
        onDiscard();
      }
      handleClose();
    } catch (err: unknown) {
      const errorMessage = formatApiError(err);
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
      <div className="flex flex-col min-h-0">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-primary" size={32} />
          </div>
        )}

        {error && (
          <div className="flex-shrink-0 p-4 bg-red-50 border border-red-200 rounded-md mx-4 sm:mx-6 mt-4 sm:mt-6">
            <p className="text-sm font-medium text-red-600 break-words">{error}</p>
          </div>
        )}

        {member && !loading && (
          <div className="flex-1 p-4 sm:p-6 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 uppercase break-words">{formatMemberName(member.name)}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[member.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {statusLabels[member.status] ?? member.status}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {getCongregationDisplayName(member.expected_congregation) || 'Não definida'}
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
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="inline-flex items-center justify-center gap-2 min-h-11 w-full sm:w-auto"
                >
                  {exporting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span className="hidden sm:inline">Exportar PDF</span>
                      <span className="sm:hidden">PDF</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoSection
                title="Informações pessoais"
                icon={<User size={20} />}
                items={[
                  { label: 'Data de Nascimento', value: formatDate(member.birth) },
                  { label: 'Idade', value: age !== null ? `${age} anos` : '—' },
                  { label: 'Gênero', value: member.gender ? (genderLabels[member.gender] || member.gender) : '—' },
                  { label: 'Estado civil', value: member.marital_status ? (maritalLabels[member.marital_status] || member.marital_status) : '—' },
                  { label: 'Telefone', value: formatPhone(member.phone) },
                  {
                    label: 'WhatsApp',
                    value: member.whatsapp ? formatPhone(member.whatsapp) : '—',
                    href: member.whatsapp ? `https://wa.me/${member.whatsapp.replace(/\D/g, '')}` : undefined
                  }
                ]}
              />

              {(() => {
                const ecclesiasticalItems = buildEcclesiasticalItems(member);
                if (ecclesiasticalItems.length === 0) return null;
                return (
                  <InfoSection
                    title="Informações eclesiásticas"
                    icon={<Clipboard size={20} />}
                    items={ecclesiasticalItems}
                  />
                );
              })()}
            </div>

            <InfoSection
              title="Acompanhamento"
              icon={<Info size={20} />}
              items={[
                { label: 'Responsável/Discipulador', value: member.mentor?.name || '—' },
                { label: 'Contato do responsável', value: formatPhone(member.mentor?.phone || member.mentor?.whatsapp) || '—' },
                { label: 'Status', value: statusLabels[member.status] ?? member.status },
                { label: 'Observações', value: member.notes || 'Nenhuma anotação registrada' }
              ]}
            />

            {/* Footer com ações para integrantes em progresso */}
            {member && member.status === 'em_progresso' && (
              <div className="border-t border-gray-200 pt-4 mt-6">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDiscard}
                    disabled={discarding || readOnly}
                    title={readOnly ? READER_TOOLTIP : undefined}
                    className="inline-flex items-center justify-center gap-2 min-h-11 w-full sm:w-auto"
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
                    disabled={readOnly}
                    title={readOnly ? READER_TOOLTIP : undefined}
                    className="inline-flex items-center justify-center gap-2 min-h-11 w-full sm:w-auto"
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
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDeleteClick}
                    disabled={readOnly}
                    title={readOnly ? READER_TOOLTIP : undefined}
                    className="inline-flex items-center justify-center gap-2 min-h-11 w-full sm:w-auto"
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

  // Tentar extrair data no formato YYYY-MM-DD (ou ISO) de forma segura
  const raw = birth.includes('T') ? birth.split('T')[0] : birth;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  let date: Date;

  if (match) {
    const [, year, month, day] = match;
    // Cria Date usando componentes locais para evitar problemas de timezone
    date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  } else {
    // Fallback para outros formatos
    date = new Date(birth);
  }

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

  // Se já vier em DD/MM/AAAA
  if (date.includes('/')) return date;

  const raw = date.includes('T') ? date.split('T')[0] : date;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  // Fallback para outros formatos
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

