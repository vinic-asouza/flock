'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { removeAccents } from '@/utils';

interface SelectOption {
  value: string;
  label: string;
  count?: number;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  showCount?: boolean;
  searchable?: boolean;
  error?: string;
  helperText?: string;
  onSearchChange?: (term: string) => void;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Selecione uma opção",
  label,
  className = "",
  disabled = false,
  showCount = false,
  searchable = false,
  error,
  helperText,
  onSearchChange,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = searchable
    ? options.filter(option =>
        removeAccents(option.label.toLowerCase()).includes(removeAccents(searchTerm.toLowerCase()))
      )
    : options;

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const dropdownMaxHeight = 240;
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownMaxHeight && rect.top > spaceBelow;

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 60,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + gap, top: 'auto' }
        : { top: rect.bottom + gap, bottom: 'auto' }),
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleReposition = () => updatePosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updatePosition, filteredOptions.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideTrigger = selectRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideTrigger && !insideDropdown) {
        setIsOpen(false);
        setSearchTerm('');
        if (onSearchChange) onSearchChange('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onSearchChange]);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [filteredOptions]);

  const handleSearchUpdate = (term: string) => {
    setSearchTerm(term);
    onSearchChange?.(term);
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    onSearchChange?.('');
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        onSearchChange?.('');
        setFocusedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          handleOptionClick(filteredOptions[focusedIndex].value);
        }
        break;
    }
  };

  const selectedOption = options.find(option => option.value === value);

  const dropdown = isOpen && mounted ? createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden"
    >
      {searchable && (
        <div className="p-2 border-b border-gray-200">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => handleSearchUpdate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex(0);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsOpen(false);
                handleSearchUpdate('');
                setFocusedIndex(-1);
              }
            }}
            className="w-full px-2 py-1 text-[15px] text-[#222] border border-gray-200 rounded-md focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="max-h-48 overflow-y-auto">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionClick(option.value)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                value === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
              } ${
                focusedIndex === index ? 'bg-gray-100' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {value === option.value && (
                  <Check size={14} className="text-blue-600 flex-shrink-0" />
                )}
                <span className="truncate">{option.label}</span>
              </div>
              {showCount && option.count !== undefined && (
                <span className="text-xs bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                  {option.count}
                </span>
              )}
            </button>
          ))
        ) : (
          <div className="px-3 py-2 text-sm text-gray-500 text-center">
            Nenhuma opção encontrada
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className={`relative space-y-2 ${className}`} ref={selectRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 text-[15px] text-[#222] border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
        }`}
      >
        <span className={selectedOption ? 'text-[#222]' : 'text-[#888]'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {dropdown}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
