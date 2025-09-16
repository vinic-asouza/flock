'use client';

import { useEffect, useState } from 'react';
import { RoleCard } from './RoleCard';
import { apiService } from '@/services/api';
import { Role } from '@/types/role';

interface RoleListProps {
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string, activeMembersCount?: number) => void;
  refreshTrigger?: number;
}

export function RoleList({ onEdit, onDelete, refreshTrigger }: RoleListProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const rolesData = await apiService.listRoles();
      setRoles(rolesData);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erro ao carregar cargos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, [refreshTrigger]);

  const handleEdit = (id: string) => {
    onEdit(id);
  };

  const handleDelete = (id: string, name: string, activeMembersCount: number = 0) => {
    onDelete(id, name, activeMembersCount);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg font-medium text-gray-900 mb-2">Carregando cargos...</p>
        <p className="text-sm text-gray-500">Buscando informações</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar cargos</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={loadRoles}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">Nenhum cargo encontrado</p>
        <p className="text-sm text-gray-500">Comece criando seu primeiro cargo</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {roles.map((role) => (
        <RoleCard
          key={role.id}
          role={role}
          onEdit={() => handleEdit(role.id)}
          onDelete={() => handleDelete(role.id, role.name, role.activeMembersCount || 0)}
        />
      ))}
    </div>
  );
}
