import type { StandingsReportGroup } from '@/lib/pdf/reportsPdf';
import type { CompetitionProbabilityResult } from '@/types/classificationProbability';
import { ClassificationProbabilitySection } from './ClassificationProbabilitySection';
import { Trophy } from 'lucide-react';

interface StandingsReportViewProps {
  groups: StandingsReportGroup[];
  probabilityResult?: CompetitionProbabilityResult;
}

export function StandingsReportView({ groups, probabilityResult }: StandingsReportViewProps) {
  if (groups.length === 0) {
    return (
      <div className="p-8 text-center rounded-xl bg-card border border-border text-muted-foreground text-xs">
        Nenhuma tabela de classificação disponível para esta competição no momento.
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="standings-report-view">
      {groups.map((group) => (
        <div key={group.groupName} className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-amber-500/10 text-amber-400">
              <Trophy className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-sm font-bold text-foreground">
              Grupo {group.groupName} — Classificação Oficial
            </h4>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-xs report-table">
              <thead>
                <tr className="border-b border-border bg-zinc-900/80 text-muted-foreground font-semibold text-center">
                  <th className="py-2.5 px-3 w-12 text-center font-mono">Pos</th>
                  <th className="py-2.5 px-3 text-left">Equipe</th>
                  <th className="py-2.5 px-2.5 w-12 font-bold text-foreground font-mono">P</th>
                  <th className="py-2.5 px-2 w-10 font-mono">J</th>
                  <th className="py-2.5 px-2 w-10 font-mono">V</th>
                  <th className="py-2.5 px-2 w-10 font-mono">D</th>
                  <th className="py-2.5 px-2 w-12 font-mono">Sets V</th>
                  <th className="py-2.5 px-2 w-12 font-mono">Sets P</th>
                  <th className="py-2.5 px-2 w-14 font-mono">Set Avg</th>
                  <th className="py-2.5 px-2 w-12 font-mono">Pts V</th>
                  <th className="py-2.5 px-2 w-12 font-mono">Pts P</th>
                  <th className="py-2.5 px-2 w-14 font-mono">Pts Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {group.standings.map((st, idx) => {
                  const isTop = idx < 2;
                  return (
                    <tr
                      key={st.teamId}
                      className={`hover:bg-zinc-900/40 transition-colors ${
                        isTop ? 'bg-amber-500/[0.02]' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-center font-mono font-bold">
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${
                            idx === 0
                              ? 'bg-amber-500 text-zinc-950 font-bold'
                              : idx === 1
                              ? 'bg-zinc-300 text-zinc-950 font-bold'
                              : idx === 2
                              ? 'bg-amber-700 text-white font-bold'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {st.position}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate max-w-[200px]">
                            {st.teamName}
                          </span>
                          {st.teamShortName && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({st.teamShortName})
                            </span>
                          )}
                          {st.tiebreakReason && (
                            <span
                              className="text-[9px] px-1 py-0.5 rounded bg-zinc-800 text-amber-400 font-mono truncate max-w-[120px]"
                              title={st.tiebreakReason}
                            >
                              {st.tiebreakReason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 text-center font-bold text-foreground font-mono tabular-nums bg-zinc-900/30">
                        {st.competitionPoints}
                      </td>
                      <td className="py-2 px-2 text-center font-mono tabular-nums text-muted-foreground">
                        {st.matchesPlayed}
                      </td>
                      <td className="py-2 px-2 text-center font-mono tabular-nums text-emerald-400 font-medium">
                        {st.matchesWon}
                      </td>
                      <td className="py-2 px-2 text-center font-mono tabular-nums text-zinc-400">
                        {st.matchesLost}
                      </td>
                      <td className="py-2 px-2 text-center font-mono tabular-nums text-muted-foreground">
                        {st.setsWon}
                      </td>
                      <td className="py-2 px-2 text-center font-mono tabular-nums text-muted-foreground">
                        {st.setsLost}
                      </td>
                      <td className="py-2 px-2 text-center font-mono tabular-nums font-medium text-foreground">
                        {st.setsRatio.toFixed(3)}
                      </td>
                      <td className="py-2 px-2 text-center font-mono tabular-nums text-muted-foreground">
                        {st.pointsWon}
                      </td>
                      <td className="py-2 px-2 text-center font-mono tabular-nums text-muted-foreground">
                        {st.pointsLost}
                      </td>
                      <td className="py-2 px-2 text-center font-mono tabular-nums font-medium text-foreground">
                        {st.pointsRatio.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Legenda Normativa de Desempate CBV/FIVB */}
      <div className="p-3 rounded-lg bg-zinc-900/40 border border-border text-[11px] text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">
          Critérios Oficiais de Classificação e Desempate (CBV / FIVB):
        </p>
        <p className="leading-relaxed">
          1º Pontos Ganhos (3 pts p/ vitória 3x0 ou 3x1; 2 pts p/ vitória 3x2; 1 pt p/ derrota 2x3; 0 pts p/ derrota 0x3 ou 1x3) ·
          2º Número de Vitórias · 3º Set Average (Sets Vencidos ÷ Sets Perdidos) · 4º Pontos Average (Pontos Pró ÷ Pontos Contra) ·
          5º Confronto Direto (entre 2 equipes).
        </p>
      </div>

      {/* Seção Contextual de Probabilidade de Classificação (Fase 5) */}
      {probabilityResult && <ClassificationProbabilitySection probabilityResult={probabilityResult} />}
    </div>
  );
}
