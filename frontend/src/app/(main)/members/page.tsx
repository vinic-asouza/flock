'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { MemberList } from '@/components/members/MemberList';
import { MemberSearchInput } from '@/components/members/MemberSearchInput';
import { useState, useCallback } from 'react';
import { MemberFiltersBar } from '@/components/members/MemberFiltersBar';
import { MemberFiltersAdvanced } from '@/components/members/MemberFiltersAdvanced';
import { ActiveFiltersChips } from '@/components/members/ActiveFiltersChips';

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
  baptismDateFrom: '',
  baptismDateTo: '',
  admissionDateFrom: '',
  admissionDateTo: '',
};

const initialSorting = {
  sort_by: 'name',
  sort_order: 'asc' as 'asc' | 'desc'
};

export default function MembersPage() {
  const [total, setTotal] = useState<number | null>(null);
  const [filters, setFilters] = useState<MemberFilters>(initialFilters);
  const [sorting, setSorting] = useState<{ sort_by: string; sort_order: 'asc' | 'desc' }>(initialSorting);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Membros</h1>
        <Link
          href="/members/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md font-medium shadow-sm hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} />
          Adicionar Membro
        </Link>
      </div>
      <MemberSearchInput value={filters.search} onChange={handleSearchChange} />
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
      {typeof total === 'number' && (
        <div className="text-gray-500 text-sm mb-2">{total} membros encontrados</div>
      )}
      <MemberList onTotalChange={setTotal} filters={filters} sorting={sorting} />
    </div>
  );
} 