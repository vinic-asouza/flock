'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import apiService, { formatApiError } from '@/services/api';
import type { ChurchUserListItem, ChurchUserRole } from '@/types';
import type { Congregation } from '@/types/congregation';
import { getCongregationDisplayName } from '@/utils/congregation';
import toast from 'react-hot-toast';
import { UserPlus, Shield, Loader2, Trash2 } from 'lucide-react';

const ROLE_OPTIONS: { value: ChurchUserRole; label: string }[] = [
  { value: 'reader', label: 'Leitor' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Administrador' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo' },
  { value: 'disabled', label: 'Desativado' },
];

const ADD_USER_FORM_ID = 'add-church-user-form';
const MODAL_FOOTER_CLASS =
  'flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:p-6';

function validateCongregationScope(
  userRole: ChurchUserRole,
  accessAll: boolean,
  ids: string[]
): string | null {
  if (userRole === 'admin') return null;
  if (accessAll || ids.length > 0) return null;
  return 'Selecione ao menos uma congregação ou marque "Todas as congregações"';
}

function formatUserScope(
  item: ChurchUserListItem,
  congregationMap: Map<string, Congregation>
): string {
  if (item.role === 'owner' || item.role === 'admin') return 'Todas';
  if (item.accessAllCongregations) return 'Todas';
  const ids = item.congregationIds ?? [];
  if (ids.length === 0) return '—';
  const names = ids
    .map((id) => getCongregationDisplayName(congregationMap.get(id)))
    .filter(Boolean);
  if (names.length <= 2) return names.join(', ');
  return `${names.length} congregações`;
}

function getRoleBadgeClass(role: string): string {
  if (role === 'admin') return 'bg-blue-100 text-blue-700';
  if (role === 'editor') return 'bg-emerald-100 text-emerald-700';
  if (role === 'reader') return 'bg-gray-100 text-gray-700';
  return 'bg-sky-100 text-sky-800';
}

function getStatusBadgeClass(status: string): string {
  return status === 'active'
    ? 'bg-green-50 text-green-700 border border-green-200'
    : 'bg-gray-50 text-gray-600 border border-gray-200';
}

