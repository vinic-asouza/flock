'use client';

import { MemberList } from '@/components/members/MemberList';
import { MemberSearchInput } from '@/components/members/MemberSearchInput';
import { ViewModeSelector } from '@/components/members/ViewModeSelector';
import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MemberFiltersBar } from '@/components/members/MemberFiltersBar';
import { MemberFiltersAdvanced } from '@/components/members/MemberFiltersAdvanced';
import { ActiveFiltersChips } from '@/components/members/ActiveFiltersChips';
import { CreateMemberModal } from '@/components/members/CreateMemberModal';
import { ViewMemberModal } from '@/components/members/ViewMemberModal';
import { EditMemberModal } from '@/components/members/EditMemberModal';
import { DeleteMemberModal } from '@/components/members/DeleteMemberModal';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { MembersProvider, useMembers } from '@/context/MembersContext';
import { useViewMode } from '@/hooks/useViewMode';

export type MemberFilters = {
  search: string;
  status: 'all' | 'active' | 'inactive';
  roleId: string;
  congregationId: string;
  gender: '' | 'Masculino' | 'Feminino';
  maritalStatus: '' | 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'Outro';
  nationality: string;
  state: string;
  city: string;
  neighborhood: string;
  ageFrom: string;
  ageTo: string;
  occupation: string;
  birthDateFrom: string;
  birthDateTo: string;
  baptismDateFrom: string;
  baptismDateTo: string;
  admissionDateFrom: string;
  admissionDateTo: string;
};

const initialFilters: MemberFilters = {
  search: '',
  status: 'active',
  roleId: '',
  congregationId: '',
  gender: '',
  maritalStatus: '',
  nationality: '',
  state: '',
  city: '',
  neighborhood: '',
  ageFrom: '',
  ageTo: '',
  occupation: '',
  birthDateFrom: '',
  birthDateTo: '',
  baptismDateFrom: '',
  baptismDateTo: '',
  admissionDateFrom: '',
  admissionDateTo: '',
};

const initialSorting = {
  sort_by: 'name',
  sort_order: 'asc' as 'asc' | 'desc'
};

