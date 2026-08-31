import { Users, UserPlus, Building2, UsersRound, Calendar, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Membros',
    headline: 'Tenha o rol da igreja sempre atualizado.',
    description:
      'Cadastre, encontre e atualize membros rapidamente. Saiba quem entrou, quem saiu e mantenha todas as informações organizadas.',
  },
  {
    icon: UserPlus,
    title: 'Integração',
    headline: 'Não perca quem está chegando.',
    description:
      'Acompanhe visitantes e novos membros desde o primeiro contato até a integração à igreja.',
  },
  {
    icon: Building2,
    title: 'Congregações',
    headline: 'Uma igreja. Várias congregações.',
    description:
      'Gerencie diferentes congregações mantendo tudo conectado em uma única plataforma.',
  },
  {
    icon: UsersRound,
    title: 'Grupos',
    headline: 'Organize ministérios, células e equipes.',
    description:
      'Saiba quem participa de cada grupo e facilite o acompanhamento dos líderes.',
  },
  {
    icon: Calendar,
    title: 'Agenda',
    headline: 'Tudo que acontece na igreja, organizado.',
    description:
      'Cultos, reuniões e eventos em uma agenda compartilhada com a liderança.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios',
    headline: 'Transforme dados em decisões.',
    description:
      'Acompanhe crescimento, perfil da membresia e outros indicadores importantes para entender sua igreja.',
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 py-20 px-4 bg-[#fffffffe] min-w-0 overflow-x-hidden">
      <div className="max-w-7xl mx-auto min-w-0">
        <div className="text-center mb-16">
          <p className="text-base sm:text-lg font-semibold text-primary mb-2">
            Sua igreja ainda depende de fichas ou planilhas?
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary mb-2.5">
            O que o Flock resolve no dia a dia
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Informações espalhadas dificultam o trabalho da secretaria, dos líderes e da própria liderança. O Flock coloca tudo em um só lugar.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-4 sm:p-6 md:p-8 rounded-xl bg-white border border-gray-200 hover:border-primary/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 min-w-0"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary rounded-xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-primary mb-1">{feature.title}</p>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 group-hover:text-primary transition-colors">
                {feature.headline}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-8 space-y-3 max-w-3xl mx-auto">
          <p className="text-sm text-gray-500">
            Já tem a lista em planilha ou em outro sistema? Nós vamos te ajudar a migrar para o Flock.
          </p>
        </div>
      </div>
    </section>
  );
}
