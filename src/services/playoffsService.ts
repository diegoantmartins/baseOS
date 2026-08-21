// Motor de fases eliminatórias (Mata-mata) do VolleyPro.
//
// Suporta:
//  - Oitavas de final (8 jogos)
//  - Quartas de final (4 jogos)
//  - Semifinais (2 jogos)
//  - Disputa de 3º lugar (1 jogo)
//  - Final (1 jogo)
//
// Regras:
//  1. Geração automática de confrontos a partir dos classificados da fase de grupos.
//  2. Avanço automático: ao homologar/finalizar um jogo, o vencedor é propagado
//     para a próxima fase (e perdedores das semis para o 3º lugar).
//  3. Apuração do pódio (Campeão, Vice, 3º e 4º lugar).

import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { StandingsByGroup, BestThirdResult } from '@/services/standingsService';

export type PlayoffPhase = 'oitavas' | 'quartas' | 'semifinal' | 'terceiro_lugar' | 'final';

export type PlayoffMatchSlot = {
  phase: PlayoffPhase;
  matchIndex: number;
  label: string;
  sourceTeamA: { description: string; teamId?: string };
  sourceTeamB: { description: string; teamId?: string };
  nextWinnerMatchIndex?: number;
  nextWinnerSlot?: 'A' | 'B';
  nextLoserMatchIndex?: number; // Ex: perdedor da semi vai para 3º lugar
  nextLoserSlot?: 'A' | 'B';
};

export const PLAYOFF_PHASE_LABELS: Record<PlayoffPhase, string> = {
  oitavas: 'Oitavas de Final',
  quartas: 'Quartas de Final',
  semifinal: 'Semifinais',
  terceiro_lugar: 'Disputa de 3º Lugar',
  final: 'Final',
};

/**
 * Gera a grade de cruzamentos para Quartas + Semis + 3º Lugar + Final (4 grupos A, B, C, D).
 * Padrão olímpico: 1A x 2B, 1C x 2D, 1B x 2A, 1D x 2C.
 */
export function generateFourGroupPlayoffs(
  groups: StandingsByGroup,
  bestThirds?: BestThirdResult[],
): PlayoffMatchSlot[] {
  const getQualified = (groupLetter: string, pos: number): { description: string; teamId?: string } => {
    const grp = groups.find(g => g.groupName.toUpperCase().includes(groupLetter));
    const team = grp?.standings.find(s => s.position === pos);
    return {
      description: `${pos}º do Grupo ${groupLetter}`,
      teamId: team?.teamId,
    };
  };

  const slots: PlayoffMatchSlot[] = [
    // Quartas de final
    {
      phase: 'quartas',
      matchIndex: 1,
      label: 'Quartas 1',
      sourceTeamA: getQualified('A', 1),
      sourceTeamB: getQualified('B', 2),
      nextWinnerMatchIndex: 5,
      nextWinnerSlot: 'A',
    },
    {
      phase: 'quartas',
      matchIndex: 2,
      label: 'Quartas 2',
      sourceTeamA: getQualified('C', 1),
      sourceTeamB: getQualified('D', 2),
      nextWinnerMatchIndex: 5,
      nextWinnerSlot: 'B',
    },
    {
      phase: 'quartas',
      matchIndex: 3,
      label: 'Quartas 3',
      sourceTeamA: getQualified('B', 1),
      sourceTeamB: getQualified('A', 2),
      nextWinnerMatchIndex: 6,
      nextWinnerSlot: 'A',
    },
    {
      phase: 'quartas',
      matchIndex: 4,
      label: 'Quartas 4',
      sourceTeamA: getQualified('D', 1),
      sourceTeamB: getQualified('C', 2),
      nextWinnerMatchIndex: 6,
      nextWinnerSlot: 'B',
    },

    // Semifinais
    {
      phase: 'semifinal',
      matchIndex: 5,
      label: 'Semifinal 1',
      sourceTeamA: { description: 'Vencedor Quartas 1' },
      sourceTeamB: { description: 'Vencedor Quartas 2' },
      nextWinnerMatchIndex: 8,
      nextWinnerSlot: 'A',
      nextLoserMatchIndex: 7,
      nextLoserSlot: 'A',
    },
    {
      phase: 'semifinal',
      matchIndex: 6,
      label: 'Semifinal 2',
      sourceTeamA: { description: 'Vencedor Quartas 3' },
      sourceTeamB: { description: 'Vencedor Quartas 4' },
      nextWinnerMatchIndex: 8,
      nextWinnerSlot: 'B',
      nextLoserMatchIndex: 7,
      nextLoserSlot: 'B',
    },

    // Disputa de 3º Lugar
    {
      phase: 'terceiro_lugar',
      matchIndex: 7,
      label: 'Disputa de 3º Lugar',
      sourceTeamA: { description: 'Perdedor Semifinal 1' },
      sourceTeamB: { description: 'Perdedor Semifinal 2' },
    },

    // Final
    {
      phase: 'final',
      matchIndex: 8,
      label: 'Grande Final',
      sourceTeamA: { description: 'Vencedor Semifinal 1' },
      sourceTeamB: { description: 'Vencedor Semifinal 2' },
    },
  ];

  return slots;
}

