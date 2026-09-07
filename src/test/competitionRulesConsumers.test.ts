import { describe, it, expect } from 'vitest';
import { validateSingleSet, validateMatchResult, DEFAULT_INDOOR_CONFIG } from '@/services/matchValidationService';
import { accumulateStats, computeStandings } from '@/services/standingsService';
import { getRosterLimits, validateAthleteInput, validateRosterMinimum } from '@/services/registrationService';
import { buildPlayoffMatches, type PlayoffMatchSlot } from '@/services/playoffsService';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';

describe('Migração dos Consumidores para o Motor Canônico de Regras (Fase 4.3)', () => {
  describe('matchValidationService (Delegação direta)', () => {
    it('valida set regular de 25 pontos através da delegação ao CompetitionRulesService', () => {
      const res = validateSingleSet(1, 25, 20, DEFAULT_INDOOR_CONFIG, false);
      expect(res.valid).toBe(true);
      expect(res.winner).toBe('A');
    });

    it('rejeita set incompleto com mensagem padronizada', () => {
      const res = validateSingleSet(1, 20, 18, DEFAULT_INDOOR_CONFIG, false);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('25 pontos');
    });

    it('valida resultado de partida com 3 sets em melhor de 3', () => {
      const sets = [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 20, scoreB: 25 },
        { setNumber: 3, scoreA: 15, scoreB: 10 },
      ];
      const res = validateMatchResult(sets, { ...DEFAULT_INDOOR_CONFIG, setFormat: '3-sets' });
      expect(res.valid).toBe(true);
      expect(res.winner).toBe('A');
      expect(res.scoreA).toBe(2);
      expect(res.scoreB).toBe(1);
    });
  });

  describe('standingsService (Consumo de pontuação canônica)', () => {
    const mockTeamA: TeamRecord = {
      id: 'team-a',
      name: 'Equipe Alpha',
      shortName: 'ALP',
      modality: 'indoor',
      city: 'Curitiba',
      status: 'confirmed',
    };
    const mockTeamB: TeamRecord = {
      id: 'team-b',
      name: 'Equipe Beta',
      shortName: 'BET',
      modality: 'indoor',
      city: 'Curitiba',
      status: 'confirmed',
    };

    const matches: MatchRecord[] = [
      {
        id: 'm-1',
        competitionId: 'c-1',
        round: 1,
        matchNumber: 1,
        teamAId: 'team-a',
        teamBId: 'team-b',
        teamAName: 'Equipe Alpha',
        teamBName: 'Equipe Beta',
        teamAShortName: 'ALP',
        teamBShortName: 'BET',
        venue: 'Ginásio 1',
        court: '1',
        scheduledTime: '2026-09-01T10:00:00Z',
        status: 'completed',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20 },
          { setNumber: 2, scoreA: 20, scoreB: 25 },
          { setNumber: 3, scoreA: 15, scoreB: 13 },
        ],
        referees: [],
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    it('calcula pontuação padrão FIVB (2x1 = 2 pts para vencedor, 1 pt para perdedor)', () => {
      const statsA = accumulateStats(matches, 'team-a', false);
      const statsB = accumulateStats(matches, 'team-b', false);

      expect(statsA.competitionPoints).toBe(2);
      expect(statsB.competitionPoints).toBe(1);
    });

    it('respeita regras customizadas de pontuação quando a competição possui config', () => {
      const customComp: CompetitionRecord = {
        id: 'c-custom',
        name: 'Torneio Especial',
        modality: 'indoor',
        format: 'groups',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'in-progress',
        config: {
          version: 1,
          format: {
            defaultSetsToWin: 2,
            setRules: { regularSetPoints: 25, tiebreakPoints: 15, minAdvantage: 2 },
          },
          scoring: {
            systemType: 'custom',
            pointsWinClear: 4,
            pointsWinNarrow: 3,
            pointsLossNarrow: 2,
            pointsLossClear: 0,
            pointsWoWin: 4,
            pointsWoLoss: 0,
          },
          standings: {
            tiebreakCriteriaOrder: ['points'],
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

      const statsA = accumulateStats(matches, 'team-a', false, customComp);
      const statsB = accumulateStats(matches, 'team-b', false, customComp);

      // No config customizado: vitória apertada (2x1) = 3 pontos, derrota apertada (1x2) = 2 pontos
      expect(statsA.competitionPoints).toBe(3);
      expect(statsB.competitionPoints).toBe(2);

      const standings = computeStandings(
        [{ team: mockTeamA }, { team: mockTeamB }],
        matches,
        { competition: customComp },
      );

      expect(standings[0].teamId).toBe('team-a');
      expect(standings[0].competitionPoints).toBe(3);
      expect(standings[1].teamId).toBe('team-b');
      expect(standings[1].competitionPoints).toBe(2);
    });
  });

  describe('playoffsService (Resolução dinâmica de formato de sets)', () => {
    const comp: CompetitionRecord = {
      id: 'c-playoffs',
      name: 'Torneio Playoffs',
      modality: 'indoor',
      format: 'knockout',
      playerFormat: '6x6',
      genderCategory: 'male',
      setFormat: '3-sets',
      status: 'planning',
      phaseSetRules: {
        groupStage: '3-sets',
        playoffs: '3-sets',
        semifinals: '3-sets',
        final: '5-sets',
      },
    };

    const slots: PlayoffMatchSlot[] = [
      {
        phase: 'semifinal',
        matchIndex: 1,
        label: 'Semifinal 1',
        sourceTeamA: { description: '1º A' },
        sourceTeamB: { description: '2º B' },
      },
      {
        phase: 'final',
        matchIndex: 2,
        label: 'Grande Final',
        sourceTeamA: { description: 'Venc SF1' },
        sourceTeamB: { description: 'Venc SF2' },
      },
    ];

    it('atribui 3-sets para a semifinal e 5-sets para a final com base nas regras canônicas', () => {
      const matches = buildPlayoffMatches(comp, slots, []);
      expect(matches[0].phase).toBe('semifinal');
      expect(matches[0].customSetFormat).toBe('3-sets');

      expect(matches[1].phase).toBe('final');
      expect(matches[1].customSetFormat).toBe('5-sets');
    });
  });

  describe('registrationService (Limites canônicos de elenco)', () => {
    const mockAthletes: CompetitionAthlete[] = [
      {
        id: 'ath-1',
        competitionTeamId: 'ct-1',
        name: 'Jogador 1',
        position: 'Ponteiro',
        jerseyNumber: 10,
        isCaptain: true,
        isLibero: false,
        gender: 'male',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ath-2',
        competitionTeamId: 'ct-1',
        name: 'Jogador 2',
        position: 'Líbero',
        jerseyNumber: 11,
        isCaptain: false,
        isLibero: true,
        gender: 'male',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    it('respeita limites customizados da competição via config', () => {
      const compWithCustomLimits: CompetitionRecord = {
        id: 'c-custom-limits',
        name: 'Torneio Especial',
        modality: 'indoor',
        format: 'groups',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'planning',
        config: {
          version: 1,
          format: {
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
            tiebreakCriteriaOrder: ['points'],
            advancingPerGroup: 2,
          },
          registration: {
            minAthletes: 4, // Customizado para 4
            maxAthletes: 8, // Customizado para 8
            maxCaptains: 1,
            maxLiberos: 1, // Customizado para apenas 1 líbero
            requireJerseyNumberOnRegistration: false,
          },
        },
      };

      const limits = getRosterLimits('6x6', compWithCustomLimits);
      expect(limits.min).toBe(4);
      expect(limits.max).toBe(8);
      expect(limits.maxLiberos).toBe(1);

      // Rejeita segundo líbero porque maxLiberos customizado é 1
      const validationLibero = validateAthleteInput(
        {
          name: 'Segundo Líbero',
          position: 'Líbero',
          jerseyNumber: 12,
          isCaptain: false,
          isLibero: true,
          gender: 'male',
        },
        mockAthletes,
        '6x6',
        undefined,
        compWithCustomLimits,
      );
      expect(validationLibero.valid).toBe(false);
      expect(validationLibero.errors[0]).toContain('Máximo de 1 líberos por equipe');

      // Mínimo de 4 atletas: 2 atletas não atingem o mínimo
      const minValidation = validateRosterMinimum(mockAthletes, '6x6', compWithCustomLimits);
      expect(minValidation.valid).toBe(false);
      expect(minValidation.errors[0]).toContain('Mínimo de 4 atletas');
    });
  });

  describe('CompetitionRulesService (Congelamento e Bloqueio de Regras)', () => {
    it('bloqueia edição quando o status é in-progress ou completed', () => {
      const compInProgress: CompetitionRecord = {
        id: 'c-active',
        name: 'Ativo',
        modality: 'indoor',
        format: 'groups',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'in-progress',
      };
      expect(CompetitionRulesService.areRulesLocked(compInProgress)).toBe(true);

      const compCompleted: CompetitionRecord = {
        ...compInProgress,
        status: 'completed',
      };
      expect(CompetitionRulesService.areRulesLocked(compCompleted)).toBe(true);
    });

    it('bloqueia edição quando a contagem de partidas for maior que 0 mesmo em status planning', () => {
      const compPlanning: CompetitionRecord = {
        id: 'c-plan',
        name: 'Planejamento',
        modality: 'indoor',
        format: 'groups',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'planning',
      };
      expect(CompetitionRulesService.areRulesLocked(compPlanning, 0)).toBe(false);
      expect(CompetitionRulesService.areRulesLocked(compPlanning, 1)).toBe(true);
    });
  });
});
