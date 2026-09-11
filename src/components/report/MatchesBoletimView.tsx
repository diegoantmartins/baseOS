import type { MatchBoletimRow } from '@/lib/pdf/reportsPdf';
import { Calendar, MapPin, Trophy } from 'lucide-react';

interface MatchesBoletimViewProps {
  rows: MatchBoletimRow[];
}

export function MatchesBoletimView({ rows }: MatchesBoletimViewProps) {
  if (rows.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-card border border-border text-muted-foreground text-xs">
        Nenhuma partida encontrada para os filtros selecionados nesta competição.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="matches-boletim-view">
      {/* Tabela de Confrontos (Desktop & Tablet) */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-xs report-table">
          <thead>
            <tr className="border-b border-border bg-zinc-900/80 text-muted-foreground font-semibold text-left">
              <th className="py-2.5 px-3 w-14 text-center font-mono">#</th>
              <th className="py-2.5 px-3 w-36">Fase / Chave</th>
              <th className="py-2.5 px-3 w-40">Data & Local</th>
              <th className="py-2.5 px-3 text-right">Mandante (Equipe A)</th>
              <th className="py-2.5 px-3 w-28 text-center font-mono">Placar</th>
              <th className="py-2.5 px-3 text-left">Visitante (Equipe B)</th>
              <th className="py-2.5 px-3 w-28 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row) => {
              const hasScore = row.scoreA !== undefined && row.scoreB !== undefined;
              return (
                <tr key={row.matchNumber} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="py-2 px-3 text-center font-mono text-muted-foreground font-bold">
                    {row.matchNumber}
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-semibold text-foreground block truncate">
                      {row.phase || 'Classificatória'}
                    </span>
                    {row.groupName && (
                      <span className="text-[10px] text-muted-foreground block font-mono">
                        Grupo {row.groupName}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-foreground font-mono block">
                      {row.date} {row.time ? `· ${row.time}` : ''}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {row.venue} {row.court ? `(${row.court})` : ''}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-semibold text-foreground truncate max-w-[140px]">
                        {row.teamAName}
                      </span>
                      {row.teamALogo ? (
                        <img
                          src={row.teamALogo}
                          alt={row.teamAName}
                          className="w-5 h-5 rounded object-contain bg-zinc-950 p-0.5 border border-zinc-800 shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-300 shrink-0">
                          {(row.teamAShort || row.teamAName).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center font-mono tabular-nums font-bold">
                    {hasScore ? (
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-foreground">
                        {row.scoreA} × {row.scoreB}
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-normal">vs</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-left">
                    <div className="flex items-center justify-start gap-2">
                      {row.teamBLogo ? (
                        <img
                          src={row.teamBLogo}
                          alt={row.teamBName}
                          className="w-5 h-5 rounded object-contain bg-zinc-950 p-0.5 border border-zinc-800 shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-300 shrink-0">
                          {(row.teamBShort || row.teamBName).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-foreground truncate max-w-[140px]">
                        {row.teamBName}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-block ${
                          row.statusLabel === 'Homologado' || row.statusLabel === 'Finalizado'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : row.statusLabel === 'Ao vivo'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                            : row.statusLabel === 'Cancelado'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {row.statusLabel}
                      </span>
                      {row.highlightAthleteName && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[9px] font-bold text-amber-300 max-w-[130px] truncate"
                          title={`Destaque da Partida: ${row.highlightAthleteName}${row.highlightTeamShort ? ` (${row.highlightTeamShort})` : ''}`}
                        >
                          <Trophy className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          <span className="truncate">{row.highlightAthleteName}</span>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
