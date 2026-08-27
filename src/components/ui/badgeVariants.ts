import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

// Status pills: retangulares (radius 6px), fundo contido, sem bordas chamativas.
export const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-zinc-800 text-zinc-300',
        destructive: 'border-transparent bg-destructive/15 text-red-400',
        success: 'border-transparent bg-emerald-500/10 text-emerald-400',
        warning: 'border-transparent bg-amber-500/10 text-amber-400',
        accent: 'border-transparent bg-primary text-primary-foreground',
        info: 'border-transparent bg-zinc-800 text-zinc-300',
        muted: 'border-transparent bg-zinc-800/60 text-muted-foreground',
        outline: 'border-border text-muted-foreground',
        // Status esportivos (contidos, sem brilho)
        scheduled: 'border-transparent bg-zinc-800 text-zinc-300',
        live: 'border-transparent bg-amber-500/10 text-amber-400',
        completed: 'border-transparent bg-emerald-500/10 text-emerald-400',
        homologated: 'border-transparent bg-emerald-500/10 text-emerald-400',
        pending: 'border-transparent bg-zinc-800/60 text-muted-foreground',
        cancelled: 'border-transparent bg-destructive/15 text-red-400',
        walkover: 'border-transparent bg-violet-500/10 text-violet-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
