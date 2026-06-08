'use client';

import { Search } from 'lucide-react';

interface TutorialSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function TutorialSearch({ value, onChange }: TutorialSearchProps) {
  return (
    <div className="relative max-w-xl">
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar tutoriais (ex.: cadastrar membro, csv, calendário)"
        aria-label="Buscar tutoriais"
        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
    </div>
  );
}
