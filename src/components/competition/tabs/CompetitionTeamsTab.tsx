import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';

export interface CompetitionTeamsTabProps {
  selected: CompetitionRecord;
  selectedTeams: CompetitionTeam[];
  selectedAthletes: CompetitionAthlete[];
  teams: TeamRecord[];
}

export function CompetitionTeamsTab({
  selected,
  selectedTeams,
  selectedAthletes,
  teams,
}: CompetitionTeamsTabProps) {
  const navigate = useNavigate();

  return (
    <SectionCard
      title={`Equipes Participantes (${selectedTeams.length})`}
      description="Inscrições homologadas e elenco confirmado por agremiação."
      actions={
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => navigate(`/competicoes/${selected.id}/inscricoes`)}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Gerenciar Inscrições
        </Button>
      }
      divided
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {selectedTeams.map((ct) => {
          const t = teams.find((team) => team.id === ct.teamId);
          const athCount = selectedAthletes.filter((a) => a.competitionTeamId === ct.id).length;
          return (
            <div
              key={ct.id}
              className="p-3.5 rounded-xl border border-border bg-zinc-900/60 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-xs text-foreground truncate">{t?.name || 'Equipe'}</p>
                <p className="text-[11px] text-muted-foreground font-mono tabular-nums">{athCount} atletas no elenco</p>
              </div>
              <StatusBadge status={ct.status} showIcon={false} className="text-[10px] shrink-0" />
            </div>
          );
        })}
        {selectedTeams.length === 0 && (
          <p className="text-xs text-muted-foreground col-span-3 py-6 text-center">
            Nenhuma equipe inscrita nesta competição ainda.
          </p>
        )}
      </div>
    </SectionCard>
  );
}