function UserIdentity({
  item,
  layout,
}: {
  item: ChurchUserListItem;
  layout: 'card' | 'table';
}) {
  const isOwner = item.role === 'owner';
  const isCard = layout === 'card';
  const label = item.email ?? item.user_id;

  return (
    <div className={`flex min-w-0 gap-3 ${isCard ? 'items-start' : 'items-center'}`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
        {item.email?.[0]?.toUpperCase() ?? 'U'}
      </div>
      {isCard ? (
        <div className="min-w-0 flex-1">
          <p className="break-all text-sm font-medium text-gray-900">{label}</p>
          {isOwner && (
            <span className="mt-1 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
              Conta Principal
            </span>
          )}
        </div>
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-gray-900">{label}</span>
          {isOwner && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
              Conta Principal
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role, roleLabel }: { role: string; roleLabel: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadgeClass(role)}`}
    >
      {roleLabel}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(status)}`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
          status === 'active' ? 'bg-green-500' : 'bg-gray-400'
        }`}
      />
      {status === 'active' ? 'Ativo' : 'Desativado'}
    </span>
  );
}

function UserRowActions({
  item,
  onEdit,
  onDelete,
  layout,
}: {
  item: ChurchUserListItem;
  onEdit: (item: ChurchUserListItem) => void;
  onDelete: (item: ChurchUserListItem) => void;
  layout: 'card' | 'table';
}) {
  if (item.role === 'owner') {
    return (
      <span className="text-[11px] text-gray-400">Sem ações disponíveis</span>
    );
  }

  const isCard = layout === 'card';

  return (
    <div className={`flex items-center gap-2 ${isCard ? 'w-full' : 'justify-end'}`}>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onEdit(item)}
        className={isCard ? 'min-h-11 flex-1' : undefined}
      >
        Editar
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onDelete(item)}
        className={`text-red-600 hover:bg-red-50 ${isCard ? 'min-h-11 px-3' : ''}`}
        aria-label="Remover usuário"
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
}

type CongregationScopePickerProps = {
  accessAllCongregations: boolean;
  onAccessAllChange: (value: boolean) => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  congregations: Congregation[];
  loading: boolean;
  disabled?: boolean;
};

function CongregationScopePicker({
  accessAllCongregations,
  onAccessAllChange,
  selectedIds,
  onSelectedIdsChange,
  congregations,
  loading,
  disabled = false,
}: CongregationScopePickerProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Congregações</label>
      <label className="flex min-h-11 cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={accessAllCongregations}
          onChange={(e) => {
            onAccessAllChange(e.target.checked);
            if (e.target.checked) onSelectedIdsChange([]);
          }}
          disabled={disabled || loading}
          className="h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm text-gray-700">Todas as congregações</span>
      </label>
      {!accessAllCongregations && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              Carregando congregações...
            </div>
          ) : congregations.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma congregação cadastrada.</p>
          ) : (
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1">
              {congregations.map((cong) => {
                const isSelected = selectedIds.includes(cong.id);
                return (
                  <label
                    key={cong.id}
                    className={`flex min-h-11 items-center gap-2 rounded p-2 cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-gray-50'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        onSelectedIdsChange(
                          e.target.checked
                            ? [...selectedIds, cong.id]
                            : selectedIds.filter((id) => id !== cong.id)
                        );
                      }}
                      disabled={disabled}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded flex-shrink-0"
                    />
                    <span className="text-sm text-gray-900">
                      {getCongregationDisplayName(cong) || cong.name}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {selectedIds.length > 0 && (
            <p className="text-xs text-primary font-medium">
              {selectedIds.length}{' '}
              {selectedIds.length === 1 ? 'congregação selecionada' : 'congregações selecionadas'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ChurchUsersManagement() {
  const { currentRole } = useAuth();
  const [list, setList] = useState<ChurchUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [congregationsLoading, setCongregationsLoading] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ChurchUserRole>('reader');
  const [accessAllCongregations, setAccessAllCongregations] = useState(true);
  const [selectedCongregationIds, setSelectedCongregationIds] = useState<string[]>([]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ChurchUserListItem | null>(null);
  const [editRole, setEditRole] = useState<ChurchUserRole>('reader');
  const [editStatus, setEditStatus] = useState('active');
  const [editAccessAllCongregations, setEditAccessAllCongregations] = useState(true);
  const [editSelectedCongregationIds, setEditSelectedCongregationIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<ChurchUserListItem | null>(null);
  const [removing, setRemoving] = useState(false);

  const canManage = currentRole === 'admin' || currentRole === 'owner';

  const congregationMap = useMemo(() => {
    const map = new Map<string, Congregation>();
    for (const c of congregations) map.set(c.id, c);
    return map;
  }, [congregations]);

  const sortedList = useMemo(() => {
    const order: ChurchUserRole[] = ['owner', 'admin', 'editor', 'reader'];
    return [...list].sort((a, b) => {
      const aIdx = order.indexOf(a.role as ChurchUserRole);
      const bIdx = order.indexOf(b.role as ChurchUserRole);
      return aIdx - bIdx;
    });
  }, [list]);

  const resetAddScope = () => {
    setAccessAllCongregations(true);
    setSelectedCongregationIds([]);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setEmail('');
    setRole('reader');
    resetAddScope();
  };

  const fetchCongregations = async () => {
    try {
      setCongregationsLoading(true);
      const data = await apiService.listCongregations();
      setCongregations(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      toast.error(formatApiError(err));
      setCongregations([]);
    } finally {
      setCongregationsLoading(false);
    }
  };

  const fetchList = async () => {
    try {
      setLoading(true);
      const { data } = await apiService.listChurchUsers();
      setList(data);
    } catch (err: unknown) {
      toast.error(formatApiError(err));
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) {
      fetchList();
      fetchCongregations();
    }
  }, [canManage]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error('Informe o email');
      return;
    }
    const scopeError = validateCongregationScope(role, accessAllCongregations, selectedCongregationIds);
    if (scopeError) {
      toast.error(scopeError);
      return;
    }
    try {
      setAdding(true);
      await apiService.createChurchUser({
        email: trimmed,
        role,
        accessAllCongregations: role === 'admin' ? true : accessAllCongregations,
        congregationIds:
          role === 'admin' || accessAllCongregations ? [] : selectedCongregationIds,
      });
      toast.success('Usuário adicionado. Um email informativo foi enviado.');
      closeAddModal();
      fetchList();
    } catch (err: unknown) {
      toast.error(formatApiError(err));
    } finally {
      setAdding(false);
    }
  };

  const openEditModal = (item: ChurchUserListItem) => {
    if (item.role === 'owner') return;
    setEditingUser(item);
    setEditRole(item.role as ChurchUserRole);
    setEditStatus(item.status);
    setEditAccessAllCongregations(item.accessAllCongregations ?? true);
    setEditSelectedCongregationIds(item.congregationIds ?? []);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingUser || editingUser.role === 'owner') return;
    const needsScope = editRole === 'reader' || editRole === 'editor';
    if (needsScope) {
      const scopeError = validateCongregationScope(
        editRole,
        editAccessAllCongregations,
        editSelectedCongregationIds
      );
      if (scopeError) {
        toast.error(scopeError);
        return;
      }
    }
    try {
      setSavingEdit(true);
      const payload: {
        role: ChurchUserRole;
        status: string;
        accessAllCongregations?: boolean;
        congregationIds?: string[];
      } = { role: editRole, status: editStatus };
      if (needsScope) {
        payload.accessAllCongregations = editAccessAllCongregations;
        payload.congregationIds = editAccessAllCongregations ? [] : editSelectedCongregationIds;
      }
      await apiService.updateChurchUser(editingUser.id, payload);
      toast.success('Usuário atualizado');
      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchList();
    } catch (err: unknown) {
      toast.error(formatApiError(err));
    } finally {
      setSavingEdit(false);
    }
  };

  const openDeleteModal = (item: ChurchUserListItem) => {
    if (item.role === 'owner') return;
    setDeletingUser(item);
    setIsDeleteModalOpen(true);
  };

  const handleRemove = async () => {
    if (!deletingUser || deletingUser.role === 'owner') return;
    try {
      setRemoving(true);
      await apiService.deleteChurchUser(deletingUser.id);
      toast.success('Usuário removido');
      setIsDeleteModalOpen(false);
      setDeletingUser(null);
      fetchList();
    } catch (err: unknown) {
      toast.error(formatApiError(err));
    } finally {
      setRemoving(false);
    }
  };

  const showAddScope = role === 'reader' || role === 'editor';
  const showEditScope = editRole === 'reader' || editRole === 'editor';

  if (!canManage) {
    return (
      <Card className="p-6">
        <p className="text-gray-600">
          Apenas administradores e o dono da igreja podem gerenciar usuários.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <UserPlus size={20} className="shrink-0" />
              Adicionar usuário
            </h3>
            <p className="text-sm text-gray-600">
              Convide outros usuários para acessar a sua igreja com níveis de permissão diferentes.
            </p>
            <p className="text-sm text-gray-600">
              O usuário convidado receberá um email informando o acesso. Se ainda não tiver conta, poderá definir a senha pela opção
              {' '}<span className="font-medium">&quot;Esqueci minha senha&quot;</span> na tela de login.
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                <span className="font-semibold">Leitor</span>: apenas visualiza dados e relatórios
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                <span className="font-semibold">Editor</span>: pode cadastrar, editar e excluir dados
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                <span className="font-semibold">Administrador</span>: tudo do editor + configurações e plano
              </span>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 md:w-auto"
          >
            <UserPlus size={18} />
            Novo usuário
          </Button>
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Shield size={20} className="shrink-0" />
          Usuários da igreja
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : sortedList.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            Nenhum usuário extra configurado ainda. Use o formulário acima para convidar alguém.
          </div>
        ) : (
          <>
            <ul className="space-y-3 md:hidden">
              {sortedList.map((item) => {
                const isOwner = item.role === 'owner';
                const scopeLabel = formatUserScope(item, congregationMap);
                return (
                  <li
                    key={item.id}
                    className={`rounded-lg border p-4 ${
                      isOwner ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <UserIdentity item={item} layout="card" />
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <RoleBadge role={item.role} roleLabel={item.roleLabel} />
                      <StatusBadge status={item.status} />
                      <span className="text-xs text-gray-600">Congregações: {scopeLabel}</span>
                    </div>
                    <div className="mt-3">
                      <UserRowActions
                        item={item}
                        onEdit={openEditModal}
                        onDelete={openDeleteModal}
                        layout="card"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-separate border-spacing-y-1 text-sm">
                <thead>
                  <tr className="text-gray-500">
                    <th className="py-1 pr-4 text-center text-xs font-semibold uppercase tracking-wide">Usuário</th>
                    <th className="py-1 pr-4 text-center text-xs font-semibold uppercase tracking-wide">Papel</th>
                    <th className="py-1 pr-4 text-center text-xs font-semibold uppercase tracking-wide">Congregações</th>
                    <th className="py-1 pr-4 text-center text-xs font-semibold uppercase tracking-wide">Status</th>
                    <th className="w-32 py-1 text-center text-xs font-semibold uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedList.map((item) => {
                    const isOwner = item.role === 'owner';
                    const scopeLabel = formatUserScope(item, congregationMap);
                    return (
                      <tr
                        key={item.id}
                        className={`${isOwner ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:border-primary/60'} rounded-lg border`}
                      >
                        <td className="px-4 py-2 align-middle">
                          <UserIdentity item={item} layout="table" />
                        </td>
                        <td className="px-4 py-2 text-center align-middle">
                          <RoleBadge role={item.role} roleLabel={item.roleLabel} />
                        </td>
                        <td className="px-4 py-2 text-center align-middle">
                          <span className="text-xs text-gray-600">{scopeLabel}</span>
                        </td>
                        <td className="px-4 py-2 text-center align-middle">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-2 text-right align-middle">
                          <UserRowActions
                            item={item}
                            onEdit={openEditModal}
                            onDelete={openDeleteModal}
                            layout="table"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          if (!adding) closeAddModal();
        }}
        title="Adicionar usuário"
        size="md"
        footer={
          <div className={MODAL_FOOTER_CLASS}>
            <Button
              type="button"
              variant="secondary"
              disabled={adding}
              onClick={closeAddModal}
              className="min-h-11 w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={ADD_USER_FORM_ID}
              disabled={adding}
              className="min-h-11 w-full sm:w-auto"
            >
              {adding ? <Loader2 size={18} className="animate-spin" /> : 'Adicionar usuário'}
            </Button>
          </div>
        }
      >
        <form id={ADD_USER_FORM_ID} onSubmit={handleAdd} className="space-y-4 p-4 sm:p-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              disabled={adding}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Papel</label>
            <Select
              value={role}
              onChange={(value) => {
                const newRole = value as ChurchUserRole;
                setRole(newRole);
                if (newRole === 'admin') resetAddScope();
              }}
              options={ROLE_OPTIONS}
              disabled={adding}
            />
          </div>
          {showAddScope && (
            <CongregationScopePicker
              accessAllCongregations={accessAllCongregations}
              onAccessAllChange={setAccessAllCongregations}
              selectedIds={selectedCongregationIds}
              onSelectedIdsChange={setSelectedCongregationIds}
              congregations={congregations}
              loading={congregationsLoading}
              disabled={adding}
            />
          )}
          <p className="text-xs text-gray-500">
            O convidado receberá um email informando o acesso. Se ainda não tiver conta, poderá definir a senha pela opção
            {' '}<span className="font-medium">&quot;Esqueci minha senha&quot;</span> na tela de login.
          </p>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          if (!savingEdit) {
            setIsEditModalOpen(false);
            setEditingUser(null);
          }
        }}
        title="Editar usuário"
        size="md"
        footer={
          <div className={MODAL_FOOTER_CLASS}>
            <Button
              type="button"
              variant="secondary"
              disabled={savingEdit}
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingUser(null);
              }}
              className="min-h-11 w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={savingEdit}
              onClick={handleUpdate}
              className="min-h-11 w-full sm:w-auto"
            >
              {savingEdit ? <Loader2 size={16} className="mr-1 animate-spin" /> : null}
              {savingEdit ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-4 sm:p-6">
          {editingUser && (
            <>
              <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {(editingUser.email ?? editingUser.user_id)?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="min-w-0 flex-col">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Usuário</p>
                  <p className="break-all text-sm font-medium text-gray-900">
                    {editingUser.email ?? editingUser.user_id}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Papel</label>
                  <Select
                    value={editRole}
                    onChange={(value) => {
                      const newRole = value as ChurchUserRole;
                      setEditRole(newRole);
                      if (newRole === 'admin') {
                        setEditAccessAllCongregations(true);
                        setEditSelectedCongregationIds([]);
                      }
                    }}
                    options={ROLE_OPTIONS}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <Select
                    value={editStatus}
                    onChange={(value) => setEditStatus(value)}
                    options={STATUS_OPTIONS}
                  />
                </div>
              </div>
              {showEditScope && (
                <CongregationScopePicker
                  accessAllCongregations={editAccessAllCongregations}
                  onAccessAllChange={setEditAccessAllCongregations}
                  selectedIds={editSelectedCongregationIds}
                  onSelectedIdsChange={setEditSelectedCongregationIds}
                  congregations={congregations}
                  loading={congregationsLoading}
                  disabled={savingEdit}
                />
              )}
            </>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!removing) {
            setIsDeleteModalOpen(false);
            setDeletingUser(null);
          }
        }}
        title="Remover usuário"
        size="sm"
        footer={
          <div className={MODAL_FOOTER_CLASS}>
            <Button
              type="button"
              variant="secondary"
              disabled={removing}
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingUser(null);
              }}
              className="min-h-11 w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={removing}
              onClick={handleRemove}
              className="min-h-11 w-full sm:w-auto"
            >
              {removing ? <Loader2 size={16} className="mr-1 animate-spin" /> : null}
              {removing ? 'Removendo...' : 'Remover usuário'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-4 sm:p-6">
          <p className="break-words text-sm text-gray-700">
            Tem certeza de que deseja remover{' '}
            <span className="font-medium">
              {deletingUser?.email ?? 'este usuário'}
            </span>{' '}
            da igreja? Esta ação não remove a conta do usuário no sistema, apenas o acesso a esta igreja.
          </p>
        </div>
      </Modal>
    </div>
  );
}
