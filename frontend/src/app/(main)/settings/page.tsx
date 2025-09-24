'use client';

import { useState } from 'react';
import { Church, Shield, Bell, Link } from 'lucide-react';
import { ChurchManagement } from '@/components/settings/ChurchManagement';
import { Card } from '@/components/ui/Card';

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
            icon: Shield,
            comingSoon: true
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
                            disabled={section.comingSoon}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeSection === section.id
                                    ? 'bg-primary text-white shadow-sm'
                                    : section.comingSoon
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-gray-200'
                                }`}
                        >
                            <IconComponent size={16} />
                            <span>{section.title}</span>
                            {section.comingSoon && (
                                <span className="text-xs opacity-75">(Em breve)</span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Conteúdo principal */}
            <div>
                {activeSection === 'church' && <ChurchManagement />}

                {activeSection === 'account' && (
                    <Card>
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🔒</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                Configurações da sua conta
                            </h3>
                            <p className="text-gray-600">
                                Esta seção estará disponível em breve.
                            </p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
