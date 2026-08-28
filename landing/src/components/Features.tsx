import { Users, UserPlus, Building2, UsersRound, Calendar, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Membros',
    description: 'Cadastre, filtre e atualize o rol. Importe a lista em CSV e exporte em CSV/PDF.',
  },
  {
    icon: UserPlus,
    title: 'Integração',
    description: 'Acompanhe pré-membros (status, mentor, conversão) até entrarem no rol.',
  },
  {
    icon: Building2,
    title: 'Congregações',
    description: 'Organize campus/pontos dentro da mesma igreja, com congregação principal.',
  },
  {
    icon: UsersRound,
    title: 'Grupos',
    description: 'Ministérios, células e equipes. Um membro pode estar em vários.',
  },
  {
    icon: Calendar,
    title: 'Calendário',
    description: 'Programação, eventos e reuniões com recorrência.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios',
    description: 'Totais, demografia e estrutura no Painel. Lista de membros em CSV; o resto em PDF.',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 px-4 bg-[#fffffffe] min-w-0 overflow-x-hidden">
      <div className="max-w-7xl mx-auto min-w-0">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary mb-2.5">
            O que sua igreja encontra no Painel
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Membros, integração, congregações, grupos, calendário e relatórios — o que já está shipped.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-4 sm:p-6 md:p-8 rounded-xl bg-white border border-gray-200 hover:border-primary/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 min-w-0"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary rounded-xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-8 text-sm text-gray-600 max-w-3xl mx-auto">
          <p>
            <strong>Isolamento por igreja.</strong> Dados no Brasil.
          </p>
        </div>
      </div>
    </section>
  );
}

