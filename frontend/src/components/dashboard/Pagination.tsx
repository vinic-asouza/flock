'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Gera um range de páginas para exibir (máximo 5)
  const getPages = () => {
    const pages = [];
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, page + 2);
    if (end - start < 4) {
      if (start === 1) end = Math.min(totalPages, start + 4);
      if (end === totalPages) start = Math.max(1, end - 4);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <nav className="flex justify-center mt-6">
      <ul className="inline-flex items-center gap-1">
        <li>
          <button
            className="px-3 py-1 rounded-md border text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            aria-label="Página anterior"
          >
            <ChevronLeft size={18} />
          </button>
        </li>
        {getPages().map((p) => (
          <li key={p}>
            <button
              className={`px-3 py-1 rounded-md border text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-primary text-white border-primary'
                  : 'text-gray-700 hover:bg-gray-100 border-gray-200'
              }`}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          </li>
        ))}
        <li>
          <button
            className="px-3 py-1 rounded-md border text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            aria-label="Próxima página"
          >
            <ChevronRight size={18} />
          </button>
        </li>
      </ul>
    </nav>
  );
} 