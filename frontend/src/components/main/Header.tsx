'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { FlockLogo } from '@/components/ui/FlockLogo';

export function Header() {
  const router = useRouter();
  const { user, session, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      {/* Logo e Nome da Igreja */}
      <div className="flex items-center gap-3">
        <FlockLogo size={30} className="text-primary" />
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-primary">Flock App</span>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-normal text-gray-600" title={user?.name}>
            {user?.name || 'Igreja'}
          </h1>
        </div>
      </div>

      {/* Dados do Usuário e Botão Sair */}
      <div className="flex items-center gap-4">
        {/* Email do Usuário */}
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
          <User size={16} className="text-gray-600" />
          <span className="truncate max-w-48" title={session?.user?.email}>
            {session?.user?.email || 'usuario@igreja.com'}
          </span>
        </div>

        {/* Botão Sair */}
        <Button
          onClick={handleLogout}
          size="sm"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
        >
          <LogOut size={16} className="text-white" />
          <span className="hidden sm:inline text-white">Sair</span>
        </Button>
      </div>
    </header>
  );
}
