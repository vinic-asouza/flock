'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Church, Shield, FileText, CreditCard, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChurchManagement } from '@/components/settings/ChurchManagement';
import { AccountManagement } from '@/components/settings/AccountManagement';
import AuditLogs from '@/components/settings/AuditLogs';
import { PaymentManagement } from '@/components/settings/PaymentManagement';
import { ChurchUsersManagement } from '@/components/settings/ChurchUsersManagement';
import { useAuth } from '@/context/AuthContext';

function SettingsPageContent() {
    const searchParams = useSearchParams();
    const tabFromUrl = searchParams.get('tab');
    const { currentRole } = useAuth();
    const [activeSection, setActiveSection] = useState('church');

    const canSeeUsers = currentRole === 'admin' || currentRole === 'owner';

    const settingsSections = useMemo(() => {
        const base = [
            { id: 'church', title: 'Igreja', description: 'Gerencie os dados básicos da sua igreja', icon: Church },
            { id: 'payment', title: 'Plano', description: 'Gerencie seu plano e assinatura', icon: CreditCard },
            { id: 'account', title: 'Conta', description: 'Configurações da sua conta', icon: Shield },
            ...(canSeeUsers ? [{ id: 'users', title: 'Usuários', description: 'Usuários com acesso à igreja', icon: Users }] : []),
            { id: 'logs', title: 'Logs', description: 'Histórico de operações do sistema', icon: FileText },
        ];
        return base;
    }, [canSeeUsers]);

    useEffect(() => {
        if (tabFromUrl && settingsSections.some((s: { id: string }) => s.id === tabFromUrl)) {
            setActiveSection(tabFromUrl);
        }
    }, [tabFromUrl, settingsSections]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <PageHeader
                title="Configurações"
                subtitle="Gerencie as configurações da sua igreja e personalização do sistema."
            />

            {/* Navegação horizontal compacta */}
            <nav className="flex flex-wrap gap-2 mb-6">
                {settingsSections.map((section) => {
                    const IconComponent = section.icon;
                    return (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeSection === section.id
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-gray-200'
                                }`}
                        >
                            <IconComponent size={16} />
                            <span>{section.title}</span>
                        </button>
                    );
                })}
            </nav>

             <div>
                 {activeSection === 'church' && <ChurchManagement />}
                 {activeSection === 'payment' && <PaymentManagement />}
                 {activeSection === 'account' && <AccountManagement />}
                 {activeSection === 'users' && canSeeUsers && <ChurchUsersManagement />}
                 {activeSection === 'logs' && <AuditLogs />}
             </div>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="space-y-6">
                <PageHeader
                    title="Configurações"
                    subtitle="Carregando..."
                />
            </div>
        }>
            <SettingsPageContent />
        </Suspense>
    );
}
