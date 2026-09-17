'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  User,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { EntityDetailLayout, useEntityTab } from '@/components/entity-detail';
import { MemberCardCompact } from '@/components/reports/MemberCardCompact';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { apiService, formatApiError } from '@/services/api';
import { GroupWithMembers } from '@/types';
import { Member } from '@/types/reports';
import { getCongregationDisplayName } from '@/utils/congregation';

const MEMBERS_PER_PAGE = 10;

const MINISTRY_TABS = ['membros'] as const;
type MinistryTab = (typeof MINISTRY_TABS)[number];

const TAB_ITEMS = [{ id: 'membros', label: 'Membros', panelId: 'membros-panel' }];

type RosterMember = Member & { addedAt?: string };

interface MinistryDetailViewProps {
  group: GroupWithMembers;
  readOnly?: boolean;
  onRosterChange?: () => void;
}

export function MinistryDetailView({
  group,
  readOnly = false,
  onRosterChange
}: MinistryDetailViewProps) {
  const { activeTab, setActiveTab } = useEntityTab(MINISTRY_TABS, 'membros');

  const groupId = group.id;
  const congregationId = group.congregation_id || undefined;

  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [errorRoster, setErrorRoster] = useState<string | null>(null);

  const [churchMembers, setChurchMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingChurchMembers, setLoadingChurchMembers] = useState(false);
  const [errorChurchMembers, setErrorChurchMembers] = useState<string | null>(null);

  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const loadRoster = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoadingRoster(true);
      setErrorRoster(null);
      const members = (await apiService.getGroupMembers(groupId)) as RosterMember[];
      const sorted = [...members].sort((a, b) => {
        const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return dateB - dateA;
      });
      setRoster(sorted);
    } catch (err) {
      setErrorRoster(formatApiError(err));
      setRoster([]);
    } finally {
      setLoadingRoster(false);
    }
  }, [groupId]);

  const loadChurchMembers = useCallback(async () => {
    if (readOnly) return;
    try {
      setLoadingChurchMembers(true);
      setErrorChurchMembers(null);

      let allMembers: Member[] = [];
      let currentPage = 1;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await apiService.listMembers({
          page: currentPage,
          limit,
          congregation_id: congregationId,
          active: true
        });

        const members = response.data || [];
        allMembers = [...allMembers, ...members];
        hasMore = members.length === limit && Boolean(response.pagination?.hasNextPage);
        currentPage++;
      }

      setChurchMembers(allMembers.map((m) => ({ id: m.id, name: m.name })));
    } catch (err) {
      setErrorChurchMembers(formatApiError(err));
      setChurchMembers([]);
    } finally {
      setLoadingChurchMembers(false);
    }
  }, [congregationId, readOnly]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    loadChurchMembers();
  }, [loadChurchMembers]);

  useEffect(() => {
    setPage(1);
  }, [groupId]);

  const availableMembers = useMemo(() => {
    const rosterIds = new Set(roster.map((m) => m.id));
    return churchMembers.filter((m) => !rosterIds.has(m.id));
  }, [churchMembers, roster]);

  const totalMembers = roster.length;
  const totalPages = Math.max(1, Math.ceil(totalMembers / MEMBERS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedMembers = roster.slice(
    (currentPage - 1) * MEMBERS_PER_PAGE,
    currentPage * MEMBERS_PER_PAGE
  );

  const handleAddMember = async () => {
    if (!selectedMemberId) return;
    try {
      setAddingMember(true);
      await apiService.addMemberToGroup(groupId, selectedMemberId);
      setSelectedMemberId('');
      await loadRoster();
      onRosterChange?.();
      toast.success('Membro adicionado ao ministério');
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = roster.find((m) => m.id === memberId);
    const memberName = member?.name || 'este membro';
    const confirmed = window.confirm(
      `Tem certeza que deseja remover ${memberName} do ministério?\n\nEsta ação não poderá ser desfeita.`
    );
    if (!confirmed) return;

    try {
      setRemovingMemberId(memberId);
      await apiService.removeMemberFromGroup(groupId, memberId);
      await loadRoster();
      onRosterChange?.();
      toast.success('Membro removido do ministério');
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setRemovingMemberId(null);
    }
  };

  const responsible = group.responsible;

  return (
    <EntityDetailLayout
      aside={
        <Card className="space-y-4">
          <div>
            <p className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
              <CircleDot size={16} className="shrink-0 text-gray-400" />
              Status
            </p>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                group.status ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {group.status ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
              <MapPin size={16} className="shrink-0 text-gray-400" />
              Congregação
            </p>
            <p className="break-words text-sm text-gray-900">
              {getCongregationDisplayName(group.congregations) || '—'}
            </p>
          </div>

          {responsible ? (
            <div className="min-w-0">
              <p className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
                <User size={16} className="shrink-0 text-gray-400" />
                Responsável
              </p>
              <p className="break-words text-sm font-medium text-gray-900">
                {responsible.name || '—'}
              </p>
              {responsible.email || responsible.phone || responsible.whatsapp ? (
                <div className="mt-1 flex flex-col gap-0.5 text-sm text-gray-600">
                  {responsible.email ? (
                    <a
                      href={`mailto:${responsible.email}`}
                      className="flex min-h-9 items-center gap-1.5 break-all transition-colors hover:text-primary"
                    >
                      <Mail size={14} className="shrink-0 text-gray-400" />
                      {responsible.email}
                    </a>
                  ) : null}
                  {responsible.phone ? (
                    <a
                      href={`tel:${responsible.phone.replace(/\D/g, '')}`}
                      className="flex min-h-9 items-center gap-1.5 transition-colors hover:text-primary"
                    >
                      <Phone size={14} className="shrink-0 text-gray-400" />
                      {responsible.phone}
                    </a>
                  ) : null}
                  {responsible.whatsapp ? (
                    <a
                      href={`https://wa.me/${responsible.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-9 items-center gap-1.5 transition-colors hover:text-green-600"
                    >
                      <MessageCircle size={14} className="shrink-0 text-gray-400" />
                      {responsible.whatsapp}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {group.description ? (
            <div className="min-w-0">
              <p className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
                <FileText size={16} className="shrink-0 text-gray-400" />
                Descrição
              </p>
              <p className="whitespace-pre-wrap break-words text-sm text-gray-900">
                {group.description}
              </p>
            </div>
          ) : null}

          <span className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
            {totalMembers} {totalMembers === 1 ? 'membro' : 'membros'}
          </span>
        </Card>
      }
    >
      <Tabs
        tabs={TAB_ITEMS}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as MinistryTab)}
        ariaLabel="Conteúdo do ministério"
      />
      <section
        id={`${activeTab}-panel`}
        role="tabpanel"
        aria-labelledby={`${activeTab}-tab`}
        tabIndex={0}
        className="space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {!readOnly ? (
          <Card className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Adicionar membro</p>
            {errorChurchMembers ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-2.5">
                <p className="mb-2 break-words text-xs text-red-700">{errorChurchMembers}</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={loadChurchMembers}
                  disabled={loadingChurchMembers || addingMember}
                  className="min-h-11"
                >
                  Tentar novamente
                </Button>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1">
                <Select
                  value={selectedMemberId}
                  onChange={setSelectedMemberId}
                  options={[
                    { value: '', label: 'Selecione um membro' },
                    ...availableMembers.map((m) => ({ value: m.id, label: m.name }))
                  ]}
                  disabled={loadingChurchMembers || addingMember}
                  searchable
                  placeholder={loadingChurchMembers ? 'Carregando...' : 'Buscar membro'}
                />
              </div>
              <Button
                onClick={handleAddMember}
                disabled={!selectedMemberId || addingMember}
                isLoading={addingMember}
                className="min-h-11 w-full sm:w-auto"
              >
                <UserPlus size={16} className="mr-2 shrink-0" />
                Adicionar
              </Button>
            </div>
          </Card>
        ) : null}

        {loadingRoster ? (
          <Card className="flex items-center justify-center py-10 text-gray-500">
            <Loader2 size={20} className="mr-2 animate-spin" />
            Carregando membros...
          </Card>
        ) : paginatedMembers.length > 0 ? (
          <div className="space-y-3">
            {paginatedMembers.map((member) => (
              <div key={member.id} className="group relative min-w-0">
                <MemberCardCompact
                  href={`/members/${member.id}`}
                  member={member as Parameters<typeof MemberCardCompact>[0]['member']}
                />
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id)}
                    className="absolute right-2 top-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    title="Remover do ministério"
                    disabled={removingMemberId === member.id}
                  >
                    {removingMemberId === member.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <X size={18} />
                    )}
                  </button>
                ) : null}
              </div>
            ))}

            {totalPages > 1 ? (
              <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando {(currentPage - 1) * MEMBERS_PER_PAGE + 1} a{' '}
                  {Math.min(currentPage * MEMBERS_PER_PAGE, totalMembers)} de {totalMembers}{' '}
                  membro(s)
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-300 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:opacity-50"
                    title="Página anterior"
                  >
                    <ChevronLeft size={16} className="text-gray-600" />
                  </button>
                  <div className="flex items-center gap-1 px-2">
                    <span className="text-sm font-medium text-gray-700">{currentPage}</span>
                    <span className="text-sm text-gray-400">de</span>
                    <span className="text-sm font-medium text-gray-700">{totalPages}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-300 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:opacity-50"
                    title="Próxima página"
                  >
                    <ChevronRight size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <Card className="py-10 text-center">
            <Users size={48} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-600">
              {errorRoster
                ? 'Falha ao carregar membros vinculados'
                : 'Nenhum membro vinculado a este ministério'}
            </p>
            {errorRoster ? (
              <div className="mt-3">
                <p className="mb-2 break-words text-xs text-red-700">{errorRoster}</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={loadRoster}
                  disabled={loadingRoster}
                  className="min-h-11"
                >
                  Tentar novamente
                </Button>
              </div>
            ) : null}
          </Card>
        )}
      </section>
    </EntityDetailLayout>
  );
}
