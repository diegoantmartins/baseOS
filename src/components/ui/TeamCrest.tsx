import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface TeamCrestProps {
  team?: {
    id?: string;
    name?: string;
    shortName?: string;
    logoUrl?: string | null;
    logo_url?: string | null;
  } | null;
  logoUrl?: string | null;
  name?: string;
  shortName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';
  className?: string;
  shieldClassName?: string;
  showBorder?: boolean;
}

const SHIELD_GRADIENTS = [
  { id: 'grad-blue', from: '#1e3a8a', to: '#0284c7', border: '#38bdf8', text: '#ffffff' },
  { id: 'grad-gold', from: '#78350f', to: '#d97706', border: '#fbbf24', text: '#ffffff' },
  { id: 'grad-crimson', from: '#831843', to: '#e11d48', border: '#fda4af', text: '#ffffff' },
  { id: 'grad-emerald', from: '#064e3b', to: '#059669', border: '#34d399', text: '#ffffff' },
  { id: 'grad-violet', from: '#4c1d95', to: '#7c3aed', border: '#c4b5fd', text: '#ffffff' },
  { id: 'grad-teal', from: '#134e4a', to: '#0d9488', border: '#5eead4', text: '#ffffff' },
  { id: 'grad-orange', from: '#7c2d12', to: '#ea580c', border: '#fdba74', text: '#ffffff' },
  { id: 'grad-navy', from: '#1e1b4b', to: '#312e81', border: '#818cf8', text: '#ffffff' },
  { id: 'grad-amber', from: '#713f12', to: '#b45309', border: '#fcd34d', text: '#ffffff' },
  { id: 'grad-slate', from: '#0f172a', to: '#334155', border: '#94a3b8', text: '#ffffff' },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const SIZE_STYLES = {
  xs: 'h-5 w-5 min-w-[20px] text-[8px]',
  sm: 'h-7 w-7 min-w-[28px] text-[10px]',
  md: 'h-11 w-11 min-w-[44px] text-xs',
  lg: 'h-16 w-16 min-w-[64px] text-base',
  xl: 'h-24 w-24 min-w-[96px] text-2xl',
  '2xl': 'h-28 w-28 min-w-[112px] text-3xl',
  custom: '',
};

export function TeamCrest({
  team,
  logoUrl: propLogoUrl,
  name: propName,
  shortName: propShortName,
  size = 'md',
  className,
  shieldClassName,
  showBorder = true,
}: TeamCrestProps) {
  const [imgError, setImgError] = useState(false);

  const resolvedLogoUrl = propLogoUrl ?? team?.logoUrl ?? team?.logo_url ?? null;
  const resolvedName = propName ?? team?.name ?? 'Equipe';
  const resolvedShort = (
    propShortName ??
    team?.shortName ??
    resolvedName.slice(0, 3)
  ).toUpperCase();

  // Reset do estado de erro quando a URL da imagem mudar
  const [prevUrl, setPrevUrl] = useState(resolvedLogoUrl);
  if (resolvedLogoUrl !== prevUrl) {
    setPrevUrl(resolvedLogoUrl);
    setImgError(false);
  }

  const gradient = useMemo(() => {
    const idx = hashString(resolvedName) % SHIELD_GRADIENTS.length;
    return SHIELD_GRADIENTS[idx];
  }, [resolvedName]);

  const initials = useMemo(() => {
    if (resolvedShort && resolvedShort.length <= 4) {
      return resolvedShort;
    }
    const words = resolvedName.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return resolvedName.slice(0, 3).toUpperCase();
  }, [resolvedName, resolvedShort]);

  const sizeClass = SIZE_STYLES[size];

  // Caso 1: Imagem Real disponível e válida
  if (resolvedLogoUrl && !imgError) {
    return (
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900/90 shadow-md backdrop-blur-sm transition-transform duration-200',
          showBorder && 'border border-white/20 ring-1 ring-white/10',
          sizeClass,
          className
        )}
      >
        <img
          src={resolvedLogoUrl}
          alt={resolvedName}
          onError={() => setImgError(true)}
          className="h-full w-full object-contain p-1 drop-shadow-sm select-none"
          loading="lazy"
        />
      </div>
    );
  }

  // Caso 2: Brasão Vetorial Esportivo (SVG Shield) de Alta Definição
  const gradId = `${gradient.id}-${hashString(resolvedName)}`;

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-md transition-transform duration-200',
        sizeClass,
        className
      )}
      title={resolvedName}
    >
      <svg
        viewBox="0 0 100 115"
        className={cn('h-full w-full drop-shadow select-none', shieldClassName)}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradient.from} />
            <stop offset="100%" stopColor={gradient.to} />
          </linearGradient>
          <linearGradient id={`${gradId}-glare`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Silhueta Clássica de Brasão Esportivo */}
        <path
          d="M 50,3 C 78,3 95,12 95,30 C 95,78 68,102 50,112 C 32,102 5,78 5,30 C 5,12 22,3 50,3 Z"
          fill={`url(#${gradId})`}
        />

        {/* Brilho Superior Curvo (Reflexo de estúdio) */}
        <path
          d="M 50,5 C 76,5 92,13 92,30 C 92,55 78,75 50,85 C 22,75 8,55 8,30 C 8,13 24,5 50,5 Z"
          fill={`url(#${gradId}-glare)`}
        />

        {/* Moldura / Friso do Escudo */}
        {showBorder && (
          <>
            <path
              d="M 50,3 C 78,3 95,12 95,30 C 95,78 68,102 50,112 C 32,102 5,78 5,30 C 5,12 22,3 50,3 Z"
              fill="none"
              stroke={gradient.border}
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M 50,8 C 74,8 89,16 89,32 C 89,74 65,96 50,105 C 35,96 11,74 11,32 C 11,16 26,8 50,8 Z"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.25"
              strokeWidth="1.5"
            />
          </>
        )}

        {/* Iniciais da Equipe em Tipografia Esportiva Imponente */}
        <text
          x="50"
          y="62"
          textAnchor="middle"
          dominantBaseline="central"
          fill={gradient.text}
          fontWeight="900"
          fontFamily="'Inter', 'Arial Black', sans-serif"
          fontSize={initials.length >= 4 ? '26' : initials.length === 3 ? '30' : '36'}
          letterSpacing="1"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
        >
          {initials}
        </text>
      </svg>
    </div>
  );
}
