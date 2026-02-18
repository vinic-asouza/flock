'use client';

import { MemberList } from '@/components/members/MemberList';
import { MemberSearchInput } from '@/components/members/MemberSearchInput';
import { ViewModeSelector } from '@/components/members/ViewModeSelector';
import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MemberFiltersBar } from '@/components/members/MemberFiltersBar';
import { MemberFiltersAdvanced } from '@/components/members/MemberFiltersAdvanced';
import { ActiveFiltersChips } from '@/components/members/ActiveFiltersChips';
import { CreateMemberModal } from '@/components/members/CreateMemberModal';
import { ViewMemberModal } from '@/components/members/ViewMemberModal';
import { EditMemberModal } from '@/components/members/EditMemberModal';
import { DeleteMemberModal } from '@/components/members/DeleteMemberModal';
import { ConfirmDeactivateModal } from '@/components/members/ConfirmDeactivateModal';
import { ConfirmReactivateModal } from '@/components/members/ConfirmReactivateModal';
import { ExportMembersModal } from '@/components/members/ExportMembersModal';
import { ExportMembersCSVModal } from '@/components/members/ExportMembersCSVModal';
import { MemberImportModal } from '@/components/members/MemberImportModal';
import { MembersSkeleton } from '@/components/members/MembersSkeleton';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Plus, Upload, Link as LinkIcon } from 'lucide-react';
import { RegistrationLinksModal } from '@/components/members/RegistrationLinksModal';
import { MembersProvider, useMembers } from '@/context/MembersContext';
import { useViewMode } from '@/hooks/useViewMode';
import { apiService } from '@/services/api';
import { Member } from '@/types';
import toast from 'react-hot-toast';

export type MemberFilters = {
  search: string;
  status: 'all' | 'active' | 'inactive';
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
  sort_by: 'created_at',
  sort_order: 'desc' as 'asc' | 'desc'
};

