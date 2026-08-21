import React from 'react';
import { cn } from '@/lib/utils';

interface BaseOsLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showSubtitle?: boolean;
  className?: string;
  iconClassName?: string;
}

export function BaseOsLogo({
  size = 'md',
  showText = true,
  showSubtitle = false,
  className,
  iconClassName,
  ...props
}: BaseOsLogoProps) {
  const iconDimensions = {
    sm: { w: 20, h: 20, textClass: 'text-base', subClass: 'text-[8px]' },
    md: { w: 26, h: 26, textClass: 'text-lg', subClass: 'text-[9px]' },
    lg: { w: 32, h: 32, textClass: 'text-2xl', subClass: 'text-[10px]' },
    xl: { w: 42, h: 42, textClass: 'text-3xl', subClass: 'text-xs' },
  }[size];

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)} {...props}>
      {/* SVG Icon: Três blocos empilhados com avanço de chaves */}
      <svg
        width={iconDimensions.w}
        height={iconDimensions.h}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.25)]', iconClassName)}
        aria-label="BaseOS Logo"
      >
        <defs>
          <linearGradient id="baseos-top-grad" x1="2" y1="4" x2="20" y2="8.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f4f4f5" />
            <stop offset="1" stopColor="#a1a1aa" />
          </linearGradient>
          <linearGradient id="baseos-mid-grad" x1="8" y1="11.75" x2="26" y2="16.25" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f59e0b" />
            <stop offset="1" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="baseos-bot-grad" x1="2" y1="19.5" x2="20" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f4f4f5" />
            <stop offset="1" stopColor="#a1a1aa" />
          </linearGradient>
        </defs>

        {/* Bloco Superior (Base) */}
        <rect x="2" y="4" width="18" height="4.5" rx="2" fill="url(#baseos-top-grad)" />

        {/* Bloco do Meio (Avanço / Chaveamento deslocado à direita) */}
        <rect x="8" y="11.75" width="18" height="4.5" rx="2" fill="url(#baseos-mid-grad)" />

        {/* Bloco Inferior (Estrutural) */}
        <rect x="2" y="19.5" width="18" height="4.5" rx="2" fill="url(#baseos-bot-grad)" />
      </svg>

      {/* Typography: "Base" em font-bold (texto branco) e "OS" em font-light (amber-500) */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className={cn('font-display tracking-tight flex items-baseline', iconDimensions.textClass)}>
            <span className="font-bold text-zinc-100">Base</span>
            <span className="font-light text-amber-500 ml-0.5 tracking-wide">OS</span>
          </div>
          {showSubtitle && (
            <span className={cn('font-mono uppercase tracking-widest text-zinc-500 mt-0.5', iconDimensions.subClass)}>
              Competition Engine
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default BaseOsLogo;
