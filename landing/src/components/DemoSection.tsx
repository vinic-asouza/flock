'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import { AnimatePresence, useInView, useReducedMotion, type PanInfo } from 'motion/react';
import * as m from 'motion/react-m';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PRODUCT_SCREENS, type ProductScreen, type ScreenCallout } from '@/content/productScreens';
import { FAKE_SCREEN_HEIGHT, FAKE_SCREEN_WIDTH, FakeScreen } from '@/components/product/FakeScreens';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/motion/Reveal';
import { cn } from '@/utils/cn';

const AUTOPLAY_MS = 7000;
const EASE = [0.22, 1, 0.36, 1] as const;

function useContainerScale(designWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / designWidth);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [designWidth]);

  return { ref, scale };
}

function CalloutPin({ callout }: { callout: ScreenCallout }) {
  const place = callout.place ?? 'above';
  const labelClass = {
    above: 'bottom-full left-1/2 mb-6 -translate-x-1/2',
    'above-start': 'bottom-full left-0 mb-6',
    'above-end': 'bottom-full right-0 mb-6',
  }[place];

  return (
    <span className="absolute" style={{ left: `${callout.x}%`, top: `${callout.y}%` }}>
      <span className={cn('absolute rounded-full bg-primary/92 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-lg ring-1 ring-white/20 backdrop-blur', labelClass)}>
        {callout.label}
      </span>
      <span className="absolute flex h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2">
        <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-accent-400/80" />
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-accent-500 shadow-[0_0_0_4px_rgb(83_70_240/0.18)]" />
      </span>
    </span>
  );
}

function ScreenView({ screen }: { screen: ProductScreen }) {
  const { ref, scale } = useContainerScale(FAKE_SCREEN_WIDTH);

  if (screen.src) {
    return (
      <Image
        src={screen.src}
        alt={screen.alt}
        fill
        sizes="(min-width: 1280px) 1100px, 100vw"
        className="object-cover object-top"
      />
    );
  }

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden" role="img" aria-label={`${screen.alt} (prévia ilustrativa)`}>
      {scale !== null && (
        <div className="origin-top-left" style={{ transform: `scale(${scale})`, width: FAKE_SCREEN_WIDTH }}>
          <FakeScreen id={screen.id} />
        </div>
      )}
    </div>
  );
}

