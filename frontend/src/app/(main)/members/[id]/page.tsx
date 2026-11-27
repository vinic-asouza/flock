'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Download,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { EntityDetailPageHeader } from '@/components/entity-detail';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  MemberDetailView,
  type MemberDetail,
} from '@/components/members/MemberDetailView';
import { EditMemberModal } from '@/components/members/EditMemberModal';
import { DeleteMemberModal } from '@/components/members/DeleteMemberModal';
import { ConfirmSituationChangeModal } from '@/components/members/ConfirmSituationChangeModal';
import { useAuth } from '@/context/AuthContext';
import {
  memberSituationBadgeVariant,
  memberSituationLabel,
  resolveMemberSituation,
  situationToActive,
  type MemberSituation,
} from '@/lib/memberSituation';
import apiService, { formatApiError } from '@/services/api';
import { formatMemberName } from '@/utils/formatMemberName';
import { getNameInitials } from '@/utils/getNameInitials';

const READER_TOOLTIP = 'Seu usuário tem permissão apenas de leitura nesta igreja.';

function MemberDetailContent() {
  const { canEdit } = useAuth();
  const readOnly = canEdit === false;
  const router = useRouter();
  const params = useParams();
  const memberId = String(params.id || '');
  const hasDataRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [situationOpen, setSituationOpen] = useState(false);

  const loadMember = useCallback(async () => {
    if (!memberId) return;
    try {
      if (!hasDataRef.current) setLoading(true);
      setNotFound(false);
      const data = await apiService.getMember(memberId);
      hasDataRef.current = true;
      setMember(data as MemberDetail);
    } catch (err) {
      toast.error(formatApiError(err));
      hasDataRef.current = false;
      setMember(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    hasDataRef.current = false;
    setMember(null);
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

  const handleConfirmSituationChange = async (nextSituation: MemberSituation) => {
    if (!member) return;
    try {
      const result = await apiService.setMemberStatus(member.id, { situation: nextSituation });
      setMember((prev) =>
        prev
          ? {
              ...prev,
              active: result.member.active ?? situationToActive(nextSituation),
              situation: result.member.situation ?? nextSituation,
              situation_changed_at: result.member.situation_changed_at,
            }
          : prev
      );
      toast.success(result.message || 'Situação atualizada');
    } catch (err) {
      toast.error(formatApiError(err));
      throw err;
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

  const situation = member
    ? resolveMemberSituation(member.situation, member.active)
    : 'ativo';

  return (
    <div className="space-y-4">
      <EntityDetailPageHeader
        backHref="/members"
        backLabel="Voltar aos membros"
        title={
          member ? (
            <span className="inline-flex min-w-0 items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-400 text-sm font-semibold text-gray-900"
                aria-hidden
              >
                {getNameInitials(member.name)}
              </span>
              <span className="min-w-0">{formatMemberName(member.name)}</span>
            </span>
          ) : (
            'Membro'
          )
        }
        badge={
          member ? (
            <StatusBadge
              variant={memberSituationBadgeVariant(situation)}
              label={memberSituationLabel(situation)}
              size="sm"
            />
          ) : null
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
              <Button
                variant="secondary"
                className="min-h-11"
                disabled={readOnly}
                title={readOnly ? READER_TOOLTIP : undefined}
                onClick={() => setSituationOpen(true)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Alterar situação
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
          <ConfirmSituationChangeModal
            isOpen={situationOpen}
            onClose={() => setSituationOpen(false)}
            memberName={member.name}
            currentSituation={situation}
            onConfirm={handleConfirmSituationChange}
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
