import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const LAST_UPDATED = '4 de novembro de 2026';
const CONTACT_EMAIL = 'contato@flockapp.com.br';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Como o Flock trata os dados pessoais enviados pelo site e pelo formulário de contato.',
  alternates: { canonical: '/privacidade' },
};

const SECTIONS: { id: string; title: string; content: ReactNode }[] = [
  {
    id: 'escopo',
    title: '1. Sobre esta política',
    content: (
      <>
        <p>
          Esta política explica como o Flock trata os dados pessoais de quem visita o site <strong>flockapp.com.br</strong> e
          envia o formulário de contato ou de solicitação de acesso. Ela segue a Lei Geral de Proteção de Dados Pessoais
          (Lei nº 13.709/2018 — LGPD).
        </p>
        <p>
          Os dados tratados dentro da plataforma Flock, como o cadastro de membros feito pelas igrejas, não fazem parte
          desta política e são regidos por documentos próprios do produto.
        </p>
      </>
    ),
  },
  {
    id: 'dados',
    title: '2. Quais dados coletamos',
    content: (
      <>
        <p>Quando você envia o formulário de contato, coletamos:</p>
        <ul>
          <li>nome completo;</li>
          <li>e-mail;</li>
          <li>telefone;</li>
          <li>nome da igreja;</li>
          <li>estado e cidade;</li>
          <li>plano de interesse;</li>
          <li>mensagem, se você escrever uma.</li>
        </ul>
        <p>
          Ao navegar pelo site, a infraestrutura de hospedagem pode registrar dados técnicos de acesso, como endereço IP,
          data e hora e tipo de navegador, para manter o site seguro e funcionando.
        </p>
      </>
    ),
  },
  {
    id: 'finalidade',
    title: '3. Para que usamos os dados',
    content: (
      <ul>
        <li>responder à sua solicitação e tirar suas dúvidas;</li>
        <li>agendar uma demonstração, quando você pedir;</li>
        <li>avaliar e conduzir a sua adesão ao programa Igrejas Parceiras ou a um plano do Flock;</li>
        <li>enviar o e-mail de confirmação do recebimento da solicitação.</li>
      </ul>
    ),
  },
  {
    id: 'base-legal',
    title: '4. Base legal',
    content: (
      <p>
        Tratamos os dados do formulário para executar procedimentos preliminares a um contrato, a pedido do próprio
        titular (art. 7º, V, da LGPD). Os registros técnicos de acesso são tratados com base no legítimo interesse de
        manter o site seguro (art. 7º, IX).
      </p>
    ),
  },
  {
    id: 'compartilhamento',
    title: '5. Com quem compartilhamos',
    content: (
      <>
        <p>Não vendemos seus dados. Eles são tratados por fornecedores que operam a infraestrutura do Flock:</p>
        <ul>
          <li>
            <strong>Supabase</strong> — armazenamento das solicitações;
          </li>
          <li>
            <strong>Resend</strong> — envio dos e-mails de confirmação e de aviso à nossa equipe;
          </li>
          <li>
            <strong>Railway</strong> — hospedagem do site e dos serviços.
          </li>
        </ul>
        <p>
          Para listar estados e cidades no formulário, o seu navegador consulta diretamente a API pública de localidades do{' '}
          <strong>IBGE</strong>. Alguns desses fornecedores podem armazenar ou processar dados fora do Brasil.
        </p>
      </>
    ),
  },
  {
    id: 'armazenamento-local',
    title: '6. Cookies e armazenamento no navegador',
    content: (
      <p>
        O site não usa cookies de publicidade nem ferramentas de rastreamento. Quando você escolhe um plano, guardamos essa
        escolha apenas no armazenamento da sessão do seu navegador, para levá-la ao cadastro. Ela é apagada quando a aba é
        fechada.
      </p>
    ),
  },
  {
    id: 'retencao',
    title: '7. Por quanto tempo guardamos',
    content: (
      <p>
        Guardamos os dados do formulário pelo tempo necessário para atender à sua solicitação e ao relacionamento comercial
        que surgir dela. Você pode pedir a exclusão a qualquer momento pelo e-mail abaixo.
      </p>
    ),
  },
  {
    id: 'direitos',
    title: '8. Seus direitos',
    content: (
      <>
        <p>Conforme o art. 18 da LGPD, você pode, a qualquer momento:</p>
        <ul>
          <li>confirmar se tratamos seus dados e acessá-los;</li>
          <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
          <li>pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários ou tratados em desconformidade;</li>
          <li>pedir a portabilidade dos dados;</li>
          <li>saber com quem compartilhamos seus dados;</li>
          <li>pedir a eliminação dos dados tratados com o seu consentimento, quando for o caso.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'seguranca',
    title: '9. Segurança',
    content: (
      <p>
        Adotamos medidas técnicas e administrativas para proteger os dados, como conexão criptografada (HTTPS) e acesso
        restrito às informações.
      </p>
    ),
  },
  {
    id: 'contato',
    title: '10. Contato',
    content: (
      <p>
        Para exercer seus direitos ou tirar dúvidas sobre esta política, escreva para{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
  {
    id: 'alteracoes',
    title: '11. Alterações',
    content: (
      <p>
        Podemos atualizar esta política. A data da última atualização fica sempre no topo desta página.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip">
      <Header />
      <main id="conteudo" className="flex-1 bg-white">
        <div className="relative isolate overflow-hidden bg-brand-950 text-white">
          <div aria-hidden className="bg-grid absolute inset-0 -z-10 opacity-60" />
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
            <p className="text-xs font-semibold tracking-[0.14em] text-accent-200 uppercase">Privacidade</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">Política de Privacidade</h1>
            <p className="mt-4 text-white/60">Última atualização: {LAST_UPDATED}</p>
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[14rem_1fr]">
          <nav aria-label="Nesta página" className="hidden lg:block">
            <ul className="sticky top-24 space-y-1 border-l border-gray-200 text-sm">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="-ml-px block border-l border-transparent py-1.5 pl-4 text-gray-500 hover:border-primary hover:text-primary">
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <article className="max-w-none space-y-10 text-base leading-relaxed text-gray-700 [&_a]:font-medium [&_a]:text-accent-500 [&_a]:underline [&_a]:underline-offset-2 [&_li]:mt-1.5 [&_p+p]:mt-3 [&_strong]:text-gray-900 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul+p]:mt-3">
            {SECTIONS.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="mb-3 text-xl font-bold text-primary">{section.title}</h2>
                {section.content}
              </section>
            ))}
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
