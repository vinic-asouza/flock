'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { useAuth } from '@/context/AuthContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar churchName={user?.name || ''} />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
} 