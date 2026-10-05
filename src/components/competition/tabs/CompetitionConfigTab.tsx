import { Settings, Layers, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/ui/Section';
import type { CompetitionRecord } from '@/types/entities';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { formatSetsToWinLabel, getStageId } from '@/types/competitionConfig';

const TIEBREAK_CRITERIA_LABELS_PT: Record<string, string> = {
  'points': 'Pontos',
  'victories': 'Vitórias',
  'head-to-head': 'Confronto Direto',
  'sets-ratio': 'Set Average',
  'points-ratio': 'Points Average',
  'sets-balance': 'Saldo de Sets',
  'points-balance': 'Saldo de Pontos',
  'draw': 'Sorteio',
};

const STAGE_TYPE_LABELS: Record<string, string> = {
  'group-stage': 'Fase de Grupos',
  'round-robin': 'Pontos Corridos',
  'play-in': 'Play-In (Repescagem)',
  'knockout': 'Mata-Mata Eliminatório',
  'third-place': 'Disputa de 3º Lugar',
  'custom': 'Personalizado',
};

export interface CompetitionConfigTabProps {
  selected: CompetitionRecord;
  canEdit: boolean;
  onOpenEditConfig: () => void;
  onOpenFormatBuilder?: () => void;
}

export function CompetitionConfigTab({
  selected,
  canEdit,
  onOpenEditConfig,
  onOpenFormatBuilder,
}: CompetitionConfigTabProps) {
  const config = CompetitionRulesService.getConfig(selected);
  const stages = selected.config?.format?.stages?.length
    ? selected.config.format.stages
    : config.format.stages || [];

  return (
    <SectionCard
      title="Configurações Regulamentares"
      description="Parâmetros de pontuação, desempate, sets por fase e tempos de descanso."
      actions={
        canEdit && (
          <div className="flex items-center gap-2">
            {onOpenFormatBuilder && (
              <Button size="sm" onClick={onOpenFormatBuilder} className="gap-1.5 text-xs">
                <Layers className="w-3.5 h-3.5" />
                Formato e Regras da Competição
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onOpenEditConfig} className="gap-1.5 text-xs">
              <Settings className="w-3.5 h-3.5" />
              Editar Configurações
            </Button>
          </div>
        )
      }
      divided
    >
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-zinc-900/60 border border-border">
            <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Modalidade e Formato</span>
            <p className="font-semibold text-foreground mt-1">
              {selected.modality === 'beach' ? 'Vôlei de Praia' : 'Vôlei de Quadra'} ({selected.playerFormat})
            </p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/60 border border-border">
            <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Sets Padrão</span>
            <p className="font-semibold text-foreground mt-1">
              {selected.setFormat === '5-sets' ? 'Melhor de 5 sets' : 'Melhor de 3 sets'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/60 border border-border">
            <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Tempo de Jogo / Descanso</span>
            <p className="font-semibold text-foreground mt-1">
              {selected.defaultMatchIntervalMinutes || 75} min / {selected.minTeamRestMinutes || 30} min rest
            </p>
          </div>
        </div>

        {/* Estrutura Dinâmica de Fases do Grafo (DAG) */}
        <div className="space-y-2.5 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-[10px] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Estrutura de Fases & Sets ({stages.length} {stages.length === 1 ? 'Fase' : 'Fases'})
            </h4>
            <Badge variant="outline" className="text-[10px] border-zinc-800 bg-zinc-900/60 text-zinc-400">
              Formato: {config.format.formatType || 'Customizado'}
            </Badge>
          </div>

          <div
            className={`grid gap-2.5 text-xs ${
              stages.length === 1
                ? 'grid-cols-1'
                : stages.length === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : stages.length === 3
                ? 'grid-cols-1 sm:grid-cols-3'
                : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-5'
            }`}
          >
            {stages.map((stage, idx) => {
              const stageId = getStageId(stage);
              const resolvedMatchFormat = CompetitionRulesService.resolveMatchFormat(selected, stageId);
              const setsLabel = formatSetsToWinLabel(resolvedMatchFormat.setsToWin);
              const isGroup = stage.type === 'round-robin' || stage.type === 'group-stage';
              const isKnockout = stage.type === 'knockout';
              const isPlayIn = stage.type === 'play-in';

              return (
                <div
                  key={stageId || idx}
                  className="relative p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-amber-400/90 uppercase tracking-wider">
                        {String(stage.order || idx + 1).padStart(2, '0')}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[9px] py-0 px-1.5 h-4 bg-zinc-800 text-zinc-300 font-normal"
                      >
                        {STAGE_TYPE_LABELS[stage.type] || stage.type}
                      </Badge>
                    </div>

                    <h5 className="font-semibold text-foreground text-xs leading-tight line-clamp-1" title={stage.name}>
                      {stage.name}
                    </h5>

                    <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 pt-0.5">
                      {isGroup && (
                        <span>
                          {stage.groupConfig?.groupsCount || stage.groupsCount || 1}{' '}
                          {(stage.groupConfig?.groupsCount || stage.groupsCount || 1) === 1 ? 'grupo' : 'grupos'}
                          {stage.groupConfig?.teamsPerGroup ? ` (${stage.groupConfig.teamsPerGroup} eq/grupo)` : ''}
                        </span>
                      )}
                      {isKnockout && (
                        <span>Chave de {stage.eliminationConfig?.bracketSize || stage.participantsCount || 4} equipes</span>
                      )}
                      {isPlayIn && (
                        <span>Repescagem ({stage.participantsCount || 4} equipes)</span>
                      )}
                      {stage.advancingCount ? (
                        <span className="text-emerald-400/90">Avançam: {stage.advancingCount}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 uppercase font-medium">Sets</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1.5 h-4 border-amber-500/30 bg-amber-500/10 text-amber-400 font-semibold"
                    >
                      {setsLabel}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 pt-3 border-t border-border">
          <h4 className="font-semibold text-foreground text-[10px] uppercase tracking-wider">Critérios de Desempate Ordenados</h4>
          <div className="flex flex-wrap gap-2 text-xs">
            {(CompetitionRulesService.getConfig(selected).standings?.tiebreakCriteriaOrder || [
              'points',
              'victories',
              'head-to-head',
              'sets-ratio',
              'points-ratio',
              'sets-balance',
              'points-balance',
            ]).map((crit, idx) => (
              <Badge key={crit} variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs bg-zinc-800 text-zinc-300">
                <span className="font-bold text-primary font-mono tabular-nums">{idx + 1}º</span>
                <span className="capitalize">{TIEBREAK_CRITERIA_LABELS_PT[crit] || crit.replace(/-/g, ' ')}</span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Identidade Visual e Apoiadores do Evento */}
        <div className="space-y-2.5 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-[10px] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Identidade Visual e Apoiadores Oficiais
            </h4>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenEditConfig}
                className="h-6 text-[11px] text-amber-400 hover:text-amber-300 px-2"
              >
                Gerenciar Apoiadores
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-zinc-900/40 border border-border flex items-center gap-3">
              {selected.logoUrl ? (
                <img
                  src={selected.logoUrl}
                  alt="Logo da competição"
                  className="w-10 h-10 rounded-lg object-contain bg-zinc-950 p-1 border border-border shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-border flex items-center justify-center text-zinc-500 shrink-0">
                  <Trophy className="w-5 h-5 opacity-50" />
                </div>
              )}
              <div>
                <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Logo Oficial</span>
                <span className="text-xs text-foreground font-medium">
                  {selected.logoUrl ? 'Configurado' : 'Não definido'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900/40 border border-border">
              <span className="text-[10px] text-muted-foreground block font-semibold uppercase">
                Apoiadores do Evento ({selected.supporters?.length || 0})
              </span>
              {selected.supporters && selected.supporters.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {selected.supporters.map((sup) => (
                    <Badge
                      key={sup.id}
                      variant="outline"
                      className="text-[10px] py-0 px-2 h-5 border-zinc-800 bg-zinc-900/80 text-zinc-300"
                    >
                      {sup.name}
                      {sup.tier && <span className="text-amber-400/80 ml-1">({sup.tier})</span>}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-zinc-500 mt-1 block">Nenhum apoiador cadastrado</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
