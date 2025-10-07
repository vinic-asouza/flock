'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { apiService } from '@/services/api';
import { 
  FileText, 
  UserPlus, 
  UserMinus, 
  Edit, 
  Trash2, 
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX
} from 'lucide-react';

interface AuditLog {
  id: string;
  entity: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete';
  changes_before: any;
  changes_after: any;
  metadata: any;
  user_id: string;
  church_id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

interface AuditLogsResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ACTION_ICONS = {
  create: UserPlus,
  update: Edit,
  delete: Trash2,
  activate: UserCheck,
  deactivate: UserX,
};

const ACTION_LABELS = {
  create: 'Criado',
  update: 'Atualizado',
  delete: 'Excluído',
  activate: 'Ativado',
  deactivate: 'Inativado',
};

const ENTITY_LABELS = {
  member: 'Membro',
  role: 'Cargo',
  congregation: 'Congregação',
};

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
  });
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Buscando logs com parâmetros:', {
        page,
        limit: pagination.limit,
        entity: 'member',
        action: filters.action || undefined,
      });
      
      // Para ativação/inativação, buscar logs de 'update' e filtrar no frontend
      const apiAction = (filters.action === 'activate' || filters.action === 'deactivate') 
        ? 'update' 
        : filters.action || undefined;
      
      const response: AuditLogsResponse = await apiService.getAuditLogs({
        page,
        limit: pagination.limit,
        entity: 'member', // Apenas membros
        action: apiAction,
      });

      console.log('📊 Resposta da API:', response);

      let filteredLogs = response.data;
      
      // Filtrar ativação/inativação no frontend
      if (filters.action === 'activate' || filters.action === 'deactivate') {
        filteredLogs = response.data.filter(log => {
          const realAction = getRealAction(log);
          return realAction === filters.action;
        });
      }

      setLogs(filteredLogs);
      setPagination({
        ...response.pagination,
        total: filteredLogs.length
      });
    } catch (err: any) {
      console.error('❌ Erro ao buscar logs:', err);
      setError(err.message || 'Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePageChange = (newPage: number) => {
    fetchLogs(newPage);
  };

  const toggleExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionIcon = (action: string) => {
    const IconComponent = ACTION_ICONS[action as keyof typeof ACTION_ICONS] || FileText;
    return <IconComponent className="w-4 h-4" />;
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'text-green-600 bg-green-50';
      case 'update': return 'text-blue-600 bg-blue-50';
      case 'delete': return 'text-red-600 bg-red-50';
      case 'activate': return 'text-emerald-600 bg-emerald-50';
      case 'deactivate': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Função para detectar se é ativação/inativação
  const isActivationChange = (log: AuditLog) => {
    if (log.action !== 'update') return false;
    
    const before = log.changes_before;
    const after = log.changes_after;
    
    if (!before || !after) return false;
    
    // Verifica se o campo 'active' mudou
    if (before.active === after.active) return false;
    
    // Verifica se apenas o campo 'active' mudou (ou com mudanças mínimas)
    const fieldsToCheck = ['name', 'email', 'phone', 'birth', 'gender', 'marital_status', 'occupation', 'city', 'state'];
    const otherFieldsChanged = fieldsToCheck.some(field => before[field] !== after[field]);
    
    // Se outros campos mudaram, não é uma ativação/inativação pura
    return !otherFieldsChanged;
  };

  // Função para obter o tipo de ação real (considerando ativação/inativação)
  const getRealAction = (log: AuditLog) => {
    if (isActivationChange(log)) {
      return log.changes_after.active ? 'activate' : 'deactivate';
    }
    return log.action;
  };

  const getMemberName = (log: AuditLog) => {
    if (log.action === 'create' && log.changes_after?.name) {
      return log.changes_after.name;
    }
    if (log.action === 'update' && log.changes_after?.name) {
      return log.changes_after.name;
    }
    if (log.action === 'delete' && log.changes_before?.name) {
      return log.changes_before.name;
    }
    return 'Nome não disponível';
  };

  const getChangedFields = (before: any, after: any) => {
    if (!before || !after) return [];
    
    const changes: Array<{field: string, before: any, after: any}> = [];
    const fieldsToCheck = ['name', 'email', 'phone', 'birth', 'gender', 'marital_status', 'occupation', 'city', 'state'];
    
    fieldsToCheck.forEach(field => {
      if (before[field] !== after[field]) {
        changes.push({
          field,
          before: before[field],
          after: after[field]
        });
      }
    });
    
    return changes;
  };

  const formatFieldName = (field: string) => {
    const fieldNames: Record<string, string> = {
      name: 'Nome',
      email: 'Email',
      phone: 'Telefone',
      birth: 'Data de Nascimento',
      gender: 'Gênero',
      marital_status: 'Estado Civil',
      occupation: 'Ocupação',
      city: 'Cidade',
      state: 'Estado'
    };
    return fieldNames[field] || field;
  };

  const formatFieldValue = (value: any, field: string) => {
    if (value === null || value === undefined) return 'Não informado';
    if (field === 'birth' && value) {
      return new Date(value).toLocaleDateString('pt-BR');
    }
    return value;
  };

  const renderChanges = (log: AuditLog, isExpanded: boolean) => {
    const memberName = getMemberName(log);
    const realAction = getRealAction(log);
    const isActivation = isActivationChange(log);
    const changedFields = (log.action === 'update' || isActivation) ? getChangedFields(log.changes_before, log.changes_after) : [];

    if (!isExpanded) {
      return (
        <div className="text-sm text-gray-500">
          <div className="mb-2">
            <span className="font-medium text-gray-700">Membro: {memberName}</span>
            {(log.action === 'update' || isActivation) && changedFields.length > 0 && (
              <div className="mt-1 text-xs text-gray-600">
                Campos alterados: {changedFields.map(f => formatFieldName(f.field)).join(', ')}
              </div>
            )}
            {isActivation && (
              <div className="mt-1 text-xs text-gray-600">
                Status: {realAction === 'activate' ? 'Ativado' : 'Inativado'}
              </div>
            )}
          </div>
          <button
            onClick={() => toggleExpanded(log.id)}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
          >
            <ChevronDown className="w-4 h-4" />
            Ver detalhes
          </button>
        </div>
      );
    }

    if (log.action === 'create') {
      return (
        <div className="text-sm text-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Dados criados para {memberName}:</span>
            <button
              onClick={() => toggleExpanded(log.id)}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
            >
              <ChevronUp className="w-4 h-4" />
              Recolher
            </button>
          </div>
          <div className="p-2 bg-gray-50 rounded text-xs">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(log.changes_after, null, 2)}
            </pre>
          </div>
        </div>
      );
    }

    if (isActivation) {
      const statusText = realAction === 'activate' ? 'Ativado' : 'Inativado';
      const statusColor = realAction === 'activate' ? 'text-emerald-600' : 'text-orange-600';
      const bgColor = realAction === 'activate' ? 'bg-emerald-50' : 'bg-orange-50';
      const borderColor = realAction === 'activate' ? 'border-emerald-400' : 'border-orange-400';
      
      return (
        <div className="text-sm text-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{memberName} foi {statusText.toLowerCase()}</span>
            <button
              onClick={() => toggleExpanded(log.id)}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
            >
              <ChevronUp className="w-4 h-4" />
              Recolher
            </button>
          </div>
          
          <div className={`p-3 ${bgColor} rounded border-l-4 ${borderColor}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${realAction === 'activate' ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
              <span className={`font-medium ${statusColor}`}>
                Status: {statusText}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Antes:</span>
                  <div className="text-red-600">
                    {log.changes_before?.active ? 'Ativo' : 'Inativo'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Depois:</span>
                  <div className={statusColor}>
                    {log.changes_after?.active ? 'Ativo' : 'Inativo'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (log.action === 'update') {
      return (
        <div className="text-sm text-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Alterações em {memberName}:</span>
            <button
              onClick={() => toggleExpanded(log.id)}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
            >
              <ChevronUp className="w-4 h-4" />
              Recolher
            </button>
          </div>
          
          {changedFields.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 mb-2">Campos alterados:</div>
              {changedFields.map((change, index) => (
                <div key={index} className="p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                  <div className="font-medium text-gray-800">{formatFieldName(change.field)}:</div>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="text-red-600 line-through">
                      {formatFieldValue(change.before, change.field)}
                    </span>
                    <span className="mx-2">→</span>
                    <span className="text-green-600 font-medium">
                      {formatFieldValue(change.after, change.field)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-2 bg-yellow-50 rounded text-yellow-800">
              Nenhuma alteração detectada nos campos principais
            </div>
          )}
          
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
              Ver dados completos (JSON)
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <div>
                <span className="font-medium text-red-600">Antes:</span>
                <div className="mt-1 p-2 bg-red-50 rounded text-xs">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(log.changes_before, null, 2)}
                  </pre>
                </div>
              </div>
              <div>
                <span className="font-medium text-green-600">Depois:</span>
                <div className="mt-1 p-2 bg-green-50 rounded text-xs">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(log.changes_after, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </details>
        </div>
      );
    }

    if (log.action === 'delete') {
      return (
        <div className="text-sm text-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Dados excluídos de {memberName}:</span>
            <button
              onClick={() => toggleExpanded(log.id)}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
            >
              <ChevronUp className="w-4 h-4" />
              Recolher
            </button>
          </div>
          <div className="p-2 bg-red-50 rounded text-xs">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(log.changes_before, null, 2)}
            </pre>
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading && logs.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Carregando logs...</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Logs de Auditoria</h2>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <Select
              value={filters.action}
              onChange={(value) => handleFilterChange('action', value)}
              options={[
                { value: '', label: 'Todas as ações' },
                { value: 'create', label: 'Criação' },
                { value: 'update', label: 'Atualização' },
                { value: 'activate', label: 'Ativação' },
                { value: 'deactivate', label: 'Inativação' },
                { value: 'delete', label: 'Exclusão' }
              ]}
              className="w-40"
            />
          </div>
        </div>

        {/* Lista de Logs */}
        {error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">Erro ao carregar logs</div>
            <div className="text-sm text-gray-500 mb-4">{error}</div>
            <Button onClick={() => fetchLogs()} variant="secondary">
              Tentar novamente
            </Button>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <div className="text-gray-500">Nenhum log encontrado</div>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getActionColor(getRealAction(log))}`}>
                      {getActionIcon(getRealAction(log))}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {ENTITY_LABELS[log.entity as keyof typeof ENTITY_LABELS] || log.entity} {ACTION_LABELS[getRealAction(log)]}
                        {getMemberName(log) !== 'Nome não disponível' && (
                          <span className="text-blue-600 ml-2">- {getMemberName(log)}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {log.entity_id}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {formatDate(log.created_at)}
                  </div>
                </div>

                {renderChanges(log, expandedLogs.has(log.id))}

                {log.metadata && expandedLogs.has(log.id) && (
                  <div className="mt-3 text-sm text-gray-600">
                    <span className="font-medium">Metadados:</span>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} logs
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>
              <span className="text-sm text-gray-500 px-2">
                {pagination.page} de {pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages || loading}
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
