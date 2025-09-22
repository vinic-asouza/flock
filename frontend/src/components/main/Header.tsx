'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User, Church } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

export function Header() {
  const router = useRouter();
  const { user, session, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      {/* Nome da Igreja */}
      <div className="flex items-center">
        <Church size={16} className="text-gray-900" />
        <h1 className="pl-2 text-base font-medium text-gray-900" title={user?.name}>
          {user?.name || 'Igreja'}
        </h1>
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
