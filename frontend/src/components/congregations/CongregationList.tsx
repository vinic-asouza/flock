'use client';

import { useEffect, useState } from 'react';
import { CongregationCard } from './CongregationCard';
import { CongregationsSkeleton } from './CongregationsSkeleton';
import { apiService } from '@/services/api';
import { Congregation } from '@/types/congregation';

interface CongregationListProps {
  canEdit?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string, activeMembersCount?: number) => void;
  refreshTrigger?: number;
}

export function CongregationList({ canEdit = true, onEdit, onDelete, refreshTrigger }: CongregationListProps) {
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCongregations = async () => {
    try {
      setLoading(true);
      setError(null);
      const congregationsData = await apiService.listCongregations();
      setCongregations(congregationsData);
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { error?: string; details?: string } } };
      const errorMessage = errorResponse.response?.data?.details 
        || errorResponse.response?.data?.error 
        || (err instanceof Error ? err.message : 'Erro ao carregar congregações');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCongregations();
  }, [refreshTrigger]);

  const handleEdit = (id: string) => {
    onEdit(id);
  };

  const handleDelete = (id: string, name: string, activeMembersCount: number = 0) => {
    onDelete(id, name, activeMembersCount);
  };

  if (loading) {
    return <CongregationsSkeleton />;
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar congregações</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={loadCongregations}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (congregations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">Nenhuma congregação encontrada</p>
        <p className="text-sm text-gray-500">Comece adicionando uma nova congregação.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {congregations.map((congregation) => (
        <CongregationCard
          key={congregation.id}
          congregation={congregation}
          canEdit={canEdit}
          onEdit={() => handleEdit(congregation.id)}
          onDelete={() => handleDelete(congregation.id, congregation.name, congregation.activeMembersCount || 0)}
        />
      ))}
    </div>
  );
}
