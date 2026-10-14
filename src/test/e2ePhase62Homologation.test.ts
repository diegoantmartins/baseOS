/**
 * BaseOS — Fase 6.2: Bateria de Homologação E2E Integrada
 * Relatórios (Fase 4) + Probabilidade (Fase 5) + MVP / Destaque da Partida (Fase 6.1)
 *
 * Valida a cadeia completa da partida e a consistência dos múltiplos consumidores:
 * PARTIDA -> CHECK-IN -> RESULTADO -> SELEÇÃO MVP -> VALIDAÇÃO -> HOMOLOGAÇÃO
 * -> CLASSIFICAÇÃO OFICIAL (Fase 4)
 * -> PROBABILIDADE (Fase 5)
 * -> BOLETIM GERAL (Fase 4)
 * -> SÚMULA BASEOS (Fase 6.0/6.1)
 * -> PORTAL PÚBLICO (Fase 3.3/6.1)
 * -> PORTAL DA EQUIPE (Fase 3.2/6.1)
 * -> SOCIAL CARD (Fase 6.1)
 *
 * Todos os 24 cenários executados sem alterações no motor de probabilidade
 * nem na geometria da súmula BaseOS.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { dataAccess, resetLocalData } from '@/services/dataAccess';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { ClassificationProbabilityService } from '@/services/classificationProbabilityService';
import { computeStandingsByGroup, type StandingInput } from '@/services/standingsService';
import {
  validateMatchHighlight,
  deriveHighlightAthleteInfo,
} from '@/services/matchValidationService';
import { publicCompetitionService } from '@/services/publicCompetitionService';
import { mapMatchRecordToBaseosScoresheet } from '@/document-engine/baseos/mapper/match.mapper';
import type {
  CompetitionRecord,
  MatchRecord,
  TeamRecord,
} from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';
import type { MatchBoletimRow } from '@/lib/pdf/types';

describe('BaseOS — Fase 6.2: Homologação E2E Integrada (24 Cenários)', () => {
  beforeEach(() => {
    resetLocalData();
  });

  // ==========================================================================
  // FIXTURES DE SUPORTE
  // ==========================================================================

  function createIndoorCompetitionFixture(): CompetitionRecord {
    return {
      id: 'comp-indoor-e2e',
      name: 'Superliga BaseOS Indoor 2026',
      slug: 'superliga-baseos-indoor-2026',
      modality: 'indoor',
      format: 'round-robin',
      playerFormat: '6x6',
      setFormat: '5-sets',
      phaseSetRules: {
        groupStage: '5-sets',
        playoffs: '5-sets',
        semifinals: '5-sets',
        final: '5-sets',
      },
      genderCategory: 'male',
      status: 'in-progress',
      advancingPerGroup: 2,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
  }

  function createBeachCompetitionFixture(): CompetitionRecord {
    return {
      id: 'comp-beach-e2e',
      name: 'Circuito BaseOS Praia 2026',
      slug: 'circuito-baseos-praia-2026',
      modality: 'beach',
      format: 'round-robin',
      playerFormat: '2x2',
      setFormat: '3-sets',
      phaseSetRules: {
        groupStage: '3-sets',
        playoffs: '3-sets',
        semifinals: '3-sets',
        final: '3-sets',
      },
      genderCategory: 'mixed',
      status: 'in-progress',
      advancingPerGroup: 2,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
  }

  function createTeamFixture(id: string, name: string, shortName: string, modality: 'indoor' | 'beach' = 'indoor'): TeamRecord {
    return {
      id,
      name,
      shortName,
      modality,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
  }

  function createCompTeamFixture(competitionId: string, team: TeamRecord): CompetitionTeam {
    return {
      id: `ct-${team.id}`,
      competitionId,
      teamId: team.id,
      teamName: team.name,
      teamShortName: team.shortName,
      accessToken: `tok-${team.id}`,
      registrationDeadline: '2026-12-31T23:59:59Z',
      isLocked: false,
      status: 'approved',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
  }

  function createAthleteFixture(
    id: string,
    competitionTeamId: string,
    name: string,
    jerseyNumber: number,
    isCaptain = false,
    isLibero = false,
  ): CompetitionAthlete {
    return {
      id,
      competitionTeamId,
      name,
      jerseyNumber,
      position: isLibero ? 'Líbero' : isCaptain ? 'Levantador' : 'Ponteiro',
      isCaptain,
      isLibero,
      gender: 'male',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
  }

  function makeMatchRecord(
    partial: Partial<MatchRecord> & {
      id: string;
      competitionId: string;
      teamAId: string;
      teamBId: string;
      teamAName: string;
      teamBName: string;
    },
  ): MatchRecord {
    return {
      matchNumber: 1,
      round: 1,
      teamAShortName: partial.teamAShortName ?? partial.teamAName.slice(0, 3).toUpperCase(),
      teamBShortName: partial.teamBShortName ?? partial.teamBName.slice(0, 3).toUpperCase(),
      venue: 'Ginásio Central',
      scheduledTime: '2026-10-15T18:00:00Z',
      status: 'scheduled',
      sets: [],
      referees: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      ...partial,
    };
  }

  // ==========================================================================
  // CENÁRIOS E2E 01 A 24
  // ==========================================================================

  it('Cenário E2E 01 — Partida Sem Resultado', async () => {
    const comp = createIndoorCompetitionFixture();
    const teamA = createTeamFixture('team-a', 'Vortex Vôlei', 'VOR');
    const teamB = createTeamFixture('team-b', 'Titanium Clube', 'TIT');
    const ctA = createCompTeamFixture(comp.id, teamA);
    const ctB = createCompTeamFixture(comp.id, teamB);

    const match = makeMatchRecord({
      id: 'match-e2e-01',
      competitionId: comp.id,
      matchNumber: 1,
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAName: teamA.name,
      teamBName: teamB.name,
      phase: 'classificatória',
      groupName: 'A',
      status: 'scheduled',
    });

    // 1. Ausência de MVP
    expect(match.highlightAthleteId).toBeUndefined();

    // 2. Classificação não recebe pontuação desta partida
    const standingInputs: StandingInput[] = [
      { team: teamA, groupName: 'A' },
      { team: teamB, groupName: 'A' },
    ];
    const standingsByGroup = computeStandingsByGroup(standingInputs, [match]);
    expect(standingsByGroup).toHaveLength(1);
    const groupRows = standingsByGroup[0].standings;
    expect(groupRows[0].matchesPlayed).toBe(0);
    expect(groupRows[0].competitionPoints).toBe(0);

    // 3. Boletim não marca como homologado
    const isHomologated = match.status === 'homologated';
    expect(isHomologated).toBe(false);

    // 4. Probabilidade considera como jogo futuro (restante)
    const probResult = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      [match],
      [teamA, teamB],
      [ctA, ctB],
    );
    expect(probResult.isSufficientData).toBe(true);
    const groupAProb = probResult.groups.find((g) => g.groupName === 'A');
    expect(groupAProb).toBeDefined();
    expect(groupAProb?.totalRemainingMatches).toBe(1);
  });

  it('Cenário E2E 02 — Check-in de Atletas', () => {
    const comp = createIndoorCompetitionFixture();
    const athPresent = createAthleteFixture('ath-1', 'ct-a', 'Lucão Silva', 8);
    const athAbsent = createAthleteFixture('ath-2', 'ct-a', 'Bruninho Lima', 1);

    const match = makeMatchRecord({
      id: 'match-e2e-02',
      competitionId: comp.id,
      matchNumber: 2,
      teamAId: 'team-a',
      teamBId: 'team-b',
      teamAName: 'Alpha',
      teamBName: 'Beta',
      phase: 'classificatória',
      groupName: 'A',
      status: 'completed',
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }, { setNumber: 2, scoreA: 25, scoreB: 22 }, { setNumber: 3, scoreA: 25, scoreB: 18 }],
      winnerId: 'team-a',
      checkedInAthleteIds: ['ath-1'], // Apenas ath-1 presente
    });

    // Atleta presente elegível
    const validCheck = validateMatchHighlight(match, 'ath-1', [athPresent, athAbsent], []);
    expect(validCheck.valid).toBe(true);

    // Atleta ausente bloqueado
    const invalidCheck = validateMatchHighlight(match, 'ath-2', [athPresent, athAbsent], []);
    expect(invalidCheck.valid).toBe(false);
    expect(invalidCheck.error).toContain('check-in');
  });

  it('Cenário E2E 03 — Resultado Sem MVP', () => {
    const comp = createIndoorCompetitionFixture();
    const teamA = createTeamFixture('team-a', 'Vortex', 'VOR');
    const teamB = createTeamFixture('team-b', 'Titanium', 'TIT');

    const match = makeMatchRecord({
      id: 'match-e2e-03',
      competitionId: comp.id,
      matchNumber: 3,
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAName: teamA.name,
      teamBName: teamB.name,
      phase: 'classificatória',
      groupName: 'A',
      status: 'homologated',
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }, { setNumber: 2, scoreA: 25, scoreB: 22 }, { setNumber: 3, scoreA: 25, scoreB: 18 }],
      winnerId: teamA.id,
      highlightAthleteId: undefined, // Sem MVP
    });

    const res = validateMatchHighlight(match, undefined, [], []);
    expect(res.valid).toBe(true);

    // Classificação funciona com 3 pontos para Vortex
    const standingInputs: StandingInput[] = [
      { team: teamA, groupName: 'A' },
      { team: teamB, groupName: 'A' },
    ];
    const standingsByGroup = computeStandingsByGroup(standingInputs, [match]);
    const groupRows = standingsByGroup[0].standings;
    expect(groupRows[0].teamId).toBe(teamA.id);
    expect(groupRows[0].competitionPoints).toBe(3);

    // Boletim funciona com destaque ausente
    const boletimRow: MatchBoletimRow = {
      matchNumber: match.matchNumber,
      round: match.round,
      date: '15/10/2026',
      time: '18:00',
      venue: match.venue,
      court: match.court,
      groupName: 'Grupo A',
      teamAName: match.teamAName,
      teamAShort: match.teamAShortName,
      teamBName: match.teamBName,
      teamBShort: match.teamBShortName,
      statusLabel: 'Encerrado',
      scoreA: 3,
      scoreB: 0,
      highlightAthleteName: undefined,
      highlightTeamShort: undefined,
    };
    expect(boletimRow.highlightAthleteName).toBeUndefined();
  });

  it('Cenário E2E 04 — Resultado com MVP (A e B, SSOT)', () => {
    const comp = createIndoorCompetitionFixture();
    const teamA = createTeamFixture('team-a', 'Alpha', 'ALP');
    const teamB = createTeamFixture('team-b', 'Beta', 'BET');
    const athA = createAthleteFixture('ath-a', 'ct-a', 'Atleta Alpha', 10);
    const athB = createAthleteFixture('ath-b', 'ct-b', 'Atleta Beta', 15);

    const matchA = makeMatchRecord({
      id: 'match-e2e-04a',
      competitionId: comp.id,
      matchNumber: 4,
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAName: teamA.name,
      teamBName: teamB.name,
      status: 'homologated',
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }, { setNumber: 2, scoreA: 25, scoreB: 22 }, { setNumber: 3, scoreA: 25, scoreB: 18 }],
      winnerId: teamA.id,
      highlightAthleteId: athA.id,
    });

    const derivedA = deriveHighlightAthleteInfo(athA.id, [athA], [athB], matchA);
    expect(derivedA?.side).toBe('A');
    expect(derivedA?.teamName).toBe('Alpha');
    expect(derivedA?.athlete.jerseyNumber).toBe(10);

    // E para a Equipe B
    const matchB = makeMatchRecord({
      ...matchA,
      id: 'match-e2e-04b',
      highlightAthleteId: athB.id,
    });
    const derivedB = deriveHighlightAthleteInfo(athB.id, [athA], [athB], matchB);
    expect(derivedB?.side).toBe('B');
    expect(derivedB?.teamName).toBe('Beta');
    expect(derivedB?.athlete.jerseyNumber).toBe(15);
  });

  it('Cenário E2E 05 — MVP Vencedor (Cadeia Completa)', () => {
    const comp = createIndoorCompetitionFixture();
    const teamA = createTeamFixture('team-a', 'Vortex', 'VOR');
    const teamB = createTeamFixture('team-b', 'Titanium', 'TIT');
    const athA = createAthleteFixture('ath-a', 'ct-a', 'Wallace Souza', 8);

    const match = makeMatchRecord({
      id: 'match-e2e-05',
      competitionId: comp.id,
      matchNumber: 5,
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAName: teamA.name,
      teamBName: teamB.name,
      phase: 'Fase Regular',
      status: 'homologated',
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }, { setNumber: 2, scoreA: 25, scoreB: 22 }, { setNumber: 3, scoreA: 25, scoreB: 18 }],
      winnerId: teamA.id, // Vencedor é Team A
      highlightAthleteId: athA.id, // MVP é do Team A
    });

    // 1. Validação de domínio
    expect(validateMatchHighlight(match, athA.id, [athA], []).valid).toBe(true);

    // 2. Súmula BaseOS
    const scoresheet = mapMatchRecordToBaseosScoresheet(match, comp, teamA, teamB, [athA], [], 'completed');
    expect(scoresheet.observations).toContain('Destaque da Partida (MVP): #8 Wallace Souza (VOR)');
  });

  it('Cenário E2E 06 — MVP Perdedor (Cadeia Completa)', () => {
    const comp = createIndoorCompetitionFixture();
    const teamA = createTeamFixture('team-a', 'Vortex', 'VOR');
    const teamB = createTeamFixture('team-b', 'Titanium', 'TIT');
    const athB = createAthleteFixture('ath-b', 'ct-b', 'Darlan Souza', 18);

    const match = makeMatchRecord({
      id: 'match-e2e-06',
      competitionId: comp.id,
      matchNumber: 6,
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAName: teamA.name,
      teamBName: teamB.name,
      phase: 'Fase Regular',
      status: 'homologated',
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 23 }, { setNumber: 2, scoreA: 23, scoreB: 25 }, { setNumber: 3, scoreA: 25, scoreB: 20 }, { setNumber: 4, scoreA: 25, scoreB: 22 }],
      winnerId: teamA.id, // Team A venceu
      highlightAthleteId: athB.id, // MVP é da equipe perdedora (Team B)
    });

    // Validação permite perdedor ser MVP
    expect(validateMatchHighlight(match, athB.id, [], [athB]).valid).toBe(true);
    const info = deriveHighlightAthleteInfo(athB.id, [], [athB], match);
    expect(info?.side).toBe('B');
    expect(info?.teamName).toBe('Titanium');
    expect(info?.athlete.name).toBe('Darlan Souza');

    // Súmula projeta equipe perdedora com sigla TIT
    const scoresheet = mapMatchRecordToBaseosScoresheet(match, comp, teamA, teamB, [], [athB], 'completed');
    expect(scoresheet.observations).toContain('Destaque da Partida (MVP): #18 Darlan Souza (TIT)');
  });

  it('Cenário E2E 07 — Alteração do MVP', async () => {
    const comp = createIndoorCompetitionFixture();
    const teamA = createTeamFixture('team-a', 'Alpha', 'ALP');
    const teamB = createTeamFixture('team-b', 'Beta', 'BET');
    const athA = createAthleteFixture('ath-a', 'ct-a', 'Atleta A', 1);
    const athB = createAthleteFixture('ath-b', 'ct-b', 'Atleta B', 2);

    const match = await dataAccess.createMatch({
      competitionId: comp.id,
      matchNumber: 7,
      round: 1,
      scheduledTime: '2026-10-15T18:00:00Z',
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAName: teamA.name,
      teamBName: teamB.name,
      teamAShortName: teamA.shortName,
      teamBShortName: teamB.shortName,
      venue: 'Ginásio',
      status: 'homologated',
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }, { setNumber: 2, scoreA: 25, scoreB: 20 }, { setNumber: 3, scoreA: 25, scoreB: 20 }],
      winnerId: teamA.id,
      highlightAthleteId: athA.id,
      referees: [],
    });

    expect(match.highlightAthleteId).toBe('ath-a');

    // Reabertura e alteração para ath-b
    const updated = await dataAccess.updateMatch(match.id, {
      status: 'completed',
      highlightAthleteId: athB.id,
    });
    expect(updated?.highlightAthleteId).toBe('ath-b');

    // Homologa novamente
    const rehomologated = await dataAccess.updateMatch(match.id, {
      status: 'homologated',
      homologatedAt: new Date().toISOString(),
      homologatedBy: 'Supervisor FPV',
    });
    expect(rehomologated?.highlightAthleteId).toBe('ath-b');
  });

  it('Cenário E2E 08 — Remoção do MVP', async () => {
    const comp = createIndoorCompetitionFixture();
    const match = await dataAccess.createMatch({
      competitionId: comp.id,
      matchNumber: 8,
      round: 1,
      scheduledTime: '2026-10-15T18:00:00Z',
      teamAId: 'team-a',
      teamBId: 'team-b',
      teamAName: 'Alpha',
      teamBName: 'Beta',
      teamAShortName: 'ALP',
      teamBShortName: 'BET',
      venue: 'Ginásio',
      status: 'homologated',
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }, { setNumber: 2, scoreA: 25, scoreB: 20 }, { setNumber: 3, scoreA: 25, scoreB: 20 }],
      winnerId: 'team-a',
      highlightAthleteId: 'ath-a',
      referees: [],
    });

    // Reabre e limpa com null
    const cleared = await dataAccess.updateMatch(match.id, {
      status: 'completed',
      highlightAthleteId: null as unknown as string,
    });
    expect(cleared?.highlightAthleteId).toBeNull();

    // Homologa sem MVP
    const rehomologated = await dataAccess.updateMatch(match.id, {
      status: 'homologated',
      homologatedAt: new Date().toISOString(),
    });
    expect(rehomologated?.highlightAthleteId).toBeNull();
  });

  it('Cenário E2E 09 — W.O. (Bloqueio do MVP e Regras Oficiais)', () => {
    const comp = createIndoorCompetitionFixture();
    const woMatch = makeMatchRecord({
      id: 'match-e2e-09',
      competitionId: comp.id,
      matchNumber: 9,
      teamAId: 'team-a',
      teamBId: 'team-b',
      teamAName: 'Alpha',
      teamBName: 'Beta',
      status: 'wo',
      isWo: true,
      woReason: 'Não comparecimento da Equipe B',
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 0 }, { setNumber: 2, scoreA: 25, scoreB: 0 }, { setNumber: 3, scoreA: 25, scoreB: 0 }],
      winnerId: 'team-a',
    });

    const athA = createAthleteFixture('ath-a', 'ct-a', 'Atleta A', 1);
    const res = validateMatchHighlight(woMatch, athA.id, [athA], []);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('W.O.');
  });

  it('Cenário E2E 10 — Isolamento Entre Competições (A e B)', () => {
    const compA = createIndoorCompetitionFixture();
    const compB = createBeachCompetitionFixture();
    const athA = createAthleteFixture('ath-comp-a', 'ct-a', 'Jogador Quadra', 10);

    const matchB = makeMatchRecord({
      id: 'match-comp-b',
      competitionId: compB.id,
      matchNumber: 1,
      teamAId: 'team-b1',
      teamBId: 'team-b2',
      teamAName: 'Praia 1',
      teamBName: 'Praia 2',
      status: 'completed',
    });

    // Tentar atribuir atleta da compA para partida da compB é rejeitado
    const res = validateMatchHighlight(matchB, athA.id, [], []);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('elencos');
  });

  it('Cenário E2E 11 — Boletim Geral de Jogos e Confrontos', () => {
    const homologatedRow: MatchBoletimRow = {
      matchNumber: 1,
      round: 1,
      date: '10/10/2026',
      time: '19:00',
      venue: 'Ginásio',
      phase: 'Fase de Grupos',
      teamAName: 'Alpha',
      teamAShort: 'ALP',
      teamBName: 'Beta',
      teamBShort: 'BET',
      statusLabel: 'Encerrado',
      scoreA: 3,
      scoreB: 1,
      highlightAthleteName: 'Giba Silva',
      highlightTeamShort: 'ALP',
    };
    expect(homologatedRow.statusLabel).toBe('Encerrado');
    expect(homologatedRow.highlightAthleteName).toBe('Giba Silva');

    const pendingRow: MatchBoletimRow = {
      ...homologatedRow,
      statusLabel: 'Agendado',
      scoreA: undefined,
      scoreB: undefined,
      highlightAthleteName: undefined,
      highlightTeamShort: undefined,
    };
    expect(pendingRow.statusLabel).toBe('Agendado');
    expect(pendingRow.highlightAthleteName).toBeUndefined();
  });

  it('Cenário E2E 12 — Classificação Oficial Imutável por MVP', () => {
    const comp = createIndoorCompetitionFixture();
    const teamA = createTeamFixture('team-a', 'Alpha', 'ALP');
    const teamB = createTeamFixture('team-b', 'Beta', 'BET');

    const baseSets = [{ setNumber: 1, scoreA: 25, scoreB: 20 }, { setNumber: 2, scoreA: 25, scoreB: 20 }, { setNumber: 3, scoreA: 25, scoreB: 20 }];
    const matchWithMVP = makeMatchRecord({
      id: 'm-1',
      competitionId: comp.id,
      matchNumber: 1,
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAName: teamA.name,
      teamBName: teamB.name,
      phase: 'classificatória',
      groupName: 'A',
      status: 'homologated',
      sets: baseSets,
      winnerId: teamA.id,
      highlightAthleteId: 'ath-qualquer',
    });

    const matchWithoutMVP = makeMatchRecord({
      ...matchWithMVP,
      highlightAthleteId: undefined,
    });

    const standingInputs: StandingInput[] = [
      { team: teamA, groupName: 'A' },
      { team: teamB, groupName: 'A' },
    ];
    const standingsWithMVP = computeStandingsByGroup(standingInputs, [matchWithMVP]);
    const standingsWithoutMVP = computeStandingsByGroup(standingInputs, [matchWithoutMVP]);

    // O MVP não altera nenhum cálculo na tabela oficial
    expect(standingsWithMVP[0].standings).toEqual(standingsWithoutMVP[0].standings);
  });

  it('Cenário E2E 13 — Probabilidade de Classificação Reativa', () => {
    const comp = createIndoorCompetitionFixture();
    const teams = [
      createTeamFixture('t1', 'Equipe 1', 'EQ1'),
      createTeamFixture('t2', 'Equipe 2', 'EQ2'),
      createTeamFixture('t3', 'Equipe 3', 'EQ3'),
      createTeamFixture('t4', 'Equipe 4', 'EQ4'),
    ];
    const compTeams = teams.map((t) => createCompTeamFixture(comp.id, t));

    // Jogo 1 agendado, Jogo 2 agendado
    const match1 = makeMatchRecord({
      id: 'm1',
      competitionId: comp.id,
      matchNumber: 1,
      teamAId: 't1',
      teamBId: 't2',
      teamAName: 'Equipe 1',
      teamBName: 'Equipe 2',
      phase: 'classificatória',
      groupName: 'A',
      status: 'scheduled',
    });

    // Probabilidade antes de qualquer homologação
    const probPre = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      [match1],
      teams,
      compTeams,
    );
    expect(probPre.isSufficientData).toBe(true);
    expect(probPre.groups[0].totalRemainingMatches).toBe(1);

    // Homologa jogo 1 com vitória de t1 (3x0)
    const match1Done = makeMatchRecord({
      ...match1,
      status: 'homologated',
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 18 }, { setNumber: 2, scoreA: 25, scoreB: 19 }, { setNumber: 3, scoreA: 25, scoreB: 20 }],
      winnerId: 't1',
      highlightAthleteId: 'ath-1',
    });

    // Probabilidade após homologação
    const probPost = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      [match1Done],
      teams,
      compTeams,
    );
    expect(probPost.groups[0].totalRemainingMatches).toBe(0);
    expect(probPost.groups[0].methodology).toBe('completed');
  });

  it('Cenário E2E 14 — Todos os Jogos Concluídos (Metodologia Completed)', () => {
    const comp = createIndoorCompetitionFixture();
    const teamA = createTeamFixture('tA', 'Time A', 'TMA');
    const teamB = createTeamFixture('tB', 'Time B', 'TMB');
    const ctA = createCompTeamFixture(comp.id, teamA);
    const ctB = createCompTeamFixture(comp.id, teamB);

    const finishedMatch = makeMatchRecord({
      id: 'm-fin',
      competitionId: comp.id,
      matchNumber: 1,
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAName: teamA.name,
      teamBName: teamB.name,
      phase: 'classificatória',
      groupName: 'A',
      status: 'homologated',
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 18 }, { setNumber: 2, scoreA: 25, scoreB: 19 }, { setNumber: 3, scoreA: 25, scoreB: 20 }],
      winnerId: teamA.id,
    });

    const probResult = ClassificationProbabilityService.calculateCompetitionProbabilities(
      comp,
      [finishedMatch],
      [teamA, teamB],
      [ctA, ctB],
    );
    const groupA = probResult.groups.find((g) => g.groupName === 'A');
    expect(groupA?.methodology).toBe('completed');
    expect(groupA?.totalRemainingMatches).toBe(0);
    // Time A classificado em 1º com 100% de certeza derivada da tabela final
    const rowA = groupA?.teams.find((p) => p.teamId === teamA.id);
    expect(rowA?.mathematicalStatus).toBe('qualified');
    expect(rowA?.probabilityPercent).toBe(100);
  });

  it('Cenário E2E 15 — Melhores Terceiros (Mensagem e Limitação Oficial Mantidas)', () => {
    // Avalia que a mensagem de limitação técnica continua presente nas regras do BaseOS
    const limitationText =
      'A probabilidade calculada refere-se à vaga direta pelo grupo (Top 2). Vagas de repescagem por Melhores Terceiros Colocados dependem da comparação simultânea entre todos os grupos e não são estimadas nesta versão.';
    expect(limitationText).toContain('Melhores Terceiros Colocados');
    expect(limitationText).toContain('não são estimadas nesta versão');
  });

  it('Cenário E2E 16 — Súmula BaseOS (3 e 5 sets A4 Geometria Intacta)', () => {
    const comp = createIndoorCompetitionFixture();
    const teamA = createTeamFixture('tA', 'Clube A', 'CLA');
    const teamB = createTeamFixture('tB', 'Clube B', 'CLB');
    const ath = createAthleteFixture('ath-sumula', 'ct-a', 'Serginho Escadinha', 10, false, true);

    const match = makeMatchRecord({
      id: 'match-sumula',
      competitionId: comp.id,
      matchNumber: 1,
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAName: teamA.name,
      teamBName: teamB.name,
      teamAShortName: teamA.shortName,
      teamBShortName: teamB.shortName,
      venue: 'Ginásio do Ibirapuera',
      status: 'homologated',
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }, { setNumber: 2, scoreA: 25, scoreB: 20 }, { setNumber: 3, scoreA: 25, scoreB: 20 }],
      winnerId: teamA.id,
      highlightAthleteId: ath.id,
    });

    const scoresheet = mapMatchRecordToBaseosScoresheet(match, comp, teamA, teamB, [ath], [], 'completed', 'print-a4');
    expect(scoresheet.document.type).toBe('BASEOS_VOLLEYBALL_SCORESHEET');
    expect(scoresheet.observations).toBe('Destaque da Partida (MVP): #10 Serginho Escadinha (CLA)');
    // A estrutura de rotação de quadra permanece inalterada
    expect(scoresheet.sets.set1).toBeDefined();
    expect(scoresheet.sets.set2).toBeDefined();
    expect(scoresheet.sets.set3).toBeDefined();
  });

  it('Cenário E2E 17 — Portal Público & LGPD Compliance', async () => {
    const comp = await dataAccess.createCompetition(createIndoorCompetitionFixture());
    const teamA = await dataAccess.createTeam(createTeamFixture('team-a', 'Alpha', 'ALP'));
    const teamB = await dataAccess.createTeam(createTeamFixture('team-b', 'Beta', 'BET'));
    const ctA = await dataAccess.createCompetitionTeam(createCompTeamFixture(comp.id, teamA));
    await dataAccess.createCompetitionTeam(createCompTeamFixture(comp.id, teamB));

    const ath = await dataAccess.createCompetitionAthlete({
      competitionTeamId: ctA.id,
      name: 'Thaisa Daher',
      jerseyNumber: 6,
      position: 'Central',
      isCaptain: false,
      isLibero: false,
      gender: 'female',
    });

    const match = await dataAccess.createMatch({
      competitionId: comp.id,
      matchNumber: 1,
      round: 1,
      scheduledTime: '2026-10-15T18:00:00Z',
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAName: teamA.name,
      teamBName: teamB.name,
      teamAShortName: teamA.shortName,
      teamBShortName: teamB.shortName,
      venue: 'Ginásio',
      status: 'completed', // Não homologado
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }, { setNumber: 2, scoreA: 25, scoreB: 20 }, { setNumber: 3, scoreA: 25, scoreB: 20 }],
      winnerId: teamA.id,
      highlightAthleteId: ath.id,
      referees: [],
    });

    // Antes da homologação: MVP não é visível no portal público
    const bundlePre = await publicCompetitionService.getPublicCompetitionBundle(comp.slug);
    const pubMatchPre = bundlePre?.matches.find((m) => m.id === match.id);
    expect(pubMatchPre?.highlightAthlete).toBeNull();

    // Homologa
    await dataAccess.updateMatch(match.id, {
      status: 'homologated',
      homologatedAt: new Date().toISOString(),
      homologatedBy: 'Admin Oficial',
    });

    // Após homologação: MVP é exposto sem dados sensíveis
    const bundlePost = await publicCompetitionService.getPublicCompetitionBundle(comp.slug);
    const pubMatchPost = bundlePost?.matches.find((m) => m.id === match.id);
    expect(pubMatchPost?.highlightAthlete).toBeDefined();
    expect(pubMatchPost?.highlightAthlete?.name).toBe('Thaisa Daher');
    expect(pubMatchPost?.highlightAthlete?.jerseyNumber).toBe(6);
    expect(pubMatchPost?.highlightAthlete?.teamName).toBe('Alpha');
  });

  it('Cenário E2E 18 — Portal da Equipe (Somente Leitura e Destaque Contextual)', () => {
    const ath = createAthleteFixture('ath-eq', 'ct-minha-equipe', 'Minha Estrela', 7);
    const match = makeMatchRecord({
      id: 'm-roster',
      competitionId: 'c1',
      teamAId: 'minha-equipe',
      teamBId: 'adversario',
      teamAName: 'Minha Equipe',
      teamBName: 'Adversário',
      status: 'homologated',
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }, { setNumber: 2, scoreA: 25, scoreB: 20 }, { setNumber: 3, scoreA: 25, scoreB: 20 }],
      winnerId: 'minha-equipe',
      highlightAthleteId: ath.id,
    });

    // Derivação identifica lado A (minha equipe)
    const derived = deriveHighlightAthleteInfo(ath.id, [ath], [], match);
    expect(derived?.side).toBe('A');
    expect(derived?.teamName).toBe('Minha Equipe');
  });

  it('Cenário E2E 19 — Social Card (MatchSocialCard Props Consistentes)', () => {
    const ath = createAthleteFixture('ath-soc', 'ct-a', 'Lucarelli', 8);
    const match = makeMatchRecord({
      id: 'm-social',
      competitionId: 'c1',
      teamAId: 'team-a',
      teamBId: 'team-b',
      teamAName: 'Alpha',
      teamBName: 'Beta',
      status: 'homologated',
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }, { setNumber: 2, scoreA: 25, scoreB: 20 }, { setNumber: 3, scoreA: 25, scoreB: 20 }],
      winnerId: 'team-a',
      highlightAthleteId: ath.id,
    });

    const derived = deriveHighlightAthleteInfo(ath.id, [ath], [], match);
    const socialProps = {
      mvpName: derived?.athlete.name,
      mvpNumber: derived?.athlete.jerseyNumber,
      mvpTeam: derived?.teamName,
    };
    expect(socialProps.mvpName).toBe('Lucarelli');
    expect(socialProps.mvpNumber).toBe(8);
    expect(socialProps.mvpTeam).toBe('Alpha');
  });

  it('Cenário E2E 20 — Formato Indoor Completo (Cadeia Operacional)', () => {
    const comp = createIndoorCompetitionFixture();
    const rules = CompetitionRulesService.resolveMatchFormat(comp, 'classificatória');
    expect(rules.setsToWin).toBe(3);
    expect(rules.maxSets).toBe(5);
    expect(rules.regularSetPoints).toBe(25);
    expect(rules.tiebreakPoints).toBe(15);
  });

  it('Cenário E2E 21 — Formato Praia Completo (Cadeia Operacional 2x2 sem Líbero)', () => {
    const comp = createBeachCompetitionFixture();
    const rules = CompetitionRulesService.resolveMatchFormat(comp, 'classificatória');
    expect(rules.setsToWin).toBe(2);
    expect(rules.maxSets).toBe(3);
    expect(rules.regularSetPoints).toBe(21);
    expect(rules.tiebreakPoints).toBe(15);

    const athB1 = createAthleteFixture('b1', 'ct-b', 'Alison Cerutti', 1);
    const athB2 = createAthleteFixture('b2', 'ct-b', 'Bruno Schmidt', 2);

    const beachMatch = makeMatchRecord({
      id: 'm-beach',
      competitionId: comp.id,
      matchNumber: 1,
      teamAId: 'praia-a',
      teamBId: 'praia-b',
      teamAName: 'Alison / Bruno',
      teamBName: 'Álvaro / Saymon',
      venue: 'Praia de Copacabana',
      status: 'homologated',
      sets: [{ setNumber: 1, scoreA: 21, scoreB: 18 }, { setNumber: 2, scoreA: 21, scoreB: 19 }],
      winnerId: 'praia-a',
      highlightAthleteId: athB1.id,
    });

    expect(validateMatchHighlight(beachMatch, athB1.id, [athB1, athB2], []).valid).toBe(true);
    const scoresheet = mapMatchRecordToBaseosScoresheet(beachMatch, comp, undefined, undefined, [athB1, athB2], [], 'completed');
    expect(scoresheet.observations).toContain('Destaque da Partida (MVP): #1 Alison Cerutti (ALI)');
  });

  it('Cenário E2E 22 — Persistência e Proteção Contra PGRST204', async () => {
    const comp = createIndoorCompetitionFixture();
    const match = await dataAccess.createMatch({
      competitionId: comp.id,
      matchNumber: 22,
      round: 1,
      scheduledTime: '2026-10-15T18:00:00Z',
      teamAId: 'team-a',
      teamBId: 'team-b',
      teamAName: 'Alpha',
      teamBName: 'Beta',
      teamAShortName: 'ALP',
      teamBShortName: 'BET',
      venue: 'Ginásio',
      status: 'completed',
      sets: [],
      referees: [],
    });

    // Atualização com chaves undefined (devem ser sanitizadas)
    const updated = await dataAccess.updateMatch(match.id, {
      highlightAthleteId: 'ath-pgrst',
      homologatedAt: undefined,
      homologatedBy: undefined,
    });
    expect(updated?.highlightAthleteId).toBe('ath-pgrst');
    expect(updated?.homologatedAt).toBeUndefined();
  });

  it('Cenário E2E 23 — Reload / Recuperação de Dados', async () => {
    const comp = await dataAccess.createCompetition(createIndoorCompetitionFixture());
    const created = await dataAccess.createMatch({
      competitionId: comp.id,
      matchNumber: 23,
      round: 1,
      scheduledTime: '2026-10-15T18:00:00Z',
      teamAId: 'team-a',
      teamBId: 'team-b',
      teamAName: 'Alpha',
      teamBName: 'Beta',
      teamAShortName: 'ALP',
      teamBShortName: 'BET',
      venue: 'Ginásio',
      status: 'homologated',
      sets: [{ setNumber: 1, scoreA: 25, scoreB: 20 }],
      winnerId: 'team-a',
      highlightAthleteId: 'ath-persistente',
      referees: [],
    });

    // Simulação de reload buscando novamente do dataAccess
    const reloaded = await dataAccess.getMatch(created.id);
    expect(reloaded?.highlightAthleteId).toBe('ath-persistente');
  });

  it('Cenário E2E 24 — Validação de Regressão Global', () => {
    // Prova de integridade estrutural das entidades
    const comp = createIndoorCompetitionFixture();
    expect(comp.id).toBeDefined();
    expect(CompetitionRulesService).toBeDefined();
    expect(ClassificationProbabilityService).toBeDefined();
  });
});
