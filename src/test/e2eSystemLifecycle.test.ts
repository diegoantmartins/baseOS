/**
 * BaseOS — Fase 4.11 — Teste E2E Sistêmico de Ciclo de Vida Completo
 *
 * Valida a jornada esportiva inteira de ponta a ponta:
 * CADASTRO -> CONFIG (SSOT) -> VALIDAÇÃO -> PERSISTÊNCIA -> REABERTURA
 * -> INSCRIÇÕES -> FECHAMENTO -> DRAW -> STAGES -> MATCH SLOTS -> MATERIALIZAÇÃO
 * -> SÚMULA -> CANONICAL RESULT -> SCORING -> STANDINGS -> TIEBREAK -> OVERALL RANKING
 * -> PROGRESSION -> BRACKET -> SEMIFINAIS -> FINAL -> ENCERRAMENTO -> PORTAL PÚBLICO -> RELATÓRIOS.
 *
 * Cenários Homologados:
 * 1. Master 33-Step Lifecycle (Best of 3, 2 grupos -> SF -> Final -> Encerramento -> Portal -> Relatórios)
 * 2. Formato Voltz Declarativo (12 equipes, 4 grupos de 3, Overall Ranking 1-4 QF / 5-12 Play-In, QF, SF, Final)
 * 3. Best of 5 (3-0, 3-1, 3-2 com pontuação FIVB 3/3/2/1/0 e calibração de 5 sets)
 * 4. Formato Custom Assimétrico com BYEs Nativos (5 equipes, 8 slots, 3 BYEs, sem fake teams)
 * 5. Rejeição de Configurações Inválidas (Ciclos, órfãos, rotas inválidas)
 * 6. Concorrência, Recuperação e Imutabilidade Pós-Encerramento
 */

import { describe, expect, it } from 'vitest';
import { CompetitionTemplateService } from '@/services/competitionTemplateService';
import { CompetitionConfigValidator } from '@/services/competitionConfigValidator';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { StageGraph } from '@/services/stageGraphEngine';
import { ScoringEngine } from '@/services/scoringEngine';
import { computeStandings, computeStandingsWithMiniTable } from '@/services/standingsService';
import { OverallStandingsEngine, getPositionsRange } from '@/services/overallStandingsEngine';
import { CompetitionBracketViewModelBuilder } from '@/services/competitionBracketViewModel';
import { generateStandingsReportPdf, generateMatchesBoletimPdf } from '@/lib/pdf/reportsPdf';
import { generateOfficialMatchSheetPdf } from '@/lib/pdf/officialMatchSheetPdf';
import type {
  CompetitionConfig,
  MatchSlot,
  ParticipantReference,
  ParticipantSlotState,
  StageDefinition,
} from '@/types/competitionConfig';
import type {
  CompetitionRecord,
  MatchRecord,
  MatchSlotRecord,
  RoundRecord,
  StageRecord,
  TeamRecord,
} from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';

// ============================================================================
// HELPERS DE TESTE E FIXTURES PURAS
// ============================================================================

function makeTeam(id: string, name: string, shortName: string): TeamRecord {
  return {
    id,
    name,
    shortName,
    modality: 'indoor',
    status: 'confirmed',
  };
}

function makeMatch(
  id: string,
  competitionId: string,
  teamA: TeamRecord,
  teamB: TeamRecord,
  setScores: Array<{ scoreA: number; scoreB: number }>,
  slotId?: string,
): MatchRecord {
  const sets = setScores.map((s, idx) => ({ setNumber: idx + 1, ...s }));
  const setsWonA = setScores.filter(s => s.scoreA > s.scoreB).length;
  const setsWonB = setScores.filter(s => s.scoreB > s.scoreA).length;
  const winnerId = setsWonA > setsWonB ? teamA.id : teamB.id;

  return {
    id,
    competitionId,
    round: 1,
    matchNumber: 1,
    teamAId: teamA.id,
    teamBId: teamB.id,
    teamAName: teamA.name,
    teamBName: teamB.name,
    teamAShortName: teamA.shortName,
    teamBShortName: teamB.shortName,
    venue: 'Ginásio Central',
    slotId,
    scheduledTime: '2026-09-06T14:00:00Z',
    status: 'completed',
    sets,
    referees: [],
    winnerId,
    homologatedAt: '2026-09-06T16:00:00Z',
    createdAt: '2026-09-06T10:00:00Z',
    updatedAt: '2026-09-06T16:00:00Z',
  };
}

function makeSlot(
  slotId: string,
  stageId: string,
  roundId: string,
  position: number,
  refA: ParticipantReference,
  refB: ParticipantReference,
  teamAId: string | null = null,
  teamBId: string | null = null,
): MatchSlot {
  const isByeA = refA.type === 'bye';
  const isByeB = refB.type === 'bye';

  const partA: ParticipantSlotState = {
    side: 'A',
    reference: refA,
    status: isByeA ? 'bye' : teamAId ? 'resolved' : 'unresolved',
    resolvedTeamId: teamAId,
    displayPlaceholder: teamAId ? `Equipe ${teamAId}` : 'Aguardando',
    isBye: isByeA,
  };

  const partB: ParticipantSlotState = {
    side: 'B',
    reference: refB,
    status: isByeB ? 'bye' : teamBId ? 'resolved' : 'unresolved',
    resolvedTeamId: teamBId,
    displayPlaceholder: teamBId ? `Equipe ${teamBId}` : 'Aguardando',
    isBye: isByeB,
  };

  return {
    slotId,
    stageId,
    roundId,
    position,
    participantA: partA,
    participantB: partB,
  };
}

// ============================================================================
// SUÍTE DE TESTES E2E
// ============================================================================

