'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Download, Loader2, Pencil, Trash2 } from 'lucide-react';
import { EntityDetailPageHeader } from '@/components/entity-detail';
import { GroupForm } from '@/components/groups/GroupForm';
import { MinistryDetailView } from '@/components/groups/MinistryDetailView';
import { ExportGroupMembersModal } from '@/components/groups/ExportGroupMembersModal';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import apiService, { formatApiError } from '@/services/api';
import { GroupPayload, GroupWithMembers } from '@/types';
import { getCongregationDisplayName } from '@/utils/congregation';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

type GroupFormData = {
  name: string;
  description?: string;
  congregation_id: string;
  responsible_id?: string | null;
  status: boolean;
};

function MinistryDetailContent() {
  const { canEdit } = useAuth();
  const readOnly = canEdit === false;
  const router = useRouter();
  const params = useParams();
  const groupId = String(params.id || '');

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadGroup = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      setNotFound(false);
      const data = await apiService.getGroup(groupId);
      setGroup(data);
    } catch (err) {
      toast.error(formatApiError(err));
      setGroup(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const handleEditGroup = async (data: GroupFormData) => {
    try {
      setIsSubmitting(true);
      await apiService.updateGroup(groupId, data as Partial<GroupPayload>);
      toast.success('Ministério atualizado com sucesso!');
      setEditOpen(false);
      await loadGroup();
    } catch (err) {
      toast.error(formatApiError(err));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      setIsSubmitting(true);
      await apiService.deleteGroup(groupId);
      toast.success('Ministério excluído com sucesso!');
      setDeleteOpen(false);
      router.push('/ministries');
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!loading && (notFound || !group)) {
    return (
      <div className="space-y-4">
        <EntityDetailPageHeader
          backHref="/ministries"
          backLabel="Voltar aos ministérios"
          title="Ministério"
        />
        <p className="text-sm text-gray-600">Não foi possível carregar este ministério.</p>
      </div>
    );
  }

  const editFormId = 'edit-ministry-form';

  return (
    <div className="space-y-4">
      <EntityDetailPageHeader
        backHref="/ministries"
        backLabel="Voltar aos ministérios"
        title={group?.name || 'Ministério'}
        badge={
          group ? (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                group.status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {group.status ? 'Ativo' : 'Inativo'}
            </span>
          ) : null
        }
        subtitle={
          loading
            ? 'Carregando…'
            : group
              ? getCongregationDisplayName(group.congregations) || undefined
              : undefined
        }
        actions={
          group ? (
            <>
              <Button
                variant="secondary"
                className="min-h-11"
                onClick={() => setExportOpen(true)}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
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
                disabled={readOnly}
                title={readOnly ? READER_TOOLTIP : undefined}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </>
          ) : null
        }
      />

      {loading || !group ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Carregando…
        </div>
      ) : (
        <MinistryDetailView group={group} readOnly={readOnly} onRosterChange={loadGroup} />
      )}

      {group ? (
        <>
          <Modal
            isOpen={editOpen}
            onClose={() => setEditOpen(false)}
            title="Editar Ministério"
            size="lg"
            closeOnOverlayClick={!isSubmitting}
            closeOnEscape={!isSubmitting}
            footer={
              <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:p-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditOpen(false)}
                  disabled={isSubmitting}
                  className="min-h-11 w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  form={editFormId}
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  className="min-h-11 w-full sm:w-auto"
                >
                  Salvar Alterações
                </Button>
              </div>
            }
          >
            <GroupForm
              formId={editFormId}
              showActions={false}
              mode="edit"
              group={group}
              onSubmit={handleEditGroup}
              onCancel={() => setEditOpen(false)}
              isLoading={isSubmitting}
            />
          </Modal>

          <Modal
            isOpen={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            title="Excluir Ministério"
            size="md"
            closeOnOverlayClick={!isSubmitting}
            closeOnEscape={!isSubmitting}
            footer={
              <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:p-6">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteOpen(false)}
                  disabled={isSubmitting}
                  className="min-h-11 w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteGroup}
                  isLoading={isSubmitting}
                  className="min-h-11 w-full sm:w-auto"
                >
                  <Trash2 size={16} className="mr-2 shrink-0" />
                  Excluir ministério
                </Button>
              </div>
            }
          >
            <div className="p-4 sm:p-6">
              <p className="break-words text-gray-700">
                Tem certeza que deseja excluir o ministério <strong>{group.name}</strong>? Os
                membros deixarão de estar vinculados a este ministério. Esta ação não pode ser
                desfeita.
              </p>
            </div>
          </Modal>

          <ExportGroupMembersModal
            isOpen={exportOpen}
            onClose={() => setExportOpen(false)}
            onExport={async (selectedFields) => {
              const { blob, filename } = await apiService.exportGroupMembersList(
                groupId,
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

export default function MinistryDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Carregando…
        </div>
      }
    >
      <MinistryDetailContent />
    </Suspense>
  );
}
