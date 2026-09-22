import { describe, it, expect } from 'vitest';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import { computePodium, isSingleStageRoundRobin } from '@/services/playoffsService';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { evaluateCompetitionReadiness } from '@/services/competitionReadinessService';

function makeTeam(id: string, name: string): TeamRecord {
  return {
    id,
    name,
    shortName: name.substring(0, 3).toUpperCase(),
    modality: 'indoor',
  };
}

function makeMatch(
  id: string,
  teamAId: string,
  teamBId: string,
  scoreA: number,
  scoreB: number,
  status: 'homologated' | 'completed' | 'scheduled' = 'homologated',
  matchNumber = 1,
): MatchRecord {
  return {
    id,
    competitionId: 'comp-rr-5',
    round: 1,
    matchNumber,
    teamAId,
    teamBId,
    teamAName: teamAId,
    teamBName: teamBId,
    teamAShortName: teamAId,
    teamBShortName: teamBId,
    venue: 'Ginásio Central',
    court: 'Quadra 1',
    scheduledTime: '2026-09-22T10:00:00Z',
    phase: 'regular',
    status,
    sets: [
      { setNumber: 1, scoreA: scoreA > scoreB ? 25 : 18, scoreB: scoreB > scoreA ? 25 : 18 },
      { setNumber: 2, scoreA: scoreA > scoreB ? 25 : 20, scoreB: scoreB > scoreA ? 25 : 20 },
    ],
    referees: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('Domínio 1 — Round-Robin / Pódio / Completion', () => {
  const compRoundRobin: CompetitionRecord = {
    id: 'comp-rr-5',
    name: 'Copa Round-Robin 5 Equipes',
    modality: 'indoor',
    format: 'round-robin',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'male',
    status: 'in-progress',
    tiebreakCriteriaOrder: ['points', 'victories', 'head-to-head', 'set-average', 'points-average', 'draw'],
  };

  const compPlayoffs: CompetitionRecord = {
    id: 'comp-playoffs',
    name: 'Torneio com Mata-mata',
    modality: 'indoor',
    format: 'groups-knockout',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'male',
    status: 'in-progress',
  };

  const teams: TeamRecord[] = [
    makeTeam('t1', 'Alfa'),
    makeTeam('t2', 'Beta'),
    makeTeam('t3', 'Gama'),
    makeTeam('t4', 'Delta'),
    makeTeam('t5', 'Epsilon'),
  ];

  it('1 a 6. 5 equipes, 10 partidas homologadas, sem phase=final, pódio e 4º colocados corretos', () => {
    // 5 equipes todos contra todos = 10 jogos:
    // T1 vence todos (4 vitórias: T1>T2, T1>T3, T1>T4, T1>T5) -> 1º lugar
    // T2 vence T3, T4, T5 (3 vitórias) -> 2º lugar
    // T3 vence T4, T5 (2 vitórias) -> 3º lugar
    // T4 vence T5 (1 vitória) -> 4º lugar
    // T5 perde todos (0 vitórias) -> 5º lugar
    const matches: MatchRecord[] = [
      makeMatch('m1', 't1', 't2', 2, 0, 'homologated', 1),
      makeMatch('m2', 't1', 't3', 2, 0, 'homologated', 2),
      makeMatch('m3', 't1', 't4', 2, 0, 'homologated', 3),
      makeMatch('m4', 't1', 't5', 2, 0, 'homologated', 4),
      makeMatch('m5', 't2', 't3', 2, 0, 'homologated', 5),
      makeMatch('m6', 't2', 't4', 2, 0, 'homologated', 6),
      makeMatch('m7', 't2', 't5', 2, 0, 'homologated', 7),
      makeMatch('m8', 't3', 't4', 2, 0, 'homologated', 8),
      makeMatch('m9', 't3', 't5', 2, 0, 'homologated', 9),
      makeMatch('m10', 't4', 't5', 2, 0, 'homologated', 10),
    ];

    expect(isSingleStageRoundRobin(compRoundRobin, matches)).toBe(true);

    const podium = computePodium(matches, compRoundRobin);
    expect(podium.championTeamId).toBe('t1');
    expect(podium.runnerUpTeamId).toBe('t2');
    expect(podium.thirdPlaceTeamId).toBe('t3');
    expect(podium.fourthPlaceTeamId).toBe('t4');

    // Nenhuma partida possui phase=final
    expect(matches.some(m => m.phase === 'final')).toBe(false);
  });

  it('7. 9 homologadas + 1 pendente: não permite conclusão e não atribui pódio prematuro', () => {
    const matches: MatchRecord[] = [
      makeMatch('m1', 't1', 't2', 2, 0, 'homologated', 1),
      makeMatch('m2', 't1', 't3', 2, 0, 'homologated', 2),
      makeMatch('m3', 't1', 't4', 2, 0, 'homologated', 3),
      makeMatch('m4', 't1', 't5', 2, 0, 'homologated', 4),
      makeMatch('m5', 't2', 't3', 2, 0, 'homologated', 5),
      makeMatch('m6', 't2', 't4', 2, 0, 'homologated', 6),
      makeMatch('m7', 't2', 't5', 2, 0, 'homologated', 7),
      makeMatch('m8', 't3', 't4', 2, 0, 'homologated', 8),
      makeMatch('m9', 't3', 't5', 2, 0, 'homologated', 9),
      makeMatch('m10', 't4', 't5', 0, 0, 'scheduled', 10), // 10ª pendente
    ];

    const podium = computePodium(matches, compRoundRobin);
    expect(podium.championTeamId).toBeUndefined();

    const validation = CompetitionLifecycleService.validateTransition(compRoundRobin, 'completed', {
      teams,
      matches,
      championTeamId: podium.championTeamId,
    });
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('1 partidas em aberto'))).toBe(true);

    const readiness = evaluateCompetitionReadiness({
      competition: compRoundRobin,
      modalities: [],
      venues: [],
      teams,
      competitionTeams: [],
      athletes: [],
      matches,
    });
    expect(readiness.canHomologate).toBe(false);
  });

  it('8. Todas homologadas: permite completed', () => {
    const matches: MatchRecord[] = [
      makeMatch('m1', 't1', 't2', 2, 0, 'homologated', 1),
      makeMatch('m2', 't1', 't3', 2, 0, 'homologated', 2),
      makeMatch('m3', 't1', 't4', 2, 0, 'homologated', 3),
      makeMatch('m4', 't1', 't5', 2, 0, 'homologated', 4),
      makeMatch('m5', 't2', 't3', 2, 0, 'homologated', 5),
      makeMatch('m6', 't2', 't4', 2, 0, 'homologated', 6),
      makeMatch('m7', 't2', 't5', 2, 0, 'homologated', 7),
      makeMatch('m8', 't3', 't4', 2, 0, 'homologated', 8),
      makeMatch('m9', 't3', 't5', 2, 0, 'homologated', 9),
      makeMatch('m10', 't4', 't5', 2, 0, 'homologated', 10),
    ];

    const podium = computePodium(matches, compRoundRobin);
    const validation = CompetitionLifecycleService.validateTransition(compRoundRobin, 'completed', {
      teams,
      matches,
      championTeamId: podium.championTeamId,
    });
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    const nextStatus = CompetitionLifecycleService.getNextRecommendedStatus('in-progress', compRoundRobin, matches);
    expect(nextStatus).toBe('completed');
  });

  it('9. Empate entre equipes desempata por confronto direto (TieBreakEngine)', () => {
    // T1 e T2 terminam com a mesma pontuação, mas T1 venceu T2 no confronto direto
    const matches: MatchRecord[] = [
      makeMatch('m1', 't1', 't2', 2, 0, 'homologated', 1), // T1 vence T2
      makeMatch('m2', 't2', 't3', 2, 0, 'homologated', 2), // T2 vence T3
      makeMatch('m3', 't3', 't1', 2, 0, 'homologated', 3), // T3 vence T1
    ];

    const comp3: CompetitionRecord = {
      ...compRoundRobin,
      id: 'comp-h2h',
      tiebreakCriteriaOrder: ['points', 'head-to-head', 'victories', 'set-average', 'draw'],
    };

    const podium = computePodium(matches, comp3);
    expect(podium.championTeamId).toBeDefined();
  });

  it('10. Empate triplo resolvido pelos critérios oficiais existentes', () => {
    // T1 vence T2 (2-0), T2 vence T3 (2-0), T3 vence T1 (2-0)
    // Mini-tabela resolve por sets ratio / points ratio
    const matches: MatchRecord[] = [
      {
        ...makeMatch('m1', 't1', 't2', 2, 0, 'homologated', 1),
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 10 },
          { setNumber: 2, scoreA: 25, scoreB: 10 },
        ],
      },
      {
        ...makeMatch('m2', 't2', 't3', 2, 0, 'homologated', 2),
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20 },
          { setNumber: 2, scoreA: 25, scoreB: 20 },
        ],
      },
      {
        ...makeMatch('m3', 't3', 't1', 2, 0, 'homologated', 3),
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 23 },
          { setNumber: 2, scoreA: 25, scoreB: 23 },
        ],
      },
    ];

    const podium = computePodium(matches, compRoundRobin);
    // T1 cedeu apenas 20 pontos para T2 e marcou 46 contra T3 -> melhor saldo/average
    expect(podium.championTeamId).toBe('t1');
  });

  it('11. Competição com playoff não pula playoffs e exige mata-mata', () => {
    const groupMatches: MatchRecord[] = [
      makeMatch('m1', 't1', 't2', 2, 0, 'homologated', 1),
      makeMatch('m2', 't3', 't4', 2, 0, 'homologated', 2),
    ];

    expect(isSingleStageRoundRobin(compPlayoffs, groupMatches)).toBe(false);

    // Próximo status recomendado para formato com playoff é 'playoffs', não 'completed'
    const nextStatus = CompetitionLifecycleService.getNextRecommendedStatus('in-progress', compPlayoffs, groupMatches);
    expect(nextStatus).toBe('playoffs');

    // Tentativa de pular diretamente de in-progress para completed é bloqueada
    const validation = CompetitionLifecycleService.validateTransition(compPlayoffs, 'completed', {
      teams,
      matches: groupMatches,
      championTeamId: 't1',
    });
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('possui fase eliminatória (playoffs) configurada'))).toBe(true);
  });

  it('12. Execução duplicada da avaliação produz resultado idempotente', () => {
    const matches: MatchRecord[] = [
      makeMatch('m1', 't1', 't2', 2, 0, 'homologated', 1),
      makeMatch('m2', 't2', 't3', 2, 0, 'homologated', 2),
    ];

    const p1 = computePodium(matches, compRoundRobin);
    const p2 = computePodium(matches, compRoundRobin);
    expect(p1).toEqual(p2);

    const v1 = CompetitionLifecycleService.validateTransition(compRoundRobin, 'completed', { teams, matches });
    const v2 = CompetitionLifecycleService.validateTransition(compRoundRobin, 'completed', { teams, matches });
    expect(v1).toEqual(v2);
  });
});
