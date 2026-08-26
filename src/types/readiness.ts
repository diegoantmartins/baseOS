import type {
  CompetitionRecord,
  MatchRecord,
  TeamRecord,
  ModalityRecord,
  VenueRecord,
} from './entities';
import type { CompetitionTeam, CompetitionAthlete } from './registration';
import type { DrawRecord } from './draw';

export type StepStatus =
  | 'completed'
  | 'in_progress'
  | 'pending'
  | 'blocked'
  | 'attention';

export type GlobalCompetitionStage =
  | 'PREPARACAO'
  | 'PRONTA_PARA_INICIAR'
  | 'EM_ANDAMENTO'
  | 'FASES_FINAIS'
  | 'PRONTA_PARA_HOMOLOGACAO'
  | 'HOMOLOGADA'
  | 'ENCERRADA';

export interface EvaluatedJourneyStep {
  stepNumber: string;
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  metrics?: {
    label: string;
    value: string | number;
  }[];
  blockers?: string[];
  warnings?: string[];
  articleId?: string;
  route?: string;
  actionLabel?: string;
  guideLabel?: string;
}

export interface CompetitionPendingTask {
  id: string;
  severity: 'blocker' | 'warning' | 'info';
  title: string;
  description: string;
  route?: string;
  actionLabel?: string;
  articleId?: string;
}

export interface CompetitionNextAction {
  title: string;
  description: string;
  route?: string;
  actionLabel?: string;
  articleId?: string;
  guideLabel?: string;
}

export interface CompetitionReadinessReport {
  competitionId: string;
  competitionName: string;
  percentage: number;
  completedStepsCount: number;
  totalStepsCount: number;
  globalStage: GlobalCompetitionStage;
  globalStageLabel: string;
  steps: EvaluatedJourneyStep[];
  pendingTasks: CompetitionPendingTask[];
  nextAction: CompetitionNextAction | null;
  canHomologate: boolean;
  /** Métricas de execução de partidas */
  matchesStats: {
    total: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    percentageCompleted: number;
  };
}

export interface EvaluateCompetitionData {
  competition: CompetitionRecord;
  modalities?: ModalityRecord[];
  venues?: VenueRecord[];
  teams?: TeamRecord[];
  competitionTeams?: CompetitionTeam[];
  athletes?: CompetitionAthlete[];
  draws?: DrawRecord[];
  matches?: MatchRecord[];
}
