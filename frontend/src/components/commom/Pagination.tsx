'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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
        {/* Botão para primeira página */}
        <li>
          <button
            className="px-3 py-1 rounded-md border text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            aria-label="Primeira página"
            title="Primeira página"
          >
            <ChevronsLeft size={18} />
          </button>
        </li>
        
        {/* Botão para página anterior */}
        <li>
          <button
            className="px-3 py-1 rounded-md border text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            aria-label="Página anterior"
            title="Página anterior"
          >
            <ChevronLeft size={18} />
          </button>
        </li>
        
        {/* Números das páginas */}
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
              title={`Página ${p}`}
            >
              {p}
            </button>
          </li>
        ))}
        
        {/* Botão para próxima página */}
        <li>
          <button
            className="px-3 py-1 rounded-md border text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            aria-label="Próxima página"
            title="Próxima página"
          >
            <ChevronRight size={18} />
          </button>
        </li>
        
        {/* Botão para última página */}
        <li>
          <button
            className="px-3 py-1 rounded-md border text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            aria-label="Última página"
            title="Última página"
          >
            <ChevronsRight size={18} />
          </button>
        </li>
      </ul>
    </nav>
  );
} 