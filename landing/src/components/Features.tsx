import { Users, UserPlus, Building2, UsersRound, Calendar, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Membros',
    description: 'O rol da igreja. Quem é membro, quem saiu, quem precisa atualizar. Encontre qualquer pessoa na hora.',
  },
  {
    icon: UserPlus,
    title: 'Integração',
    description: 'Quem está chegando na igreja, até virar membro. Sem perder gente no caminho.',
  },
  {
    icon: Building2,
    title: 'Congregações',
    description: 'Várias congregações, um só cadastro. Cada ponto da igreja no seu lugar.',
  },
  {
    icon: UsersRound,
    title: 'Grupos',
    description: 'Ministérios, células e equipes. Crie o grupo, acompanhe quem faz parte e conduza o trabalho da equipe.',
  },
  {
    icon: Calendar,
    title: 'Calendário',
    description: 'Cultos, reuniões e eventos, visíveis para a liderança.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios',
    description: 'As estatísticas da sua igreja: quantos membros, como está o crescimento, o perfil da congregação. Números claros para a liderança acompanhar e decidir.',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 px-4 bg-[#fffffffe] min-w-0 overflow-x-hidden">
      <div className="max-w-7xl mx-auto min-w-0">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary mb-2.5">
            O que o Flock faz pela sua igreja
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            O dia a dia da igreja, num só lugar.
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
        <div className="text-center mt-8 space-y-3 max-w-3xl mx-auto">
          <p className="text-sm text-gray-600">
            <strong>Os dados da sua igreja ficam só com a sua igreja.</strong> Seguros.
          </p>
          <p className="text-xs text-gray-500">
            Já tem a lista em planilha ou em outro sistema? Traga para o Flock.
          </p>
        </div>
      </div>
    </section>
  );
}

