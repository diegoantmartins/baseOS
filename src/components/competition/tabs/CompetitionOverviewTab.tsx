import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Dices } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CompetitionProgress } from '@/components/competition/CompetitionProgress';
import { CompetitionPendingTasks } from '@/components/competition/CompetitionPendingTasks';
import type {
  CompetitionRecord,
  CompetitionLifecycleStatus,
  MatchRecord,
  TeamRecord,
} from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';
import type { CompetitionReadinessReport } from '@/types/readiness';
import type { CompetitionTab } from '@/components/competition/CompetitionHeader';

export interface CompetitionOverviewTabProps {
  selected: CompetitionRecord;
  selectedTeams: CompetitionTeam[];
  selectedMatches: MatchRecord[];
  teams: TeamRecord[];
  readinessReport: CompetitionReadinessReport | null;
  podium: {
    championTeamId?: string;
    runnerUpTeamId?: string;
    thirdPlaceTeamId?: string;
    fourthPlaceTeamId?: string;
  } | null;
  canEdit: boolean;
  onRefresh: () => Promise<void>;
  onRequestStatusTransition: (status: CompetitionLifecycleStatus) => void;
  onNavigateTab: (tab: CompetitionTab) => void;
}

export function CompetitionOverviewTab({
  selected,
  selectedTeams,
  selectedMatches,
  teams,
  readinessReport,
  podium,
  canEdit,
  onRefresh,
  onRequestStatusTransition,
  onNavigateTab,
}: CompetitionOverviewTabProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Prontidão Operacional */}
      {readinessReport && (
        <div className="space-y-4">
          <CompetitionProgress report={readinessReport} onRefresh={onRefresh} />
          {readinessReport.pendingTasks && readinessReport.pendingTasks.length > 0 && (
            <CompetitionPendingTasks tasks={readinessReport.pendingTasks} />
          )}
        </div>
      )}

      {/* Controle de Ciclo de Vida */}
      <SectionCard
        title="Fluxo e Ciclo de Vida do Torneio"
        description="Avance as etapas regulamentares conforme o progresso do torneio."
        actions={<StatusBadge status={selected.status} />}
        divided
      >
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selected.status === 'registration-open' ? 'default' : 'outline'}
            disabled={!canEdit}
            onClick={() => onRequestStatusTransition('registration-open')}
            className="text-xs h-8"
          >
            1. Abrir Inscrições
          </Button>
          <Button
            size="sm"
            variant={selected.status === 'registration-closed' ? 'default' : 'outline'}
            disabled={!canEdit}
            onClick={() => onRequestStatusTransition('registration-closed')}
            className="text-xs h-8"
          >
            2. Encerrar Inscrições
          </Button>
          <Button
            size="sm"
            variant={selected.status === 'draw-pending' ? 'default' : 'outline'}
            disabled={!canEdit}
            onClick={() => onRequestStatusTransition('draw-pending')}
            className="text-xs h-8"
          >
            3. Sorteio de Grupos
          </Button>
          <Button
            size="sm"
            variant={selected.status === 'in-progress' ? 'default' : 'outline'}
            disabled={!canEdit}
            onClick={() => onRequestStatusTransition('in-progress')}
            className="text-xs h-8"
          >
            4. Iniciar Jogos
          </Button>
          <Button
            size="sm"
            variant={selected.status === 'playoffs' ? 'default' : 'outline'}
            disabled={!canEdit}
            onClick={() => onRequestStatusTransition('playoffs')}
            className="text-xs h-8"
          >
            5. Mata-mata (Playoffs)
          </Button>
          <Button
            size="sm"
            variant={selected.status === 'completed' ? 'default' : 'outline'}
            disabled={!canEdit}
            onClick={() => onRequestStatusTransition('completed')}
            className="text-xs h-8 text-emerald-400 border-emerald-500/30"
          >
            6. Finalizar Torneio
          </Button>
        </div>
      </SectionCard>

      {/* Pódio Oficial se Apurado */}
      {podium && (podium.championTeamId || podium.runnerUpTeamId) && (
        <SectionCard
          title="Pódio Oficial da Competição"
          description="Classificação final e quadro de honra homologado."
          divided
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-lg border border-border bg-zinc-900/60">
              <span className="text-[10px] font-bold text-amber-400 uppercase block">1º Lugar (Campeão)</span>
              <span className="font-semibold text-sm text-foreground mt-1 block">
                {teams.find((t) => t.id === podium.championTeamId)?.name || 'A definir'}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-zinc-900/60">
              <span className="text-[10px] font-bold text-zinc-400 uppercase block">2º Lugar (Vice)</span>
              <span className="font-semibold text-sm text-foreground mt-1 block">
                {teams.find((t) => t.id === podium.runnerUpTeamId)?.name || 'A definir'}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-zinc-900/60">
              <span className="text-[10px] font-bold text-amber-600 uppercase block">3º Lugar</span>
              <span className="font-semibold text-sm text-foreground mt-1 block">
                {teams.find((t) => t.id === podium.thirdPlaceTeamId)?.name || 'A definir'}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-border bg-zinc-900/60">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">4º Lugar</span>
              <span className="font-semibold text-sm text-foreground mt-1 block">
                {teams.find((t) => t.id === podium.fourthPlaceTeamId)?.name || 'A definir'}
              </span>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Resumo Operacional */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SectionCard density="dense">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Equipes Confirmadas</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl font-bold font-mono tabular-nums text-foreground">{selectedTeams.length}</p>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs mt-2"
            onClick={() => onNavigateTab('teams')}
          >
            Gerenciar Equipes
          </Button>
        </SectionCard>

        <SectionCard density="dense">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Partidas Programadas</span>
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl font-bold font-mono tabular-nums text-foreground">{selectedMatches.length}</p>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs mt-2"
            onClick={() => navigate('/jogos')}
          >
            Central de Jogos
          </Button>
        </SectionCard>

        <SectionCard density="dense">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Chaves de Disputa</span>
            <Dices className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl font-bold font-mono tabular-nums text-foreground">
            {selected.groupsCount || 1} Grupos
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs mt-2"
            onClick={() => navigate(`/sorteio/${selected.id}`)}
          >
            Motor de Sorteio
          </Button>
        </SectionCard>
      </div>
    </div>
  );
}
