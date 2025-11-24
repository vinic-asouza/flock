'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DemoItem {
  id: string;
  title: string;
  description: string;
  image: string; // URL ou path da imagem do sistema
}

const demoItems: DemoItem[] = [
  {
    id: 'dashboard',
    title: 'Painel de Informações',
    description: 'Visualize estatísticas completas da sua igreja em tempo real. Acompanhe membros, batismos, admissões e muito mais através de gráficos interativos e relatórios detalhados.',
    image: '/demo/painel.png',
  },
  {
    id: 'members',
    title: 'Gestão de Membros',
    description: 'Cadastre e gerencie todos os membros da sua igreja com informações completas. Filtre por congregação, cargo, idade e muito mais. Mantenha seus dados sempre organizados.',
    image: '/demo/members.png',
  },
  {
    id: 'integration',
    title: 'Controle de Integração',
    description: 'Gerencie o processo de integração de novos membros de forma organizada. Acompanhe o status de cada integrante e facilite a transição para membros efetivos.',
    image: '/demo/integration.png',
  },
  {
    id: 'congregations',
    title: 'Congregações',
    description: 'Organize sua igreja em múltiplas congregações e gerencie cada uma de forma independente. Visualize membros por congregação e mantenha tudo centralizado.',
    image: '/demo/congregation.png',
  },
  {
    id: 'functions',
    title: 'Controle de Cargos',
    description: 'Gerencie os cargos e funções da sua igreja de forma eficiente. Organize a estrutura hierárquica e atribua responsabilidades de forma clara e organizada.',
    image: '/demo/fuctions.png',
  },
  {
    id: 'reports',
    title: 'Relatórios Detalhados',
    description: 'Gere relatórios completos sobre demografia, estrutura da igreja, batismos e muito mais. Exporte em PDF e mantenha histórico completo dos seus dados.',
    image: '/demo/details.png',
  },
];

export function DemoSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % demoItems.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + demoItems.length) % demoItems.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const currentItem = demoItems[currentIndex];

  return (
    <section id="demo" className="py-20 px-4 bg-[#f5f5f5]">
      <div className="max-w-7xl mx-auto">
        {/* Título e Subtítulo */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-primary mb-4">
            Veja o Flock em Ação
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore as principais funcionalidades do sistema e descubra como ele pode transformar a gestão da sua igreja
          </p>
        </div>

        {/* Bloco Principal */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="grid lg:grid-cols-10 gap-0">
            {/* Card de Informações (30%) */}
            <div 
              className="lg:col-span-3 p-8 bg-gradient-to-br from-primary to-[#0d0a3a] text-white flex flex-col justify-start"
              style={{
                backgroundColor: '#090725',
                backgroundImage: 'linear-gradient(to bottom right, #090725, #0d0a3a)',
              }}
            >
              <div className="mb-6">
                <div className="flex gap-2 mb-4">
                  {demoItems.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        index === currentIndex
                          ? 'bg-white w-8'
                          : 'bg-white/30 w-2 hover:bg-white/50'
                      }`}
                      aria-label={`Ir para slide ${index + 1}`}
                    />
                  ))}
                </div>
                <h3 className="text-2xl font-bold mb-4">
                  {currentItem.title}
                </h3>
                <p className="text-white/90 leading-relaxed">
                  {currentItem.description}
                </p>
              </div>

              {/* Navegação Mobile */}
              <div className="flex gap-3 mt-auto lg:hidden">
                <button
                  onClick={prevSlide}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  aria-label="Slide anterior"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={nextSlide}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  aria-label="Próximo slide"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Imagem do Sistema (70%) */}
            <div className="lg:col-span-7 p-8 lg:p-12 bg-white flex items-center justify-center">
              <div className="relative w-full max-w-5xl">
                {/* Botão Anterior - Lateral Esquerda da Imagem */}
                <button
                  onClick={prevSlide}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 p-3 bg-primary text-white rounded-full shadow-lg hover:bg-[#0d0a3a] hover:scale-110 transition-all duration-300 hidden lg:flex items-center justify-center"
                  aria-label="Slide anterior"
                >
                  <ChevronLeft size={24} />
                </button>

                {/* Botão Próximo - Lateral Direita da Imagem */}
                <button
                  onClick={nextSlide}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 p-3 bg-primary text-white rounded-full shadow-lg hover:bg-[#0d0a3a] hover:scale-110 transition-all duration-300 hidden lg:flex items-center justify-center"
                  aria-label="Próximo slide"
                >
                  <ChevronRight size={24} />
                </button>

                {/* Imagem do sistema ou placeholder */}
                <div className="w-full bg-white rounded-xl shadow-inner border border-gray-200 overflow-hidden aspect-video">
                  {currentItem.image ? (
                    <img
                      src={currentItem.image}
                      alt={currentItem.title}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    /* Placeholder animado */
                    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
                      <div className="w-full space-y-3 animate-pulse">
                        <div className="text-sm text-gray-500 mb-4 font-medium text-center">
                          {currentItem.title}
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-3/4 mx-auto" />
                        <div className="h-3 bg-gray-200 rounded w-5/6 mx-auto" />
                        <div className="grid grid-cols-3 gap-4 mt-6">
                          <div className="h-24 bg-gray-200 rounded" />
                          <div className="h-24 bg-gray-200 rounded" />
                          <div className="h-24 bg-gray-200 rounded" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

