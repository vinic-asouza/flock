'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/context/AuthContext';
import apiService from '@/services/api';
import type { ChurchUserListItem, ChurchUserRole } from '@/types';
import toast from 'react-hot-toast';
import { UserPlus, Mail, Shield, Loader2, Trash2 } from 'lucide-react';

const ROLE_OPTIONS: { value: ChurchUserRole; label: string }[] = [
  { value: 'reader', label: 'Leitor' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Administrador' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo' },
  { value: 'disabled', label: 'Desativado' },
];

export function ChurchUsersManagement() {
  const { currentRole } = useAuth();
  const [list, setList] = useState<ChurchUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ChurchUserRole>('reader');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<ChurchUserRole>('reader');
  const [editStatus, setEditStatus] = useState('active');

  const canManage = currentRole === 'admin' || currentRole === 'owner';

  const fetchList = async () => {
    try {
      setLoading(true);
      const { data } = await apiService.listChurchUsers();
      setList(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar usuários';
      toast.error(msg);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) fetchList();
  }, [canManage]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error('Informe o email');
      return;
    }
    try {
      setAdding(true);
      await apiService.createChurchUser({ email: trimmed, role });
      toast.success('Usuário adicionado. Um email informativo foi enviado.');
      setEmail('');
      setRole('reader');
      fetchList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao adicionar usuário';
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (item: ChurchUserListItem) => {
    if (item.role === 'owner') return;
    try {
      setEditingId(item.id);
      await apiService.updateChurchUser(item.id, { role: editRole, status: editStatus });
      toast.success('Usuário atualizado');
      setEditingId(null);
      fetchList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar';
      toast.error(msg);
    } finally {
      setEditingId(null);
    }
  };

  const handleRemove = async (item: ChurchUserListItem) => {
    if (item.role === 'owner') return;
    if (!confirm(`Remover ${item.email ?? 'este usuário'} da igreja?`)) return;
    try {
      await apiService.deleteChurchUser(item.id);
      toast.success('Usuário removido');
      fetchList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover';
      toast.error(msg);
    }
  };

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
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus size={20} />
          Adicionar usuário
        </h3>
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              disabled={adding}
            />
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
            <Select
              value={role}
              onChange={(value) => setRole(value as ChurchUserRole)}
              options={ROLE_OPTIONS}
              disabled={adding}
            />
          </div>
          <Button type="submit" disabled={adding}>
            {adding ? <Loader2 size={18} className="animate-spin" /> : 'Adicionar'}
          </Button>
        </form>
        <p className="text-sm text-gray-500 mt-2">
          O usuário receberá um email informando que foi adicionado. Se não tiver conta, poderá definir a senha pela opção &quot;Esqueci minha senha&quot; no login.
        </p>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield size={20} />
          Usuários da igreja
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Papel</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 w-28">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4 flex items-center gap-2">
                      <Mail size={14} className="text-gray-400" />
                      {item.email ?? item.user_id}
                    </td>
                    <td className="py-3 pr-4">{item.roleLabel}</td>
                    <td className="py-3 pr-4">
                      {editingId === item.id ? (
                        <Select
                          value={editStatus}
                          onChange={(value) => setEditStatus(value)}
                          options={STATUS_OPTIONS}
                          className="max-w-[140px]"
                        />
                      ) : (
                        item.status
                      )}
                    </td>
                    <td className="py-3">
                      {item.role === 'owner' ? (
                        <span className="text-gray-400 text-xs">Dono</span>
                      ) : editingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={editRole}
                            onChange={(value) => setEditRole(value as ChurchUserRole)}
                            options={ROLE_OPTIONS}
                            className="max-w-[130px]"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleUpdate(item)}
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditRole(item.role);
                              setEditStatus(item.status);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleRemove(item)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && (
              <p className="text-gray-500 py-6 text-center">Nenhum usuário além de você.</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
