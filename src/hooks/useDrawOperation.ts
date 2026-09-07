// Hook para gerenciar a operação de sorteio.
//
// Separa a apresentação (UI) do motor de sorteio.
// Centraliza o estado de operação (idle, running, saving) para evitar
// múltiplas execuções simultâneas e fornece feedback consistente.

import { useCallback, useState } from 'react';
import { dataAccess } from '@/services/dataAccess';
import { runDraw } from '@/services/drawService';
import { validateDrawConfig, formatValidationErrors, getValidationSummary } from '@/services/drawValidator';
import type { DrawConfig, DrawGroup, DrawMatchProposal, DrawRecord } from '@/types/draw';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';

export type DrawOperationState = 'idle' | 'running' | 'saving';

export interface UseDrawOperationResult {
  state: DrawOperationState;
  isRunning: boolean;
  isSaving: boolean;
  isIdle: boolean;
  runPreview: (
    competition: CompetitionRecord,
    teams: TeamRecord[],
    config: DrawConfig
  ) => { groups: DrawGroup[]; matches: DrawMatchProposal[] } | null;
  saveWithMatches: (
    competition: CompetitionRecord,
    teams: TeamRecord[],
    config: DrawConfig,
    preview: { groups: DrawGroup[]; matches: DrawMatchProposal[] },
    scheduledTimeFn: (index: number) => string,
    venue: string
  ) => Promise<DrawRecord | null>;
  showValidationErrors: (config: DrawConfig, teams: TeamRecord[]) => boolean;
}

export function useDrawOperation(): UseDrawOperationResult {
  const [state, setState] = useState<DrawOperationState>('idle');

  const isRunning = state === 'running';
  const isSaving = state === 'saving';
  const isIdle = state === 'idle';

  const showValidationErrors = useCallback((config: DrawConfig, teams: TeamRecord[]): boolean => {
    const result = validateDrawConfig(config, teams);
    if (!result.valid) {
      return false;
    }
    return true;
  }, []);

  const runPreview = useCallback((
    competition: CompetitionRecord,
    teams: TeamRecord[],
    config: DrawConfig
  ): { groups: DrawGroup[]; matches: DrawMatchProposal[] } | null => {
    if (state !== 'idle') return null;

    const validation = validateDrawConfig(config, teams);
    if (!validation.valid) {
      return null;
    }

    setState('running');
    try {
      const result = runDraw(competition, teams, config);
      return { groups: result.groups, matches: result.matches };
    } finally {
      setState('idle');
    }
  }, [state]);

  const saveWithMatches = useCallback(async (
    competition: CompetitionRecord,
    teams: TeamRecord[],
    config: DrawConfig,
    preview: { groups: DrawGroup[]; matches: DrawMatchProposal[] },
    scheduledTimeFn: (index: number) => string,
    venue: string
  ): Promise<DrawRecord | null> => {
    if (state !== 'idle') return null;

    const validation = validateDrawConfig(config, teams);
    if (!validation.valid) {
      return null;
    }

    setState('saving');
    try {
      const matchProposals = preview.matches.map((proposal, idx) => {
        const teamA = teams.find(t => t.id === proposal.teamAId);
        const teamB = teams.find(t => t.id === proposal.teamBId);
        return {
          round: proposal.round,
          matchNumber: proposal.matchNumber,
          teamAId: proposal.teamAId,
          teamBId: proposal.teamBId,
          teamAName: teamA?.name ?? '',
          teamBName: teamB?.name ?? '',
          teamAShortName: teamA?.shortName ?? '',
          teamBShortName: teamB?.shortName ?? '',
          groupName: proposal.groupName,
          phase: proposal.phase,
          scheduledTime: scheduledTimeFn(idx),
          venue,
        };
      });

      const { draw } = await dataAccess.saveDrawWithMatches(
        {
          competitionId: competition.id,
          config,
          groups: preview.groups,
          matches: preview.matches,
        },
        matchProposals
      );

      return draw;
    } finally {
      setState('idle');
    }
  }, [state]);

  return {
    state,
    isRunning,
    isSaving,
    isIdle,
    runPreview,
    saveWithMatches,
    showValidationErrors,
  };
}

export { formatValidationErrors, getValidationSummary };
