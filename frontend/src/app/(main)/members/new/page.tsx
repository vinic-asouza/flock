'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewMemberPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/members" className="text-primary hover:underline flex items-center gap-1">
          <ArrowLeft size={18} />
          Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Novo Membro</h1>
      </div>
      {/* Formulário de novo membro será implementado aqui */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-gray-400 text-center">
        Formulário de cadastro de membro será exibido aqui.
      </div>
    </div>
  );
} 