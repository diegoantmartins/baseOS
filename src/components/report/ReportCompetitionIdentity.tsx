import { useMemo } from 'react';
import type { CompetitionRecord } from '@/types/entities';
import { sortSupporters } from '@/lib/supporters';
import { Trophy } from 'lucide-react';

interface ReportCompetitionIdentityProps {
  competition: CompetitionRecord;
  generatedAt?: string;
  className?: string;
}

export function ReportCompetitionIdentity({
  competition,
  generatedAt,
  className = '',
}: ReportCompetitionIdentityProps) {
  const sortedSupporters = useMemo(() => {
    if (!competition.supporters || competition.supporters.length === 0) return [];
    return sortSupporters(competition.supporters);
  }, [competition.supporters]);

  const modalityLabel = competition.modality === 'beach' ? 'Vôlei de Praia' : 'Voleibol de Quadra';
  const genderLabel =
    competition.genderCategory === 'male'
      ? 'Masculino'
      : competition.genderCategory === 'female'
      ? 'Feminino'
      : 'Misto';
  const formatLabel = `${competition.playerFormat || '6x6'} · ${competition.setFormat || '3 sets'}`;

  return (
    <div
      className={`p-5 rounded-xl bg-card border border-border space-y-4 ${className}`}
      data-testid="report-competition-identity"
    >
      {/* Cabeçalho de Identidade da Competição */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {competition.logoUrl ? (
            <img
              src={competition.logoUrl}
              alt={competition.name}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-contain bg-zinc-950 p-1 border border-zinc-800 shrink-0 shadow-xs"
            />
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-amber-500 shadow-xs">
              <Trophy className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                {modalityLabel}
              </span>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground font-mono">
                {genderLabel}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                • {formatLabel}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
              {competition.name}
            </h2>
            {competition.venue && (
              <p className="text-xs text-muted-foreground truncate">
                Local: {competition.venue}
              </p>
            )}
          </div>
        </div>

        {/* Atribuição da Plataforma e Carimbo de Data */}
        <div className="text-left sm:text-right shrink-0 space-y-0.5">
          <div className="flex items-center sm:justify-end gap-1.5 text-xs text-zinc-400 font-medium">
            <span>Powered by</span>
            <span className="font-bold tracking-tight text-foreground">
              Base<span className="text-amber-500">OS</span>
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
            {generatedAt ? `Emissão: ${generatedAt}` : 'Documento Oficial Homologado'}
          </p>
        </div>
      </div>

      {/* Apoiadores da Competição (Fase 2) */}
      {sortedSupporters.length > 0 && (
        <div className="pt-3 border-t border-border/60 space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">
            Apoiadores da Competição
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            {sortedSupporters.map((sup) => {
              const tierBadge =
                sup.tier === 'master'
                  ? 'Master'
                  : sup.tier === 'official'
                  ? 'Oficial'
                  : sup.tier === 'support'
                  ? 'Apoio'
                  : sup.tier === 'media'
                  ? 'Mídia'
                  : null;

              const content = (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-foreground">
                  {sup.logoUrl ? (
                    <img
                      src={sup.logoUrl}
                      alt={sup.name}
                      className="w-5 h-5 rounded object-contain bg-zinc-950 p-0.5 border border-zinc-800 shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                      {sup.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-xs truncate max-w-[140px]">{sup.name}</span>
                  {tierBadge && (
                    <span className="text-[9px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1 rounded font-mono">
                      {tierBadge}
                    </span>
                  )}
                </div>
              );

              if (sup.websiteUrl) {
                return (
                  <a
                    key={sup.id}
                    href={sup.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-85 transition-opacity"
                  >
                    {content}
                  </a>
                );
              }

              return <div key={sup.id}>{content}</div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
