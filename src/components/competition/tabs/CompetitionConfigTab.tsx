import { Settings, Layers } from 'lucide-react';
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
                Format Builder & Fases
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onOpenEditConfig} className="gap-1.5 text-xs">
              <Settings className="w-3.5 h-3.5" />
              Editar Parâmetros
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
            {(selected.tiebreakCriteriaOrder || [
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
      </div>
    </SectionCard>
  );
}
