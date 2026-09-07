/**
 * TournamentBracket.tsx — Adaptador de Compatibilidade do Chaveamento (Fase 4.9)
 *
 * Responsabilidades:
 * - Atua como Thin Adapter de compatibilidade para código legado existente
 * - Delega 100% da lógica de apresentação visual para o GenericTournamentBracket
 * - Não mantém lógica de renderização própria duplicada
 */

import React, { useMemo } from 'react';
import {
  GenericTournamentBracket,
  type GenericTournamentBracketProps,
} from './bracket/GenericTournamentBracket';
import type {
  CompetitionBracketViewModel,
  RoundViewModel,
  MatchSlotViewModel,
  StageViewModel,
} from '@/services/competitionBracketViewModel';

export interface LegacyTeam {
  id: string;
  name: string;
  shortName: string;
  seed?: number;
}

export interface LegacyBracketMatch {
  id: string;
  round: number;
  position: number;
  teamA?: LegacyTeam;
  teamB?: LegacyTeam;
  scoreA?: number;
  scoreB?: number;
  winner?: 'A' | 'B';
  scheduled?: string;
}

export interface TournamentBracketProps {
  /** Matriz legada de partidas por rodada (compatibilidade com versões anteriores) */
  matches?: LegacyBracketMatch[][];
  title?: string;
  /** Novo modelo canônico de visualização do Competition Format Engine */
  viewModel?: CompetitionBracketViewModel;
  /** Callback para abertura da Mesa do Apontador ao clicar no confronto */
  onOpenMatch?: (matchId: string) => void;
  className?: string;
}

export function TournamentBracket({
  matches,
  title,
  viewModel,
  onOpenMatch,
  className,
}: TournamentBracketProps) {
  // Se o novo ViewModel canônico for fornecido diretamente, repassa sem modificações
  const resolvedViewModel = useMemo<CompetitionBracketViewModel>(() => {
    if (viewModel) return viewModel;

    // Converte a matriz legada matches: LegacyBracketMatch[][] em um CompetitionBracketViewModel
    if (!matches || matches.length === 0) {
      return {
        competitionId: 'legacy',
        competitionName: 'Competição',
        isLegacy: true,
        hasMatchSlots: false,
        stages: [],
      };
    }

    const roundNames = ['Quartas de Final', 'Semifinais', 'Final'];

    const roundViewModels: RoundViewModel[] = matches.map((roundMatches, roundIdx) => {
      const roundName = roundNames[roundIdx] || `Rodada ${roundIdx + 1}`;

      const slots: MatchSlotViewModel[] = roundMatches.map((m) => {
        const hasScore = m.scoreA !== undefined && m.scoreB !== undefined;
        const isCompleted = m.winner !== undefined;

        return {
          slotId: `slot-${m.id}`,
          stageId: 'playoffs',
          stageName: 'Fase Eliminatória',
          roundId: `round-${m.round || roundIdx + 1}`,
          roundName,
          roundOrder: roundIdx + 1,
          position: m.position,
          label: `${roundName} #${m.position}`,
          visualState: isCompleted ? 'completed' : m.teamA && m.teamB ? 'materialized' : 'pending',
          participantA: {
            side: 'A',
            teamId: m.teamA?.id || null,
            displayName: m.teamA?.name || 'A definir',
            shortName: m.teamA?.shortName || 'TBD',
            seed: m.teamA?.seed,
            isResolved: Boolean(m.teamA?.id),
            isBye: false,
          },
          participantB: {
            side: 'B',
            teamId: m.teamB?.id || null,
            displayName: m.teamB?.name || 'A definir',
            shortName: m.teamB?.shortName || 'TBD',
            seed: m.teamB?.seed,
            isResolved: Boolean(m.teamB?.id),
            isBye: false,
          },
          matchId: m.id,
          matchNumber: m.position,
          canOpenMatch: Boolean(m.id && m.teamA && m.teamB),
          scheduledTime: m.scheduled,
          scoreA: hasScore ? m.scoreA : undefined,
          scoreB: hasScore ? m.scoreB : undefined,
          winnerSide: m.winner,
          isInconsistent: false,
        };
      });

      return {
        roundId: `round-${roundIdx + 1}`,
        roundOrder: roundIdx + 1,
        name: roundName,
        slotsCount: slots.length,
        status: 'in-progress',
        slots,
      };
    });

    const singleStage: StageViewModel = {
      stageId: 'playoffs',
      stageOrder: 1,
      name: 'Fase Eliminatória',
      stageType: 'knockout',
      status: 'in-progress',
      rounds: roundViewModels,
    };

    return {
      competitionId: 'legacy',
      competitionName: 'Chaveamento',
      isLegacy: true,
      hasMatchSlots: false,
      stages: [singleStage],
    };
  }, [viewModel, matches]);

  return (
    <GenericTournamentBracket
      viewModel={resolvedViewModel}
      title={title}
      onOpenMatch={onOpenMatch}
      className={className}
    />
  );
}
