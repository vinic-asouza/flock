'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Trash2, Upload } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import apiService, { formatApiError } from '@/services/api';
import type { TeachingClass, TeachingEnrollment, TeachingEnrollmentKind } from '@/types';
import { TeachingEmptyState } from './TeachingUi';

const HEX = /^#[0-9A-Fa-f]{6}$/;
const MAX_EXTRA = 2;
const MAX_SELECT = 50;
const ENROLLMENTS_PAGE_SIZE = 100;
const ACCEPT_IMAGES = 'image/png,image/jpeg,.png,.jpg,.jpeg';

function KindBadge({ kind }: { kind: TeachingEnrollmentKind }) {
  const styles =
    kind === 'member'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
      : kind === 'guest'
        ? 'bg-sky-50 text-sky-700 ring-sky-600/20'
        : 'bg-amber-50 text-amber-800 ring-amber-600/20';
  const label =
    kind === 'member' ? 'Membro' : kind === 'guest' ? 'Convidado' : 'Possível membro';
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles}`}
    >
      {label}
    </span>
  );
}

function enrollmentName(row: TeachingEnrollment): string {
  return (row.display_name || row.full_name || row.member?.name || 'Sem nome').trim();
}

type LogoSlot = {
  file: File | null;
  previewUrl: string | null;
};

function emptyLogo(): LogoSlot {
  return { file: null, previewUrl: null };
}

export function TeachingCertificatesTab({
  teachingClass,
  readOnly,
  onDirtyChange,
}: {
  teachingClass: TeachingClass;
  readOnly: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { user } = useAuth();
  const churchName = user?.name || 'Igreja';
  const programName = teachingClass.program?.name || 'Programa';
  const className = teachingClass.name;
  const isClosed = teachingClass.status === 'closed';

  const [loading, setLoading] = useState(false);
  const [eligible, setEligible] = useState<TeachingEnrollment[]>([]);
  const [queue, setQueue] = useState<TeachingEnrollment[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [primaryColor, setPrimaryColor] = useState('#1E3A5F');
  const [secondaryColor, setSecondaryColor] = useState('#94A3B8');
  const [churchLogo, setChurchLogo] = useState<LogoSlot>(emptyLogo);
  const [extraLogos, setExtraLogos] = useState<LogoSlot[]>([]);
  const [generating, setGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string | null>(null);
  const downloadUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const dirty =
      !readOnly &&
      isClosed &&
      (selected.size > 0 ||
        !!churchLogo.file ||
        extraLogos.length > 0 ||
        primaryColor !== '#1E3A5F' ||
        secondaryColor !== '#94A3B8');
    onDirtyChange?.(dirty);
  }, [
    readOnly,
    isClosed,
    selected,
    churchLogo.file,
    extraLogos.length,
    primaryColor,
    secondaryColor,
    onDirtyChange,
  ]);

  const revokeDownload = useCallback(() => {
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(downloadUrlRef.current);
      downloadUrlRef.current = null;
    }
    setDownloadUrl(null);
    setDownloadName(null);
  }, []);

  useEffect(() => {
    return () => {
      revokeDownload();
      if (churchLogo.previewUrl) URL.revokeObjectURL(churchLogo.previewUrl);
      extraLogos.forEach((slot) => {
        if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, []);

  const loadEnrollments = useCallback(async () => {
    if (!isClosed) return;
    setLoading(true);
    try {
      const first = await apiService.listTeachingEnrollments(teachingClass.id, {
        page: 1,
        limit: ENROLLMENTS_PAGE_SIZE,
      });
      const rows = [...((first.data || []) as TeachingEnrollment[])];
      let pagination = first.pagination;
      let page = 1;

      while (pagination?.hasNextPage && page < (pagination.totalPages || page)) {
        page += 1;
        const next = await apiService.listTeachingEnrollments(teachingClass.id, {
          page,
          limit: ENROLLMENTS_PAGE_SIZE,
        });
        rows.push(...((next.data || []) as TeachingEnrollment[]));
        pagination = next.pagination;
      }

      setEligible(rows);
      setQueue((first.queue || []) as TeachingEnrollment[]);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [isClosed, teachingClass.id]);

  useEffect(() => {
    void loadEnrollments();
  }, [loadEnrollments]);

  const filteredEligible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter((row) => enrollmentName(row).toLowerCase().includes(q));
  }, [eligible, search]);

  const colorsValid = HEX.test(primaryColor) && HEX.test(secondaryColor);
  const canGenerate =
    !readOnly &&
    isClosed &&
    !!churchLogo.file &&
    colorsValid &&
    selected.size > 0 &&
    selected.size <= MAX_SELECT &&
    !generating;

  const previewStudent =
    filteredEligible.find((row) => selected.has(row.id)) ||
    filteredEligible[0] ||
    null;

  function assignLogo(
    file: File | null,
    setter: (slot: LogoSlot) => void,
    previous?: LogoSlot
  ) {
    if (previous?.previewUrl) URL.revokeObjectURL(previous.previewUrl);
    if (!file) {
      setter(emptyLogo());
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Cada logo deve ter no máximo 2 MB');
      return;
    }
    if (!/^image\/(png|jpeg)$/i.test(file.type) && !/\.(png|jpe?g)$/i.test(file.name)) {
      toast.error('Use PNG ou JPEG');
      return;
    }
    setter({ file, previewUrl: URL.createObjectURL(file) });
  }

  function toggleId(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= MAX_SELECT) {
          toast.error(`Selecione no máximo ${MAX_SELECT} alunos`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  }

  function selectAllEligible() {
    const ids = filteredEligible.slice(0, MAX_SELECT).map((row) => row.id);
    setSelected(new Set(ids));
    if (filteredEligible.length > MAX_SELECT) {
      toast.error(`Limite de ${MAX_SELECT} alunos por emissão`);
    }
  }

  async function handleGenerate() {
    if (!canGenerate || !churchLogo.file) return;
    setGenerating(true);
    revokeDownload();
    try {
      const { blob, filename } = await apiService.exportTeachingCertificates(teachingClass.id, {
        enrollmentIds: [...selected],
        primaryColor,
        secondaryColor,
        churchLogo: churchLogo.file,
        extraLogos: extraLogos.map((s) => s.file).filter(Boolean) as File[],
      });
      const url = URL.createObjectURL(blob);
      downloadUrlRef.current = url;
      setDownloadUrl(url);
      setDownloadName(filename);
      toast.success('Certificados gerados');
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setGenerating(false);
    }
  }

  if (!isClosed) {
    return (
      <div className="space-y-4">
        <Alert
          variant="warning"
          message="Encerre a Turma para emitir certificados."
        />
        <TeachingEmptyState text="A emissão de certificados estará disponível após o encerramento da turma." />
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="space-y-4">
        <Alert
          variant="info"
          message="Não há certificados armazenados. A emissão é feita por editores no encerramento da turma."
        />
        <TeachingEmptyState text="Readers consultam esta aba, mas não configuram nem geram certificados." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert
        variant="info"
        message="Esta configuração vale só para esta emissão e não fica salva."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-medium text-gray-900">Configuração desta emissão</h3>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Logo da Igreja <span className="text-red-600">*</span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <Upload className="h-4 w-4" aria-hidden />
                Enviar imagem
                <input
                  type="file"
                  accept={ACCEPT_IMAGES}
                  className="sr-only"
                  onChange={(e) =>
                    assignLogo(e.target.files?.[0] || null, setChurchLogo, churchLogo)
                  }
                />
              </label>
              {churchLogo.file ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => assignLogo(null, setChurchLogo, churchLogo)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Remover
                </Button>
              ) : null}
            </div>
            {churchLogo.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={churchLogo.previewUrl}
                alt="Prévia do logo da igreja"
                className="h-16 w-auto object-contain"
              />
            ) : (
              <p className="text-xs text-gray-500">PNG ou JPEG, até 2 MB.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Logos adicionais (opcional, até {MAX_EXTRA})
            </label>
            <div className="flex flex-wrap gap-2">
              {extraLogos.map((slot, index) => (
                <div key={slot.previewUrl || index} className="relative">
                  {slot.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slot.previewUrl}
                      alt={`Logo adicional ${index + 1}`}
                      className="h-14 w-14 rounded object-contain ring-1 ring-gray-200"
                    />
                  ) : null}
                  <button
                    type="button"
                    className="absolute -right-1 -top-1 rounded-full bg-white p-1 text-gray-500 shadow ring-1 ring-gray-200"
                    aria-label={`Remover logo adicional ${index + 1}`}
                    onClick={() => {
                      setExtraLogos((prev) => {
                        const copy = [...prev];
                        const [removed] = copy.splice(index, 1);
                        if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
                        return copy;
                      });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {extraLogos.length < MAX_EXTRA ? (
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Upload className="h-4 w-4" aria-hidden />
                  Adicionar
                  <input
                    type="file"
                    accept={ACCEPT_IMAGES}
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        toast.error('Cada logo deve ter no máximo 2 MB');
                        return;
                      }
                      if (
                        !/^image\/(png|jpeg)$/i.test(file.type) &&
                        !/\.(png|jpe?g)$/i.test(file.name)
                      ) {
                        toast.error('Use PNG ou JPEG');
                        return;
                      }
                      setExtraLogos((prev) => [
                        ...prev,
                        { file, previewUrl: URL.createObjectURL(file) },
                      ]);
                      e.target.value = '';
                    }}
                  />
                </label>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="cert-primary">
                Cor primária
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="cert-primary"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                  className="h-11 w-12 cursor-pointer rounded border border-gray-200 bg-white p-1"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                  aria-label="Hex da cor primária"
                />
              </div>
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium text-gray-700"
                htmlFor="cert-secondary"
              >
                Cor secundária
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="cert-secondary"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value.toUpperCase())}
                  className="h-11 w-12 cursor-pointer rounded border border-gray-200 bg-white p-1"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value.toUpperCase())}
                  aria-label="Hex da cor secundária"
                />
              </div>
            </div>
          </div>

          {!colorsValid ? (
            <p className="text-sm text-red-600">Use cores no formato #RRGGBB.</p>
          ) : null}

          <p className="text-xs text-gray-500">
            O PDF incluirá: nome do aluno, turma, programa, igreja e data de emissão.
          </p>
        </section>

        <section
          className="rounded-xl border border-gray-200 bg-slate-50 p-4"
          aria-label="Prévia aproximada do certificado"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
            Prévia (aproximação)
          </p>
          <div
            className="relative aspect-[1.414/1] overflow-hidden rounded-lg bg-white shadow-sm"
            style={{ border: `3px solid ${HEX.test(primaryColor) ? primaryColor : '#1E3A5F'}` }}
          >
            <div
              className="absolute inset-x-3 top-3 h-1.5 rounded"
              style={{ background: HEX.test(primaryColor) ? primaryColor : '#1E3A5F' }}
            />
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              {churchLogo.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={churchLogo.previewUrl} alt="" className="h-10 w-auto object-contain" />
              ) : (
                <div className="h-10 w-24 rounded bg-slate-100" />
              )}
              <p
                className="text-sm font-semibold"
                style={{ color: HEX.test(primaryColor) ? primaryColor : '#1E3A5F' }}
              >
                CERTIFICADO
              </p>
              <p className="text-xs text-gray-500">Certificamos que</p>
              <p className="text-base font-semibold text-gray-900">
                {previewStudent ? enrollmentName(previewStudent) : 'Nome do aluno'}
              </p>
              <p className="text-xs text-gray-500">concluiu a turma</p>
              <p
                className="text-sm font-medium"
                style={{ color: HEX.test(primaryColor) ? primaryColor : '#1E3A5F' }}
              >
                {className}
              </p>
              <p className="text-[11px] text-gray-400">Programa: {programName}</p>
              <p className="mt-2 text-[11px] text-gray-600">{churchName}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-gray-900">
            Alunos elegíveis{' '}
            <span className="font-normal text-gray-500">({selected.size} selecionados)</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={selectAllEligible} disabled={loading}>
              Selecionar todos elegíveis
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              disabled={selected.size === 0}
            >
              Limpar
            </Button>
          </div>
        </div>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome"
          aria-label="Buscar alunos elegíveis"
        />

        {loading ? (
          <p className="text-sm text-gray-500">Carregando inscritos…</p>
        ) : filteredEligible.length === 0 ? (
          <TeachingEmptyState text="Não há membros ou convidados elegíveis nesta turma." />
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {filteredEligible.map((row) => {
              const checked = selected.has(row.id);
              return (
                <li key={row.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={checked}
                      onChange={() => toggleId(row.id)}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-900">
                      {enrollmentName(row)}
                    </span>
                    <KindBadge kind={row.kind} />
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {queue.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
            <p className="text-sm font-medium text-amber-900">Pendências</p>
            <p className="text-xs text-amber-800">
              Resolva na aba Inscritos para torná-los elegíveis.
            </p>
            <ul className="space-y-1">
              {queue.map((row) => (
                <li
                  key={row.id}
                  className="flex min-h-11 items-center justify-between gap-2 text-sm text-amber-950"
                >
                  <span className="truncate">{enrollmentName(row)}</span>
                  <KindBadge kind="possible_member" />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="primary"
          isLoading={generating}
          disabled={!canGenerate}
          aria-busy={generating}
          onClick={() => void handleGenerate()}
        >
          Gerar certificados
        </Button>
        {downloadUrl ? (
          <a
            href={downloadUrl}
            download={downloadName || 'certificados.pdf'}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Download className="h-4 w-4" aria-hidden />
            Baixar PDF
          </a>
        ) : null}
        {!churchLogo.file ? (
          <p className="text-sm text-gray-500">Envie o logo da Igreja para habilitar a geração.</p>
        ) : null}
      </div>
    </div>
  );
}
