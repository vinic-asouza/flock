'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Download, Loader2, Pencil, Trash2 } from 'lucide-react';
import { EntityDetailPageHeader } from '@/components/entity-detail';
import { CongregationDetailView } from '@/components/congregations/CongregationDetailView';
import { EditCongregationModal } from '@/components/congregations/EditCongregationModal';
import { DeleteCongregationModal } from '@/components/congregations/DeleteCongregationModal';
import { ExportCongregationMembersModal } from '@/components/congregations/ExportCongregationMembersModal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import apiService, { formatApiError } from '@/services/api';
import { Congregation } from '@/types/congregation';
import { getCongregationDisplayName } from '@/utils/congregation';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

function CongregationDetailContent() {
  const { canEdit } = useAuth();
  const readOnly = canEdit === false;
  const router = useRouter();
  const params = useParams();
  const congregationId = String(params.id || '');

  const [loading, setLoading] = useState(true);
  const [congregation, setCongregation] = useState<Congregation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const loadCongregation = useCallback(async () => {
    if (!congregationId) return;
    try {
      setLoading(true);
      setNotFound(false);
      const data = await apiService.getCongregation(congregationId);
      setCongregation(data as Congregation);
    } catch (err) {
      toast.error(formatApiError(err));
      setCongregation(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [congregationId]);

  useEffect(() => {
    loadCongregation();
  }, [loadCongregation]);

  if (!loading && (notFound || !congregation)) {
    return (
      <div className="space-y-4">
        <EntityDetailPageHeader
          backHref="/congregations"
          backLabel="Voltar às congregações"
          title="Congregação"
        />
        <p className="text-sm text-gray-600">Não foi possível carregar esta congregação.</p>
      </div>
    );
  }

  const canExportMembers = (congregation?.activeMembersCount ?? 0) > 0;

  return (
    <div className="space-y-4">
      <EntityDetailPageHeader
        backHref="/congregations"
        backLabel="Voltar às congregações"
        title={congregation ? getCongregationDisplayName(congregation) : 'Congregação'}
        badge={
          congregation?.is_primary ? (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Principal
            </span>
          ) : null
        }
        subtitle={
          loading
            ? 'Carregando…'
            : congregation
              ? [congregation.city, congregation.state].filter(Boolean).join('/') || undefined
              : undefined
        }
        actions={
          congregation ? (
            <>
              <Button
                variant="secondary"
                className="min-h-11"
                onClick={() => setExportOpen(true)}
                disabled={!canExportMembers}
                title={canExportMembers ? undefined : 'Não há membros ativos para exportar'}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar lista
              </Button>
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
              <Button
                variant="ghost"
                className="min-h-11 text-red-600 hover:text-red-700"
                disabled={readOnly || congregation.is_primary}
                title={
                  congregation.is_primary
                    ? 'A congregação principal não pode ser excluída'
                    : readOnly
                      ? READER_TOOLTIP
                      : undefined
                }
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </>
          ) : null
        }
      />

      {loading || !congregation ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Carregando…
        </div>
      ) : (
        <CongregationDetailView congregation={congregation} />
      )}

      {congregation ? (
        <>
          <EditCongregationModal
            isOpen={editOpen}
            onClose={() => setEditOpen(false)}
            congregationId={congregation.id}
            onSuccess={async () => {
              setEditOpen(false);
              await loadCongregation();
            }}
          />

          <DeleteCongregationModal
            isOpen={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            congregationId={congregation.id}
            congregationName={congregation.name}
            activeMembersCount={congregation.activeMembersCount ?? 0}
            isPrimary={congregation.is_primary}
            onSuccess={() => {
              setDeleteOpen(false);
              router.push('/congregations');
            }}
          />

          <ExportCongregationMembersModal
            isOpen={exportOpen}
            onClose={() => setExportOpen(false)}
            onExport={async (selectedFields) => {
              const { blob, filename } = await apiService.exportCongregationMembersList(
                congregation.id,
                selectedFields
              );
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
              toast.success('PDF exportado com sucesso!');
            }}
          />
        </>
      ) : null}
    </div>
  );
}

export default function CongregationDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Carregando…
        </div>
      }
    >
      <CongregationDetailContent />
    </Suspense>
  );
}
