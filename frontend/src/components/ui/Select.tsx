'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  isLoading?: boolean;
  className?: string;
  searchable?: boolean;
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecione uma opção',
  disabled = false,
  error,
  isLoading = false,
  className = '',
  searchable = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focar no input quando abrir o dropdown (se searchable)
  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const selectedOption = options.find(option => option.value === value);

  // Função para remover acentos
  const removeAccents = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  // Filtrar opções baseado no termo de busca (sem acentuação)
  const filteredOptions = searchable && searchTerm
    ? options.filter(option => {
        const optionLabel = removeAccents(option.label.toLowerCase());
        const searchTermClean = removeAccents(searchTerm.toLowerCase());
        return optionLabel.includes(searchTermClean);
      })
    : options;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (event.key === 'ArrowDown' && filteredOptions.length > 0) {
      event.preventDefault();
      // Focar no primeiro item da lista
      const firstOption = filteredOptions[0];
      if (firstOption) {
        onChange(firstOption.value);
        setIsOpen(false);
        setSearchTerm('');
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      <div ref={selectRef} className="relative">
        <button
          type="button"
          className={`
            flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm text-[#222] 
            placeholder-[#888] font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none 
            transition-all duration-200 cursor-pointer
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled || isLoading 
              ? 'opacity-50 cursor-not-allowed bg-gray-50' 
              : 'hover:shadow-sm'
            }
            ${isOpen 
              ? 'ring-2 ring-primary/20 border-primary shadow-sm' 
              : ''
            }
          `}
          onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={label}
        >
          <span className={`
            truncate text-left
            ${!selectedOption ? 'text-gray-500' : 'text-gray-900'}
          `}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          
          <ChevronDown 
            size={16} 
            className={`
              text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2
              ${isOpen ? 'rotate-180' : 'rotate-0'}
              ${disabled || isLoading ? 'text-gray-300' : 'text-gray-400'}
            `}
          />
        </button>

        {/* Dropdown */}
        {isOpen && !disabled && !isLoading && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
            {/* Campo de busca (se searchable) */}
            {searchable && (
              <div className="p-2 border-b border-gray-200">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Digite para buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
                />
              </div>
            )}
            
            <ul 
              role="listbox" 
              className="py-1 overflow-auto max-h-48"
              aria-label={`Opções para ${label}`}
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      className={`
                        w-full px-3 py-2 text-left text-sm cursor-pointer transition-colors
                        ${option.value === value
                          ? 'bg-primary text-white'
                          : 'text-gray-900 hover:bg-gray-100'
                        }
                        focus:outline-none focus:bg-gray-100
                      `}
                      onClick={() => handleSelect(option.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSelect(option.value);
                        }
                      }}
                      role="option"
                      aria-selected={option.value === value}
                    >
                      {option.label}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm text-gray-500 text-center">
                  Nenhuma opção encontrada
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
