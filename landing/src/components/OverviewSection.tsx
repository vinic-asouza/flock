import Image from 'next/image';

export function OverviewSection() {
  return (
    <section id="visao-geral" className="scroll-mt-24 py-20 px-4 bg-[#f5f5f5fe] min-w-0 overflow-x-hidden">
      <div className="max-w-7xl mx-auto min-w-0">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary mb-4">
              Conheça melhor a sua igreja
            </h2>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
              Saiba quem são seus membros, onde estão, quais grupos participam e como a igreja está crescendo.
            </p>
            <p className="text-base sm:text-lg font-semibold text-primary">
              Tudo o que sua liderança precisa saber, em um só lugar.
            </p>
          </div>
          <div className="relative min-w-0">
            <Image
              src="/demo/painel.png"
              alt="Painel do Flock — visão geral da igreja"
              width={960}
              height={600}
              className="rounded-xl w-full h-auto shadow-lg object-cover object-top"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
