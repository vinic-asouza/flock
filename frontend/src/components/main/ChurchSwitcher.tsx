'use client';

import { useState } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

export function ChurchSwitcher() {
  const { memberships, activeChurchId, switchChurch, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (memberships.length <= 1) {
    return null;
  }

  const active = memberships.find((m) => m.churchId === activeChurchId);

  const handleSelect = async (churchId: string) => {
    if (churchId === activeChurchId) {
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      await switchChurch(churchId);
      setOpen(false);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="gap-2"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
      >
        <Building2 className="h-4 w-4 shrink-0" />
        <span className="max-w-[72px] sm:max-w-[140px] truncate">
          {active?.churchName || user?.name || 'Igreja'}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </Button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-md border border-gray-200 bg-white shadow-lg z-50">
          {memberships.map((m) => (
            <button
              key={m.churchId}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                m.churchId === activeChurchId ? 'bg-primary/5 font-medium' : ''
              }`}
              onClick={() => handleSelect(m.churchId)}
            >
              {m.churchName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
