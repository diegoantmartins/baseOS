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
import { computeStandings, type StandingsByGroup, type BestThirdResult, type StandingInput } from '@/services/standingsService';
import { CompetitionRulesService, isSingleStageRoundRobin } from './competitionRulesService';

export { isSingleStageRoundRobin };

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

    const resolvedFormat = CompetitionRulesService.resolveMatchFormat(competition, slot.phase);
    const customSetFormat: '3-sets' | '5-sets' =
      resolvedFormat.setsToWin === 3 ? '5-sets' : '3-sets';

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
 * para os próximos confrontos do chaveamento usando o Resultado Canônico Oficial.
 */
export function advancePlayoffMatches(
  matches: MatchRecord[],
  teams: TeamRecord[],
  competition?: CompetitionRecord,
): { updatedMatches: MatchRecord[]; changed: boolean } {
  const teamById = new Map(teams.map(t => [t.id, t]));
  const updated = [...matches];
  let changed = false;

  const getCanonicalWinnerAndLoser = (match: MatchRecord) => {
    const isFinished = match.status === 'completed' || match.status === 'homologated';
    if (!isFinished) return { winnerId: null, loserId: null };

    const canonical = CompetitionRulesService.getCanonicalMatchResult(competition, match);
    if (canonical.isCompleted && canonical.isValid) {
      return { winnerId: canonical.winnerId, loserId: canonical.loserId };
    }

    const winnerId = match.winnerId ?? null;
    const loserId = winnerId ? (winnerId === match.teamAId ? match.teamBId : match.teamAId) : null;
    return { winnerId, loserId };
  };

  // Localiza semifinais, disputa de 3º e final
  const semis = updated.filter(m => m.phase === 'semifinal');
  const thirdPlace = updated.find(m => m.phase === 'terceiro_lugar');
  const finalMatch = updated.find(m => m.phase === 'final');

  // Propagação de Quartas para Semis
  const quartas = updated.filter(m => m.phase === 'quartas');
  if (quartas.length === 4 && semis.length === 2) {
    // Q1 -> Semi1 Team A, Q2 -> Semi1 Team B
    const { winnerId: q1Winner } = getCanonicalWinnerAndLoser(quartas[0]);
    const { winnerId: q2Winner } = getCanonicalWinnerAndLoser(quartas[1]);

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
    const { winnerId: q3Winner } = getCanonicalWinnerAndLoser(quartas[2]);
    const { winnerId: q4Winner } = getCanonicalWinnerAndLoser(quartas[3]);

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

    const { winnerId: semi1Winner, loserId: semi1Loser } = getCanonicalWinnerAndLoser(semi1);
    const { winnerId: semi2Winner, loserId: semi2Loser } = getCanonicalWinnerAndLoser(semi2);

    // Vencedores -> Final
    if (finalMatch) {
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
 * Calcula o pódio final da competição (Campeão, Vice, 3º lugar e 4º lugar)
 * com base no Resultado Canônico Oficial.
 *
 * Para competições eliminatórias (playoffs), avalia as partidas de final e 3º lugar.
 * Para competições de fase única (round-robin), utiliza o StandingsService com TieBreakEngine
 * oficial e mini-tabela.
 */
export function computePodium(
  matches: MatchRecord[],
  competition?: CompetitionRecord,
): {
  championTeamId?: string;
  runnerUpTeamId?: string;
  thirdPlaceTeamId?: string;
  fourthPlaceTeamId?: string;
} {
  // 1. Se for competição de fase única round-robin
  if (isSingleStageRoundRobin(competition, matches)) {
    const pendingMatches = matches.filter(
      m => m.status !== 'completed' && m.status !== 'homologated' && m.status !== 'cancelled',
    );

    // O pódio oficial em pontos corridos só é homologável após a conclusão de todas as partidas obrigatórias
    if (matches.length === 0 || pendingMatches.length > 0) {
      return {};
    }

    // Extrai equipes sintéticas dos participantes das partidas para alimentar o standingsService
    // (A API de computePodium recebe apenas matches e competition; equipes sintéticas garantem
    // que o StandingsService processe todos os critérios oficiais sem violar o contrato existente).
    const teamsMap = new Map<string, TeamRecord>();
    for (const m of matches) {
      if (m.teamAId && !teamsMap.has(m.teamAId)) {
        teamsMap.set(m.teamAId, {
          id: m.teamAId,
          name: m.teamAName || m.teamAId,
          shortName: m.teamAShortName || m.teamAName || m.teamAId,
          modality: competition?.modality || 'indoor',
        });
      }
      if (m.teamBId && !teamsMap.has(m.teamBId)) {
        teamsMap.set(m.teamBId, {
          id: m.teamBId,
          name: m.teamBName || m.teamBId,
          shortName: m.teamBShortName || m.teamBName || m.teamBId,
          modality: competition?.modality || 'indoor',
        });
      }
    }

    const standingInputs: StandingInput[] = Array.from(teamsMap.values()).map(team => ({ team }));
    const standings = computeStandings(standingInputs, matches, {
      competition,
      useMiniTable: true,
    });

    return {
      championTeamId: standings[0]?.teamId,
      runnerUpTeamId: standings[1]?.teamId,
      thirdPlaceTeamId: standings[2]?.teamId,
      fourthPlaceTeamId: standings[3]?.teamId,
    };
  }

  // 2. Fluxo oficial de Playoffs / Fases Finais
  const isFinished = (m: MatchRecord) => m.status === 'completed' || m.status === 'homologated';
  const finalMatch = matches.find(
    m =>
      (m.phase === 'final' ||
        m.phase === 'Grande Final' ||
        m.phase?.toLowerCase() === 'final' ||
        (m.phase?.toLowerCase().includes('final') &&
          !m.phase.toLowerCase().includes('semi') &&
          !m.phase.toLowerCase().includes('quart') &&
          !m.phase.toLowerCase().includes('oitav'))) &&
      isFinished(m)
  );
  const thirdMatch = matches.find(
    m =>
      (m.phase === 'terceiro_lugar' ||
        m.phase === 'Disputa de 3º Lugar' ||
        m.phase?.toLowerCase().includes('3') ||
        m.phase?.toLowerCase().includes('terceiro')) &&
      isFinished(m)
  );

  let championTeamId: string | undefined;
  let runnerUpTeamId: string | undefined;
  let thirdPlaceTeamId: string | undefined;
  let fourthPlaceTeamId: string | undefined;

  if (finalMatch) {
    const canonical = CompetitionRulesService.getCanonicalMatchResult(competition, finalMatch);
    championTeamId = canonical.winnerId ?? finalMatch.winnerId;
    runnerUpTeamId = canonical.loserId ?? (finalMatch.winnerId === finalMatch.teamAId ? finalMatch.teamBId : finalMatch.teamAId);
  }

  if (thirdMatch) {
    const canonical = CompetitionRulesService.getCanonicalMatchResult(competition, thirdMatch);
    thirdPlaceTeamId = canonical.winnerId ?? thirdMatch.winnerId;
    fourthPlaceTeamId = canonical.loserId ?? (thirdMatch.winnerId === thirdMatch.teamAId ? thirdMatch.teamBId : thirdMatch.teamAId);
  }

  // 3. Fallback de Segurança Universal: se não houver partida explicitamente com phase === 'final',
  // mas 100% das partidas do torneio estiverem finalizadas (ex: Turno Único, grupos, ou formatos customizados),
  // calcula o ranking final oficial via StandingsService para que o torneio nunca fique sem campeão / pódio.
  if (!championTeamId && matches.length > 0) {
    const pendingMatches = matches.filter(
      m => m.status !== 'completed' && m.status !== 'homologated' && m.status !== 'cancelled'
    );
    if (pendingMatches.length === 0) {
      const teamsMap = new Map<string, TeamRecord>();
      for (const m of matches) {
        if (m.teamAId && !teamsMap.has(m.teamAId)) {
          teamsMap.set(m.teamAId, {
            id: m.teamAId,
            name: m.teamAName || m.teamAId,
            shortName: m.teamAShortName || m.teamAName || m.teamAId,
            modality: competition?.modality || 'indoor',
          });
        }
        if (m.teamBId && !teamsMap.has(m.teamBId)) {
          teamsMap.set(m.teamBId, {
            id: m.teamBId,
            name: m.teamBName || m.teamBId,
            shortName: m.teamBShortName || m.teamBName || m.teamBId,
            modality: competition?.modality || 'indoor',
          });
        }
      }

      const standingInputs: StandingInput[] = Array.from(teamsMap.values()).map(team => ({ team }));
      const standings = computeStandings(standingInputs, matches, {
        competition,
        useMiniTable: true,
      });

      championTeamId = standings[0]?.teamId;
      runnerUpTeamId = standings[1]?.teamId;
      thirdPlaceTeamId = standings[2]?.teamId;
      fourthPlaceTeamId = standings[3]?.teamId;
    }
  }

  return { championTeamId, runnerUpTeamId, thirdPlaceTeamId, fourthPlaceTeamId };
}
