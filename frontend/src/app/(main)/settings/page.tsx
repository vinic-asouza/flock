'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Church, Shield, FileText, CreditCard, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { ChurchManagement } from '@/components/settings/ChurchManagement';
import { AccountManagement } from '@/components/settings/AccountManagement';
import AuditLogs from '@/components/settings/AuditLogs';
import { PaymentManagement } from '@/components/settings/PaymentManagement';
import { ChurchUsersManagement } from '@/components/settings/ChurchUsersManagement';
import { useAuth } from '@/context/AuthContext';

const DEFAULT_TAB = 'church';

function SettingsPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabFromUrl = searchParams.get('tab');
    const { currentRole } = useAuth();
    const [activeSection, setActiveSection] = useState(DEFAULT_TAB);

    const canSeeUsers = currentRole === 'admin' || currentRole === 'owner';
    const canSeeLogs = currentRole === 'admin' || currentRole === 'owner';
    const canManagePlan = currentRole === 'admin' || currentRole === 'owner';

    const settingsSections = useMemo(() => {
        const base = [
            { id: 'church', title: 'Igreja', description: 'Gerencie os dados básicos da sua igreja', icon: Church },
            ...(canManagePlan ? [{ id: 'payment', title: 'Plano', description: 'Gerencie seu plano e assinatura', icon: CreditCard }] : []),
            { id: 'account', title: 'Conta', description: 'Configurações da sua conta', icon: Shield },
            ...(canSeeUsers ? [{ id: 'users', title: 'Usuários', description: 'Usuários com acesso à igreja', icon: Users }] : []),
            ...(canSeeLogs ? [{ id: 'logs', title: 'Histórico', description: 'Atividades realizadas na igreja', icon: FileText }] : []),
        ];
        return base;
    }, [canSeeUsers, canSeeLogs, canManagePlan]);

    const resolveFallbackTab = useCallback(() => {
        if (settingsSections.some((s) => s.id === DEFAULT_TAB)) {
            return DEFAULT_TAB;
        }
        return settingsSections[0]?.id ?? 'account';
    }, [settingsSections]);

    useEffect(() => {
        if (tabFromUrl && settingsSections.some((s) => s.id === tabFromUrl)) {
            setActiveSection(tabFromUrl);
            return;
        }

        if (tabFromUrl && !settingsSections.some((s) => s.id === tabFromUrl)) {
            const fallback = resolveFallbackTab();
            setActiveSection(fallback);
            router.replace(`/settings?tab=${fallback}`, { scroll: false });
            toast.error('Aba não disponível ou sem permissão para acessá-la.');
            return;
        }

        if (!tabFromUrl) {
            router.replace(`/settings?tab=${activeSection}`, { scroll: false });
        }
    }, [tabFromUrl, settingsSections, router, resolveFallbackTab, activeSection]);

    const handleSectionChange = (sectionId: string) => {
        setActiveSection(sectionId);
        router.replace(`/settings?tab=${sectionId}`, { scroll: false });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Configurações"
                subtitle="Gerencie as configurações da sua igreja e personalização do sistema."
            />

            <nav className="-mx-1 mb-6 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:thin] md:overflow-visible">
                <div className="flex w-max min-w-full gap-2 md:w-auto md:min-w-0 md:flex-wrap">
                    {settingsSections.map((section) => {
                        const IconComponent = section.icon;
                        return (
                            <button
                                key={section.id}
                                type="button"
                                onClick={() => handleSectionChange(section.id)}
                                className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${activeSection === section.id
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-gray-200'
                                    }`}
                            >
                                <IconComponent size={16} className="shrink-0" />
                                <span>{section.title}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>

             <div>
                 {activeSection === 'church' && <ChurchManagement />}
                 {activeSection === 'payment' && canManagePlan && <PaymentManagement />}
                 {activeSection === 'account' && <AccountManagement />}
                 {activeSection === 'users' && canSeeUsers && <ChurchUsersManagement />}
                 {activeSection === 'logs' && canSeeLogs && <AuditLogs />}
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
