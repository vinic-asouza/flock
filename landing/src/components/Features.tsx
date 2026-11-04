import { BarChart3, Building2, UserPlus, Users, UsersRound, type LucideIcon } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { ModuleIllustration, type ModuleId } from '@/components/product/ModuleIllustrations';
import { cn } from '@/utils/cn';

interface Feature {
  module: ModuleId;
  icon: LucideIcon;
  title: string;
  headline: string;
  description: string;
  span: string;
}

const FEATURES: Feature[] = [
  {
    module: 'members',
    icon: Users,
    title: 'Membros',
    headline: 'Tenha o rol da igreja sempre atualizado.',
    description: 'Cadastre, encontre e atualize qualquer membro em segundos. Saiba quem entrou e quem saiu.',
    span: 'lg:col-span-4',
  },
  {
    module: 'integration',
    icon: UserPlus,
    title: 'Integração de novos membros',
    headline: 'Não perca quem está chegando.',
    description: 'Acompanhe visitantes e novos membros desde o primeiro contato até a integração à igreja.',
    span: 'lg:col-span-2',
  },
  {
    module: 'congregations',
    icon: Building2,
    title: 'Congregações',
    headline: 'Uma igreja. Várias congregações.',
    description: 'Gerencie diferentes congregações, com tudo conectado em uma única plataforma.',
    span: 'lg:col-span-2',
  },
  {
    module: 'ministries',
    icon: UsersRound,
    title: 'Ministérios',
    headline: 'Organize as áreas de serviço da igreja.',
    description: 'Saiba quem participa de cada ministério e facilite o acompanhamento dos líderes.',
    span: 'lg:col-span-2',
  },
  {
    module: 'reports',
    icon: BarChart3,
    title: 'Relatórios',
    headline: 'Transforme dados em decisões.',
    description: 'Acompanhe crescimento, perfil da membresia e outros indicadores para entender sua igreja.',
    span: 'lg:col-span-2',
  },
];

export function Features() {
  return (
    <section id="features" className="relative scroll-mt-20 bg-canvas py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Recursos"
          title="O que o Flock resolve no dia a dia"
          description="Informações espalhadas dificultam o trabalho da secretaria, dos líderes e da própria liderança. O Flock coloca tudo em um só lugar."
        />

        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-5">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            const wide = feature.span === 'lg:col-span-4';
            return (
              <StaggerItem
                key={feature.module}
                className={cn(feature.span, index === 0 && 'sm:col-span-2')}
              >
                <SpotlightCard className="flex h-full flex-col">
                  <div className={cn('flex h-full flex-col gap-6 p-6 sm:p-7', wide && 'md:flex-row md:items-center md:gap-8')}>
                    <div className={cn('flex flex-col', wide && 'md:w-[44%]')}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-[0_8px_20px_-8px_rgb(9_7_37/0.6)] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
                        <Icon aria-hidden className="h-5 w-5" />
                      </span>
                      <p className="mt-5 text-xs font-semibold tracking-[0.12em] text-accent-500 uppercase">{feature.title}</p>
                      <h3 className="mt-2 text-lg font-bold tracking-[-0.01em] text-balance text-primary sm:text-xl">{feature.headline}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">{feature.description}</p>
                    </div>
                    <div className={cn('mt-auto rounded-2xl bg-canvas p-4 ring-1 ring-gray-100', wide && 'md:mt-0 md:flex-1')}>
                      <ModuleIllustration module={feature.module} />
                    </div>
                  </div>
                </SpotlightCard>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
