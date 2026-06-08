'use client';

import { Suspense } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { TutorialsPageContent } from '@/components/tutorials/TutorialsPageContent';

export default function TutorialsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader
            title="Tutoriais"
            subtitle="Carregando..."
          />
        </div>
      }
    >
      <TutorialsPageContent />
    </Suspense>
  );
}
