'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Download,
  Loader2,
  Pencil,
  Trash2,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import { EntityDetailPageHeader } from '@/components/entity-detail';
import { Button } from '@/components/ui/Button';
import {
  MemberDetailView,
  type MemberDetail,
} from '@/components/members/MemberDetailView';
import { EditMemberModal } from '@/components/members/EditMemberModal';
import { DeleteMemberModal } from '@/components/members/DeleteMemberModal';
import { ConfirmDeactivateModal } from '@/components/members/ConfirmDeactivateModal';
import { ConfirmReactivateModal } from '@/components/members/ConfirmReactivateModal';
import { useAuth } from '@/context/AuthContext';
import apiService, { formatApiError } from '@/services/api';
import { formatMemberName } from '@/utils/formatMemberName';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

function MemberDetailContent() {
  const { canEdit } = useAuth();
  const readOnly = canEdit === false;
  const router = useRouter();
  const params = useParams();
  const memberId = String(params.id || '');

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);

  const loadMember = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      setNotFound(false);
      const data = await apiService.getMember(memberId);
      setMember(data as MemberDetail);
    } catch (err) {
      toast.error(formatApiError(err));
      setMember(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  const handleExport = async () => {
    if (!member) return;
    try {
      setExporting(true);
      const blob = await apiService.exportMemberPDF(member.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `membro-${member.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
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

  if (!loading && (notFound || !member)) {
    return (
      <div className="space-y-4">
        <EntityDetailPageHeader
          backHref="/members"
          backLabel="Voltar aos membros"
          title="Membro"
        />
        <p className="text-sm text-gray-600">
          Não foi possível carregar este membro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EntityDetailPageHeader
        backHref="/members"
        backLabel="Voltar aos membros"
        title={
          member ? formatMemberName(member.name) : 'Membro'
        }
        badge={
          member ? (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                member.active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {member.active ? 'Ativo' : 'Inativo'}
            </span>
          ) : null
        }
        subtitle={
          loading
            ? 'Carregando…'
            : member
              ? member.congregation?.name || undefined
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
              {member.active ? (
                <Button
                  variant="secondary"
                  className="min-h-11"
                  disabled={readOnly}
                  title={readOnly ? READER_TOOLTIP : undefined}
                  onClick={() => setDeactivateOpen(true)}
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  Inativar
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="min-h-11"
                  disabled={readOnly}
                  title={readOnly ? READER_TOOLTIP : undefined}
                  onClick={() => setReactivateOpen(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Reativar
                </Button>
              )}
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

      {loading || !member ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Carregando…
        </div>
      ) : (
        <MemberDetailView member={member} />
      )}

      {member ? (
        <>
          <EditMemberModal
            isOpen={editOpen}
            onClose={() => setEditOpen(false)}
            memberId={member.id}
            onSuccess={async () => {
              setEditOpen(false);
              await loadMember();
            }}
          />
          <DeleteMemberModal
            isOpen={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            memberId={member.id}
            memberName={member.name}
            onSuccess={() => {
              setDeleteOpen(false);
              router.push('/members');
            }}
          />
          <ConfirmDeactivateModal
            isOpen={deactivateOpen}
            onClose={() => setDeactivateOpen(false)}
            memberName={member.name}
            onConfirm={async () => {
              await apiService.setMemberStatus(member.id, false);
              toast.success('Membro inativado');
              setDeactivateOpen(false);
              await loadMember();
            }}
          />
          <ConfirmReactivateModal
            isOpen={reactivateOpen}
            onClose={() => setReactivateOpen(false)}
            memberName={member.name}
            onConfirm={async () => {
              await apiService.setMemberStatus(member.id, true);
              toast.success('Membro reativado');
              setReactivateOpen(false);
              await loadMember();
            }}
          />
        </>
      ) : null}
    </div>
  );
}

export default function MemberDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Carregando…
        </div>
      }
    >
      <MemberDetailContent />
    </Suspense>
  );
}
