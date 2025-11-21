'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/main/Sidebar';
import { Header } from '@/components/main/Header';
import { Footer } from '@/components/main/Footer';
import { useAuth } from '@/context/AuthContext';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth();

  return (
    <div className="h-screen bg-app flex flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar churchName={user?.name || ''} />
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full flex flex-col">
            <div className="flex-1 p-6 md:p-10">
              {children}
            </div>
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
} 