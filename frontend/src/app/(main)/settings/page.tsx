'use client';

import { useState } from 'react';
import { Church, Shield, FileText } from 'lucide-react';
import { ChurchManagement } from '@/components/settings/ChurchManagement';
import { AccountManagement } from '@/components/settings/AccountManagement';
import AuditLogs from '@/components/settings/AuditLogs';

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState('church');

    const settingsSections = [
        {
            id: 'church',
            title: 'Gerenciamento da Igreja',
            description: 'Gerencie os dados básicos da sua igreja',
            icon: Church
        },
        {
            id: 'account',
            title: 'Conta',
            description: 'Configurações da sua conta',
            icon: Shield
        },
        {
            id: 'logs',
            title: 'Logs',
            description: 'Histórico de operações do sistema',
            icon: FileText
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
                <p className="mt-2 text-sm text-gray-500">
                    Gerencie as configurações da sua igreja e personalização do sistema.
                </p>
            </div>

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

             {/* Conteúdo principal */}
             <div>
                 {activeSection === 'church' && <ChurchManagement />}

                 {activeSection === 'account' && <AccountManagement />}

                 {activeSection === 'logs' && <AuditLogs />}
             </div>
        </div>
    );
}
