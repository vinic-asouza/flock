'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface DashboardImageProps {
  src: string;
  alt: string;
  className?: string;
  delay?: number;
  animationDelay?: number;
}

function DashboardImage({ src, alt, className = '', delay = 0, animationDelay = 0 }: DashboardImageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (imgRef.current) {
        const rect = imgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        setMousePosition({ x: x * 0.1, y: y * 0.1 });
      }
    };

    const handleMouseLeave = () => {
      setMousePosition({ x: 0, y: 0 });
    };

    const element = imgRef.current;
    if (element) {
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (element) {
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (imgRef.current) {
        const scrollY = window.scrollY;
        const offset = Math.sin((scrollY * 0.005) + animationDelay) * 10;
        imgRef.current.style.setProperty('--scroll-offset', `${offset}px`);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [animationDelay]);

  return (
    <div
      ref={imgRef}
      className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className}`}
      style={{
        transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
        transition: 'transform 0.3s ease-out',
      }}
    >
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100 transform transition-all duration-300 hover:scale-105 hover:shadow-3xl">
          <div className="aspect-video relative overflow-hidden">
            <Image
              src={src}
              alt={alt}
              fill
              className="object-cover object-top"
              quality={100}
              sizes="(max-width: 768px) 320px, (max-width: 1024px) 384px, 512px"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardPreview() {
  const images = [
    { src: '/demo/main1.png', alt: 'Dashboard - Painel de Informações', delay: 0, animationDelay: 0 },
    { src: '/demo/main2.png', alt: 'Dashboard - Gráficos e Estatísticas', delay: 100, animationDelay: 1 },
    { src: '/demo/main3.png', alt: 'Dashboard - Demografia', delay: 200, animationDelay: 2 },
    { src: '/demo/main4.png', alt: 'Dashboard - Gestão de Membros', delay: 300, animationDelay: 3 },
  ];

  return (
    <div className="relative w-full h-full min-h-[600px] lg:min-h-[800px] flex items-center justify-center">
      {/* Imagem 1 - Esquerda, levemente acima do centro */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-y-20 w-80 lg:w-96 xl:w-[28rem] z-10">
        <DashboardImage
          src={images[0].src}
          alt={images[0].alt}
          delay={images[0].delay}
          animationDelay={images[0].animationDelay}
          className="hover:z-20"
        />
      </div>

      {/* Imagem 2 - Direita, levemente acima do centro */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 -translate-y-16 w-80 lg:w-96 xl:w-[28rem] z-20">
        <DashboardImage
          src={images[1].src}
          alt={images[1].alt}
          delay={images[1].delay}
          animationDelay={images[1].animationDelay}
          className="hover:z-30"
        />
      </div>

      {/* Imagem 3 - Esquerda, levemente abaixo do centro */}
      <div className="absolute top-1/2 left-16 -translate-y-1/2 translate-y-16 w-80 lg:w-96 xl:w-[28rem] z-30">
        <DashboardImage
          src={images[2].src}
          alt={images[2].alt}
          delay={images[2].delay}
          animationDelay={images[2].animationDelay}
          className="hover:z-40"
        />
      </div>

      {/* Imagem 4 - Direita, levemente abaixo do centro */}
      <div className="absolute top-1/2 right-16 -translate-y-1/2 translate-y-20 w-80 lg:w-96 xl:w-[28rem] z-40">
        <DashboardImage
          src={images[3].src}
          alt={images[3].alt}
          delay={images[3].delay}
          animationDelay={images[3].animationDelay}
          className="hover:z-50"
        />
      </div>
    </div>
  );
}

