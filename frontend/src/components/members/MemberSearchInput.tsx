'use client';

import { useEffect, useState, useRef } from 'react';
import { Search } from 'lucide-react';

interface MemberSearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function MemberSearchInput({ value, onChange }: MemberSearchInputProps) {
  const [input, setInput] = useState(value);
  const onChangeRef = useRef(onChange);

  // Atualizar a ref quando onChange mudar
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setInput(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      onChangeRef.current(input);
    }, 500);
    return () => clearTimeout(handler);
  }, [input]);

  return (
    <div className="relative w-full max-w">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <Search size={18} />
      </span>
      <input
        type="text"
        className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-lg bg-white text-gray-700 placeholder-gray-400 focus:outline-none hover:border-gray-300 transition-colors"
        placeholder="Busque por nome, email ou telefone"
        value={input}
        onChange={e => setInput(e.target.value)}
        autoComplete="off"
      />
    </div>
  );
} 