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
  const stages = selected.config?.format?.stages || [];

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

        <div className="space-y-2 pt-3 border-t border-border">
          <h4 className="font-semibold text-foreground text-[10px] uppercase tracking-wider">Sets por Fase</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-border text-center">
              <span className="text-muted-foreground block text-[10px]">Grupos</span>
              <span className="font-semibold">{formatSetsToWinLabel(CompetitionRulesService.resolveMatchFormat(selected, 'fase_grupos').setsToWin)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-border text-center">
              <span className="text-muted-foreground block text-[10px]">Quartas</span>
              <span className="font-semibold">{formatSetsToWinLabel(CompetitionRulesService.resolveMatchFormat(selected, 'quartas').setsToWin)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-border text-center">
              <span className="text-muted-foreground block text-[10px]">Semifinais</span>
              <span className="font-semibold">{formatSetsToWinLabel(CompetitionRulesService.resolveMatchFormat(selected, 'semifinal').setsToWin)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-border text-center">
              <span className="text-muted-foreground block text-[10px]">Final</span>
              <span className="font-semibold">{formatSetsToWinLabel(CompetitionRulesService.resolveMatchFormat(selected, 'final').setsToWin)}</span>
            </div>
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
