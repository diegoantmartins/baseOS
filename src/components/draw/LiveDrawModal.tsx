// Modal do sorteio — único caminho visual do módulo.
// O resultado do sorteio continua vindo do motor puro e é apresentado visualmente.
// Experiência principal: Draw Arena Cinematográfico (Three.js, lazy-loaded).
// Fallback (sem WebGL): DrawScene3D (CSS/Framer Motion).
// Renderizado via Portal diretamente no document.body para garantir isolamento e takeover fullscreen absoluto.

import React, { Suspense } from 'react';
import { createPortal } from 'react-dom';
import { DrawScene3D } from './DrawScene3D';
import { shouldUseDrawArena3D } from '@/config/drawArenaFeatures';
import type { DrawGroup, DrawResult } from '@/types/draw';
import type { TeamRecord, CompetitionRecord } from '@/types/entities';

const DrawArenaController = React.lazy(() =>
  import('./cinematic/DrawArenaController').then((m) => ({ default: m.DrawArenaController })),
);

interface LiveDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  result?: DrawResult | null;
  groups?: DrawGroup[];
  teams: TeamRecord[];
  competition: CompetitionRecord;
  /** ID real do sorteio persistido (para auditoria). Se undefined, não exibe. */
  drawId?: string;
}

function DrawLoadingFallback() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#05070c]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#f0b45d]/30 border-t-[#f0b45d]" />
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
          Iniciando Draw Chamber…
        </p>
      </div>
    </div>
  );
}

export function LiveDrawModal({
  isOpen,
  onClose,
  result,
  groups,
  teams,
  competition,
  drawId,
}: LiveDrawModalProps) {
  if (!isOpen) return null;

  const resolvedResult: DrawResult =
    result ?? {
      competitionId: competition.id,
      config: {
        groupsCount: groups?.length ?? 1,
        seedingMode: 'random',
        seed: 0,
        headSeeds: [],
      },
      groups: groups ?? [],
      matches: [],
      status: 'preview',
    };

  // Feature flag: usar a Urna 3D cinematográfica quando WebGL disponível, senão fallback
  const useArena3D = shouldUseDrawArena3D();

  const content = useArena3D ? (
    <Suspense fallback={<DrawLoadingFallback />}>
      <DrawArenaController
        result={resolvedResult}
        teams={teams}
        competition={competition}
        onClose={onClose}
        drawId={drawId}
      />
    </Suspense>
  ) : (
    <DrawScene3D
      result={resolvedResult}
      teams={teams}
      competition={competition}
      onClose={onClose}
    />
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}
