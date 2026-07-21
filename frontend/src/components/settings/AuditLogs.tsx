'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { apiService, formatApiError } from '@/services/api';
import { formatMemberName } from '@/utils/formatMemberName';
import toast from 'react-hot-toast';
import {
  FileText,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  User,
} from 'lucide-react';

interface AuditActor {
  id: string;
  email: string | null;
  displayName: string;
}

interface AuditLog {
  id: string;
  entity: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'convert' | 'import' | 'export' | 'deactivate';
  changes_before: Record<string, unknown> | null;
  changes_after: Record<string, unknown> | null;
  user_id: string;
  church_id: string;
  created_at: string;
  actor: AuditActor;
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Criou',
  update: 'Atualizou',
  delete: 'Excluiu',
  activate: 'Ativou',
  deactivate: 'Inativou',
  convert: 'Converteu',
  import: 'Importou',
  export: 'Exportou',
};

const ENTITY_LABELS: Record<string, string> = {
  member: 'membro',
  congregation: 'congregação',
  church: 'igreja',
  account: 'conta',
  group: 'grupo',
  calendar_item: 'evento',
  integration_member: 'integração',
  public_registration_link: 'link de cadastro',
  public_integration_link: 'link de integração',
  member_group: 'vínculo com grupo',
};

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  email: 'E-mail',
  phone: 'Telefone',
  birth: 'Data de nascimento',
  gender: 'Gênero',
  marital_status: 'Estado civil',
  occupation: 'Ocupação',
  city: 'Cidade',
  state: 'Estado',
  address: 'Endereço',
  active: 'Status',
  denomination: 'Denominação',
  cnpj: 'CNPJ',
  email_church: 'E-mail da igreja',
  phone_church: 'Telefone da igreja',
  type: 'Tipo',
  description: 'Descrição',
  status: 'Status',
  role: 'Papel',
  title: 'Título',
  start_at: 'Início',
  end_at: 'Fim',
};

const ENTITY_FILTER_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'member', label: 'Membros' },
  { value: 'church', label: 'Igreja' },
  { value: 'account', label: 'Conta' },
  { value: 'congregation', label: 'Congregações' },
  { value: 'group', label: 'Grupos' },
  { value: 'calendar_item', label: 'Calendário' },
  { value: 'integration_member', label: 'Integração' },
];

const ACTION_FILTER_OPTIONS = [
  { value: '', label: 'Todas as ações' },
  { value: 'create', label: 'Criação' },
  { value: 'update', label: 'Atualização' },
  { value: 'activate', label: 'Ativação' },
  { value: 'deactivate', label: 'Inativação' },
  { value: 'delete', label: 'Exclusão' },
  { value: 'import', label: 'Importação' },
  { value: 'export', label: 'Exportação' },
];

const isMemberListTransfer = (log: AuditLog) =>
  (log.action === 'import' || log.action === 'export') &&
  (log.entity === 'church' || log.changes_after?.list_type === 'members');

const FIELDS_BY_ENTITY: Record<string, string[]> = {
  member: ['name', 'email', 'phone', 'birth', 'gender', 'marital_status', 'occupation', 'city', 'state', 'address', 'active'],
  church: ['name', 'denomination', 'address', 'city', 'state', 'cnpj', 'email_church', 'phone_church'],
  account: ['email', 'phone'],
  congregation: ['name', 'address', 'city', 'state'],
  group: ['name', 'type', 'description'],
  calendar_item: ['title', 'description', 'type', 'status', 'start_at', 'end_at'],
  integration_member: ['name', 'email', 'phone', 'city', 'state', 'status'],
};

