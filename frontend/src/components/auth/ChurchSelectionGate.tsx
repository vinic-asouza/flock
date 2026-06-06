'use client';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Building2 } from 'lucide-react';

export function ChurchSelectionGate({ children }: { children: React.ReactNode }) {
  const { churchSelectionRequired, memberships, switchChurch, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!churchSelectionRequired) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold text-gray-900">Selecione a igreja</h1>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Sua conta tem acesso a mais de uma igreja. Escolha qual deseja usar agora.
        </p>
        <ul className="space-y-2">
          {memberships.map((m) => (
            <li key={m.churchId}>
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start"
                onClick={() => switchChurch(m.churchId).then(() => window.location.reload())}
              >
                {m.churchName}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
