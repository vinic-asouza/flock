'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Video, BookOpen } from 'lucide-react';

interface DemoItem {
  id: string;
  title: string;
  description: string;
  image: string;
}

const demoItems: DemoItem[] = [
  {
    id: 'dashboard',
    title: 'Painel de Informações',
    description: 'Visualize estatísticas completas da sua igreja em tempo real. Acompanhe membros, batismos, recebimento e muito mais através de gráficos interativos e relatórios detalhados.',
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
    image: '/demo/functions.png',
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    demoItems.forEach((item) => {
      if (item.image) {
        const img = new window.Image();
        img.src = item.image;
      }
    });
  }, []);

  useEffect(() => {
    setIsTransitioning(true);
    setImageLoaded(false);
    setImageFailed(false);

    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [currentIndex]);

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
    <section id="demo" className="py-20 px-4 bg-[#f5f5f5fe]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary mb-2.5">
            Veja o Flock em Ação
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Explore as principais funcionalidades do sistema e descubra como ele pode transformar a gestão da sua igreja
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="grid lg:grid-cols-10 gap-0">
            <div
              className="lg:col-span-3 p-6 md:p-8 bg-gradient-to-br from-primary to-[#0d0a3a] text-white flex flex-col justify-start"
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
                <h3 className="text-xl md:text-2xl font-bold mb-4">
                  {currentItem.title}
                </h3>
                <p className="text-sm md:text-base text-white/90 leading-relaxed">
                  {currentItem.description}
                </p>
              </div>

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

            <div className="lg:col-span-7 p-4 sm:p-6 md:p-8 lg:p-12 bg-white flex items-center justify-center">
              <div className="relative w-full max-w-5xl">
                <button
                  onClick={prevSlide}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 z-10 p-2 sm:p-3 bg-primary text-white rounded-full shadow-lg hover:bg-[#0d0a3a] hover:scale-110 transition-all duration-300 hidden lg:flex items-center justify-center"
                  aria-label="Slide anterior"
                >
                  <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
                </button>

                <button
                  onClick={nextSlide}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 z-10 p-2 sm:p-3 bg-primary text-white rounded-full shadow-lg hover:bg-[#0d0a3a] hover:scale-110 transition-all duration-300 hidden lg:flex items-center justify-center"
                  aria-label="Próximo slide"
                >
                  <ChevronRight size={20} className="sm:w-6 sm:h-6" />
                </button>

                <div className="w-full bg-white rounded-xl shadow-inner border border-gray-200 overflow-hidden aspect-video relative">
                  {currentItem.image && !imageFailed ? (
                    <>
                      <Image
                        key={`${currentIndex}-${currentItem.id}`}
                        src={currentItem.image}
                        alt={currentItem.title}
                        fill
                        className={`object-cover object-top transition-opacity duration-300 ${
                          isTransitioning || !imageLoaded ? 'opacity-0' : 'opacity-100'
                        }`}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 70vw"
                        priority={currentIndex < 2}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => {
                          setImageFailed(true);
                          setImageLoaded(true);
                        }}
                      />
                      {isTransitioning && (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 animate-pulse" />
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-8 text-center">
                      <BookOpen className="w-12 h-12 text-gray-300 mb-4" aria-hidden />
                      <p className="text-sm font-medium text-gray-600 mb-1">Preview indisponível</p>
                      <p className="text-xs text-gray-500 max-w-sm">
                        A captura de tela de {currentItem.title} ainda não está disponível. Explore a descrição ao lado ou solicite uma demonstração.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 sm:mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="#waitlist"
            onClick={(e) => {
              e.preventDefault();
              window.location.hash = '#waitlist';
              setTimeout(() => {
                const waitlistSection = document.getElementById('waitlist');
                if (waitlistSection) {
                  waitlistSection.scrollIntoView({ behavior: 'smooth' });
                }
              }, 100);
            }}
            className="inline-flex items-center justify-center gap-2 text-white px-6 sm:px-8 py-3 rounded-lg text-base sm:text-lg font-semibold hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl w-full sm:w-auto"
            style={{
              backgroundColor: '#090725',
              backgroundImage: 'linear-gradient(to right, #090725, #0d0a3a, #090725)',
            }}
          >
            <Video size={18} className="sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Agende uma Demonstração Online</span>
          </a>
        </div>
      </div>
    </section>
  );
}