const DEFAULT_DIFF_FIELDS = [
  'name', 'email', 'phone', 'birth', 'gender', 'marital_status', 'occupation',
  'city', 'state', 'address', 'active', 'type', 'description', 'status', 'title',
];

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    action: '',
    entity: '',
  });
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      setExpandedLogs(new Set());

      const isStatusChangeFilter =
        filters.action === 'activate' || filters.action === 'deactivate';

      const response = await apiService.getAuditLogs({
        page,
        limit: pagination.limit,
        entity: filters.entity || undefined,
        action: isStatusChangeFilter ? undefined : filters.action || undefined,
        member_status_change: isStatusChangeFilter
          ? (filters.action as 'activate' | 'deactivate')
          : undefined,
      });

      setLogs(response.data as unknown as AuditLog[]);
      setPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      });
    } catch (err: unknown) {
      const errorMessage = formatApiError(err);
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage === pagination.page || loading) return;
    if (pagination.totalPages > 0 && newPage > pagination.totalPages) return;
    fetchLogs(newPage);
  };

  const toggleExpanded = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const isActivationChange = (log: AuditLog) => {
    if (log.action !== 'update') return false;
    const before = log.changes_before;
    const after = log.changes_after;
    if (!before || !after || before.active === after.active) return false;

    const fieldsToCheck = FIELDS_BY_ENTITY.member.filter((f) => f !== 'active');
    return !fieldsToCheck.some((field) => before[field] !== after[field]);
  };

  const getRealAction = (log: AuditLog) => {
    if (isActivationChange(log) && log.changes_after) {
      return log.changes_after.active ? 'activate' : 'deactivate';
    }
    return log.action;
  };

  const getTargetName = (log: AuditLog): string => {
    if (log.entity === 'church') {
      const name = log.changes_after?.name ?? log.changes_before?.name;
      return name ? String(name) : 'Igreja';
    }
    if (log.entity === 'account') {
      const email = log.changes_after?.email ?? log.changes_before?.email;
      return email ? String(email) : 'Conta';
    }
    if (log.entity === 'calendar_item') {
      const title = log.changes_after?.title ?? log.changes_before?.title;
      return title ? String(title) : 'Evento';
    }

    const name =
      log.changes_after?.name ??
      log.changes_before?.name ??
      null;

    if (name) return formatMemberName(String(name));
    return 'Registro';
  };

  const getChangedFields = (log: AuditLog) => {
    const before = log.changes_before;
    const after = log.changes_after;
    if (!before || !after) return [];

    const fields = FIELDS_BY_ENTITY[log.entity] ?? DEFAULT_DIFF_FIELDS;
    const changes: Array<{ field: string; before: unknown; after: unknown }> = [];

    fields.forEach((field) => {
      if (before[field] !== after[field]) {
        changes.push({ field, before: before[field], after: after[field] });
      }
    });

    return changes;
  };

  const formatFieldName = (field: string) => FIELD_LABELS[field] || field;

  const formatFieldValue = (value: unknown, field: string) => {
    if (value === null || value === undefined || value === '') return 'Não informado';
    if (field === 'active') return value ? 'Ativo' : 'Inativo';
    if (
      (field === 'birth' || field === 'start_at' || field === 'end_at') &&
      (typeof value === 'string' || typeof value === 'number' || value instanceof Date)
    ) {
      return new Date(value).toLocaleString('pt-BR');
    }
    return String(value);
  };

  const getActorLabel = (log: AuditLog) =>
    log.actor?.displayName || log.actor?.email || 'Usuário indisponível';

  const getSummaryLine = (log: AuditLog) => {
    if (isMemberListTransfer(log)) {
      return log.action === 'export'
        ? 'Exportou uma lista de membros'
        : 'Importou uma lista de membros';
    }

    const action = getRealAction(log);
    const actionLabel = ACTION_LABELS[action] || 'Alterou';
    const entityLabel = ENTITY_LABELS[log.entity] || 'registro';
    const target = getTargetName(log);
    return `${actionLabel} ${entityLabel} “${target}”`;
  };

  const getChangedFieldsPreview = (log: AuditLog) => {
    if (isMemberListTransfer(log)) return null;

    const realAction = getRealAction(log);
    if (realAction === 'activate' || realAction === 'deactivate') {
      return realAction === 'activate' ? 'Status: Ativo' : 'Status: Inativo';
    }
    if (log.action !== 'update') return null;
    const fields = getChangedFields(log);
    if (fields.length === 0) return null;
    return fields.map((f) => formatFieldName(f.field)).join(', ');
  };

  const renderExpandedDetails = (log: AuditLog) => {
    if (isMemberListTransfer(log)) {
      const rows =
        log.changes_after?.importedRows ??
        log.changes_after?.exportedRows ??
        null;
      return (
        <p className="text-sm text-gray-700">
          {log.action === 'export'
            ? 'Exportação de lista de membros'
            : 'Importação de lista de membros'}
          {typeof rows === 'number' ? ` (${rows} registros).` : '.'}
        </p>
      );
    }

    const realAction = getRealAction(log);

    if (realAction === 'create') {
      const after = log.changes_after;
      const fields = FIELDS_BY_ENTITY[log.entity] ?? DEFAULT_DIFF_FIELDS;
      const entries = after
        ? fields
            .filter((field) => after[field] !== undefined && after[field] !== null && after[field] !== '')
            .map((field) => ({ field, value: after[field] }))
        : [];

      if (entries.length === 0) {
        return <p className="text-sm text-gray-500">Registro criado.</p>;
      }

      return (
        <ul className="space-y-1 text-sm text-gray-700">
          {entries.map(({ field, value }) => (
            <li key={field}>
              <span className="font-medium text-gray-800">{formatFieldName(field)}:</span>{' '}
              {formatFieldValue(value, field)}
            </li>
          ))}
        </ul>
      );
    }

    if (realAction === 'delete') {
      const before = log.changes_before;
      const name = before?.name ?? before?.title ?? before?.email;
      return (
        <p className="text-sm text-gray-700">
          Registro removido
          {name ? (
            <>
              : <span className="font-medium">{String(name)}</span>
            </>
          ) : (
            '.'
          )}
        </p>
      );
    }

    if (realAction === 'activate' || realAction === 'deactivate') {
      return (
        <p className="text-sm text-gray-700">
          Status:{' '}
          <span className="font-medium">
            {realAction === 'activate' ? 'Ativo' : 'Inativo'}
          </span>
        </p>
      );
    }

    const changedFields = getChangedFields(log);
    if (changedFields.length === 0) {
      return <p className="text-sm text-gray-500">Nenhuma alteração nos campos principais.</p>;
    }

    return (
      <ul className="space-y-2">
        {changedFields.map((change) => (
          <li key={change.field} className="text-sm text-gray-700">
            <span className="font-medium text-gray-800">{formatFieldName(change.field)}:</span>{' '}
            <span className="text-gray-500 line-through">
              {formatFieldValue(change.before, change.field)}
            </span>
            <span className="mx-1.5 text-gray-400">→</span>
            <span className="font-medium text-gray-900">
              {formatFieldValue(change.after, change.field)}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  const rangeStart =
    pagination.total === 0 ? 0 : ((pagination.page - 1) * pagination.limit) + 1;
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Histórico de atividades</h2>
        <p className="mt-1 text-sm text-gray-500">
          Acompanhe o que foi alterado e quem realizou cada ação.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <Select
          value={filters.entity}
          onChange={(value) => handleFilterChange('entity', value)}
          options={ENTITY_FILTER_OPTIONS}
          className="w-40"
          disabled={loading}
        />
        <Select
          value={filters.action}
          onChange={(value) => handleFilterChange('action', value)}
          options={ACTION_FILTER_OPTIONS}
          className="w-40"
          disabled={loading}
        />
      </div>

      {loading ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 border-t border-gray-100 py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm text-gray-600">Carregando atividades...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 border-t border-gray-100 py-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <div className="text-sm font-medium text-red-600">Erro ao carregar atividades</div>
          <p className="max-w-md text-sm text-gray-500">{error}</p>
          <Button
            onClick={() => fetchLogs(pagination.page || 1)}
            variant="secondary"
            disabled={loading}
          >
            Tentar novamente
          </Button>
        </div>
      ) : logs.length === 0 ? (
        <div className="border-t border-gray-100 py-10 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">Nenhuma atividade encontrada</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {logs.map((log) => {
            const isExpanded = expandedLogs.has(log.id);
            const preview = getChangedFieldsPreview(log);
            const canExpand =
              log.action === 'update' ||
              log.action === 'create' ||
              log.action === 'delete' ||
              isMemberListTransfer(log) ||
              isActivationChange(log);

            return (
              <li key={log.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {getSummaryLine(log)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {getActorLabel(log)}
                      </span>
                      <span>{formatDate(log.created_at)}</span>
                      {preview && !isExpanded && (
                        <span className="text-gray-400">Alterou: {preview}</span>
                      )}
                    </div>
                  </div>
                  {canExpand && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(log.id)}
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:opacity-80"
                    >
                      {isExpanded ? (
                        <>
                          Recolher
                          <ChevronUp className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>
                          Detalhes
                          <ChevronDown className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="mt-2 rounded-md bg-gray-50 px-3 py-2">
                    {renderExpandedDetails(log)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500">
            {loading
              ? 'Carregando...'
              : `${rangeStart}–${rangeEnd} de ${pagination.total}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="inline-flex items-center gap-1 px-1 text-xs text-gray-500">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {pagination.page}/{pagination.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
