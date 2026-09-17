'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Phone,
  Search,
  User,
  Users
} from 'lucide-react';
import { EntityDetailLayout, useEntityTab } from '@/components/entity-detail';
import { MemberCardCompact } from '@/components/reports/MemberCardCompact';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { apiService, formatApiError } from '@/services/api';
import { Congregation } from '@/types/congregation';
import type { Member } from '@/types/reports';

const MEMBERS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 400;

const CONGREGATION_TABS = ['membros'] as const;
type CongregationTab = (typeof CONGREGATION_TABS)[number];

const TAB_ITEMS = [{ id: 'membros', label: 'Membros', panelId: 'membros-panel' }];

interface CongregationDetailViewProps {
  congregation: Congregation;
}

export function CongregationDetailView({ congregation }: CongregationDetailViewProps) {
  const { activeTab, setActiveTab } = useEntityTab(CONGREGATION_TABS, 'membros');

  const congregationId = congregation.id;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [pagination, setPagination] = useState<{
    total: number;
    totalPages?: number;
  } | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [errorMembers, setErrorMembers] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [congregationId, searchDebounced]);

  const loadMembers = useCallback(async () => {
    if (!congregationId) return;
    const requestId = ++requestIdRef.current;
    try {
      setLoadingMembers(true);
      setErrorMembers(null);
      const response = await apiService.listMembers({
        page,
        limit: MEMBERS_PER_PAGE,
        congregation_id: congregationId,
        active: true,
        ...(searchDebounced ? { search: searchDebounced } : {})
      });
      if (requestId !== requestIdRef.current) return;
      setMembers(response.data || []);
      setPagination(
        response.pagination
          ? {
              total: response.pagination.total,
              totalPages: response.pagination.totalPages
            }
          : null
      );
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setErrorMembers(formatApiError(err));
      setMembers([]);
      setPagination(null);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingMembers(false);
      }
    }
  }, [congregationId, page, searchDebounced]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const activeMembersCount = congregation.activeMembersCount ?? pagination?.total ?? 0;
  const totalMembers = pagination?.total ?? activeMembersCount;
  const totalPages =
    pagination?.totalPages ?? (totalMembers > 0 ? Math.ceil(totalMembers / MEMBERS_PER_PAGE) : 1);
  const hasPrevPage = page > 1;
  const hasNextPage = page < totalPages;

  const fullAddress = [congregation.address, congregation.city, congregation.state]
    .filter(Boolean)
    .join(', ');

  return (
    <EntityDetailLayout
      aside={
        <Card className="space-y-4">
          {congregation.abbreviation?.trim() ? (
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500">Nome completo</p>
              <p className="mt-0.5 break-words text-sm text-gray-900">{congregation.name}</p>
            </div>
          ) : null}

          <div>
            <p className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
              <Users size={16} className="shrink-0 text-gray-400" />
              Quantidade
            </p>
            <p className="text-sm text-gray-900">{activeMembersCount} membro(s)</p>
          </div>

          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
              <MapPin size={16} className="shrink-0 text-gray-400" />
              Endereço
            </p>
            <p className="break-words text-sm text-gray-900">{fullAddress || '—'}</p>
          </div>

          <div>
            <p className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
              <Phone size={16} className="shrink-0 text-gray-400" />
              Contato
            </p>
            <p className="text-sm text-gray-900">
              {congregation.phone ? (
                <a
                  href={`tel:${congregation.phone.replace(/\D/g, '')}`}
                  className="text-primary hover:underline"
                >
                  {congregation.phone}
                </a>
              ) : (
                '—'
              )}
            </p>
          </div>

          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-500">
              <User size={16} className="shrink-0 text-gray-400" />
              Líder
            </p>
            <p className="break-words text-sm text-gray-900">{congregation.leader || '—'}</p>
          </div>
        </Card>
      }
    >
      <Tabs
        tabs={TAB_ITEMS}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as CongregationTab)}
        ariaLabel="Conteúdo da congregação"
      />
      <section
        id={`${activeTab}-panel`}
        role="tabpanel"
        aria-labelledby={`${activeTab}-tab`}
        tabIndex={0}
        className="space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="shrink-0 text-sm font-medium text-gray-900">
            Membros ({activeMembersCount})
          </h3>
          <div className="relative w-full min-w-0 sm:max-w-sm">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar membros por nome..."
              aria-label="Buscar membros da congregação"
              className="h-11 w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {loadingMembers ? (
          <Card className="flex items-center justify-center py-10 text-gray-500">
            <Loader2 size={20} className="mr-2 animate-spin" />
            Carregando membros...
          </Card>
        ) : errorMembers ? (
          <Card className="py-8 text-center">
            <p className="mb-3 break-words text-sm font-medium text-red-700">{errorMembers}</p>
            <Button onClick={loadMembers} variant="secondary" className="min-h-11">
              Tentar novamente
            </Button>
          </Card>
        ) : members.length > 0 ? (
          <div className="space-y-3">
            {members.map((member) => (
              <MemberCardCompact
                key={member.id}
                href={`/members/${member.id}`}
                member={member as Parameters<typeof MemberCardCompact>[0]['member']}
              />
            ))}

            {totalPages > 1 ? (
              <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando {(page - 1) * MEMBERS_PER_PAGE + 1} a{' '}
                  {Math.min(page * MEMBERS_PER_PAGE, totalMembers)} de {totalMembers} membro(s)
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={!hasPrevPage}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-300 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:opacity-50"
                    title="Página anterior"
                  >
                    <ChevronLeft size={16} className="text-gray-600" />
                  </button>
                  <div className="flex items-center gap-1 px-2">
                    <span className="text-sm font-medium text-gray-700">{page}</span>
                    <span className="text-sm text-gray-400">de</span>
                    <span className="text-sm font-medium text-gray-700">{totalPages}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={!hasNextPage}
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
              {searchDebounced
                ? 'Nenhum membro encontrado para esta busca'
                : 'Nenhum membro vinculado a esta congregação'}
            </p>
          </Card>
        )}
      </section>
    </EntityDetailLayout>
  );
}
