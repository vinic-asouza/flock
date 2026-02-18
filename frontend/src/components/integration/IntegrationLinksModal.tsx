'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Loader, 
  Plus, 
  Copy, 
  Trash2, 
  Edit, 
  Link as LinkIcon, 
  Calendar,
  Users,
  CheckCircle,
  PowerOff,
  Power,
  AlertTriangle
} from 'lucide-react';
import apiService from '@/services/api';

interface IntegrationLink {
  id: string;
  token: string;
  url: string;
  expires_at: string;
  max_uses?: number | null;
  current_uses: number;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  is_expired: boolean;
  remaining_uses?: number | null;
  is_limit_reached: boolean;
}

interface IntegrationLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntegrationLinksModal({ isOpen, onClose }: IntegrationLinksModalProps) {
  const [links, setLinks] = useState<IntegrationLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLink, setEditingLink] = useState<IntegrationLink | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form state
  const [expiresAt, setExpiresAt] = useState('');
  const [maxUses, setMaxUses] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLinks();
    }
  }, [isOpen]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.listIntegrationLinks();
      setLinks(response.data || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar links';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setShowCreateForm(true);
    setEditingLink(null);
    resetForm();
  };

  const handleEdit = (link: IntegrationLink) => {
    setEditingLink(link);
    setShowCreateForm(true);
    setExpiresAt(new Date(link.expires_at).toISOString().slice(0, 16));
    setMaxUses(link.max_uses?.toString() || '');
    setNotes(link.notes || '');
  };

  const resetForm = () => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30); // 30 dias por padrão
    setExpiresAt(defaultDate.toISOString().slice(0, 16));
    setMaxUses('');
    setNotes('Link para cadastro de novos integrantes.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError(null);

      const data = {
        expires_at: new Date(expiresAt).toISOString(),
        max_uses: maxUses ? parseInt(maxUses) : null,
        notes: notes || null,
      };

      if (editingLink) {
        await apiService.updateIntegrationLink(editingLink.id, data);
      } else {
        await apiService.createIntegrationLink(data);
      }

      await loadLinks();
      setShowCreateForm(false);
      resetForm();
      setEditingLink(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar link';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await apiService.deactivateIntegrationLink(id);
      await loadLinks();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao desativar link';
      setError(errorMessage);
    }
  };

  const handleDeleteClick = (id: string) => {
    setLinkToDelete(id);
  };

  const handleDeleteCancel = () => {
    setLinkToDelete(null);
    setError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!linkToDelete) return;

    try {
      setIsDeleting(true);
      setError(null);
      await apiService.deleteIntegrationLink(linkToDelete);
      await loadLinks();
      setLinkToDelete(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir link';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await apiService.updateIntegrationLink(id, { is_active: true });
      await loadLinks();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao reativar link';
      setError(errorMessage);
    }
  };

  const handleCopyLink = async (url: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(linkId);
      setTimeout(() => {
        setCopiedLinkId(null);
      }, 2000);
    } catch {
      // Erro já tratado pelo toast
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleClose = () => {
    setShowCreateForm(false);
    setEditingLink(null);
    resetForm();
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Gerenciar Links de Integração Pública"
      size="xl"
      closeOnOverlayClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <div className="flex flex-col min-h-[70vh] p-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-6 -mx-6 -mt-6">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        {!showCreateForm ? (
          <>
            {links.length > 0 && (
              <div className="flex justify-between items-center mb-6 gap-4">
                <p className="text-sm text-gray-600 flex-1">
                  Crie links e compartilhe com a igreja para que pessoas possam se cadastrar no processo de integração utilizando o autocadastro.
                </p>
                <Button onClick={handleCreate} className="inline-flex items-center gap-2 flex-shrink-0 whitespace-nowrap">
                  <Plus size={18} />
                  Novo Link
                </Button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin text-primary" size={32} />
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-12">
                <LinkIcon className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 mb-4">Nenhum link de integração criado ainda.</p>
                <Button onClick={handleCreate}>Criar Primeiro Link</Button>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className={`p-4 border rounded-lg ${
                      !link.is_active || link.is_expired || link.is_limit_reached
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <LinkIcon size={18} className="text-gray-500" />
                          <h3 className="font-medium text-gray-900">
                            {link.notes || `Link criado em ${formatDate(link.created_at)}`}
                          </h3>
                          {!link.is_active && (
                            <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                              Desativado
                            </span>
                          )}
                          {link.is_expired && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                              Expirado
                            </span>
                          )}
                          {link.is_limit_reached && (
                            <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                              Limite Atingido
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>Expira em: {formatDate(link.expires_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users size={14} />
                            <span>
                              {link.current_uses} {link.max_uses ? `de ${link.max_uses}` : ''} usos
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <input
                            type="text"
                            value={link.url}
                            readOnly
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50"
                          />
                          {link.is_active && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleCopyLink(link.url, link.id)}
                              className="inline-flex items-center gap-1"
                            >
                              {copiedLinkId === link.id ? (
                                <>
                                  <CheckCircle size={14} />
                                  Link Copiado!
                                </>
                              ) : (
                                <>
                                  <Copy size={14} />
                                  Copiar
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEdit(link)}
                          disabled={loading}
                          className="inline-flex items-center gap-1"
                        >
                          <Edit size={16} />
                          Editar
                        </Button>
                        {link.is_active ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDeactivate(link.id)}
                            disabled={loading}
                            className="inline-flex items-center gap-1"
                            title="Desativar link"
                          >
                            <PowerOff size={16} />
                            Desativar
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleReactivate(link.id)}
                              disabled={loading}
                              className="inline-flex items-center gap-1"
                              title="Reativar link"
                            >
                              <Power size={16} />
                              Reativar
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDeleteClick(link.id)}
                              disabled={loading}
                              className="inline-flex items-center gap-1"
                              title="Excluir permanentemente"
                            >
                              <Trash2 size={16} />
                              Excluir
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">
              {editingLink ? 'Editar Link' : 'Criar Novo Link'}
            </h3>

            <Input
              label="Data de Expiração *"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              required
            />

            <Input
              label="Número Máximo de Usos (deixe vazio para ilimitado)"
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              min="1"
              placeholder="Ex: 100"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingLink(null);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {editingLink ? 'Salvar Alterações' : 'Criar Link'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Modal de confirmação de exclusão */}
      <Modal
        isOpen={linkToDelete !== null}
        onClose={handleDeleteCancel}
        title="Confirmar Exclusão"
        size="sm"
        closeOnOverlayClick={!isDeleting}
        closeOnEscape={!isDeleting}
      >
        <div className="flex flex-col">
          <div className="p-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-6">
                <p className="text-sm font-medium text-red-600">{error}</p>
              </div>
            )}

            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Excluir Link Permanentemente
              </h3>
              
              <p className="text-sm text-gray-500 mb-6">
                Tem certeza que deseja excluir permanentemente este link? 
                Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>

          <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-6">
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteConfirm}
                isLoading={isDeleting}
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}

