import { describe, it, expect } from 'vitest';
import {
  computeStandings,
  headToHeadWinner,
  matchWinner,
  competitionPointsFromSets,
} from '@/services/standingsService';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';

describe('Fase 5.1 — Eliminação dos Bypasses do CompetitionRulesService', () => {
  const teamA: TeamRecord = { id: 'team-a', name: 'Alpha Team', shortName: 'ALP', modality: 'indoor' };
  const teamB: TeamRecord = { id: 'team-b', name: 'Beta Team', shortName: 'BET', modality: 'indoor' };
  const teamD: TeamRecord = { id: 'team-d', name: 'Delta Team', shortName: 'DEL', modality: 'indoor' };

  const createTestMatch = (
    overrides: Partial<MatchRecord> & Pick<MatchRecord, 'id' | 'competitionId' | 'teamAId' | 'teamBId' | 'sets'>,
  ): MatchRecord => ({
    id: overrides.id,
    competitionId: overrides.competitionId,
    round: overrides.round ?? 1,
    matchNumber: overrides.matchNumber ?? 1,
    teamAId: overrides.teamAId,
    teamBId: overrides.teamBId,
    teamAName: overrides.teamAName ?? 'Alpha Team',
    teamBName: overrides.teamBName ?? 'Beta Team',
    teamAShortName: overrides.teamAShortName ?? 'ALP',
    teamBShortName: overrides.teamBShortName ?? 'BET',
    venue: overrides.venue ?? 'Quadra Central',
    court: overrides.court ?? 'Quadra 1',
    scheduledTime: overrides.scheduledTime ?? '2026-09-01T10:00:00Z',
    status: overrides.status ?? 'completed',
    sets: overrides.sets,
    referees: overrides.referees ?? [],
    createdAt: overrides.createdAt ?? '2026-09-01T00:00:00Z',
    updatedAt: overrides.updatedAt ?? '2026-09-01T00:00:00Z',
    ...overrides,
  });

  /**
   * TESTE DE DIVERGÊNCIA PROPOSITAL (MANDATÓRIO)
   *
   * Demonstra que o sistema respeita a precedência da configuração canônica (rulesSnapshot / config)
   * sobre campos legados no topo do CompetitionRecord.
   *
   * Cenário:
   *  - Legado: ['points', 'head-to-head', 'sets-ratio'] -> favoreceria Equipe A (venceu confronto direto).
   *  - Canônico: ['points', 'sets-ratio', 'head-to-head'] -> favorece Equipe B (melhor razão de sets: 1.667 vs 1.500).
   *
   * Prova que a classificação final coloca Equipe B em 1º lugar.
   */
  it('divergência proposital: configuração canônica prevalece sobre critérios legados', () => {
    const divergentCompetition: CompetitionRecord = {
      id: 'comp-divergent-51',
      name: 'Copa Divergência Canônica vs Legada',
      modality: 'indoor',
      format: 'groups',
      playerFormat: '6x6',
      setFormat: '5-sets',
      genderCategory: 'male',
      status: 'in-progress',
      // BYPASS LEGADO INTENCIONAL NO TOPO DO REGISTRO:
      tiebreakCriteriaOrder: ['points', 'head-to-head', 'sets-ratio'],
      // AUTORIDADE CANÔNICA (Single Source of Truth):
      config: {
        version: 1,
        format: {
          defaultSetsToWin: 3,
          setRules: { regularSetPoints: 25, tiebreakPoints: 15, minAdvantage: 2 },
        },
        scoring: {
          systemType: 'fivb-standard',
          pointsWinClear: 3,
          pointsWinNarrow: 2,
          pointsLossNarrow: 1,
          pointsLossClear: 0,
          pointsWoWin: 3,
          pointsWoLoss: 0,
        },
        standings: {
          // Canônico coloca sets-ratio ANTES de head-to-head
          tiebreakCriteriaOrder: ['points', 'sets-ratio', 'head-to-head'],
          advancingPerGroup: 2,
        },
        registration: {
          minAthletes: 6,
          maxAthletes: 14,
          maxCaptains: 1,
          maxLiberos: 2,
          requireJerseyNumberOnRegistration: false,
        },
      },
    };

    // Ambas equipes terminam com 4 pontos:
    // Partida 1: Alpha vence Beta por 3x2 (Alpha: 2 pts, Beta: 1 pt). H2H favorece Alpha!
    // Partida 2: Alpha vence Delta por 3x2 (Alpha: 2 pts, Delta: 1 pt). Total Alpha: 4 pts, sets 6/4 = 1.500.
    // Partida 3: Beta vence Delta por 3x0 (Beta: 3 pts, Delta: 0 pt). Total Beta: 4 pts, sets 5/3 = 1.667.
    const matches: MatchRecord[] = [
      createTestMatch({
        id: 'm1',
        competitionId: divergentCompetition.id,
        round: 1,
        matchNumber: 1,
        teamAId: 'team-a',
        teamBId: 'team-b',
        teamAName: 'Alpha Team',
        teamBName: 'Beta Team',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20 },
          { setNumber: 2, scoreA: 20, scoreB: 25 },
          { setNumber: 3, scoreA: 25, scoreB: 20 },
          { setNumber: 4, scoreA: 20, scoreB: 25 },
          { setNumber: 5, scoreA: 15, scoreB: 13 },
        ],
      }),
      createTestMatch({
        id: 'm2',
        competitionId: divergentCompetition.id,
        round: 2,
        matchNumber: 2,
        teamAId: 'team-a',
        teamBId: 'team-d',
        teamAName: 'Alpha Team',
        teamBName: 'Delta Team',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20 },
          { setNumber: 2, scoreA: 20, scoreB: 25 },
          { setNumber: 3, scoreA: 25, scoreB: 20 },
          { setNumber: 4, scoreA: 20, scoreB: 25 },
          { setNumber: 5, scoreA: 15, scoreB: 13 },
        ],
      }),
      createTestMatch({
        id: 'm3',
        competitionId: divergentCompetition.id,
        round: 3,
        matchNumber: 3,
        teamAId: 'team-b',
        teamBId: 'team-d',
        teamAName: 'Beta Team',
        teamBName: 'Delta Team',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 15 },
          { setNumber: 2, scoreA: 25, scoreB: 18 },
          { setNumber: 3, scoreA: 25, scoreB: 19 },
        ],
      }),
    ];

    const standings = computeStandings(
      [{ team: teamA }, { team: teamB }, { team: teamD }],
      matches,
      { competition: divergentCompetition },
    );

    // Ambas equipes têm 4 pontos:
    expect(standings.find(s => s.teamId === 'team-a')!.competitionPoints).toBe(4);
    expect(standings.find(s => s.teamId === 'team-b')!.competitionPoints).toBe(4);

    // Se o legado head-to-head prevalecesse, Team A estaria em 1º.
    // Como a autoridade canônica (sets-ratio) prevalece, Team B (setsRatio 1.667 vs 1.500) DEVE ser 1º!
    expect(standings[0].teamId).toBe('team-b');
    expect(standings[0].position).toBe(1);
    expect(standings[1].teamId).toBe('team-a');
    expect(standings[1].position).toBe(2);
  });

  /**
   * PROPAGAÇÃO DE CONTEXTO: headToHeadWinner e matchWinner
   */
  it('headToHeadWinner preserva e propaga CompetitionRecord até matchWinner e CompetitionRulesService', () => {
    const comp: CompetitionRecord = {
      id: 'comp-h2h-context',
      name: 'Copa Contexto H2H',
      modality: 'indoor',
      format: 'groups',
      playerFormat: '6x6',
      setFormat: '5-sets',
      genderCategory: 'male',
      status: 'in-progress',
    };

    const match: MatchRecord = createTestMatch({
      id: 'm-h2h-1',
      competitionId: comp.id,
      round: 1,
      matchNumber: 1,
      teamAId: 'team-a',
      teamBId: 'team-b',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 23, scoreB: 25 },
        { setNumber: 3, scoreA: 25, scoreB: 20 },
        { setNumber: 4, scoreA: 25, scoreB: 22 },
      ],
    });

    // matchWinner com contexto da competição
    const winnerDirect = matchWinner(match, comp);
    expect(winnerDirect).toBe('team-a');

    // headToHeadWinner propagando o contexto
    const h2h = headToHeadWinner([match], 'team-a', 'team-b', false, comp);
    expect(h2h).toBe('team-a');
  });

  /**
   * TESTE DE PRAIA — VALIDAÇÃO EXCLUSIVA DE PROPAGAÇÃO DE CONTEXTO
   *
   * O teste de praia deve validar exclusivamente que o contexto CompetitionRecord é propagado
   * até a resolução das regras esportivas, sem certificar suporte completo à modalidade praia no Document Engine.
   */
  it('teste de praia: propaga CompetitionRecord de praia (21 pontos) na resolução de regras', () => {
    const beachComp: CompetitionRecord = {
      id: 'comp-beach-h2h',
      name: 'Circuito Praia Duplas',
      modality: 'beach',
      format: 'groups',
      playerFormat: '2x2',
      setFormat: '3-sets',
      genderCategory: 'male',
      status: 'in-progress',
      config: {
        version: 1,
        format: {
          defaultSetsToWin: 2,
          setRules: { regularSetPoints: 21, tiebreakPoints: 15, minAdvantage: 2 },
        },
        scoring: {
          systemType: 'fivb-standard',
          pointsWinClear: 3,
          pointsWinNarrow: 2,
          pointsLossNarrow: 1,
          pointsLossClear: 0,
          pointsWoWin: 3,
          pointsWoLoss: 0,
        },
        standings: {
          tiebreakCriteriaOrder: ['points', 'victories', 'head-to-head'],
          advancingPerGroup: 2,
        },
        registration: {
          minAthletes: 2,
          maxAthletes: 4,
          maxCaptains: 1,
          maxLiberos: 0,
          requireJerseyNumberOnRegistration: false,
        },
      },
    };

    const beachMatch: MatchRecord = createTestMatch({
      id: 'm-beach-1',
      competitionId: beachComp.id,
      round: 1,
      matchNumber: 1,
      teamAId: 'team-a',
      teamBId: 'team-b',
      teamAName: 'Alpha Beach',
      teamBName: 'Beta Beach',
      sets: [
        { setNumber: 1, scoreA: 21, scoreB: 18 },
        { setNumber: 2, scoreA: 21, scoreB: 16 },
      ],
    });

    const winner = headToHeadWinner([beachMatch], 'team-a', 'team-b', false, beachComp);
    expect(winner).toBe('team-a');

    const canonicalResult = CompetitionRulesService.getCanonicalMatchResult(beachComp, beachMatch);
    expect(canonicalResult.isCompleted).toBe(true);
    expect(canonicalResult.winnerId).toBe('team-a');
    expect(canonicalResult.setsWonA).toBe(2);
    expect(canonicalResult.setsWonB).toBe(0);
  });

  /**
   * competitionPointsFromSets DELEGA EXCLUSIVAMENTE PARA CompetitionRulesService
   */
  it('competitionPointsFromSets delega cálculo para CompetitionRulesService com ou sem competition', () => {
    const comp: CompetitionRecord = {
      id: 'comp-pts-calc',
      name: 'Copa Pontos',
      modality: 'indoor',
      format: 'groups',
      playerFormat: '6x6',
      setFormat: '5-sets',
      genderCategory: 'male',
      status: 'in-progress',
    };

    // Com contexto de competição
    expect(competitionPointsFromSets(3, 0, false, comp)).toBe(3);
    expect(competitionPointsFromSets(3, 1, false, comp)).toBe(3);
    expect(competitionPointsFromSets(3, 2, false, comp)).toBe(2);
    expect(competitionPointsFromSets(2, 3, false, comp)).toBe(1);
    expect(competitionPointsFromSets(1, 3, false, comp)).toBe(0);
    expect(competitionPointsFromSets(0, 3, false, comp)).toBe(0);
    expect(competitionPointsFromSets(3, 0, true, comp)).toBe(3);
    expect(competitionPointsFromSets(0, 3, true, comp)).toBe(0);

    // Sem contexto (fallback defensivo para indoor padrão via CompetitionRulesService)
    expect(competitionPointsFromSets(3, 0)).toBe(3);
    expect(competitionPointsFromSets(3, 2)).toBe(2);
    expect(competitionPointsFromSets(2, 3)).toBe(1);
    expect(competitionPointsFromSets(0, 3)).toBe(0);
    expect(competitionPointsFromSets(3, 0, true)).toBe(3);
    expect(competitionPointsFromSets(0, 3, true)).toBe(0);
  });

  /**
   * RESOLUÇÃO DE CRITÉRIOS NO RUNTIME
   */
  it('resolução de critérios no runtime consome estritamente a autoridade canônica sem bypass', () => {
    const compWithDivergence: CompetitionRecord = {
      id: 'comp-runtime-div-51',
      name: 'Copa Runtime Divergente',
      modality: 'indoor',
      format: 'groups',
      playerFormat: '6x6',
      setFormat: '5-sets',
      genderCategory: 'male',
      status: 'in-progress',
      tiebreakCriteriaOrder: ['points', 'head-to-head'], // LEGADO
      config: {
        version: 1,
        format: {
          defaultSetsToWin: 3,
          setRules: { regularSetPoints: 25, tiebreakPoints: 15, minAdvantage: 2 },
        },
        scoring: {
          systemType: 'fivb-standard',
          pointsWinClear: 3,
          pointsWinNarrow: 2,
          pointsLossNarrow: 1,
          pointsLossClear: 0,
          pointsWoWin: 3,
          pointsWoLoss: 0,
        },
        standings: {
          tiebreakCriteriaOrder: ['points', 'sets-ratio', 'head-to-head'], // CANÔNICO
          advancingPerGroup: 2,
        },
        registration: {
          minAthletes: 6,
          maxAthletes: 14,
          maxCaptains: 1,
          maxLiberos: 2,
          requireJerseyNumberOnRegistration: false,
        },
      },
    };

    const canonicalConfig = CompetitionRulesService.getConfig(compWithDivergence);
    expect(canonicalConfig.standings.tiebreakCriteriaOrder).toEqual(['points', 'sets-ratio', 'head-to-head']);
    expect(canonicalConfig.standings.tiebreakCriteriaOrder).not.toEqual(compWithDivergence.tiebreakCriteriaOrder);
  });
});
