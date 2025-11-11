'use client';

import { useEffect, useState, useRef } from 'react';
import { Search, Loader } from 'lucide-react';

interface MemberSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
}

export function MemberSearchInput({ value, onChange, isLoading = false }: MemberSearchInputProps) {
  const [input, setInput] = useState(value);
  const [isSearching, setIsSearching] = useState(false);
  const onChangeRef = useRef(onChange);

  // Atualizar a ref quando onChange mudar
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setInput(value);
  }, [value]);

  useEffect(() => {
    setIsSearching(true);
    const handler = setTimeout(() => {
      onChangeRef.current(input);
      setIsSearching(false);
    }, 500);
    return () => {
      clearTimeout(handler);
      setIsSearching(false);
    };
  }, [input]);

  return (
    <div className="relative w-full max-w">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {isSearching || isLoading ? (
          <Loader className="animate-spin" size={18} />
        ) : (
          <Search size={18} />
        )}
      </span>
      <input
        type="text"
        className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-lg bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        placeholder="Busque por nome ou contato"
        value={input}
        onChange={e => setInput(e.target.value)}
        autoComplete="off"
        disabled={isLoading}
      />
      {(isSearching || isLoading) && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
} 