/**
 * Gera a grade de cruzamentos para 2 grupos A e B (Semis + 3º Lugar + Final).
 * Padrão: 1A x 2B, 1B x 2A.
 */
export function generateTwoGroupPlayoffs(groups: StandingsByGroup): PlayoffMatchSlot[] {
  const getQualified = (groupLetter: string, pos: number): { description: string; teamId?: string } => {
    const grp = groups.find(g => g.groupName.toUpperCase().includes(groupLetter));
    const team = grp?.standings.find(s => s.position === pos);
    return {
      description: `${pos}º do Grupo ${groupLetter}`,
      teamId: team?.teamId,
    };
  };

  return [
    {
      phase: 'semifinal',
      matchIndex: 1,
      label: 'Semifinal 1',
      sourceTeamA: getQualified('A', 1),
      sourceTeamB: getQualified('B', 2),
      nextWinnerMatchIndex: 4,
      nextWinnerSlot: 'A',
      nextLoserMatchIndex: 3,
      nextLoserSlot: 'A',
    },
    {
      phase: 'semifinal',
      matchIndex: 2,
      label: 'Semifinal 2',
      sourceTeamA: getQualified('B', 1),
      sourceTeamB: getQualified('A', 2),
      nextWinnerMatchIndex: 4,
      nextWinnerSlot: 'B',
      nextLoserMatchIndex: 3,
      nextLoserSlot: 'B',
    },
    {
      phase: 'terceiro_lugar',
      matchIndex: 3,
      label: 'Disputa de 3º Lugar',
      sourceTeamA: { description: 'Perdedor Semifinal 1' },
      sourceTeamB: { description: 'Perdedor Semifinal 2' },
    },
    {
      phase: 'final',
      matchIndex: 4,
      label: 'Grande Final',
      sourceTeamA: { description: 'Vencedor Semifinal 1' },
      sourceTeamB: { description: 'Vencedor Semifinal 2' },
    },
  ];
}

/**
 * Cria os MatchRecords pré-gerados para a fase eliminatória (inicialmente sem data/hora/quadra).
 */
