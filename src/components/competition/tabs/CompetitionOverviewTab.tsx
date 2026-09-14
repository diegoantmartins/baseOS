import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  Dices,
  Trophy,
  CheckCircle2,
  ListOrdered,
  Sparkles,
  ChevronRight,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/ui/Section';
import { CompetitionActionGuideCard } from '@/components/competition/CompetitionActionGuideCard';
import { CompetitionReadinessModal } from '@/components/competition/CompetitionReadinessModal';
import { evaluateCompetitionActionGuide } from '@/services/competitionActionGuideService';
import {
  buildMatchesUrl,
  buildDrawUrl,
  buildRegistrationsUrl,
} from '@/services/competitionNavigationHelper';
import type {
  CompetitionRecord,
  CompetitionLifecycleStatus,
  MatchRecord,
  TeamRecord,
} from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';
import type { CompetitionReadinessReport } from '@/types/readiness';
import type { CompetitionTab } from '@/components/competition/CompetitionHeader';
import { cn } from '@/lib/utils';

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
  const [readinessModalOpen, setReadinessModalOpen] = useState(false);

  // Avaliação do Guia de Ação Operacional (Fase 8.4)
  const actionGuide = useMemo(() => {
    return evaluateCompetitionActionGuide({
      competition: selected,
      competitionTeams: selectedTeams,
      matches: selectedMatches,
      canEdit,
    });
  }, [selected, selectedTeams, selectedMatches, canEdit]);

  // Jornada visual das 5 fases do torneio (orientada a produto, não a enums)
  const journeyPhases = useMemo(() => {
    const status = selected.status;
    let currentPhaseIndex = 0;

    if (status === 'planning' || status === 'registration-open' || status === 'registration') {
      currentPhaseIndex = 0;
    } else if (status === 'registration-closed' || status === 'draw-pending') {
      currentPhaseIndex = 1;
    } else if (status === 'groups-defined' || (status === 'in-progress' && !selectedMatches.some(m => m.phase === 'playoffs'))) {
      currentPhaseIndex = 2;
    } else if (status === 'playoffs' || selectedMatches.some(m => m.phase === 'playoffs')) {
      currentPhaseIndex = 3;
    } else if (status === 'completed') {
      currentPhaseIndex = 4;
    }

    return [
      { id: 'registration', label: '1. Inscrições', description: 'Recebimento de equipes' },
      { id: 'draw', label: '2. Sorteio Oficial', description: 'Composição de chaves' },
      { id: 'group_stage', label: '3. Fase de Grupos', description: 'Disputa classificatória' },
      { id: 'playoffs', label: '4. Mata-mata', description: 'Eliminatórias e finais' },
      { id: 'completed', label: '5. Pódio & Conclusão', description: 'Homologação oficial' },
    ].map((phase, index) => {
      const isCompleted = index < currentPhaseIndex;
      const isCurrent = index === currentPhaseIndex;
      return {
        ...phase,
        isCompleted,
        isCurrent,
        isUpcoming: index > currentPhaseIndex,
      };
    });
  }, [selected.status, selectedMatches]);

  const handleCloseRegistrations = async () => {
    onRequestStatusTransition('registration-closed');
  };

  const handleReopenRegistrations = async () => {
    onRequestStatusTransition('registration-open');
  };

  return (
    <div className="space-y-6">
      {/* ── CARD DE PRÓXIMA AÇÃO OPERACIONAL (Fase 8.4) ── */}
      <CompetitionActionGuideCard
        guide={actionGuide}
        canEdit={canEdit}
        onCloseRegistrations={handleCloseRegistrations}
        onReopenRegistrations={handleReopenRegistrations}
      />

      {/* ── JORNADA OPERACIONAL DO TORNEIO (Substitui o checklist técnico 1-6) ── */}
      <SectionCard
        title="Jornada da Competição"
        description="Acompanhe o estágio da competição e as etapas concluídas pela organização."
        actions={
          readinessReport ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReadinessModalOpen(true)}
              className="h-8 text-xs gap-1.5 border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 font-medium text-foreground"
            >
              <ListOrdered className="w-3.5 h-3.5 text-primary" />
              <span>Ver Checklist Técnico ({readinessReport.percentage}%)</span>
            </Button>
          ) : undefined
        }
        divided
      >
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          {journeyPhases.map((phase) => (
            <div
              key={phase.id}
              className={cn(
                'p-3 rounded-lg border text-xs transition-all relative',
                phase.isCurrent && 'border-amber-500/60 bg-amber-500/10 text-amber-200 shadow-sm ring-1 ring-amber-500/30',
                phase.isCompleted && 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300',
                phase.isUpcoming && 'border-zinc-800/60 bg-zinc-900/20 text-zinc-500',
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-[11px] uppercase tracking-wider block">
                  {phase.label}
                </span>
                {phase.isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : phase.isCurrent ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                ) : null}
              </div>
              <p className="text-[10px] text-muted-foreground line-clamp-1">
                {phase.description}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── PÓDIO OFICIAL (Se Apurado) ── */}
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

      {/* ── RESUMO OPERACIONAL E ATALHOS DIRETOS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SectionCard density="dense">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Equipes da Competição</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {actionGuide.capacity.confirmedCount}
            </p>
            {actionGuide.capacity.isConfigured && (
              <span className="text-xs text-muted-foreground font-mono">
                / {actionGuide.capacity.maxTeams} vagas
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs mt-2"
            onClick={() => navigate(buildRegistrationsUrl(selected.id))}
          >
            Gerenciar Inscrições
          </Button>
        </SectionCard>

        <SectionCard density="dense">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Partidas Programadas</span>
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
            {selectedMatches.length}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs mt-2"
            onClick={() => navigate(buildMatchesUrl(selected.id))}
          >
            Central de Jogos
          </Button>
        </SectionCard>

        <SectionCard density="dense">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Chaves de Disputa</span>
            <Dices className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
            {selected.groupsCount || 1} Grupos
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs mt-2"
            onClick={() => navigate(buildDrawUrl(selected.id))}
          >
            Motor de Sorteio
          </Button>
        </SectionCard>
      </div>

      {/* ── MODAL DO CHECKLIST TÉCNICO (Acessível sob demanda) ── */}
      {readinessReport && (
        <CompetitionReadinessModal
          report={readinessReport}
          isOpen={readinessModalOpen}
          onClose={() => setReadinessModalOpen(false)}
        />
      )}
    </div>
  );
}
