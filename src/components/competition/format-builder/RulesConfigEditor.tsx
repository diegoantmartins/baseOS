import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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

        {/* Sobrescritas por Fase */}
        <div className="pt-2 border-t border-border/60 space-y-2">
          <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
            Sobrescritas de Sets por Fase Decisiva
          </Label>
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
                </SelectContent>
              </Select>
            </div>
          </div>
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

      {/* 4. Regras de Inscrição */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3.5">
        <div>
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Regras de Inscrição e Elenco</h4>
          <p className="text-[11px] text-muted-foreground">
            Limites mínimos e máximos de atletas, capitães e líberos por equipe.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