function MembersPageContent() {
  const searchParams = useSearchParams();
  // const [total, setTotal] = useState<number | null>(null);
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
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [reactivateModalOpen, setReactivateModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportCSVModalOpen, setExportCSVModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [registrationLinksModalOpen, setRegistrationLinksModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedMemberName, setSelectedMemberName] = useState<string>('');
  const [memberLimit, setMemberLimit] = useState<{
    currentCount: number;
    limit: number;
    canAdd: boolean;
  } | null>(null);

  const { loadMembers, addMemberOptimistic, updateMemberOptimistic, removeMemberOptimistic } = useMembers();

  // Função para atualizar o limite de membros
  const updateMemberLimit = useCallback(async () => {
    try {
      const limitData = await apiService.getMemberLimit();
      setMemberLimit({
        currentCount: limitData.currentCount,
        limit: limitData.limit,
        canAdd: limitData.canAdd,
      });
    } catch {
      // Em caso de erro, não definir memberLimit para evitar mostrar botões incorretamente
      // O estado permanece como estava (null ou último valor válido)
      // Silenciar erro - não crítico, apenas para controle de UI
    }
  }, []);

  // Carregar informações do limite de membros
  useEffect(() => {
    updateMemberLimit();
  }, [updateMemberLimit]);

  // Atualizar limite quando membros forem atualizados
  useEffect(() => {
    const handleMemberUpdate = () => {
      updateMemberLimit();
    };

    window.addEventListener('memberUpdated', handleMemberUpdate);
    return () => {
      window.removeEventListener('memberUpdated', handleMemberUpdate);
    };
  }, [updateMemberLimit]);

  // Aplicar filtros da URL se presentes e carregar membros
  useEffect(() => {
    let isMounted = true;
    
    const initializePage = async () => {
      if (!isMounted) return;
      
      setIsInitializing(true);
      
      const congregationIdFromUrl = searchParams.get('congregation_id');
      const statusFromUrl = searchParams.get('status');
      
      const filtersToUse = { ...initialFilters };
      
      if (congregationIdFromUrl || statusFromUrl) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // const handleDeleteMember = useCallback((id: string, name: string) => {
  //   setSelectedMemberId(id);
  //   setSelectedMemberName(name);
  //   setDeleteModalOpen(true);
  // }, []);

  const handleDeactivateMember = useCallback((id: string, name: string) => {
    setSelectedMemberId(id);
    setSelectedMemberName(name);
    setDeactivateModalOpen(true);
  }, []);

  const handleConfirmDeactivate = useCallback(async () => {
    if (!selectedMemberId || !selectedMemberName) return;

    try {
      // Buscar dados atuais do membro
      const currentMember = await apiService.getMember(selectedMemberId);
      
      // Preparar dados para atualização (mantendo todos os campos obrigatórios)
      const updateData = {
        name: currentMember.name,
        birth: currentMember.birth,
        gender: currentMember.gender,
        marital_status: currentMember.marital_status,
        nationality: currentMember.nationality || null,
        document: currentMember.document || null,
        spouse: currentMember.spouse || null,
        address: currentMember.address || null,
        complement: currentMember.complement || null,
        cep: currentMember.cep || null,
        neighborhood: currentMember.neighborhood || null,
        city: currentMember.city || null,
        state: currentMember.state || null,
        phone: currentMember.phone || null,
        whatsapp: currentMember.whatsapp || null,
        email: currentMember.email || null,
        baptism_date: currentMember.baptism_date || null,
        occupation: currentMember.occupation || null,
        admission: currentMember.admission || null,
        admission_date: currentMember.admission_date || null,
        congregation_id: currentMember.congregation_id || null,
        active: false // Campo que queremos alterar
      };

      // Atualizar o membro
      await apiService.updateMember(selectedMemberId, updateData);

      // Atualizar otimisticamente na lista
      updateMemberOptimistic(selectedMemberId, { ...currentMember, active: false });
      
      // Disparar evento para recarregar a lista
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('memberUpdated'));
      }, 100);
      
    } catch (error) {
      throw error; // Re-throw para o modal lidar com o erro
    }
  }, [selectedMemberId, selectedMemberName, updateMemberOptimistic]);

  const handleReactivateMember = useCallback((id: string, name: string) => {
    setSelectedMemberId(id);
    setSelectedMemberName(name);
    setReactivateModalOpen(true);
  }, []);

  const handleConfirmReactivate = useCallback(async () => {
    if (!selectedMemberId || !selectedMemberName) return;

    try {
      // Buscar dados atuais do membro
      const currentMember = await apiService.getMember(selectedMemberId);
      
      // Preparar dados para atualização (mantendo todos os campos obrigatórios)
      const updateData = {
        name: currentMember.name,
        birth: currentMember.birth,
        gender: currentMember.gender,
        marital_status: currentMember.marital_status,
        nationality: currentMember.nationality || null,
        document: currentMember.document || null,
        spouse: currentMember.spouse || null,
        address: currentMember.address || null,
        complement: currentMember.complement || null,
        cep: currentMember.cep || null,
        neighborhood: currentMember.neighborhood || null,
        city: currentMember.city || null,
        state: currentMember.state || null,
        phone: currentMember.phone || null,
        whatsapp: currentMember.whatsapp || null,
        email: currentMember.email || null,
        baptism_date: currentMember.baptism_date || null,
        occupation: currentMember.occupation || null,
        admission: currentMember.admission || null,
        admission_date: currentMember.admission_date || null,
        congregation_id: currentMember.congregation_id || null,
        active: true // Campo que queremos alterar
      };

      // Atualizar o membro
      await apiService.updateMember(selectedMemberId, updateData);

      // Atualizar otimisticamente na lista
      updateMemberOptimistic(selectedMemberId, { ...currentMember, active: true });
      
      // Disparar evento para recarregar a lista
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('memberUpdated'));
      }, 100);
      
    } catch (error) {
      throw error; // Re-throw para o modal lidar com o erro
    }
  }, [selectedMemberId, selectedMemberName, updateMemberOptimistic]);

  // Handlers para atualização otimista
  const handleCreateSuccess = useCallback((memberData: { id: string; [key: string]: unknown }) => {
    // Adicionar otimisticamente
    // A API retorna um Member completo, então fazemos cast através de unknown
    addMemberOptimistic(memberData as unknown as Member);
    setCreateModalOpen(false);
    
    // Disparar evento para recarregar a lista e atualizar o limite de membros no Header
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('memberUpdated'));
    }, 100);
  }, [addMemberOptimistic]);

  const handleEditSuccess = useCallback((memberData: { id: string; [key: string]: unknown }) => {
    // Atualizar otimisticamente
    // A API retorna um Member completo, então fazemos cast através de unknown
    updateMemberOptimistic(memberData.id, memberData as unknown as Partial<Member>);
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

  // Handler para exportação
  const handleOpenExport = useCallback(() => {
    setExportModalOpen(true);
  }, []);

  const handleOpenExportCSV = useCallback(() => {
    setExportCSVModalOpen(true);
  }, []);

  const handleExportMembers = useCallback(async (selectedFields: string[]) => {
    try {
      // Construir parâmetros de filtro
      const params: Record<string, string | number | boolean | null | undefined> = {};
      
      // Adicionar filtros ativos
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.congregationId) params.congregation_id = filters.congregationId;
      if (filters.gender) params.gender = filters.gender;
      if (filters.maritalStatus) params.marital_status = filters.maritalStatus;
      if (filters.nationality) params.nationality = filters.nationality;
      if (filters.state) params.state = filters.state;
      if (filters.city) params.city = filters.city;
      if (filters.neighborhood) params.neighborhood = filters.neighborhood;
      if (filters.ageFrom) params.age_from = filters.ageFrom;
      if (filters.ageTo) params.age_to = filters.ageTo;
      if (filters.occupation) params.occupation = filters.occupation;
      if (filters.birthDateFrom) params.birth_date_from = filters.birthDateFrom;
      if (filters.birthDateTo) params.birth_date_to = filters.birthDateTo;
      if (filters.baptismDateFrom) params.baptism_date_from = filters.baptismDateFrom;
      if (filters.baptismDateTo) params.baptism_date_to = filters.baptismDateTo;
      if (filters.admissionDateFrom) params.admission_date_from = filters.admissionDateFrom;
      if (filters.admissionDateTo) params.admission_date_to = filters.admissionDateTo;
      
      // Adicionar ordenação
      if (sorting) {
        params.sort_by = sorting.sort_by;
        params.sort_order = sorting.sort_order;
      }

      // Chamar API para exportar
      const blob = await apiService.exportMembersList(params, selectedFields);
      
      // Criar URL para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `membros-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao exportar PDF. Tente novamente.';
      toast.error(errorMessage);
    }
  }, [filters, sorting]);

  const handleExportMembersCSV = useCallback(async (selectedFields: string[], delimiter: string, includeHeaders: boolean) => {
    try {
      // Construir parâmetros de filtro
      const params: Record<string, string | number | boolean | null | undefined> = {};
      
      // Adicionar filtros ativos
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.congregationId) params.congregation_id = filters.congregationId;
      if (filters.gender) params.gender = filters.gender;
      if (filters.maritalStatus) params.marital_status = filters.maritalStatus;
      if (filters.nationality) params.nationality = filters.nationality;
      if (filters.state) params.state = filters.state;
      if (filters.city) params.city = filters.city;
      if (filters.neighborhood) params.neighborhood = filters.neighborhood;
      if (filters.ageFrom) params.age_from = filters.ageFrom;
      if (filters.ageTo) params.age_to = filters.ageTo;
      if (filters.occupation) params.occupation = filters.occupation;
      if (filters.birthDateFrom) params.birth_date_from = filters.birthDateFrom;
      if (filters.birthDateTo) params.birth_date_to = filters.birthDateTo;
      if (filters.baptismDateFrom) params.baptism_date_from = filters.baptismDateFrom;
      if (filters.baptismDateTo) params.baptism_date_to = filters.baptismDateTo;
      if (filters.admissionDateFrom) params.admission_date_from = filters.admissionDateFrom;
      if (filters.admissionDateTo) params.admission_date_to = filters.admissionDateTo;
      
      // Adicionar ordenação
      if (sorting) {
        params.sort_by = sorting.sort_by;
        params.sort_order = sorting.sort_order;
      }

      // Chamar API para exportar CSV
      const blob = await apiService.exportMembersListCSV(params, selectedFields, delimiter, includeHeaders);
      
      // Criar URL para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `membros-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao exportar CSV. Tente novamente.';
      toast.error(errorMessage);
    }
  }, [filters, sorting]);

  // Mostrar loading durante inicialização
  if (isInitializing) {
    return <MembersSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Membros"
        subtitle="Visualize, cadastre e gerencie os membros da igreja."
        actions={
          <div className="flex items-center gap-3">
          {/* Mostrar botões apenas se:
              - Não houver limite definido (memberLimit === null) OU
              - Puder adicionar (canAdd === true) OU  
              - O limite for infinito (sem plano ou plano custom)
          */}
          {memberLimit === null || memberLimit.canAdd === true || memberLimit.limit === Infinity ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setRegistrationLinksModalOpen(true)}
                className="inline-flex items-center gap-2"
              >
                <LinkIcon size={18} />
                Links de Autocadastro
              </Button>
              <Button
                variant="secondary"
                onClick={() => setImportModalOpen(true)}
                className="inline-flex items-center gap-2"
              >
                <Upload size={18} />
                Importar CSV
              </Button>
              <Button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-2"
              >
                <Plus size={18} />
                Adicionar Membro
              </Button>
            </>
          ) : (
            <div className="text-sm text-gray-500 italic px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              Limite de membros atingido ({memberLimit.currentCount} de {memberLimit.limit})
            </div>
          )}
          </div>
        }
      />
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
        defaultSorting={initialSorting}
      />
      <MemberList 
        filters={filters} 
        sorting={sorting}
        onView={handleViewMember}
        onEdit={handleEditMember}
        onDeactivate={handleDeactivateMember}
        onReactivate={handleReactivateMember}
        onExport={handleOpenExport}
        onExportCSV={handleOpenExportCSV}
        viewMode={viewMode}
        isViewModeLoaded={isLoaded}
        viewModeSelector={<ViewModeSelector mode={viewMode} onModeChange={setViewMode} />}
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
          onDeactivate={() => {
            setViewModalOpen(false);
            setDeactivateModalOpen(true);
          }}
          onReactivate={() => {
            setViewModalOpen(false);
            setReactivateModalOpen(true);
          }}
          onDeletePermanently={() => {
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

      <ConfirmDeactivateModal
        isOpen={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        memberName={selectedMemberName}
        onConfirm={handleConfirmDeactivate}
      />

      <ConfirmReactivateModal
        isOpen={reactivateModalOpen}
        onClose={() => setReactivateModalOpen(false)}
        memberName={selectedMemberName}
        onConfirm={handleConfirmReactivate}
      />

      <ExportMembersModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExportMembers}
      />

      <ExportMembersCSVModal
        isOpen={exportCSVModalOpen}
        onClose={() => setExportCSVModalOpen(false)}
        onExport={handleExportMembersCSV}
      />

      <MemberImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          // Recarregar lista de membros após importação
          loadMembers(filters, sorting, 1);
          // Disparar evento para atualizar o limite de membros no Header
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('memberUpdated'));
          }, 100);
        }}
      />

      <RegistrationLinksModal
        isOpen={registrationLinksModalOpen}
        onClose={() => setRegistrationLinksModalOpen(false)}
      />
    </div>
  );
}

export default function MembersPage() {
  return (
    <MembersProvider>
      <Suspense fallback={<MembersSkeleton />}>
        <MembersPageContent />
      </Suspense>
    </MembersProvider>
  );
} 