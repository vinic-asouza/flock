import { ClipboardList, Church, UsersRound, Megaphone } from 'lucide-react';

const audiences = [
  {
    icon: ClipboardList,
    title: 'Secretaria',
    headline: 'Menos planilhas. Menos retrabalho.',
    description:
      'Centralize os cadastros, atualizações e informações dos membros em um único lugar.',
  },
  {
    icon: Church,
    title: 'Pastores',
    headline: 'Uma visão clara da igreja.',
    description:
      'Acompanhe crescimento, membresia, congregações e os principais indicadores da igreja.',
  },
  {
    icon: UsersRound,
    title: 'Líderes',
    headline: 'Saiba quem está com você.',
    description:
      'Organize equipes, ministérios e grupos sem depender de listas espalhadas.',
  },
  {
    icon: Megaphone,
    title: 'Comunicação',
    headline: 'Saiba quem faz parte da igreja.',
    description:
      'Tenha informações organizadas para facilitar campanhas, comunicados, eventos e ações de relacionamento.',
  },
];

export function AudienceSection() {
  return (
    <section id="para-quem" className="scroll-mt-24 py-20 px-4 bg-[#fffffffe] min-w-0 overflow-x-hidden">
      <div className="max-w-7xl mx-auto min-w-0">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary mb-2.5">
            Para quem é o Flock?
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {audiences.map((audience) => (
            <div
              key={audience.title}
              className="group p-4 sm:p-6 md:p-8 rounded-xl bg-white border border-gray-200 hover:border-primary/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 min-w-0"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary rounded-xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <audience.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" aria-hidden />
              </div>
              <p className="text-sm font-semibold text-primary mb-1">{audience.title}</p>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 group-hover:text-primary transition-colors">
                {audience.headline}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                {audience.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