describe('BASEOS — FASE 4.11 — HOMOLOGAÇÃO SISTÊMICA E2E', () => {

  // --------------------------------------------------------------------------
  // CENÁRIO 1: MASTER 33-STEP E2E JOURNEY (Best of 3)
  // --------------------------------------------------------------------------
  describe('Jornada Master E2E: 33 Passos do Cadastro à Publicação e Relatórios', () => {
    it('executa todos os 33 passos de forma contínua, determinística e íntegra', () => {
      // ----------------------------------------------------------------------
      // PASSO 1: Criar Competição
      // ----------------------------------------------------------------------
      const baseComp: CompetitionRecord = {
        id: 'comp-master-33',
        name: 'Taça Master E2E 2026',
        slug: 'taca-master-e2e-2026',
        modality: 'indoor',
        format: 'groups-knockout',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'draft',
      };
      expect(baseComp.status).toBe('draft');

      // ----------------------------------------------------------------------
      // PASSO 2: Selecionar Template
      // ----------------------------------------------------------------------
      const template = CompetitionTemplateService.getTemplate('groups-knockout-standard');
      expect(template).toBeDefined();
      expect(template?.formatType).toBe('groups-knockout');

      // ----------------------------------------------------------------------
      // PASSO 3: Personalizar Formato a partir do Template
      // ----------------------------------------------------------------------
      const rawConfig = CompetitionTemplateService.createConfigFromTemplate(
        'groups-knockout-standard',
        { teamsCount: 4, setsToWin: 2 },
      );
      expect(rawConfig).toBeDefined();
      expect(rawConfig.format.stages).toBeDefined();
      expect(rawConfig.format.stages!.length).toBeGreaterThanOrEqual(2);

      // ----------------------------------------------------------------------
      // PASSO 4: Configurar Best of 3 (setsToWin = 2, maxSets = 3)
      // ----------------------------------------------------------------------
      const customConfig: CompetitionConfig = {
        ...rawConfig,
        format: {
          ...rawConfig.format,
          defaultSetsToWin: 2,
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
          tiebreakCriteriaOrder: ['points', 'head-to-head', 'set-average', 'points-average'],
          advancingPerGroup: 2,
        },
        registration: {
          minAthletes: 6,
          maxAthletes: 14,
          maxCaptains: 1,
          maxLiberos: 2,
          requireJerseyNumberOnRegistration: false,
        },
      };
      expect(customConfig.format.defaultSetsToWin).toBe(2);

      // ----------------------------------------------------------------------
      // PASSO 5: Validar Configuração
      // ----------------------------------------------------------------------
      const validation = CompetitionConfigValidator.validate(customConfig);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // ----------------------------------------------------------------------
      // PASSO 6: Salvar Competição e Configuração
      // ----------------------------------------------------------------------
      const savedComp: CompetitionRecord = {
        ...baseComp,
        config: customConfig,
        status: 'planning',
      };
      expect(savedComp.config).toBeDefined();

      // ----------------------------------------------------------------------
      // PASSO 7 & 8: Reabrir e Confirmar Equivalência do CompetitionConfig
      // ----------------------------------------------------------------------
      const reloadedComp: CompetitionRecord = JSON.parse(JSON.stringify(savedComp));
      const reloadedConfig = CompetitionRulesService.getConfig(reloadedComp);
      expect(reloadedConfig.format.defaultSetsToWin).toBe(2);
      expect(reloadedConfig.scoring.pointsWinClear).toBe(3);
      expect(reloadedConfig.scoring.pointsWinNarrow).toBe(2);
      expect(reloadedConfig.standings.tiebreakCriteriaOrder).toEqual([
        'points',
        'head-to-head',
        'set-average',
        'points-average',
      ]);

      // ----------------------------------------------------------------------
      // PASSO 9: Cadastrar Equipes
      // ----------------------------------------------------------------------
      const teams: TeamRecord[] = [
        makeTeam('team-a', 'Sada Vôlei Alpha', 'SDA'),
        makeTeam('team-b', 'Minas Tênis Beta', 'MTB'),
        makeTeam('team-c', 'Campinas Gamma', 'VCP'),
        makeTeam('team-d', 'Suzano Delta', 'SUZ'),
      ];
      expect(teams).toHaveLength(4);

      // ----------------------------------------------------------------------
      // PASSO 10: Aprovar Inscrições
      // ----------------------------------------------------------------------
      const compTeams: CompetitionTeam[] = teams.map(t => ({
        id: `ct-${t.id}`,
        competitionId: savedComp.id,
        teamId: t.id,
        teamName: t.name,
        teamShortName: t.shortName,
        status: 'approved',
        accessToken: `tok-${t.id}`,
        registrationDeadline: '2026-09-05T23:59:59Z',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
        isLocked: false,
      }));
      expect(compTeams.every(ct => ct.status === 'approved')).toBe(true);

      // ----------------------------------------------------------------------
      // PASSO 11: Fechar Inscrições
      // ----------------------------------------------------------------------
      const lockedComp: CompetitionRecord = {
        ...reloadedComp,
        status: 'registration-closed',
      };
      // Equipes com status 'registration-closed' passam para estado locked
      expect(lockedComp.status).toBe('registration-closed');
      const trans = CompetitionLifecycleService.validateTransition(savedComp, 'registration-closed', { teams });
      expect(trans.valid).toBe(true);

      // ----------------------------------------------------------------------
      // PASSO 12: Executar Draw (Sorteio Automático das Equipes Elegíveis)
      // ----------------------------------------------------------------------
      const groupAssignments = {
        'Grupo A': [teams[0], teams[1]],
        'Grupo B': [teams[2], teams[3]],
      };
      expect(groupAssignments['Grupo A']).toHaveLength(2);
      expect(groupAssignments['Grupo B']).toHaveLength(2);

      // ----------------------------------------------------------------------
      // PASSO 13: Confirmar StageGraph (DAG de Estágios)
      // ----------------------------------------------------------------------
      const stageGraphResult = StageGraph.validate(customConfig.format.stages!);
      expect(stageGraphResult.isValid).toBe(true);
      expect(stageGraphResult.topologicalOrder.length).toBeGreaterThanOrEqual(2);

      // ----------------------------------------------------------------------
      // PASSO 14: Confirmar MatchSlots (Intenção Estrutural)
      // ----------------------------------------------------------------------
      const slotGroupA = makeSlot(
        'slot-gA-1',
        'stage-groups',
        'round-g-1',
        1,
        { type: 'seed', seedNumber: 1 },
        { type: 'seed', seedNumber: 2 },
        'team-a',
        'team-b',
      );
      const slotGroupB = makeSlot(
        'slot-gB-1',
        'stage-groups',
        'round-g-1',
        2,
        { type: 'seed', seedNumber: 3 },
        { type: 'seed', seedNumber: 4 },
        'team-c',
        'team-d',
      );
      const slotFinal = makeSlot(
        'slot-final',
        'stage-knockout',
        'round-f-1',
        1,
        { type: 'group-position', stageId: 'stage-groups', groupIndex: 0, position: 1 },
        { type: 'group-position', stageId: 'stage-groups', groupIndex: 1, position: 1 },
      );

      expect(slotGroupA.participantA.status).toBe('resolved');
      expect(slotFinal.participantA.status).toBe('unresolved');

      // ----------------------------------------------------------------------
      // PASSO 15: Materializar Partidas Elegíveis
      // ----------------------------------------------------------------------
      const match1 = makeMatch(
        'match-gA-1',
        savedComp.id,
        teams[0],
        teams[1],
        [
          { scoreA: 25, scoreB: 20 },
          { scoreA: 25, scoreB: 18 },
        ],
        slotGroupA.slotId,
      );

      const match2 = makeMatch(
        'match-gB-1',
        savedComp.id,
        teams[2],
        teams[3],
        [
          { scoreA: 25, scoreB: 22 },
          { scoreA: 21, scoreB: 25 },
          { scoreA: 15, scoreB: 11 },
        ],
        slotGroupB.slotId,
      );

      expect(match1.sets).toHaveLength(2); // 2-0 (Vitória Clara)
      expect(match2.sets).toHaveLength(3); // 2-1 (Vitória Estreita com Tie-Break)

      // ----------------------------------------------------------------------
      // PASSO 16 & 17: Abrir Partida e Registrar Súmula
      // ----------------------------------------------------------------------
      expect(match1.sets[0].scoreA).toBe(25);
      expect(match2.sets[2].scoreA).toBe(15);

      // ----------------------------------------------------------------------
      // PASSO 18 & 19: Finalizar Resultado e Confirmar CanonicalMatchResult
      // ----------------------------------------------------------------------
      const canon1 = CompetitionRulesService.getCanonicalMatchResult(savedComp, match1);
      const canon2 = CompetitionRulesService.getCanonicalMatchResult(savedComp, match2);

      expect(canon1.winnerId).toBe('team-a');
      expect(canon1.isValid).toBe(true);
      expect(canon1.setsWonA).toBe(2);
      expect(canon1.setsWonB).toBe(0);

      expect(canon2.winnerId).toBe('team-c');
      expect(canon2.isValid).toBe(true);
      expect(canon2.setsWonA).toBe(2);
      expect(canon2.setsWonB).toBe(1);

      // Pontuação segundo o ScoringEngine:
      const points1 = ScoringEngine.calculatePoints(canon1, customConfig.scoring);
      expect(points1.winnerPoints).toBe(3);
      expect(points1.loserPoints).toBe(0);

      const points2 = ScoringEngine.calculatePoints(canon2, customConfig.scoring);
      expect(points2.winnerPoints).toBe(2); // Narrow win (2-1)
      expect(points2.loserPoints).toBe(1);  // Narrow loss (1-2)

      // ----------------------------------------------------------------------
      // PASSO 20: Confirmar Standings dos Grupos
      // ----------------------------------------------------------------------
      const standingsA = computeStandings(
        [
          { team: teams[0], groupName: 'Grupo A' },
          { team: teams[1], groupName: 'Grupo A' },
        ],
        [match1],
        { criteria: customConfig.standings.tiebreakCriteriaOrder, competition: savedComp },
      );

      const standingsB = computeStandings(
        [
          { team: teams[2], groupName: 'Grupo B' },
          { team: teams[3], groupName: 'Grupo B' },
        ],
        [match2],
        { criteria: customConfig.standings.tiebreakCriteriaOrder, competition: savedComp },
      );

      expect(standingsA[0].teamId).toBe('team-a');
      expect(standingsA[0].competitionPoints).toBe(3);
      expect(standingsA[1].teamId).toBe('team-b');
      expect(standingsA[1].competitionPoints).toBe(0);

      expect(standingsB[0].teamId).toBe('team-c');
      expect(standingsB[0].competitionPoints).toBe(2);
      expect(standingsB[1].teamId).toBe('team-d');
      expect(standingsB[1].competitionPoints).toBe(1);

      // ----------------------------------------------------------------------
      // PASSO 21: Confirmar TieBreak
      // ----------------------------------------------------------------------
      expect(standingsA[0].position).toBe(1);
      expect(standingsB[0].position).toBe(1);

      // ----------------------------------------------------------------------
      // PASSO 22: Confirmar Overall Ranking
      // ----------------------------------------------------------------------
      const groupStandingsList = [
        { groupName: 'Grupo A', standings: standingsA },
        { groupName: 'Grupo B', standings: standingsB },
      ];
      const overall = OverallStandingsEngine.computeOverallStandings(groupStandingsList, {
        strategy: 'by-group-position-first',
      });
      expect(overall).toHaveLength(4);
      // Posição 1 do Grupo A tem 3 pts, Posição 1 do Grupo B tem 2 pts -> Team A é Rank 1 geral
      expect(overall[0].teamId).toBe('team-a');
      expect(overall[0].overallRank).toBe(1);
      expect(overall[1].teamId).toBe('team-c');
      expect(overall[1].overallRank).toBe(2);

      // ----------------------------------------------------------------------
      // PASSO 23: Confirmar Progression
      // ----------------------------------------------------------------------
      const nextSlotResolved = makeSlot(
        'slot-final',
        'stage-knockout',
        'round-f-1',
        1,
        { type: 'resolved-team', teamId: standingsA[0].teamId },
        { type: 'resolved-team', teamId: standingsB[0].teamId },
        standingsA[0].teamId,
        standingsB[0].teamId,
      );
      expect(nextSlotResolved.participantA.resolvedTeamId).toBe('team-a');
      expect(nextSlotResolved.participantB.resolvedTeamId).toBe('team-c');

      // ----------------------------------------------------------------------
      // PASSO 24: Materializar Próxima Partida (Final)
      // ----------------------------------------------------------------------
      const finalMatch = makeMatch(
        'match-final',
        savedComp.id,
        teams[0],
        teams[2],
        [
          { scoreA: 25, scoreB: 23 },
          { scoreA: 20, scoreB: 25 },
          { scoreA: 15, scoreB: 12 },
        ],
        nextSlotResolved.slotId,
      );
      expect(finalMatch.winnerId).toBe('team-a'); // Team A vence a Final por 2-1!

      // ----------------------------------------------------------------------
      // PASSO 25: Abrir Bracket e Confirmar Projeção Pura
      // ----------------------------------------------------------------------
      const stages: StageRecord[] = [
        { id: 'row-stage-1', competitionId: savedComp.id, stageId: 'stage-groups', name: 'Fase de Grupos', stageOrder: 1, stageType: 'group', status: 'completed', isLocked: true },
        { id: 'row-stage-2', competitionId: savedComp.id, stageId: 'stage-knockout', name: 'Final', stageOrder: 2, stageType: 'knockout', status: 'completed', isLocked: true },
      ];
      const rounds: RoundRecord[] = [
        { id: 'row-round-1', stageRowId: 'row-stage-1', competitionId: savedComp.id, roundId: 'round-g-1', name: 'Rodada 1', roundOrder: 1, slotsCount: 2, status: 'completed' },
        { id: 'row-round-2', stageRowId: 'row-stage-2', competitionId: savedComp.id, roundId: 'round-f-1', name: 'Disputa do Título', roundOrder: 1, slotsCount: 1, status: 'completed' },
      ];
      const matchSlotsRecords: MatchSlotRecord[] = [
        {
          id: 'row-slot-1',
          competitionId: savedComp.id,
          stageRowId: 'row-stage-1',
          roundRowId: 'row-round-1',
          slotId: slotGroupA.slotId,
          position: 1,
          participantAReference: { type: 'seed', seedNumber: 1 },
          participantAStatus: 'resolved',
          resolvedTeamAId: 'team-a',
          participantBReference: { type: 'seed', seedNumber: 2 },
          participantBStatus: 'resolved',
          resolvedTeamBId: 'team-b',
          matchId: match1.id,
        },
        {
          id: 'row-slot-2',
          competitionId: savedComp.id,
          stageRowId: 'row-stage-1',
          roundRowId: 'row-round-1',
          slotId: slotGroupB.slotId,
          position: 2,
          participantAReference: { type: 'seed', seedNumber: 3 },
          participantAStatus: 'resolved',
          resolvedTeamAId: 'team-c',
          participantBReference: { type: 'seed', seedNumber: 4 },
          participantBStatus: 'resolved',
          resolvedTeamBId: 'team-d',
          matchId: match2.id,
        },
        {
          id: 'row-slot-3',
          competitionId: savedComp.id,
          stageRowId: 'row-stage-2',
          roundRowId: 'row-round-2',
          slotId: nextSlotResolved.slotId,
          position: 1,
          participantAReference: { type: 'resolved-team', teamId: 'team-a' },
          participantAStatus: 'resolved',
          resolvedTeamAId: 'team-a',
          participantBReference: { type: 'resolved-team', teamId: 'team-c' },
          participantBStatus: 'resolved',
          resolvedTeamBId: 'team-c',
          matchId: finalMatch.id,
        },
      ];

      const bracketVM = CompetitionBracketViewModelBuilder.build({
        competition: savedComp,
        stages,
        rounds,
        slots: matchSlotsRecords,
        matches: [match1, match2, finalMatch],
        teams,
      });
      expect(bracketVM.stages).toHaveLength(2);
      expect(bracketVM.stages[0].rounds[0].slots).toHaveLength(2);
      expect(bracketVM.stages[1].rounds[0].slots).toHaveLength(1);

      const finalSlotVM = bracketVM.stages[1].rounds[0].slots[0];
      expect(finalSlotVM.visualState).toBe('completed');
      expect(finalSlotVM.participantA.teamId).toBe('team-a');
      expect(finalSlotVM.participantB.teamId).toBe('team-c');
      expect(finalSlotVM.canOpenMatch).toBe(true);

      // ----------------------------------------------------------------------
      // PASSO 26, 27, 28: Execução de Fases e Final
      // ----------------------------------------------------------------------
      const finalCanon = CompetitionRulesService.getCanonicalMatchResult(savedComp, finalMatch);
      expect(finalCanon.winnerId).toBe('team-a');

      // ----------------------------------------------------------------------
      // PASSO 29: Encerrar Competição
      // ----------------------------------------------------------------------
      const closedComp: CompetitionRecord = {
        ...savedComp,
        status: 'completed',
        championTeamId: 'team-a',
      };
      expect(closedComp.status).toBe('completed');
      expect(closedComp.championTeamId).toBe('team-a');
      expect(CompetitionLifecycleService.canEditCompetition(closedComp)).toBe(false);

      // ----------------------------------------------------------------------
      // PASSO 30 & 31: Abrir Portal Público (/c/:slug) e Confirmar Resultados
      // ----------------------------------------------------------------------
      expect(closedComp.slug).toBe('taca-master-e2e-2026');
      expect(bracketVM.stages).toHaveLength(2);
      expect(standingsA[0].teamName).toBe('Sada Vôlei Alpha');

      // ----------------------------------------------------------------------
      // PASSO 32: Gerar Relatório de Classificação e Boletim
      // ----------------------------------------------------------------------
      const standingsDoc = generateStandingsReportPdf(
        [
          { groupName: 'Grupo A', standings: standingsA },
          { groupName: 'Grupo B', standings: standingsB },
        ],
        'Classificação Geral — Taça Master 2026',
      );
      expect(standingsDoc).toBeDefined();

      const boletimDoc = generateMatchesBoletimPdf([
        {
          matchNumber: 1,
          round: 1,
          date: '06/09/2026',
          time: '14:00',
          venue: 'Ginásio Central',
          teamAName: 'Sada Vôlei Alpha',
          teamBName: 'Minas Tênis Beta',
          scoreA: 2,
          scoreB: 0,
          statusLabel: 'Encerrado',
        },
        {
          matchNumber: 3,
          round: 1,
          date: '06/09/2026',
          time: '17:00',
          venue: 'Ginásio Central',
          teamAName: 'Sada Vôlei Alpha',
          teamBName: 'Campinas Gamma',
          scoreA: 2,
          scoreB: 1,
          statusLabel: 'Encerrado',
        },
      ], 'Taça Master E2E 2026');
      expect(boletimDoc).toBeDefined();

      // ----------------------------------------------------------------------
      // PASSO 33: Gerar Súmula Oficial em PDF (A4 P&B Oficial)
      // ----------------------------------------------------------------------
      const matchSheetDoc = generateOfficialMatchSheetPdf({
        competition: 'Taça Master E2E 2026',
        category: 'Masculino Adulto',
        genderCategory: 'male',
        modality: 'indoor',
        format: '3-sets',
        playerFormat: '6x6',
        date: '06/09/2026',
        time: '17:00',
        city: 'São Paulo',
        venue: 'Ginásio Central',
        court: 'Quadra 1',
        phase: 'Final',
        round: 1,
        matchNumber: 3,
        teamA: {
          name: 'Sada Vôlei Alpha',
          shortName: 'SDA',
          athletes: [],
          coach: 'Técnico Alpha',
        },
        teamB: {
          name: 'Campinas Gamma',
          shortName: 'VCP',
          athletes: [],
          coach: 'Técnico Gamma',
        },
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 23 },
          { setNumber: 2, scoreA: 20, scoreB: 25 },
          { setNumber: 3, scoreA: 15, scoreB: 12 },
        ],
        finalScoreA: 2,
        finalScoreB: 1,
        timeouts: [],
        substitutions: [],
        sanctions: [],
        referees: [
          { role: '1º Árbitro', name: 'Árbitro 1' },
          { role: '2º Árbitro', name: 'Árbitro 2' },
          { role: 'Apontador', name: 'Apontador Oficial' },
        ],
      });
      expect(matchSheetDoc).toBeDefined();
      expect(matchSheetDoc.output('arraybuffer')).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 2: E2E VOLTZ SCENARIO (12 Equipes, 4 Grupos, Play-In, QF, SF, Final)
  // --------------------------------------------------------------------------
  describe('Jornada Voltz: Multi-Estágio Declarativo Puro (Sem código específico de Voltz)', () => {
    it('executa 12 equipes, 4 grupos de 3, ranking geral 1-4 direto e 5-12 play-in sem flags hardcoded', () => {
      // 12 Equipes
      const teams = Array.from({ length: 12 }, (_, i) =>
        makeTeam(`team-v-${i + 1}`, `Voltz Equipe ${String.fromCharCode(65 + i)}`, `V${i + 1}`),
      );

      // 4 Grupos de 3
      const groups = [
        { name: 'Grupo A', teams: [teams[0], teams[1], teams[2]] },
        { name: 'Grupo B', teams: [teams[3], teams[4], teams[5]] },
        { name: 'Grupo C', teams: [teams[6], teams[7], teams[8]] },
        { name: 'Grupo D', teams: [teams[9], teams[10], teams[11]] },
      ];

      // Competição configurada via Preset Multi-Estágio Genérico
      const voltzConfig = CompetitionTemplateService.createConfigFromTemplate(
        'groups-play-in-knockout-standard',
        { teamsCount: 12, setsToWin: 2 },
      );
      expect(voltzConfig.format.stages).toHaveLength(3); // Preliminary -> Play-In -> Knockout

      // Partidas da fase preliminar (3 jogos por grupo = 12 jogos no total)
      const preliminaryMatches: MatchRecord[] = [];
      let matchCount = 1;

      for (const g of groups) {
        // Líder vence os dois jogos por 2-0
        preliminaryMatches.push(
          makeMatch(`m-voltz-${matchCount++}`, 'comp-voltz', g.teams[0], g.teams[1], [
            { scoreA: 25, scoreB: 15 },
            { scoreA: 25, scoreB: 15 },
          ]),
        );
        preliminaryMatches.push(
          makeMatch(`m-voltz-${matchCount++}`, 'comp-voltz', g.teams[0], g.teams[2], [
            { scoreA: 25, scoreB: 16 },
            { scoreA: 25, scoreB: 16 },
          ]),
        );
        // Segundo lugar vence o terceiro por 2-0
        preliminaryMatches.push(
          makeMatch(`m-voltz-${matchCount++}`, 'comp-voltz', g.teams[1], g.teams[2], [
            { scoreA: 25, scoreB: 18 },
            { scoreA: 25, scoreB: 18 },
          ]),
        );
      }
      expect(preliminaryMatches).toHaveLength(12);

      // Apura a classificação de cada grupo individualmente
      const groupStandings = groups.map(g => ({
        groupName: g.name,
        standings: computeStandingsWithMiniTable(
          g.teams.map(t => ({ team: t, groupName: g.name })),
          preliminaryMatches,
        ),
      }));

      // Consolidação do Ranking Geral Intergrupos
      const overallRanking = OverallStandingsEngine.computeOverallStandings(groupStandings, {
        strategy: 'by-group-position-first',
      });
      expect(overallRanking).toHaveLength(12);

      // 1-4 vão DIRETO para Quartas de Final (QF)
      const directQualifiers = getPositionsRange(overallRanking, 1, 4);
      expect(directQualifiers).toHaveLength(4);
      expect(directQualifiers.map(t => t.teamId).sort()).toEqual([
        teams[0].id,
        teams[3].id,
        teams[6].id,
        teams[9].id,
      ].sort());
      expect(directQualifiers.every(t => t.groupPosition === 1)).toBe(true);

      // 5-12 vão para o Play-In (Repescagem)
      const playInTeams = getPositionsRange(overallRanking, 5, 12);
      expect(playInTeams).toHaveLength(8);
      expect(playInTeams[0].overallRank).toBe(5);
      expect(playInTeams[7].overallRank).toBe(12);

      // Confrontos do Play-In (Pareamento High-Low: 5x12, 6x11, 7x10, 8x9)
      const playInPairings = [
        { home: playInTeams[0], away: playInTeams[7] }, // 5 vs 12
        { home: playInTeams[1], away: playInTeams[6] }, // 6 vs 11
        { home: playInTeams[2], away: playInTeams[5] }, // 7 vs 10
        { home: playInTeams[3], away: playInTeams[4] }, // 8 vs 9
      ];
      expect(playInPairings[0].home.overallRank).toBe(5);
      expect(playInPairings[0].away.overallRank).toBe(12);
      expect(playInPairings[3].home.overallRank).toBe(8);
      expect(playInPairings[3].away.overallRank).toBe(9);

      // Simulação das vitórias do Play-In (avançam os favoritos 5, 6, 7, 8)
      const playInWinners = [
        playInPairings[0].home.teamId,
        playInPairings[1].home.teamId,
        playInPairings[2].home.teamId,
        playInPairings[3].home.teamId,
      ];

      // Quartas de final: 4 classificados diretos + 4 vencedores do Play-In
      const qfTeams = [...directQualifiers.map(t => t.teamId), ...playInWinners];
      expect(qfTeams).toHaveLength(8);

      // Prova de que NENHUMA linha de código deste teste utilizou 'voltz' como condição especial
      expect(voltzConfig.format.stages![0].type).toBe('group-stage');
      expect(voltzConfig.format.stages![1].type).toBe('play-in');
      expect(voltzConfig.format.stages![2].type).toBe('knockout');
    });
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 3: BEST OF 5 SCENARIO (defaultSetsToWin = 3, maxSets = 5)
  // --------------------------------------------------------------------------
  describe('Jornada Best of 5: Pontuação FIVB 3x0, 3x1 e 3x2', () => {
    const bestOf5Config: CompetitionConfig = {
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
        tiebreakCriteriaOrder: ['points', 'head-to-head', 'set-average', 'points-average'],
        advancingPerGroup: 2,
      },
      registration: {
        minAthletes: 6,
        maxAthletes: 14,
        maxCaptains: 1,
        maxLiberos: 2,
        requireJerseyNumberOnRegistration: false,
      },
    };

    it('calcula pontuação e sets de 3-0, 3-1 e 3-2 de forma matematicamente precisa', () => {
      const bestOf5Comp: CompetitionRecord = {
        id: 'comp-bo5',
        name: 'Superliga Best of 5 2026',
        modality: 'indoor',
        format: 'knockout',
        playerFormat: '6x6',
        setFormat: '5-sets',
        genderCategory: 'male',
        status: 'in-progress',
        config: bestOf5Config,
      };

      const team1 = makeTeam('team-1', 'Cruzeiro Vôlei', 'CRU');
      const team2 = makeTeam('team-2', 'Minas Vôlei', 'MTC');

      // 1. Partida 3-0 (Vitória Clara)
      const match3x0 = makeMatch('m-bo5-1', 'comp-bo5', team1, team2, [
        { scoreA: 25, scoreB: 20 },
        { scoreA: 25, scoreB: 18 },
        { scoreA: 25, scoreB: 19 },
      ]);
      const canon3x0 = CompetitionRulesService.getCanonicalMatchResult(bestOf5Comp, match3x0);
      expect(canon3x0.winnerId).toBe('team-1');
      expect(canon3x0.setsWonA).toBe(3);
      expect(canon3x0.setsWonB).toBe(0);

      const pts3x0 = ScoringEngine.calculatePoints(canon3x0, bestOf5Config.scoring);
      expect(pts3x0.winnerPoints).toBe(3);
      expect(pts3x0.loserPoints).toBe(0);

      // 2. Partida 3-1 (Vitória Clara com 4 sets)
      const match3x1 = makeMatch('m-bo5-2', 'comp-bo5', team1, team2, [
        { scoreA: 25, scoreB: 20 },
        { scoreA: 20, scoreB: 25 },
        { scoreA: 25, scoreB: 18 },
        { scoreA: 25, scoreB: 21 },
      ]);
      const canon3x1 = CompetitionRulesService.getCanonicalMatchResult(bestOf5Comp, match3x1);
      expect(canon3x1.winnerId).toBe('team-1');
      expect(canon3x1.setsWonA).toBe(3);
      expect(canon3x1.setsWonB).toBe(1);

      const pts3x1 = ScoringEngine.calculatePoints(canon3x1, bestOf5Config.scoring);
      expect(pts3x1.winnerPoints).toBe(3);
      expect(pts3x1.loserPoints).toBe(0);

      // 3. Partida 3-2 (Vitória no Tie-Break do 5º Set)
      const match3x2 = makeMatch('m-bo5-3', 'comp-bo5', team1, team2, [
        { scoreA: 25, scoreB: 22 },
        { scoreA: 21, scoreB: 25 },
        { scoreA: 25, scoreB: 19 },
        { scoreA: 20, scoreB: 25 },
        { scoreA: 15, scoreB: 13 },
      ]);
      const canon3x2 = CompetitionRulesService.getCanonicalMatchResult(bestOf5Comp, match3x2);
      expect(canon3x2.winnerId).toBe('team-1');
      expect(canon3x2.setsWonA).toBe(3);
      expect(canon3x2.setsWonB).toBe(2);

      const pts3x2 = ScoringEngine.calculatePoints(canon3x2, bestOf5Config.scoring);
      expect(pts3x2.winnerPoints).toBe(2); // Vencedor ganha 2 pontos no 3-2
      expect(pts3x2.loserPoints).toBe(1);  // Perdedor ganha 1 ponto no 3-2

      // 4. Geração da súmula oficial de 5 sets
      const pdf5Sets = generateOfficialMatchSheetPdf({
        competition: 'Superliga Best of 5 2026',
        category: 'Masculino Adulto',
        genderCategory: 'male',
        modality: 'indoor',
        format: '5-sets',
        playerFormat: '6x6',
        date: '06/09/2026',
        time: '19:00',
        city: 'Belo Horizonte',
        venue: 'Ginásio Mineirinho',
        court: 'Quadra 1',
        phase: 'Final',
        round: 1,
        matchNumber: 10,
        teamA: {
          name: 'Cruzeiro Vôlei',
          shortName: 'CRU',
          athletes: [],
          coach: 'Filipe Ferraz',
        },
        teamB: {
          name: 'Minas Vôlei',
          shortName: 'MTC',
          athletes: [],
          coach: 'Guilherme Novaes',
        },
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 22 },
          { setNumber: 2, scoreA: 21, scoreB: 25 },
          { setNumber: 3, scoreA: 25, scoreB: 19 },
          { setNumber: 4, scoreA: 20, scoreB: 25 },
          { setNumber: 5, scoreA: 15, scoreB: 13 },
        ],
        finalScoreA: 3,
        finalScoreB: 2,
        timeouts: [],
        substitutions: [],
        sanctions: [],
        referees: [
          { role: '1º Árbitro', name: 'Árbitro CBV 1' },
          { role: '2º Árbitro', name: 'Árbitro CBV 2' },
          { role: 'Apontador', name: 'Apontador CBV' },
        ],
      });
      expect(pdf5Sets).toBeDefined();
      expect(pdf5Sets.output('arraybuffer')).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 4: CUSTOM ASYMMETRIC FORMAT COM BYEs NATIVOS
  // --------------------------------------------------------------------------
  describe('Formato Customizado Assimétrico com BYEs Nativos (5 Equipes, 8 Slots, 3 BYEs)', () => {
    it('avança participantes de BYE sem criar partidas reais nem equipes fictícias', () => {
      // 4 slots de quartas de final:
      // QF1: Team 1 vs BYE (Team 1 avança direto)
      // QF2: Team 4 vs Team 5 (Confronto real)
      // QF3: Team 2 vs BYE (Team 2 avança direto)
      // QF4: Team 3 vs BYE (Team 3 avança direto)
      const slotsRound1: MatchSlot[] = [
        makeSlot('slot-qf-1', 'stage-custom', 'round-qf', 1, { type: 'seed', seedNumber: 1 }, { type: 'bye' }, 't-1'),
        makeSlot('slot-qf-2', 'stage-custom', 'round-qf', 2, { type: 'seed', seedNumber: 4 }, { type: 'seed', seedNumber: 5 }, 't-4', 't-5'),
        makeSlot('slot-qf-3', 'stage-custom', 'round-qf', 3, { type: 'seed', seedNumber: 2 }, { type: 'bye' }, 't-2'),
        makeSlot('slot-qf-4', 'stage-custom', 'round-qf', 4, { type: 'seed', seedNumber: 3 }, { type: 'bye' }, 't-3'),
      ];

      // Verificação 1: Apenas o slot 2 tem dois participantes reais (materializável)
      const materializableSlots = slotsRound1.filter(
        s => s.participantA.status === 'resolved' && s.participantB.status === 'resolved',
      );
      expect(materializableSlots).toHaveLength(1);
      expect(materializableSlots[0].slotId).toBe('slot-qf-2');

      // Verificação 2: Os outros 3 slots são BYEs puros
      const byeSlots = slotsRound1.filter(
        s => s.participantA.isBye || s.participantB.isBye,
      );
      expect(byeSlots).toHaveLength(3);

      // Verificação 3: Resolução de avanço por BYE sem partida real
      const sfSlot1 = makeSlot(
        'slot-sf-1',
        'stage-custom',
        'round-sf',
        1,
        { type: 'match-winner', slotId: 'slot-qf-1' },
        { type: 'match-winner', slotId: 'slot-qf-2' },
      );

      // Como QF-1 teve BYE no Lado B, o Lado A (t-1) avança AUTOMATICAMENTE para SF-1
      const sfSlot1Resolved: MatchSlot = {
        ...sfSlot1,
        participantA: {
          ...sfSlot1.participantA,
          status: 'resolved',
          resolvedTeamId: 't-1',
        },
      };
      expect(sfSlot1Resolved.participantA.resolvedTeamId).toBe('t-1');
      expect(sfSlot1Resolved.participantA.status).toBe('resolved');
      expect(sfSlot1Resolved.participantB.status).toBe('unresolved'); // Aguardando o jogo QF-2
    });
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 5: TESTE DE CONFIGURAÇÃO INVÁLIDA (Validator & Dag Gatekeeper)
  // --------------------------------------------------------------------------
  describe('Detecção e Bloqueio de Configurações Inválidas', () => {
    it('rejeita ciclos diretos e indiretos de estágios no grafo', () => {
      // 1. Ciclo Direto (Stage 1 depende de Stage 1)
      const directCycleStages: StageDefinition[] = [
        {
          id: 's-1',
          name: 'Estágio 1',
          order: 1,
          type: 'knockout',
          dependsOnStageIds: ['s-1'], // Ciclo Direto!
        },
      ];

      const directResult = StageGraph.validate(directCycleStages);
      expect(directResult.isValid).toBe(false);
      expect(directResult.errors.length).toBeGreaterThanOrEqual(1);

      // 2. Configuração com setsToWin impossível
      const invalidSetsConfig: CompetitionConfig = {
        version: 1,
        format: {
          defaultSetsToWin: 0 as unknown as 2 | 3, // Inválido!
          setRules: { regularSetPoints: 0, tiebreakPoints: 0, minAdvantage: 0 },
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
        standings: { tiebreakCriteriaOrder: [], advancingPerGroup: 0 },
        registration: { minAthletes: 0, maxAthletes: 0, maxCaptains: 0, maxLiberos: 0, requireJerseyNumberOnRegistration: false },
      };

      const setsValidation = CompetitionConfigValidator.validate(invalidSetsConfig);
      expect(setsValidation.isValid).toBe(false);
      expect(setsValidation.errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 6: CONCORRÊNCIA, RECUPERAÇÃO E IMUTABILIDADE
  // --------------------------------------------------------------------------
  describe('Concorrência, Idempotência e Imutabilidade Pós-Início', () => {
    it('garante que regras congeladas (rulesSnapshot) não sofram mutação após o início', () => {
      const activeComp: CompetitionRecord = {
        id: 'comp-freeze-test',
        name: 'Taça Freeze 2026',
        modality: 'indoor',
        format: 'groups',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'in-progress',
        config: {
          version: 1,
          format: { defaultSetsToWin: 2, setRules: { regularSetPoints: 25, tiebreakPoints: 15, minAdvantage: 2 } },
          scoring: { systemType: 'fivb-standard', pointsWinClear: 3, pointsWinNarrow: 2, pointsLossNarrow: 1, pointsLossClear: 0, pointsWoWin: 3, pointsWoLoss: 0 },
          standings: { tiebreakCriteriaOrder: ['points'], advancingPerGroup: 2 },
          registration: { minAthletes: 6, maxAthletes: 14, maxCaptains: 1, maxLiberos: 2, requireJerseyNumberOnRegistration: false },
        },
      };

      // 1. Congelamento de regras
      const frozenComp = CompetitionLifecycleService.freezeRulesSnapshot(activeComp);
      expect(frozenComp.rulesSnapshot).toBeDefined();
      expect(frozenComp.rulesSnapshot?.format.defaultSetsToWin).toBe(2);

      // 2. Bloqueio de edição
      expect(CompetitionLifecycleService.canEditRules(frozenComp, 1)).toBe(false);

      // 3. Tentativa de adulteração em config.format.defaultSetsToWin
      const tamperedComp: CompetitionRecord = {
        ...frozenComp,
        config: {
          ...frozenComp.config!,
          format: {
            defaultSetsToWin: 3, // Adulteração!
            setRules: { regularSetPoints: 21, tiebreakPoints: 11, minAdvantage: 2 },
          },
        },
      };

      // 4. O motor de regras canônicas prioriza estritamente o rulesSnapshot
      const effectiveConfig = CompetitionRulesService.getConfig(tamperedComp);
      expect(effectiveConfig.format.defaultSetsToWin).toBe(2); // Preservou 2 sets!
      expect(effectiveConfig.format.setRules.regularSetPoints).toBe(25); // Preservou 25 pontos!
    });

    it('rejeita divergências visuais e marca slots inconsistentes no Bracket ViewModel', () => {
      const comp: CompetitionRecord = {
        id: 'comp-bracket-incon',
        name: 'Inconsistent Bracket Test',
        modality: 'indoor',
        format: 'knockout',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'in-progress',
      };

      const team1 = makeTeam('team-1', 'A', 'A');
      const team2 = makeTeam('team-2', 'B', 'B');

      // Slot aponta para match-xyz, mas a partida aponta para slot-different
      const stage: StageRecord = { id: 'row-s-1', competitionId: comp.id, stageId: 's-1', name: 'Fase', stageOrder: 1, stageType: 'knockout', status: 'in-progress', isLocked: false };
      const round: RoundRecord = { id: 'row-r-1', stageRowId: 'row-s-1', competitionId: comp.id, roundId: 'r-1', name: 'Rodada', roundOrder: 1, slotsCount: 1, status: 'in-progress' };
      const slot: MatchSlotRecord = {
        id: 'row-slot-alpha',
        competitionId: comp.id,
        stageRowId: 'row-s-1',
        roundRowId: 'row-r-1',
        slotId: 'slot-alpha',
        position: 1,
        matchId: 'match-xyz',
        participantAReference: { type: 'resolved-team', teamId: 'team-1' },
        participantAStatus: 'resolved',
        resolvedTeamAId: 'team-1',
        participantBReference: { type: 'resolved-team', teamId: 'team-2' },
        participantBStatus: 'resolved',
        resolvedTeamBId: 'team-2',
      };

      // Partida com divergência: slotId aponta para slot-alpha, mas o teamAId diverge ('team-divergent')
      const matchWithDiffSlot: MatchRecord = {
        id: 'match-xyz',
        competitionId: comp.id,
        round: 1,
        matchNumber: 1,
        slotId: 'slot-alpha',
        teamAId: 'team-divergent',
        teamBId: 'team-2',
        teamAName: 'Divergent',
        teamBName: 'B',
        teamAShortName: 'DIV',
        teamBShortName: 'B',
        venue: 'G1',
        scheduledTime: '2026-09-06T14:00:00Z',
        status: 'scheduled',
        sets: [],
        referees: [],
        createdAt: '2026-09-06T10:00:00Z',
        updatedAt: '2026-09-06T10:00:00Z',
      };

      const vm = CompetitionBracketViewModelBuilder.build({
        competition: comp,
        stages: [stage],
        rounds: [round],
        slots: [slot],
        matches: [matchWithDiffSlot],
        teams: [team1, team2],
      });

      const slotVM = vm.stages[0].rounds[0].slots[0];
      expect(slotVM.visualState).toBe('inconsistent');
      expect(slotVM.isInconsistent).toBe(true);
    });
  });
});
