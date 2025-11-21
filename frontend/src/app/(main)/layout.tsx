'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/main/Sidebar';
import { Header } from '@/components/main/Header';
import { useAuth } from '@/context/AuthContext';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth();

  return (
    <div className="h-screen bg-app flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar churchName={user?.name || ''} />
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 