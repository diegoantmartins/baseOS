import { createContext, useContext } from 'react';
import type { CompetitionTeam } from '@/types/registration';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type { UserAvailableTeamContext } from '@/services/teamContextService';

export interface TeamContextValue {
  team: CompetitionTeam;
  teamRecord: TeamRecord | null;
  competition: CompetitionRecord | null;
  loading: boolean;
  refresh: () => Promise<void>;
  availableTeams?: UserAvailableTeamContext[];
  activeTeamContext?: UserAvailableTeamContext | null;
  switchTeam?: (competitionTeamId: string) => Promise<void>;
}

export const TeamContext = createContext<TeamContextValue | null>(null);

export function useTeamPortal(): TeamContextValue {
  const ctx = useContext(TeamContext);
  if (!ctx) {
    throw new Error('useTeamPortal deve ser usado dentro de um TeamPortalGuard');
  }
  return ctx;
}