export function DemoSection() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const inView = useInView(sectionRef, { margin: '-30% 0px -30% 0px' });
  const reduce = useReducedMotion();
  const baseId = useId();
  const screen = PRODUCT_SCREENS[index];
  const autoplay = inView && !paused && !userInteracted && !reduce;

  const goTo = useCallback((next: number, fromUser = true) => {
    const total = PRODUCT_SCREENS.length;
    setIndex(((next % total) + total) % total);
    if (fromUser) setUserInteracted(true);
  }, []);

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setTimeout(() => goTo(index + 1, false), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoplay, index, goTo]);

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = index + 1;
    if (event.key === 'ArrowLeft') next = index - 1;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = PRODUCT_SCREENS.length - 1;
    if (next === null) return;
    event.preventDefault();
    const total = PRODUCT_SCREENS.length;
    const target = ((next % total) + total) % total;
    goTo(target);
    tabRefs.current[target]?.focus();
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) goTo(index + 1);
    else if (info.offset.x > 60) goTo(index - 1);
  };

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="relative hidden scroll-mt-20 overflow-hidden bg-canvas py-24 sm:py-28 md:block"
      onPointerEnter={(event) => event.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div aria-hidden className="bg-grid-light pointer-events-none absolute inset-x-0 top-0 h-96" />
      <div className="relative mx-auto max-w-6xl px-8 sm:px-10 lg:px-8">
        <SectionHeading
          eyebrow="Demonstração"
          title="Conheça o Flock por dentro"
          description="Navegue pelos módulos e veja como cada parte da igreja fica organizada, sem precisar criar uma conta."
        />

        <Reveal delay={0.1} className="mt-12">
          <div
            role="tablist"
            aria-label="Módulos da demonstração"
            onKeyDown={onTabKeyDown}
            className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-auto sm:w-fit sm:justify-center sm:rounded-full sm:bg-white sm:p-1.5 sm:shadow-sm sm:ring-1 sm:ring-gray-200/80"
          >
            {PRODUCT_SCREENS.map((item, i) => {
              const selected = i === index;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${item.id}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => goTo(i)}
                  className={cn(
                    'relative min-h-11 shrink-0 snap-start overflow-hidden rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
                    selected ? 'text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:text-primary sm:bg-transparent sm:ring-0'
                  )}
                >
                  {selected && (
                    <m.span
                      layoutId={`${baseId}-demo-tab`}
                      className="absolute inset-0 rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    />
                  )}
                  {selected && autoplay && (
                    <m.span
                      key={`progress-${index}`}
                      aria-hidden
                      className="absolute inset-x-3 bottom-1 h-[2px] origin-left rounded-full bg-accent-300"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: AUTOPLAY_MS / 1000, ease: 'linear' }}
                    />
                  )}
                  <span className="relative">{item.navLabel}</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={0.15} y={40} className="relative mt-8">
          <div aria-hidden className="absolute -inset-x-10 -top-10 -bottom-16 -z-0 rounded-[3rem] bg-[radial-gradient(closest-side,rgb(83_70_240/0.18),transparent)] blur-2xl" />
          <div
            id={`${baseId}-panel`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${screen.id}`}
            className="group/frame relative rounded-[1.4rem] bg-gradient-to-b from-white to-white/60 p-1.5 shadow-[0_50px_120px_-40px_rgb(9_7_37/0.45)] ring-1 ring-gray-200/80 sm:p-2"
          >
            <button
              type="button"
              aria-label="Módulo anterior"
              onClick={() => goTo(index - 1)}
              className="absolute top-1/2 left-0 z-30 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-primary shadow-[0_12px_30px_-12px_rgb(9_7_37/0.5)] ring-1 ring-gray-200/80 transition-[transform,background-color,color,box-shadow] duration-300 hover:scale-110 hover:bg-primary hover:text-white hover:shadow-[0_16px_36px_-12px_rgb(9_7_37/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              <ChevronLeft aria-hidden className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Próximo módulo"
              onClick={() => goTo(index + 1)}
              className="absolute top-1/2 right-0 z-30 flex h-12 w-12 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-primary shadow-[0_12px_30px_-12px_rgb(9_7_37/0.5)] ring-1 ring-gray-200/80 transition-[transform,background-color,color,box-shadow] duration-300 hover:scale-110 hover:bg-primary hover:text-white hover:shadow-[0_16px_36px_-12px_rgb(9_7_37/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              <ChevronRight aria-hidden className="h-5 w-5" />
            </button>
            <m.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={onDragEnd}
              className="relative cursor-grab touch-pan-y overflow-hidden rounded-[1rem] bg-canvas active:cursor-grabbing md:aspect-[1040/650]"
            >
              <AnimatePresence initial={false} mode="wait">
                <m.div
                  key={screen.id}
                  className="md:absolute md:inset-0"
                  initial={{ opacity: 0, scale: 1.02, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <div className="md:hidden">
                    <FakeScreen id={screen.id} focus />
                  </div>
                  <div className="absolute inset-0 hidden md:block">
                    <ScreenView screen={screen} />
                  </div>
                </m.div>
              </AnimatePresence>

              <div className="pointer-events-none absolute inset-0 hidden md:block">
                <AnimatePresence>
                  {screen.callouts.map((callout, i) => (
                    <m.div
                      key={`${screen.id}-${callout.label}`}
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      transition={{ delay: 0.35 + i * 0.18, duration: 0.4, ease: EASE }}
                    >
                      <CalloutPin callout={callout} />
                    </m.div>
                  ))}
                </AnimatePresence>
              </div>
            </m.div>

            <div className="pointer-events-none absolute bottom-3 left-3 z-20 max-w-[min(20rem,calc(100%-5.5rem))] sm:bottom-5 sm:left-5 sm:max-w-sm" aria-live={userInteracted ? 'polite' : 'off'}>
              <AnimatePresence mode="wait" initial={false}>
                <m.div
                  key={screen.id}
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <div className="rounded-2xl border border-white/80 bg-white/92 p-4 shadow-[0_22px_50px_-24px_rgb(9_7_37/0.55)] ring-1 ring-primary/10 backdrop-blur-md transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/frame:-translate-y-2">
                    <h3 className="text-base font-bold tracking-[-0.01em] text-primary sm:text-lg">{screen.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{screen.description}</p>
                    <p className="mt-2.5 text-[11px] text-gray-400">Prévia ilustrativa. Dados não representam cliente real.</p>
                  </div>
                </m.div>
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
