import type { CompetitionProbabilityResult } from '@/types/classificationProbability';
import { Sparkles, CheckCircle2, XCircle, AlertCircle, HelpCircle, Layers } from 'lucide-react';

interface ClassificationProbabilitySectionProps {
  probabilityResult?: CompetitionProbabilityResult;
  className?: string;
}

export function ClassificationProbabilitySection({
  probabilityResult,
  className = '',
}: ClassificationProbabilitySectionProps) {
  if (!probabilityResult || !probabilityResult.isSufficientData) {
    return null;
  }

  return (
    <div
      className={`space-y-6 pt-6 border-t border-border/80 ${className}`}
      data-testid="classification-probability-section"
    >
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-500/[0.03] border border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Probabilidade de Classificação
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                Estimativa Matemática
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Projeção analítica baseada no estado atual da competição, partidas restantes e cenários equiprováveis.
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0 text-[11px] text-muted-foreground font-mono">
          <span>Atualizado às {probabilityResult.generatedAt}</span>
        </div>
      </div>

      {/* Alerta de Melhores Terceiros (se configurado) */}
      {probabilityResult.useBestThirdsWarning && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
          <p>{probabilityResult.useBestThirdsWarning}</p>
        </div>
      )}

      {/* Tabelas de Probabilidade por Grupo */}
      {probabilityResult.groups.map((group) => (
        <div key={group.groupName} className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-zinc-800 text-zinc-300">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                Grupo {group.groupName} · {group.advancingCount} {group.advancingCount === 1 ? 'Vaga Direta' : 'Vagas Diretas'}
              </h4>
            </div>

            {/* Metodologia e Cenários */}
            <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 flex-wrap">
              <span className="text-foreground font-semibold">
                {group.scenariosEvaluated.toLocaleString('pt-BR')} cenários avaliados
              </span>
              <span>•</span>
              <span className="text-zinc-400">
                {group.methodology === 'deterministic'
                  ? 'Exaustão determinística (100%)'
                  : group.methodology === 'completed'
                  ? 'Fase concluída'
                  : 'Monte Carlo (10.000 iterações)'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-xs report-table">
              <thead>
                <tr className="border-b border-border bg-zinc-900/80 text-muted-foreground font-semibold text-center">
                  <th className="py-2.5 px-3 w-12 text-center font-mono">Pos</th>
                  <th className="py-2.5 px-3 text-left">Equipe</th>
                  <th className="py-2.5 px-2.5 w-14 font-mono font-bold text-foreground">Pts</th>
                  <th className="py-2.5 px-2 w-12 font-mono">Restantes</th>
                  <th className="py-2.5 px-2.5 w-24 font-mono">Faixa (Mín–Máx)</th>
                  <th className="py-2.5 px-3 text-left">Vaga-Alvo</th>
                  <th className="py-2.5 px-3 w-32 text-center font-bold text-foreground">Chance Estimada</th>
                  <th className="py-2.5 px-3 w-40 text-left">Status Matemático</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {group.teams.map((t) => {
                  const isQualified = t.mathematicalStatus === 'qualified';
                  const isEliminated = t.mathematicalStatus === 'eliminated';
                  const isTopProb = t.probabilityPercent >= 50;

                  return (
                    <tr
                      key={t.teamId}
                      className={`hover:bg-zinc-900/40 transition-colors ${
                        isQualified
                          ? 'bg-emerald-500/[0.02]'
                          : isEliminated
                          ? 'opacity-70 bg-zinc-950/20'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">
                        {t.currentPosition}º
                      </td>
                      <td className="py-2.5 px-3 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground truncate max-w-[200px]">
                            {t.teamName}
                          </span>
                          {t.teamShortName && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({t.teamShortName})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-mono font-bold text-foreground tabular-nums bg-zinc-900/30">
                        {t.currentPoints}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono tabular-nums text-muted-foreground">
                        {t.remainingMatchesCount}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-mono tabular-nums text-zinc-400">
                        {t.minPossiblePoints} – {t.maxPossiblePoints} pts
                      </td>
                      <td className="py-2.5 px-3 text-left text-muted-foreground font-mono text-[11px]">
                        {t.targetPhaseDescription}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className={`font-mono font-bold tabular-nums text-sm ${
                              isQualified
                                ? 'text-emerald-400'
                                : isEliminated
                                ? 'text-zinc-500'
                                : isTopProb
                                ? 'text-amber-400'
                                : 'text-foreground'
                            }`}
                          >
                            {t.probabilityPercent.toFixed(1)}%
                          </span>
                        </div>
                        {/* Contagem de Cenários Favoráveis */}
                        <span className="text-[10px] text-zinc-500 font-mono block">
                          {t.favorableScenarios.toLocaleString('pt-BR')} / {t.totalScenarios.toLocaleString('pt-BR')} cenários
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-left">
                        {isQualified ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Garantido</span>
                          </div>
                        ) : isEliminated ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700 text-[11px] font-semibold">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Sem chances</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span>Em disputa</span>
                          </div>
                        )}

                        {/* Indicação de Base da Prova */}
                        {t.proofBasis === 'deterministic_exhaustion' && isQualified && (
                          <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
                            Provado por exaustão 100%
                          </span>
                        )}
                        {t.proofBasis === 'points_bound' && isQualified && (
                          <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
                            Provado por limite de pontos
                          </span>
                        )}
                        {t.tieBreakUncertainty && (
                          <span className="text-[9px] text-amber-500/80 font-mono block mt-0.5">
                            Desempate fino em aberto
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Nota Metodológica de Transparência Obrigatória */}
      <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-border text-xs text-muted-foreground space-y-1.5">
        <div className="flex items-center gap-1.5 text-foreground font-semibold text-[11px]">
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Metodologia e Transparência Analítica:</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          O cálculo baseia-se no <strong>Modelo de Cenários Equiprováveis</strong> construído sobre todos os placares
          finais regulamentares do voleibol oficial (CBV / FIVB). As simulações não inventam parciais de pontos não
          observados; empates no limite de classificação são sinalizados explicitamente.
        </p>
        <p className="text-[10px] text-zinc-500 font-mono">
          Aviso Legal: Os valores apresentados são estimativas matemáticas probabilísticas sobre cenários teóricos
          e <strong>não constituem garantia ou previsão de resultado esportivo real</strong>.
        </p>
      </div>
    </div>
  );
}
