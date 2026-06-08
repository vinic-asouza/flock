'use client';

import { ArrowLeft, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import {
  getAdjacentTrailGuide,
  getGuideBySlug,
} from '@/lib/tutorials/registry';
import { getModuleLabel } from '@/lib/tutorials/modules';
import type { TutorialGuide } from '@/lib/tutorials/types';
import { GuideDetailsAccordion } from './GuideDetailsAccordion';
import { GuideStepList } from './GuideStepList';
import { RelatedGuides } from './RelatedGuides';
import { RoleBadge } from './RoleBadge';

interface TutorialGuideViewProps {
  guide: TutorialGuide;
  onOpenGuide: (slug: string) => void;
  onBack: () => void;
}

export function TutorialGuideView({
  guide,
  onOpenGuide,
  onBack,
}: TutorialGuideViewProps) {
  const router = useRouter();
  const { canEdit } = useAuth();
  const moduleLabel = getModuleLabel(guide.module);
  const showReaderWarning = guide.role === 'editor' && canEdit === false;

  const prevTrail = getAdjacentTrailGuide(guide, 'prev');
  const nextTrail = getAdjacentTrailGuide(guide, 'next');

  return (
    <div className="space-y-6 max-w-3xl">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar aos tutoriais
      </button>

      <div className="space-y-2">
        <p className="text-sm text-gray-500">
          {moduleLabel} · {guide.title}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <RoleBadge role={guide.role} />
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Clock size={14} />
            ~{guide.estimatedMinutes} min
          </span>
        </div>
      </div>

      {showReaderWarning && (
        <Alert
          variant="warning"
          message="Seu perfil é somente leitura. Você pode acompanhar os passos, mas botões de cadastro aparecerão desabilitados nas telas do sistema."
        />
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <GuideStepList steps={guide.steps} />

        <Button
          onClick={() => router.push(guide.route)}
          className="w-full sm:w-auto"
        >
          Ir para {moduleLabel} →
        </Button>

        {guide.details && guide.details.length > 0 && (
          <GuideDetailsAccordion details={guide.details} />
        )}
      </div>

      {guide.trailOrder != null && (prevTrail || nextTrail) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {prevTrail && (
            <Button
              variant="secondary"
              onClick={() => onOpenGuide(prevTrail.slug)}
              className="flex-1"
            >
              ← Passo anterior
            </Button>
          )}
          {nextTrail && (
            <Button
              onClick={() => onOpenGuide(nextTrail.slug)}
              className="flex-1"
            >
              Próximo passo →
            </Button>
          )}
        </div>
      )}

      <RelatedGuides guide={guide} onOpenGuide={onOpenGuide} />
    </div>
  );
}

interface TutorialGuideNotFoundProps {
  slug: string;
  onBack: () => void;
}

export function TutorialGuideNotFound({ slug, onBack }: TutorialGuideNotFoundProps) {
  const guideExists = getGuideBySlug(slug);

  return (
    <div className="space-y-6 max-w-lg">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar aos tutoriais
      </button>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center space-y-4">
        <p className="text-gray-900 font-medium">
          {guideExists ? 'Erro ao carregar tutorial' : 'Tutorial não encontrado'}
        </p>
        <p className="text-sm text-gray-500">
          {guideExists
            ? 'Não foi possível exibir este tutorial.'
            : `Não existe um tutorial com o identificador "${slug}".`}
        </p>
        <Button variant="secondary" onClick={onBack}>
          Voltar aos tutoriais
        </Button>
      </div>
    </div>
  );
}