export function buildPlayoffMatches(
  competition: CompetitionRecord,
  slots: PlayoffMatchSlot[],
  teams: TeamRecord[],
  startMatchNumber = 1,
): Array<Omit<MatchRecord, 'id' | 'createdAt' | 'updatedAt'>> {
  const teamById = new Map(teams.map(t => [t.id, t]));

  return slots.map((slot, idx) => {
    const teamA = slot.sourceTeamA.teamId ? teamById.get(slot.sourceTeamA.teamId) : null;
    const teamB = slot.sourceTeamB.teamId ? teamById.get(slot.sourceTeamB.teamId) : null;

    const customSetFormat =
      slot.phase === 'final' || slot.phase === 'semifinal'
        ? competition.phaseSetRules?.semifinals ?? competition.phaseSetRules?.final ?? (competition.setFormat as '3-sets' | '5-sets')
        : competition.phaseSetRules?.playoffs ?? (competition.setFormat as '3-sets' | '5-sets');

    return {
      competitionId: competition.id,
      round: idx + 1,
      matchNumber: startMatchNumber + idx,
      teamAId: teamA?.id ?? `TBD-A-${slot.matchIndex}`,
      teamBId: teamB?.id ?? `TBD-B-${slot.matchIndex}`,
      teamAName: teamA?.name ?? slot.sourceTeamA.description,
      teamBName: teamB?.name ?? slot.sourceTeamB.description,
      teamAShortName: teamA?.shortName ?? 'TBD',
      teamBShortName: teamB?.shortName ?? 'TBD',
      venue: competition.venue ?? 'A definir',
      court: 'A definir',
      phase: slot.phase,
      groupName: slot.label,
      scheduledTime: competition.startDate ? `${competition.startDate}T00:00:00` : new Date().toISOString(),
      status: 'awaiting_schedule',
      sets: [],
      referees: [],
      customSetFormat,
      observations: `Partida eliminatória: ${slot.label}`,
    };
  });
}

/**
 * Propaga automaticamente os vencedores e perdedores de partidas eliminatórias
 * para os próximos confrontos do chaveamento.
 */