function MembersPageContent() {
  const searchParams = useSearchParams();
  const [total, setTotal] = useState<number | null>(null);
  const [filters, setFilters] = useState<MemberFilters>(initialFilters);
  const [sorting, setSorting] = useState<{ sort_by: string; sort_order: 'asc' | 'desc' }>(initialSorting);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const { viewMode, setViewMode, isLoaded } = useViewMode('list');
  
  // Estados dos modais
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedMemberName, setSelectedMemberName] = useState<string>('');

  const { loadMembers, addMemberOptimistic, updateMemberOptimistic, removeMemberOptimistic, syncWithServer } = useMembers();

  // Aplicar filtros da URL se presentes e carregar membros
  useEffect(() => {
    let isMounted = true;
    
    const initializePage = async () => {
      if (!isMounted) return;
      
      setIsInitializing(true);
      
      const roleIdFromUrl = searchParams.get('role_id');
      const congregationIdFromUrl = searchParams.get('congregation_id');
      const statusFromUrl = searchParams.get('status');
      
      let filtersToUse = { ...initialFilters };
      
      if (roleIdFromUrl || congregationIdFromUrl || statusFromUrl) {
        if (roleIdFromUrl) {
          filtersToUse.roleId = roleIdFromUrl;
        }
        
        if (congregationIdFromUrl) {
          filtersToUse.congregationId = congregationIdFromUrl;
        }
        
        if (statusFromUrl && (statusFromUrl === 'active' || statusFromUrl === 'inactive' || statusFromUrl === 'all')) {
          filtersToUse.status = statusFromUrl as 'all' | 'active' | 'inactive';
        }
        
        if (isMounted) {
          setFilters(filtersToUse);
        }
      }
      
      // Carregar membros com os filtros (seja da URL ou iniciais)
      if (isMounted) {
        await loadMembers(filtersToUse, sorting, 1);
        setIsInitializing(false);
      }
    };
    
    initializePage();
    
    return () => {
      isMounted = false;
    };
  }, [searchParams]); // Executar quando searchParams mudar

  const handleFilterChange = useCallback((changes: Partial<MemberFilters>) => {
    setFilters((prev) => ({ ...prev, ...changes }));
  }, []);

  const handleSortingChange = useCallback((newSorting: { sort_by: string; sort_order: 'asc' | 'desc' }) => {
    setSorting(newSorting);
  }, []);

  const handleShowAdvanced = useCallback(() => {
    setShowAdvanced((v) => !v);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    handleFilterChange({ search: value });
  }, [handleFilterChange]);

  const handleRemoveFilter = useCallback((filterKey: keyof MemberFilters) => {
    const defaultValue = initialFilters[filterKey];
    handleFilterChange({ [filterKey]: defaultValue });
  }, [handleFilterChange]);

  const handleClearAllFilters = useCallback(() => {
    setFilters(initialFilters);
    setSorting(initialSorting);
  }, []);

  // Handlers dos modais
  const handleViewMember = useCallback((id: string, name: string) => {
    setSelectedMemberId(id);
    setSelectedMemberName(name);
    setViewModalOpen(true);
  }, []);

  const handleEditMember = useCallback((id: string) => {
    setSelectedMemberId(id);
    setEditModalOpen(true);
  }, []);

  const handleDeleteMember = useCallback((id: string, name: string) => {
    setSelectedMemberId(id);
    setSelectedMemberName(name);
    setDeleteModalOpen(true);
  }, []);

  // Handlers para atualização otimista
  const handleCreateSuccess = useCallback((memberData: any) => {
    // Adicionar otimisticamente
    addMemberOptimistic(memberData);
    setCreateModalOpen(false);
  }, [addMemberOptimistic]);

  const handleEditSuccess = useCallback((memberData: any) => {
    // Atualizar otimisticamente
    updateMemberOptimistic(memberData.id, memberData);
    setEditModalOpen(false);
    
    // Disparar evento para recarregar a lista
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('memberUpdated'));
    }, 100);
  }, [updateMemberOptimistic]);

  const handleDeleteSuccess = useCallback((memberId: string) => {
    // Remover otimisticamente
    removeMemberOptimistic(memberId);
    setDeleteModalOpen(false);
  }, [removeMemberOptimistic]);

  // Mostrar loading durante inicialização
  if (isInitializing) {
    const roleIdFromUrl = searchParams.get('role_id');
    const congregationIdFromUrl = searchParams.get('congregation_id');
    const statusFromUrl = searchParams.get('status');
    const hasUrlFilters = roleIdFromUrl || congregationIdFromUrl || statusFromUrl;
    
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg font-medium text-gray-900 mb-2">Carregando membros...</p>
        <p className="text-sm text-gray-500">
          {hasUrlFilters ? 'Aplicando filtros da URL' : 'Buscando informações'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Membros</h1>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2"
        >
          <Plus size={18} />
          Adicionar Membro
        </Button>
      </div>
      <MemberSearchInput value={filters.search} onChange={handleSearchChange} isLoading={false} />
      <MemberFiltersBar
        filters={filters}
        onChange={handleFilterChange}
        onShowAdvanced={handleShowAdvanced}
        showAdvanced={showAdvanced}
        sorting={sorting}
        onSortingChange={handleSortingChange}
      />
      {showAdvanced && (
        <MemberFiltersAdvanced filters={filters} onChange={handleFilterChange} />
      )}
      <ActiveFiltersChips
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAllFilters}
        sorting={sorting}
        onRemoveSorting={() => setSorting(initialSorting)}
      />
      <MemberList 
        onTotalChange={setTotal} 
        filters={filters} 
        sorting={sorting}
        onView={handleViewMember}
        onEdit={handleEditMember}
        onDelete={handleDeleteMember}
        viewMode={viewMode}
        isViewModeLoaded={isLoaded}
        viewModeSelector={
          <div className="flex items-center justify-between mb-2">
            {typeof total === 'number' && (
              <div className="text-gray-500 text-sm">{total} membros encontrados</div>
            )}
            <ViewModeSelector mode={viewMode} onModeChange={setViewMode} />
          </div>
        }
      />

      {/* Modais */}
      <CreateMemberModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <ViewMemberModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        memberId={selectedMemberId}
        onEdit={() => {
          setViewModalOpen(false);
          setEditModalOpen(true);
        }}
        onDelete={() => {
          setViewModalOpen(false);
          setDeleteModalOpen(true);
        }}
      />

      <EditMemberModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        memberId={selectedMemberId}
        onSuccess={handleEditSuccess}
      />

      <DeleteMemberModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        memberId={selectedMemberId}
        memberName={selectedMemberName}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}

export default function MembersPage() {
  return (
    <MembersProvider>
      <MembersPageContent />
    </MembersProvider>
  );
} 