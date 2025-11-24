import { Users, Building2, BarChart3, Shield, FileText, Zap } from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Gestão de Membros',
    description: 'Cadastre e gerencie todos os membros da sua igreja com informações completas e organizadas.',
  },
  {
    icon: Building2,
    title: 'Congregações',
    description: 'Organize sua igreja em múltiplas congregações e gerencie cada uma de forma independente.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Detalhados',
    description: 'Visualize estatísticas demográficas, estruturais e temporais da sua igreja.',
  },
  {
    icon: Shield,
    title: 'Seguro e Confiável',
    description: 'Seus dados estão protegidos com criptografia e isolamento completo por igreja.',
  },
  {
    icon: FileText,
    title: 'Exportação de Dados',
    description: 'Exporte relatórios em PDF e mantenha seus dados sempre acessíveis.',
  },
  {
    icon: Zap,
    title: 'Interface Moderna',
    description: 'Sistema intuitivo e responsivo, acessível de qualquer dispositivo.',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-primary mb-4">
            Recursos Completos para sua Igreja
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Tudo que você precisa para gerenciar sua igreja de forma eficiente
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-8 rounded-xl bg-white border border-gray-200 hover:border-primary/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

