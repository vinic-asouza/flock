'use client';

import { Construction } from 'lucide-react';

export default function TutorialsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tutoriais</h1>
        <p className="mt-2 text-sm text-gray-500">
          Aprenda a usar todas as funcionalidades do Flock App através de nossos tutoriais passo a passo.
        </p>
      </div>

      {/* Conteúdo principal */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Construction size={48} className="text-gray-400" />
          <p className="text-gray-500 text-lg">Em desenvolvimento...</p>
        </div>
      </div>
    </div>
  );
}
