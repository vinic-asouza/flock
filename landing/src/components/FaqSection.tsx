const faqs = [
  {
    question: 'Preciso instalar alguma coisa?',
    answer: 'Não. O Flock funciona diretamente pelo navegador.',
  },
  {
    question: 'Posso importar minha planilha?',
    answer: 'Sim. Você pode trazer os dados que sua igreja já possui.',
  },
  {
    question: 'Posso gerenciar mais de uma igreja? (congregações/filiais)',
    answer:
      'Sim. Você pode organizar múltiplas congregações e filiais em uma única conta. O limite de membros segue o plano vinculado à conta.',
  },
  {
    question: 'Posso convidar usuários para acessar minha igreja?',
    answer:
      'Sim. Você pode convidar usuários ilimitados por e-mail e definir permissões específicas para cada um.',
  },
  {
    question: 'Meus dados ficam seguros?',
    answer: 'Sim. Os dados de cada igreja são isolados e protegidos.',
  },
  {
    question: 'Posso começar gratuitamente?',
    answer: 'Sim. Podem ser cadastrados até 100 membros de forma gratuita.',
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

export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 py-20 px-4 bg-[#fffffffe] min-w-0 overflow-x-hidden">
      <div className="max-w-3xl mx-auto min-w-0">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary mb-10 text-center">
          Ainda tem dúvidas?
        </h2>
        <div className="space-y-3">
          {faqs.map((item) => (
            <details
              key={item.question}
              className="group rounded-xl border border-gray-200 bg-white px-4 sm:px-6 open:shadow-md transition-shadow"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span
                  className="flex-shrink-0 text-primary text-xl leading-none transition-transform group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="pb-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
