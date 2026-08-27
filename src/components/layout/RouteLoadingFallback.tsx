import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function RouteLoadingFallback() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="min-h-screen bg-background text-foreground flex flex-col"
    >
      <span className="sr-only">Carregando conteúdo da visualização...</span>

      {/* Header Skeleton Bar */}
      <div className="h-14 border-b border-border bg-zinc-950/60 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-32 bg-zinc-800/80 rounded" />
          <Skeleton className="h-4 w-20 bg-zinc-800/50 rounded hidden sm:block" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 bg-zinc-800/60 rounded" />
          <Skeleton className="h-8 w-8 rounded-full bg-zinc-800/60" />
        </div>
      </div>

      {/* Main Body Skeleton */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 bg-zinc-800/80 rounded" />
          <Skeleton className="h-4 w-96 bg-zinc-800/50 rounded" />
        </div>

        {/* Content Box Skeleton */}
        <div className="border border-border/80 rounded-xl bg-card p-6 space-y-4 shadow-none">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40 bg-zinc-800/70 rounded" />
            <Skeleton className="h-8 w-28 bg-zinc-800/60 rounded" />
          </div>
          <div className="space-y-2.5 pt-2">
            <Skeleton className="h-10 w-full bg-zinc-900/80 rounded" />
            <Skeleton className="h-12 w-full bg-zinc-900/60 rounded" />
            <Skeleton className="h-12 w-full bg-zinc-900/60 rounded" />
            <Skeleton className="h-12 w-full bg-zinc-900/60 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
