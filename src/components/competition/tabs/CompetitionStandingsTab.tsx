import React from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/Section';
import { StandingsTable } from '@/components/competition/StandingsTable';
import { GenericTournamentBracket } from '@/components/competition/bracket';
import { useCompetitionBracket } from '@/hooks/useCompetitionBracket';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type { computeStandingsByGroup, computeBestThirds } from '@/services/standingsService';

type GroupStandingsList = ReturnType<typeof computeStandingsByGroup>;
type BestThirdsList = ReturnType<typeof computeBestThirds>;

export interface CompetitionStandingsTabProps {
  selected: CompetitionRecord;
  standings: GroupStandingsList;
  bestThirds: BestThirdsList;
  bracketMatches?: unknown; // Compatibilidade legada opcional
  teams: TeamRecord[];
  onExportStandings: () => void;
  onOpenMatch?: (matchId: string) => void;
}

export function CompetitionStandingsTab({
  selected,
  standings,
  bestThirds,
  teams,
  onExportStandings,
  onOpenMatch,
}: CompetitionStandingsTabProps) {
  const { viewModel, reprocessRuntime } = useCompetitionBracket(selected?.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs"
          onClick={onExportStandings}
          disabled={standings.length === 0}
        >
          <FileDown className="w-3.5 h-3.5" />
          Exportar Classificação Oficial (PDF)
        </Button>
      </div>

      {standings.map((group) => (
        <SectionCard key={group.groupName} title={group.groupName} density="dense">
          <StandingsTable
            standings={group.standings}
            title={`Classificação - ${group.groupName}`}
            logoUrlById={Object.fromEntries(teams.map((t) => [t.id, t.logoUrl ?? '']))}
          />
        </SectionCard>
      ))}

      {bestThirds.length > 0 && (
        <SectionCard
          title="Ranking Comparativo dos Melhores Terceiros Colocados"
          description="Critérios de repescagem e avanço para os playoffs."
          density="dense"
        >
          <StandingsTable
            standings={bestThirds}
            title="Melhores Terceiros"
            logoUrlById={Object.fromEntries(teams.map((t) => [t.id, t.logoUrl ?? '']))}
          />
        </SectionCard>
      )}

      {viewModel && viewModel.stages.length > 0 && (
        <SectionCard
          title="Chaveamento Eliminatório (Mata-mata)"
          description={`Fase final de ${selected.name}`}
        >
          <GenericTournamentBracket
            viewModel={viewModel}
            onOpenMatch={onOpenMatch}
            onReprocessRuntime={reprocessRuntime}
          />
        </SectionCard>
      )}
    </div>
  );
}
