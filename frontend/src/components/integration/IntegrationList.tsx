'use client';

import { IntegrationMember } from '@/types';
import { IntegrationCard } from './IntegrationCard';
import { Pagination } from '@/components/common/Pagination';
import { useIntegration } from '@/context/IntegrationContext';
import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

interface IntegrationListProps {
  onEdit: (member: IntegrationMember) => void;
  onConvert: (member: IntegrationMember) => void;
  onDelete: (member: IntegrationMember) => void;
  onView: (member: IntegrationMember) => void;
  onPageChange: (page: number) => void;
  onExport: () => void;
  isExporting?: boolean;
}

export function IntegrationList({
  onEdit,
  onConvert,
  onDelete,
  onView,
  onPageChange,
  onExport,
  isExporting = false
}: IntegrationListProps) {
  const { integrationMembers, pagination, loading, error } = useIntegration();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Spinner className="mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">Carregando integrantes...</p>
        <p className="text-sm text-gray-500">Buscando informações</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!integrationMembers.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">Nenhum integrante encontrado</p>
        <p className="text-sm text-gray-500 text-center max-w-md">
          Não encontramos integrantes com os filtros aplicados. Ajuste os critérios de busca para visualizar outros resultados.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-2">
        {typeof pagination?.total === 'number' && (
          <div className="text-gray-500 text-sm">{pagination.total} integrantes encontrados</div>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={onExport}
          disabled={isExporting}
          className="inline-flex items-center gap-2"
        >
          {isExporting ? (
            <>
              <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download size={16} />
              Exportar lista
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {integrationMembers.map(member => (
          <IntegrationCard
            key={member.id}
            member={member}
            onEdit={() => onEdit(member)}
            onConvert={() => onConvert(member)}
            onDelete={() => onDelete(member)}
            onView={() => onView(member)}
          />
        ))}
      </div>

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

