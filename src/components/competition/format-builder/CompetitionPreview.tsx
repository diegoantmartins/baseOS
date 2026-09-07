import React, { useMemo } from 'react';
import { Eye, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CompetitionConfig, MatchSlot, StageDefinition } from '@/types/competitionConfig';
import { CompetitionBracketViewModelBuilder } from '@/services/competitionBracketViewModel';
import { GenericTournamentBracket } from '@/components/competition/bracket/GenericTournamentBracket';
import type {
  CompetitionRecord,
  StageRecord,
  RoundRecord,
  MatchSlotRecord,
} from '@/types/entities';
import { cn } from '@/lib/utils';

export interface CompetitionPreviewProps {
  config: CompetitionConfig;
  previewData: {
    stages: StageDefinition[];
    slots: MatchSlot[];
  };
  className?: string;
}

export const CompetitionPreview: React.FC<CompetitionPreviewProps> = ({
  config,
  previewData,
  className = '',
}) => {
  const { stages, slots } = previewData;

  const viewModel = useMemo(() => {
    const dummyComp: CompetitionRecord = {
      id: 'preview-competition',
      name: 'Pré-Visualização do Formato',
      modality: 'indoor',
      format: config.format.formatType || 'custom',
      playerFormat: '6x6',
      setFormat: config.format.defaultSetsToWin === 3 ? '5-sets' : '3-sets',
      genderCategory: 'male',
      status: 'planning',
      config,
    };

    const stageRows: StageRecord[] = stages.map((s, idx) => ({
      id: s.id || `stage-${idx + 1}`,
      competitionId: 'preview-competition',
      stageId: s.id || `stage-${idx + 1}`,
      name: s.name,
      stageOrder: s.order || idx + 1,
      stageType: s.type,
      status: 'pending',
      isLocked: false,
    }));

    const roundRows: RoundRecord[] = stages.flatMap((s) =>
      (s.rounds || []).map((r, rIdx) => ({
        id: r.roundId || `round-${rIdx + 1}`,
        stageRowId: s.id,
        competitionId: 'preview-competition',
        roundId: r.roundId || `round-${rIdx + 1}`,
        name: r.name,
        roundOrder: r.order || rIdx + 1,
        slotsCount: r.slotsCount || 0,
        status: 'pending',
      })),
    );

    const slotRows: MatchSlotRecord[] = slots.map((s, sIdx) => ({
      id: s.slotId || `slot-${sIdx + 1}`,
      stageRowId: s.stageId,
      roundRowId: s.roundId,
      competitionId: 'preview-competition',
      slotId: s.slotId || `slot-${sIdx + 1}`,
      roundId: s.roundId,
      position: s.position || sIdx + 1,
      label: s.label,
      participantAReference: s.participantA.reference,
      participantAStatus: s.participantA.status,
      resolvedTeamAId: s.participantA.resolvedTeamId,
      participantBReference: s.participantB.reference,
      participantBStatus: s.participantB.status,
      resolvedTeamBId: s.participantB.resolvedTeamId,
      matchId: null, // Zero partidas reais no preview!
      progressionRoute: s.progressionRoute,
    }));

    return CompetitionBracketViewModelBuilder.build({
      competition: dummyComp,
      stages: stageRows,
      rounds: roundRows,
      slots: slotRows,
      matches: [],
      teams: [],
    });
  }, [config, stages, slots]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between p-3 rounded-xl bg-primary-950/20 border border-primary-500/20 text-xs text-primary-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            <strong>Simulação em Memória:</strong> Nenhuma partida ou slot foi criado ou persistido no banco de dados.
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] border-primary-500/30 text-primary-400 font-mono">
          {slots.length} slots simulados
        </Badge>
      </div>

      <div className="p-4 rounded-xl border border-border-subtle bg-surface-elevated/40">
        {slots.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-muted">
            Configure pelo menos uma fase com rodadas para visualizar a prévia do chaveamento.
          </div>
        ) : (
          <GenericTournamentBracket
            viewModel={viewModel}
            className="border-none p-0 bg-transparent"
          />
        )}
      </div>
    </div>
  );
};