export function advancePlayoffMatches(
  matches: MatchRecord[],
  teams: TeamRecord[],
): { updatedMatches: MatchRecord[]; changed: boolean } {
  const teamById = new Map(teams.map(t => [t.id, t]));
  const updated = [...matches];
  let changed = false;

  // Localiza semifinais, disputa de 3º e final
  const semis = updated.filter(m => m.phase === 'semifinal');
  const thirdPlace = updated.find(m => m.phase === 'terceiro_lugar');
  const finalMatch = updated.find(m => m.phase === 'final');

  // Propagação de Quartas para Semis
  const quartas = updated.filter(m => m.phase === 'quartas');
  if (quartas.length === 4 && semis.length === 2) {
    // Q1 -> Semi1 Team A, Q2 -> Semi1 Team B
    const q1Winner = quartas[0].status === 'completed' || quartas[0].status === 'homologated' ? quartas[0].winnerId : null;
    const q2Winner = quartas[1].status === 'completed' || quartas[1].status === 'homologated' ? quartas[1].winnerId : null;
    if (q1Winner && semis[0].teamAId !== q1Winner) {
      const team = teamById.get(q1Winner);
      if (team) {
        semis[0].teamAId = team.id;
        semis[0].teamAName = team.name;
        semis[0].teamAShortName = team.shortName;
        changed = true;
      }
    }
    if (q2Winner && semis[0].teamBId !== q2Winner) {
      const team = teamById.get(q2Winner);
      if (team) {
        semis[0].teamBId = team.id;
        semis[0].teamBName = team.name;
        semis[0].teamBShortName = team.shortName;
        changed = true;
      }
    }

    // Q3 -> Semi2 Team A, Q4 -> Semi2 Team B
    const q3Winner = quartas[2].status === 'completed' || quartas[2].status === 'homologated' ? quartas[2].winnerId : null;
    const q4Winner = quartas[3].status === 'completed' || quartas[3].status === 'homologated' ? quartas[3].winnerId : null;
    if (q3Winner && semis[1].teamAId !== q3Winner) {
      const team = teamById.get(q3Winner);
      if (team) {
        semis[1].teamAId = team.id;
        semis[1].teamAName = team.name;
        semis[1].teamAShortName = team.shortName;
        changed = true;
      }
    }
    if (q4Winner && semis[1].teamBId !== q4Winner) {
      const team = teamById.get(q4Winner);
      if (team) {
        semis[1].teamBId = team.id;
        semis[1].teamBName = team.name;
        semis[1].teamBShortName = team.shortName;
        changed = true;
      }
    }
  }

  // Propagação de Semifinais para Final e Disputa de 3º Lugar
  if (semis.length >= 2) {
    const semi1 = semis[0];
    const semi2 = semis[1];

    const getLoserId = (match: MatchRecord): string | null => {
      if (!match.winnerId) return null;
      return match.winnerId === match.teamAId ? match.teamBId : match.teamAId;
    };

    // Vencedores -> Final
    if (finalMatch) {
      const semi1Winner = (semi1.status === 'completed' || semi1.status === 'homologated') ? semi1.winnerId : null;
      const semi2Winner = (semi2.status === 'completed' || semi2.status === 'homologated') ? semi2.winnerId : null;

      if (semi1Winner && finalMatch.teamAId !== semi1Winner) {
        const team = teamById.get(semi1Winner);
        if (team) {
          finalMatch.teamAId = team.id;
          finalMatch.teamAName = team.name;
          finalMatch.teamAShortName = team.shortName;
          changed = true;
        }
      }
      if (semi2Winner && finalMatch.teamBId !== semi2Winner) {
        const team = teamById.get(semi2Winner);
        if (team) {
          finalMatch.teamBId = team.id;
          finalMatch.teamBName = team.name;
          finalMatch.teamBShortName = team.shortName;
          changed = true;
        }
      }
    }

    // Perdedores -> 3º Lugar
    if (thirdPlace) {
      const semi1Loser = (semi1.status === 'completed' || semi1.status === 'homologated') ? getLoserId(semi1) : null;
      const semi2Loser = (semi2.status === 'completed' || semi2.status === 'homologated') ? getLoserId(semi2) : null;

      if (semi1Loser && thirdPlace.teamAId !== semi1Loser) {
        const team = teamById.get(semi1Loser);
        if (team) {
          thirdPlace.teamAId = team.id;
          thirdPlace.teamAName = team.name;
          thirdPlace.teamAShortName = team.shortName;
          changed = true;
        }
      }
      if (semi2Loser && thirdPlace.teamBId !== semi2Loser) {
        const team = teamById.get(semi2Loser);
        if (team) {
          thirdPlace.teamBId = team.id;
          thirdPlace.teamBName = team.name;
          thirdPlace.teamBShortName = team.shortName;
          changed = true;
        }
      }
    }
  }

  return { updatedMatches: updated, changed };
}

/**
 * Calcula o pódio final da competição (Campeão, Vice, 3º lugar e 4º lugar).
 */
export function computePodium(matches: MatchRecord[]): {
  championTeamId?: string;
  runnerUpTeamId?: string;
  thirdPlaceTeamId?: string;
  fourthPlaceTeamId?: string;
} {
  const finalMatch = matches.find(m => m.phase === 'final' && (m.status === 'completed' || m.status === 'homologated'));
  const thirdMatch = matches.find(m => m.phase === 'terceiro_lugar' && (m.status === 'completed' || m.status === 'homologated'));

  let championTeamId: string | undefined;
  let runnerUpTeamId: string | undefined;
  let thirdPlaceTeamId: string | undefined;
  let fourthPlaceTeamId: string | undefined;

  if (finalMatch?.winnerId) {
    championTeamId = finalMatch.winnerId;
    runnerUpTeamId = finalMatch.winnerId === finalMatch.teamAId ? finalMatch.teamBId : finalMatch.teamAId;
  }

  if (thirdMatch?.winnerId) {
    thirdPlaceTeamId = thirdMatch.winnerId;
    fourthPlaceTeamId = thirdMatch.winnerId === thirdMatch.teamAId ? thirdMatch.teamBId : thirdMatch.teamAId;
  }

  return { championTeamId, runnerUpTeamId, thirdPlaceTeamId, fourthPlaceTeamId };
}
