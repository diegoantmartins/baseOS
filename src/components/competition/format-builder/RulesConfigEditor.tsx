import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw } from 'lucide-react';
import type {
  CompetitionConfig,
  OverallRankingStrategy,
  PhaseFormatOverrides,
  RegistrationRulesConfig,
  ScoringSystemConfig,
  SetsToWin,
  StandingsConfig,
} from '@/types/competitionConfig';
import { cn } from '@/lib/utils';

export interface RulesConfigEditorProps {
  config: CompetitionConfig;
  onUpdateSetsToWin: (setsToWin: SetsToWin) => void;
  onUpdatePhaseOverrides: (overrides: PhaseFormatOverrides) => void;
  onUpdateScoring: (scoring: Partial<ScoringSystemConfig>) => void;
  onUpdateStandings: (standings: Partial<StandingsConfig>) => void;
  onUpdateRegistration: (registration: Partial<RegistrationRulesConfig>) => void;
  disabled?: boolean;
  className?: string;
}

export const RulesConfigEditor: React.FC<RulesConfigEditorProps> = ({
  config,
  onUpdateSetsToWin,
  onUpdatePhaseOverrides,
  onUpdateScoring,
  onUpdateStandings,
  onUpdateRegistration,
  disabled = false,
  className = '',
}) => {
  const setsToWin = config.format.defaultSetsToWin;
  const phaseOverrides = config.format.phaseOverrides || {};
  const scoring = config.scoring;
  const standings = config.standings;
  const registration = config.registration;

  const stage1 = config.format.stages?.[0];
  const stage1ParticipantsCount = useMemo(() => {
    if (!stage1) return undefined;
    if (stage1.participantsCount && stage1.participantsCount > 0) return stage1.participantsCount;
    if (stage1.groupConfig?.groupCapacities && stage1.groupConfig.groupCapacities.length > 0) {
      return stage1.groupConfig.groupCapacities.reduce((sum, c) => sum + (Number(c) || 0), 0);
    }
    if (stage1.groupConfig?.groupsCount && stage1.groupConfig?.teamsPerGroup) {
      return stage1.groupConfig.groupsCount * stage1.groupConfig.teamsPerGroup;
    }
    return undefined;
  }, [stage1]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* 1. Formato de Sets */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3.5">
        <div>
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Formato de Sets Padrão</h4>
          <p className="text-[11px] text-muted-foreground">
            Defina o número de sets necessários para vencer as partidas na fase regular.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Formato Geral</Label>
            <Select
              disabled={disabled}
              value={String(setsToWin)}
              onValueChange={(v) => onUpdateSetsToWin(Number(v) as SetsToWin)}
            >
              <SelectTrigger className="h-8 text-xs bg-zinc-950 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-border">
                <SelectItem value="1">Set Único (1 set)</SelectItem>
                <SelectItem value="2">Melhor de 3 sets (vence 2)</SelectItem>
                <SelectItem value="3">Melhor de 5 sets (vence 3)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Pontos do Set Regular</Label>
            <Input
              type="number"
              value={config.format.setRules.regularSetPoints}
              disabled
              className="h-8 text-xs bg-zinc-950/50 border-border opacity-80"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Pontos do Tiebreak</Label>
            <Input
              type="number"
              value={config.format.setRules.tiebreakPoints}
              disabled
              className="h-8 text-xs bg-zinc-950/50 border-border opacity-80"
            />
          </div>
        </div>

        {/* Sobrescritas de Sets por Fase do Motor */}
        <div className="pt-2 border-t border-border/60 space-y-2">
          <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
            Sobrescritas de Sets por Fase da Competição
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Escolha um formato específico para fases eliminatórias ou mantenha o padrão da competição.
          </p>

          {config.format.stages && config.format.stages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {config.format.stages.map((st, idx) => {
                const rawVal = phaseOverrides[st.id] ?? (
                  st.id === 'final' ? phaseOverrides.final :
                  st.id === 'semifinals' ? phaseOverrides.semifinals :
                  st.id === 'quarterfinals' ? phaseOverrides.quarterfinals :
                  st.id === 'playoffs' ? phaseOverrides.playoffs :
                  st.id === 'groupStage' ? phaseOverrides.groupStage :
                  undefined
                );
                const currentValStr = rawVal ? String(rawVal) : 'default';

                return (
                  <div key={st.id || idx} className="p-2.5 rounded-lg border border-border/80 bg-zinc-950/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground truncate max-w-[170px]" title={st.name || st.id}>
                        {st.name || `Fase ${idx + 1}`}
                      </span>
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">
                        {st.type}
                      </span>
                    </div>
                    <Select
                      disabled={disabled}
                      value={currentValStr}
                      onValueChange={(v) => {
                        const next = { ...phaseOverrides };
                        if (v === 'default') {
                          delete next[st.id];
                          if (st.id === 'final') delete next.final;
                          if (st.id === 'semifinals') delete next.semifinals;
                          if (st.id === 'quarterfinals') delete next.quarterfinals;
                          if (st.id === 'playoffs') delete next.playoffs;
                          if (st.id === 'groupStage') delete next.groupStage;
                        } else {
                          const num = Number(v) as SetsToWin;
                          next[st.id] = num;
                          if (st.id === 'final') next.final = num;
                          if (st.id === 'semifinals') next.semifinals = num;
                          if (st.id === 'quarterfinals') next.quarterfinals = num;
                        }
                        onUpdatePhaseOverrides(next);
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs bg-zinc-900 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-border">
                        <SelectItem value="default">Padrão ({setsToWin === 3 ? 'Melhor de 5' : setsToWin === 2 ? 'Melhor de 3' : '1 set'})</SelectItem>
                        <SelectItem value="2">Melhor de 3 sets (25/25/15)</SelectItem>
                        <SelectItem value="3">Melhor de 5 sets (25/25/25/25/15)</SelectItem>
                        <SelectItem value="1">Set Único (1 set)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground block">Quartas</span>
                <Select
                  disabled={disabled}
                  value={String(phaseOverrides.quarterfinals || setsToWin)}
                  onValueChange={(v) =>
                    onUpdatePhaseOverrides({ ...phaseOverrides, quarterfinals: Number(v) as SetsToWin })
                  }
                >
                  <SelectTrigger className="h-7 text-xs bg-zinc-950 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-border">
                    <SelectItem value="2">Melhor de 3</SelectItem>
                    <SelectItem value="3">Melhor de 5</SelectItem>
                    <SelectItem value="1">Set Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground block">Semifinais</span>
                <Select
                  disabled={disabled}
                  value={String(phaseOverrides.semifinals || 3)}
                  onValueChange={(v) =>
                    onUpdatePhaseOverrides({ ...phaseOverrides, semifinals: Number(v) as SetsToWin })
                  }
                >
                  <SelectTrigger className="h-7 text-xs bg-zinc-950 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-border">
                    <SelectItem value="2">Melhor de 3</SelectItem>
                    <SelectItem value="3">Melhor de 5</SelectItem>
                    <SelectItem value="1">Set Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground block">Final</span>
                <Select
                  disabled={disabled}
                  value={String(phaseOverrides.final || 3)}
                  onValueChange={(v) =>
                    onUpdatePhaseOverrides({ ...phaseOverrides, final: Number(v) as SetsToWin })
                  }
                >
                  <SelectTrigger className="h-7 text-xs bg-zinc-950 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-border">
                    <SelectItem value="2">Melhor de 3</SelectItem>
                    <SelectItem value="3">Melhor de 5</SelectItem>
                    <SelectItem value="1">Set Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Sistema de Pontuação */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3.5">
        <div>
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Pontuação na Classificação</h4>
          <p className="text-[11px] text-muted-foreground">
            Pontos atribuídos por vitória limpa, vitória apertada (tiebreak) e derrotas.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Vitória Limpa (3x0/3x1)</Label>
            <Input
              type="number"
              disabled={disabled}
              value={scoring.pointsWinClear}
              onChange={(e) => onUpdateScoring({ pointsWinClear: Number(e.target.value) })}
              className="h-8 text-xs bg-zinc-950 border-border"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Vitória Tiebreak (3x2)</Label>
            <Input
              type="number"
              disabled={disabled}
              value={scoring.pointsWinNarrow}
              onChange={(e) => onUpdateScoring({ pointsWinNarrow: Number(e.target.value) })}
              className="h-8 text-xs bg-zinc-950 border-border"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Derrota Tiebreak (2x3)</Label>
            <Input
              type="number"
              disabled={disabled}
              value={scoring.pointsLossNarrow}
              onChange={(e) => onUpdateScoring({ pointsLossNarrow: Number(e.target.value) })}
              className="h-8 text-xs bg-zinc-950 border-border"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Derrota Limpa (0x3/1x3)</Label>
            <Input
              type="number"
              disabled={disabled}
              value={scoring.pointsLossClear}
              onChange={(e) => onUpdateScoring({ pointsLossClear: Number(e.target.value) })}
              className="h-8 text-xs bg-zinc-950 border-border"
            />
          </div>
        </div>
      </div>

      {/* 3. Classificação e Ranking Geral */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3.5">
        <div>
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Classificação e Avanço</h4>
          <p className="text-[11px] text-muted-foreground">
            Critérios para ranking geral unificado e avanço de equipes por grupo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Classificados por Grupo</Label>
            <Input
              type="number"
              min={1}
              disabled={disabled}
              value={standings.advancingPerGroup}
              onChange={(e) => onUpdateStandings({ advancingPerGroup: Number(e.target.value) })}
              className="h-8 text-xs bg-zinc-950 border-border"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Estratégia de Ranking Geral</Label>
            <Select
              disabled={disabled}
              value={standings.aggregationStrategy || 'by-group-position-first'}
              onValueChange={(v: OverallRankingStrategy) => onUpdateStandings({ aggregationStrategy: v })}
            >
              <SelectTrigger className="h-8 text-xs bg-zinc-950 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-border">
                <SelectItem value="by-group-position-first">Por Posição no Grupo (1ºs, depois 2ºs)</SelectItem>
                <SelectItem value="pure-overall-stats">Por Estatísticas Globais Puras</SelectItem>
                <SelectItem value="custom">Personalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Checkbox
              id="cb-best-thirds"
              disabled={disabled}
              checked={standings.bestThirds?.enabled}
              onCheckedChange={(c) =>
                onUpdateStandings({
                  bestThirds: {
                    enabled: Boolean(c),
                    count: standings.bestThirds?.count || 2,
                  },
                })
              }
            />
            <Label htmlFor="cb-best-thirds" className="text-xs text-foreground cursor-pointer">
              Habilitar Melhores 3ºs
            </Label>
          </div>
        </div>
      </div>

      {/* 4. Capacidade e Limites de Inscrição */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Capacidade e Limites de Inscrição</h4>
            <p className="text-[11px] text-muted-foreground">
              Capacidade máxima de equipes e limites regulamentares de elenco por equipe.
            </p>
          </div>
          {stage1ParticipantsCount !== undefined && stage1ParticipantsCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onUpdateRegistration({ maxTeams: stage1ParticipantsCount })}
              className="h-7 text-xs gap-1.5 border-primary-500/30 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10"
              title="Preenche maxTeams automaticamente com a capacidade da 1ª Fase do motor"
            >
              <RefreshCw className="w-3 h-3" />
              Sincronizar com Fase 1 ({stage1ParticipantsCount} equipes)
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
              Capacidade Máxima de Equipes (maxTeams)
            </Label>
            <Input
              type="number"
              min={2}
              disabled={disabled}
              placeholder={stage1ParticipantsCount ? `Ex: ${stage1ParticipantsCount} (Fase 1)` : 'Ex: 10'}
              value={registration.maxTeams ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : Number(e.target.value);
                onUpdateRegistration({ maxTeams: val });
              }}
              className="h-8 text-xs bg-zinc-950 border-border font-mono font-semibold text-foreground"
            />
            <p className="text-[10px] text-muted-foreground">
              {stage1ParticipantsCount
                ? `1ª Fase dimensionada para ${stage1ParticipantsCount} equipes.`
                : 'Defina o total de vagas para a competição.'}
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Mínimo de Atletas</Label>
            <Input
              type="number"
              min={1}
              disabled={disabled}
              value={registration.minAthletes}
              onChange={(e) => onUpdateRegistration({ minAthletes: Number(e.target.value) })}
              className="h-8 text-xs bg-zinc-950 border-border"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Máximo de Atletas</Label>
            <Input
              type="number"
              min={registration.minAthletes}
              disabled={disabled}
              value={registration.maxAthletes}
              onChange={(e) => onUpdateRegistration({ maxAthletes: Number(e.target.value) })}
              className="h-8 text-xs bg-zinc-950 border-border"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/60">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Máx. Líberos</Label>
            <Input
              type="number"
              min={0}
              max={2}
              disabled={disabled}
              value={registration.maxLiberos}
              onChange={(e) => onUpdateRegistration({ maxLiberos: Number(e.target.value) })}
              className="h-8 text-xs bg-zinc-950 border-border"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Máx. Capitães</Label>
            <Input
              type="number"
              min={1}
              max={1}
              value={registration.maxCaptains}
              disabled
              className="h-8 text-xs bg-zinc-950/50 border-border opacity-80"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
