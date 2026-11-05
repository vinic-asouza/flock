import Link from 'next/link';
import { ArrowRight, Mail, Plus } from 'lucide-react';
import { isClosedLaunch } from '@/utils/launchMode';
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal';

const FREE_START_ANSWER = 'Sim. Podem ser cadastrados até 100 membros de forma gratuita.';
const CLOSED_LAUNCH_FREE_ANSWER =
  'Nesta fase, o cadastro é por convite às Igrejas Parceiras. Deixe seu interesse na seção de contato. O plano gratuito segue até 100 membros.';

function faqItems() {
  return [
    {
      question: 'Preciso instalar alguma coisa?',
      answer: 'Não. O Flock funciona diretamente pelo navegador.',
    },
    {
      question: 'Posso importar minha planilha?',
      answer: 'Sim. Você pode trazer os dados que sua igreja já possui.',
    },
    {
      question: 'Vocês ajudam a migrar meus dados?',
      answer:
        'Sim. Se a lista da sua igreja está em planilha ou em outro sistema, nossa equipe ajuda você a migrar para o Flock.',
    },
    {
      question: 'Posso gerenciar várias congregações ou filiais?',
      answer:
        'Sim. Você pode organizar múltiplas congregações e filiais em uma única conta. O limite de membros segue o plano vinculado à conta.',
    },
    {
      question: 'Posso convidar usuários para acessar minha igreja?',
      answer: 'Sim. Você pode convidar usuários ilimitados por e-mail e definir permissões específicas para cada um.',
    },
    {
      question: 'Meus dados ficam seguros?',
      answer:
        'Sim. Os dados de cada igreja ficam isolados dos dados das outras igrejas, e você define permissões específicas para cada usuário que convidar.',
    },
    {
      question: 'Posso começar gratuitamente?',
      answer: isClosedLaunch() ? CLOSED_LAUNCH_FREE_ANSWER : FREE_START_ANSWER,
    },
    {
      question: 'Posso cancelar quando quiser?',
      answer: 'Sim. Você pode cancelar a qualquer momento.',
    },
    {
      question: 'O Flock funciona no celular?',
      answer: 'Sim. O Flock pode ser acessado pelo celular, tablet ou computador.',
    },
  ];
}

export function FaqSection() {
  const items = faqItems();
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <section id="faq" className="scroll-mt-20 bg-white py-24 sm:py-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-8">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="inline-flex rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-accent-500 uppercase ring-1 ring-accent-200/60">
            FAQ
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-primary sm:text-4xl md:text-[2.75rem] md:leading-[1.1]">
            Ainda tem dúvidas?
          </h2>
          <div className="mt-8 rounded-2xl bg-canvas p-5 ring-1 ring-gray-200/70">
            <p className="font-semibold text-primary">Não encontrou sua resposta?</p>
            <p className="mt-1 text-sm text-gray-600">Fale com a nossa equipe pelo formulário ou por e-mail.</p>
            <div className="mt-3 flex flex-col items-start sm:flex-row sm:flex-wrap sm:gap-x-6 lg:flex-col">
              <Link
                href="#waitlist"
                className="group inline-flex min-h-11 items-center gap-1.5 font-semibold whitespace-nowrap text-accent-500 hover:text-accent-600"
              >
                Fale com a gente
                <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="mailto:contato@flockapp.com.br"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm text-gray-600 hover:text-primary"
              >
                <Mail aria-hidden className="h-4 w-4" />
                contato@flockapp.com.br
              </a>
            </div>
          </div>
        </Reveal>

        <Stagger className="divide-y divide-gray-200 border-y border-gray-200" stagger={0.05}>
          {items.map((item) => (
            <StaggerItem key={item.question}>
              <details className="faq-item group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-5 text-left text-base font-semibold text-primary transition-colors hover:text-accent-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 sm:text-lg">
                  {item.question}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-primary ring-1 ring-gray-200 transition-[transform,background-color] duration-300 group-open:rotate-45 group-open:bg-primary group-open:text-white">
                    <Plus aria-hidden className="h-4 w-4" />
                  </span>
                </summary>
                <p className="pr-12 pb-6 text-base leading-relaxed text-gray-600">{item.answer}</p>
              </details>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
