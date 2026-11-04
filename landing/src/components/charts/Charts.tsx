'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { cn } from '@/utils/cn';

const EASE = [0.22, 1, 0.36, 1] as const;

export function CountUp({
  value,
  duration = 1.4,
  className,
  suffix = '',
}: {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: EASE,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {display.toLocaleString('pt-BR')}
      {suffix}
    </span>
  );
}

export function LineChart({
  values,
  labels,
  className,
  color = '#5346f0',
  height = 120,
}: {
  values: number[];
  labels?: string[];
  className?: string;
  color?: string;
  height?: number;
}) {
  const gradientId = useId();
  const width = 300;
  const pad = 10;
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || maxValue || 1;
  const floor = Math.max(0, minValue - range * 0.6);
  const ceil = maxValue + range * 0.15;
  const points = values.map((value, i) => ({
    x: pad + (i / (values.length - 1)) * (width - pad * 2),
    y: pad + (height - pad * 2) * (1 - (value - floor) / (ceil - floor)),
  }));
  const line = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
    })
    .join(' ');
  const area = `${line} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div className={cn('relative', className)}>
      {/* Reveal por clip-path: pathLength quebra o traço quando combinado com non-scaling-stroke. */}
      <m.svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
        initial={{ clipPath: 'inset(-10% 100% -10% 0)' }}
        whileInView={{ clipPath: 'inset(-10% 0% -10% 0)' }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: EASE }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </m.svg>
      {labels && (
        <div className="mt-1 flex justify-between px-1 text-[10px] text-gray-400">
          {labels.map((label, i) => (
            <span key={`${label}-${i}`}>{label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  segments,
  size = 120,
  thickness = 16,
  center,
  className,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  center?: React.ReactNode;
  className?: string;
}) {
  const radius = 50 - thickness / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let offset = 0;

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth={thickness} className="text-gray-100" />
        {segments.map((segment, i) => {
          const fraction = segment.value / total;
          const dash = fraction * circumference;
          const circle = (
            <m.circle
              key={segment.label}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeDashoffset={-offset}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              whileInView={{ strokeDasharray: `${Math.max(dash - 1.2, 0)} ${circumference}` }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2 + i * 0.15, ease: EASE }}
            />
          );
          offset += dash;
          return circle;
        })}
      </svg>
      {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  );
}

export function BarList({
  items,
  className,
  tone = 'light',
}: {
  items: { label: string; value: number; color?: string }[];
  className?: string;
  tone?: 'light' | 'dark';
}) {
  const max = Math.max(...items.map((item) => item.value));
  return (
    <ul className={cn('space-y-2.5', className)}>
      {items.map((item, i) => (
        <li key={item.label}>
          <div
            className={cn(
              'mb-1 flex items-center justify-between text-[11px]',
              tone === 'dark' ? 'text-white/70' : 'text-gray-600'
            )}
          >
            <span>{item.label}</span>
            <span className={cn('font-semibold tabular-nums', tone === 'dark' ? 'text-white' : 'text-gray-900')}>
              {item.value}
            </span>
          </div>
          <div className={cn('h-1.5 overflow-hidden rounded-full', tone === 'dark' ? 'bg-white/10' : 'bg-gray-100')}>
            <m.div
              className="h-full origin-left rounded-full"
              style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color ?? '#5346f0' }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: EASE }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ColumnChart({
  values,
  labels,
  className,
  color = '#5346f0',
}: {
  values: number[];
  labels: string[];
  className?: string;
  color?: string;
}) {
  const max = Math.max(...values);
  return (
    <div className={cn('flex h-full items-end gap-1.5', className)}>
      {values.map((value, i) => (
        <div key={`${labels[i]}-${i}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <m.div
            className="w-full origin-bottom rounded-t-[3px]"
            style={{ height: `${(value / max) * 100}%`, backgroundColor: color, opacity: 0.35 + (value / max) * 0.65 }}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease: EASE }}
          />
          <span className="text-[9px] text-gray-400">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
