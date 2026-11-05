import { Check, MailCheck, MessageSquareText, PhoneCall } from 'lucide-react';
import { WaitlistForm } from './WaitlistForm';
import { isClosedLaunch } from '@/utils/launchMode';
import { PARTNER_OFFER_SUMMARY } from '@/utils/partnerOffer';
import { PrimaryAction } from '@/components/ui/PrimaryAction';
import { Reveal } from '@/components/motion/Reveal';

const NEXT_STEPS = [
  { icon: MessageSquareText, text: 'Recebemos sua solicitação.' },
  { icon: MailCheck, text: 'Você recebe um e-mail de confirmação.' },
  { icon: PhoneCall, text: 'Nossa equipe entra em contato.' },
];

export function CTA() {
  const closed = isClosedLaunch();

  return (
    <section
      id="contato"
      aria-labelledby="contato-titulo"
      className="relative isolate overflow-hidden bg-brand-950 py-24 text-white sm:py-28"
    >
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(83_70_240/0.35),transparent)] blur-2xl" />
        <div className="bg-grid absolute inset-0 opacity-60" />
        <div className="bg-noise absolute inset-0" />
      </div>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8">
        <Reveal className="lg:pt-6">
          <h2
            id="contato-titulo"
            className="text-gradient-light text-3xl font-extrabold tracking-[-0.03em] text-balance sm:text-4xl md:text-5xl md:leading-[1.08]"
          >
            Sua igreja merece uma gestão mais simples.
          </h2>
          <p className="mt-5 text-lg text-white/70">
            {closed
              ? 'Vagas limitadas para Igrejas Parceiras. Fale com a gente para participar.'
              : 'Comece gratuitamente e veja o Flock funcionando na prática.'}
          </p>

          {closed ? (
            <p className="mt-6 flex items-start gap-3 rounded-2xl bg-white/[0.06] p-4 text-sm text-white/85 ring-1 ring-white/10">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" />
              {PARTNER_OFFER_SUMMARY}
            </p>
          ) : (
            <div className="mt-8 flex flex-col items-start gap-3">
              <PrimaryAction variant="light" size="lg" />
              <p className="text-sm text-white/60">Até 100 membros grátis.</p>
            </div>
          )}

          <div className="mt-10">
            <p className="text-xs font-semibold tracking-[0.14em] text-white/50 uppercase">O que acontece depois</p>
            <ol className="mt-4 space-y-4">
              {NEXT_STEPS.map(({ icon: Icon, text }, i) => (
                <li key={text} className="flex items-center gap-4">
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] ring-1 ring-white/15">
                    <Icon aria-hidden className="h-[18px] w-[18px] text-accent-200" />
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-500 text-[9px] font-bold">
                      {i + 1}
                    </span>
                  </span>
                  <span className="text-white/80">{text}</span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div
            id="waitlist"
            className="scroll-mt-24 rounded-3xl bg-white p-5 text-gray-900 shadow-[0_40px_120px_-30px_rgb(83_70_240/0.55)] ring-1 ring-white/20 sm:p-8"
          >
            <h3 className="text-xl font-bold tracking-[-0.01em] text-primary sm:text-2xl">
              {closed ? 'Solicite seu acesso de Igreja Parceira' : 'Fale com a gente ou agende uma demonstração'}
            </h3>
            <p className="mt-1 mb-6 text-sm text-gray-500">Campos com * são obrigatórios.</p>
            <WaitlistForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
