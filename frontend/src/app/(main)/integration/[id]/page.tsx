'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Download, Loader2, Pencil } from 'lucide-react';
import { EntityDetailPageHeader } from '@/components/entity-detail';
import { Button } from '@/components/ui/Button';
import { IntegrationDetailView } from '@/components/integration/IntegrationDetailView';
import { statusClasses, statusLabels } from '@/components/integration/integrationLabels';
import { EditIntegrationModal } from '@/components/integration/EditIntegrationModal';
import { ConvertIntegrationModal } from '@/components/integration/ConvertIntegrationModal';
import { DeleteIntegrationModal } from '@/components/integration/DeleteIntegrationModal';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { useAuth } from '@/context/AuthContext';
import apiService, { formatApiError } from '@/services/api';
import { IntegrationMember } from '@/types';
import { getCongregationDisplayName } from '@/utils/congregation';
import { formatMemberName } from '@/utils/formatMemberName';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

function IntegrationDetailContent() {
  const { canEdit } = useAuth();
  const readOnly = canEdit === false;
  const router = useRouter();
  const params = useParams();
  const integrationId = String(params.id || '');
  const hasDataRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<IntegrationMember | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const loadMember = useCallback(async () => {
    if (!integrationId) return;
    try {
      if (!hasDataRef.current) setLoading(true);
      setNotFound(false);
      const data = await apiService.getIntegrationMember(integrationId);
      hasDataRef.current = true;
      setMember(data);
    } catch (err) {
      toast.error(formatApiError(err));
      hasDataRef.current = false;
      setMember(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [integrationId]);

  useEffect(() => {
    hasDataRef.current = false;
    setMember(null);
    loadMember();
  }, [loadMember]);

  const handleExport = async () => {
    if (!member) return;
    try {
      setExporting(true);
      const blob = await apiService.exportIntegrationMemberPDF(member.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `integrante-${member.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setExporting(false);
    }
  };

  const handleDiscardConfirm = async () => {
    if (!member) return;

    try {
      setDiscarding(true);
      setDiscardError(null);
      const updated = await apiService.updateIntegrationMember(member.id, {
        name: member.name,
        status: 'descartado'
      });
      setMember(updated);
      setDiscardOpen(false);
      toast.success('Integrante descartado');
    } catch (err) {
      setDiscardError(formatApiError(err));
    } finally {
      setDiscarding(false);
    }
  };

  if (!loading && (notFound || !member)) {
    return (
      <div className="space-y-4">
        <EntityDetailPageHeader
          backHref="/integration"
          backLabel="Voltar à integração"
          title="Integrante"
        />
        <p className="text-sm text-gray-600">Não foi possível carregar este integrante.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EntityDetailPageHeader
        backHref="/integration"
        backLabel="Voltar à integração"
        title={member ? formatMemberName(member.name) : 'Integrante'}
        badge={
          member ? (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                statusClasses[member.status] ?? 'bg-gray-100 text-gray-700'
              }`}
            >
              {statusLabels[member.status] ?? member.status}
            </span>
          ) : null
        }
        subtitle={
          loading
            ? 'Carregando…'
            : member
              ? getCongregationDisplayName(member.expected_congregation) || undefined
              : undefined
        }
        actions={
          member ? (
            <>
              <Button
                variant="secondary"
                className="min-h-11"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Exportar PDF
              </Button>
              {member.status !== 'integrado' ? (
                <Button
                  variant="secondary"
                  className="min-h-11"
                  disabled={readOnly}
                  title={readOnly ? READER_TOOLTIP : undefined}
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              ) : null}
            </>
          ) : null
        }
      />

      {loading || !member ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Carregando…
        </div>
      ) : (
        <IntegrationDetailView
          member={member}
          readOnly={readOnly}
          discarding={discarding}
          onConvert={() => setConvertOpen(true)}
          onDiscard={() => {
            setDiscardError(null);
            setDiscardOpen(true);
          }}
          onRemove={() => setRemoveOpen(true)}
        />
      )}

      {member ? (
        <>
          <EditIntegrationModal
            isOpen={editOpen}
            onClose={() => setEditOpen(false)}
            member={member}
            onSuccess={(updated) => {
              setMember(updated);
              setEditOpen(false);
            }}
          />

          <ConvertIntegrationModal
            isOpen={convertOpen}
            onClose={() => setConvertOpen(false)}
            integrationMember={member}
            onSuccess={(result) => {
              setMember(result.integrationMember);
              setConvertOpen(false);
            }}
          />

          <ConfirmDeleteModal
            isOpen={discardOpen}
            onClose={() => {
              if (!discarding) {
                setDiscardOpen(false);
                setDiscardError(null);
              }
            }}
            onConfirm={handleDiscardConfirm}
            title="Descartar integrante"
            message={`Tem certeza de que deseja descartar ${formatMemberName(member.name)}? Essa ação não poderá ser desfeita.`}
            confirmLabel="Descartar"
            isLoading={discarding}
            error={discardError}
            variant="danger"
            size="md"
          />

          <DeleteIntegrationModal
            isOpen={removeOpen}
            onClose={() => setRemoveOpen(false)}
            memberId={member.id}
            memberName={member.name}
            onSuccess={() => {
              setRemoveOpen(false);
              router.push('/integration');
            }}
            title="Remover da lista"
            message="Esta ação remove o membro já integrado da listagem de integração. O membro continuará existindo no sistema, apenas não aparecerá mais na lista de integrantes."
            buttonLabel="Remover da lista"
            errorMessage="Erro ao remover integrante da lista"
          />
        </>
      ) : null}
    </div>
  );
}

export default function IntegrationDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Carregando…
        </div>
      }
    >
      <IntegrationDetailContent />
    </Suspense>
  );
}
