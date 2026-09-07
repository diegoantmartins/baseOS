import { beforeEach, describe, expect, it } from 'vitest';
import { CompetitionDrawEligibilityService } from '@/services/competitionDrawEligibilityService';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';
import type { CompetitionRecord } from '@/types/entities';

describe('CompetitionDrawEligibilityService — BaseOS (Fase 3)', () => {
  let indoorComp: CompetitionRecord;
  let beachComp: CompetitionRecord;
  let customComp: CompetitionRecord;

  beforeEach(async () => {
    // 1. Competição Indoor padrão (mínimo 6 atletas)
    indoorComp = await dataAccess.createCompetition({
      name: 'Superliga Estadual 2026',
      modality: 'indoor',
      format: 'groups_and_playoffs',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'male',
      groupsCount: 2,
      status: 'registration-closed',
    });

    // 2. Competição Beach padrão (mínimo 2 atletas)
    beachComp = await dataAccess.createCompetition({
      name: 'Circuito Praia 2026',
      modality: 'beach',
      format: 'round-robin',
      playerFormat: '2x2',
      setFormat: '3-sets',
      genderCategory: 'female',
      groupsCount: 1,
      status: 'registration-closed',
    });

    // 3. Competição Customizada com minAthletes = 8 no CompetitionConfig
    customComp = await dataAccess.createCompetition({
      name: 'Torneio Masters Especial',
      modality: 'indoor',
      format: 'groups_and_playoffs',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'male',
      status: 'registration-closed',
      config: {
        version: 1,
        format: {
          defaultSetsToWin: 2,
          setRules: {
            regularSetPoints: 25,
            tiebreakPoints: 15,
            minAdvantage: 2,
          },
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
          tiebreakCriteriaOrder: ['points', 'victories', 'sets-ratio', 'points-ratio'],
          advancingPerGroup: 2,
        },
        registration: {
          minAthletes: 8, // Configuração customizada: mínimo de 8 atletas
          maxAthletes: 16,
          maxCaptains: 1,
          maxLiberos: 2,
          requireJerseyNumberOnRegistration: false,
        },
      },
    });
  });

  function createMockAthletes(competitionTeamId: string, count: number): CompetitionAthlete[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `ath-${competitionTeamId}-${i + 1}`,
      competitionTeamId,
      name: `Atleta ${i + 1}`,
      jerseyNumber: i + 1,
      position: i === 0 ? 'Levantador' : 'Ponteiro',
      isCaptain: i === 0,
      isLibero: i === 1,
      gender: 'male',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  describe('evaluateTeamDrawEligibility — Avaliação Individual', () => {
    it('deve marcar equipe como elegível se atingir o elenco mínimo regulamentar (indoor: 6 atletas)', () => {
      const ct: CompetitionTeam = {
        id: 'ct-1',
        competitionId: indoorComp.id,
        teamId: 't-1',
        teamName: 'Vôlei Taubaté',
        teamShortName: 'TAU',
        accessToken: 'token-1',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: false,
        status: 'submitted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const athletes = createMockAthletes('ct-1', 6);
      const evalResult = CompetitionDrawEligibilityService.evaluateTeamDrawEligibility(
        indoorComp,
        ct,
        athletes,
      );

      expect(evalResult.eligible).toBe(true);
      expect(evalResult.blockers).toHaveLength(0);
      expect(evalResult.athleteCount).toBe(6);
      expect(evalResult.minAthletes).toBe(6);
      expect(evalResult.reasons[0]).toContain('Elenco regular com 6 atleta(s)');
    });

    it('deve marcar equipe como inelegível se elenco for menor que o mínimo regulamentar', () => {
      const ct: CompetitionTeam = {
        id: 'ct-2',
        competitionId: indoorComp.id,
        teamId: 't-2',
        teamName: 'Minas Tênis',
        teamShortName: 'MTC',
        accessToken: 'token-2',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: false,
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const athletes = createMockAthletes('ct-2', 4); // Apenas 4 de 6 necessários
      const evalResult = CompetitionDrawEligibilityService.evaluateTeamDrawEligibility(
        indoorComp,
        ct,
        athletes,
      );

      expect(evalResult.eligible).toBe(false);
      expect(evalResult.blockers).toHaveLength(1);
      expect(evalResult.blockers[0]).toContain('Elenco incompleto: 4/6 atleta(s) inscrito(s) (mínimo regulamentar: 6)');
    });

    it('deve respeitar a modalidade beach com mínimo canônico de 2 atletas', () => {
      const ct: CompetitionTeam = {
        id: 'ct-beach',
        competitionId: beachComp.id,
        teamId: 't-beach',
        teamName: 'Dupla Copacabana',
        teamShortName: 'COP',
        accessToken: 'token-beach',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: false,
        status: 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Com 2 atletas em beach deve ser elegível
      const athletes = createMockAthletes('ct-beach', 2);
      const evalResult = CompetitionDrawEligibilityService.evaluateTeamDrawEligibility(
        beachComp,
        ct,
        athletes,
      );

      expect(evalResult.eligible).toBe(true);
      expect(evalResult.minAthletes).toBe(2);
      expect(evalResult.blockers).toHaveLength(0);

      // Com 1 atleta em beach deve ser bloqueada
      const incompleteAthletes = createMockAthletes('ct-beach', 1);
      const incompleteEval = CompetitionDrawEligibilityService.evaluateTeamDrawEligibility(
        beachComp,
        ct,
        incompleteAthletes,
      );
      expect(incompleteEval.eligible).toBe(false);
      expect(incompleteEval.blockers[0]).toContain('1/2');
    });

    it('deve respeitar minAthletes customizado do CompetitionConfig sem nenhum valor hardcoded', () => {
      const ct: CompetitionTeam = {
        id: 'ct-custom',
        competitionId: customComp.id,
        teamId: 't-custom',
        teamName: 'Masters Paulistano',
        teamShortName: 'CAP',
        accessToken: 'token-custom',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: false,
        status: 'submitted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 6 atletas (suficiente para indoor padrão, mas INSUFICIENTE para a config custom de 8)
      const athletes6 = createMockAthletes('ct-custom', 6);
      const eval6 = CompetitionDrawEligibilityService.evaluateTeamDrawEligibility(
        customComp,
        ct,
        athletes6,
      );
      expect(eval6.eligible).toBe(false);
      expect(eval6.minAthletes).toBe(8);
      expect(eval6.blockers[0]).toContain('6/8');

      // 8 atletas atinge o mínimo customizado
      const athletes8 = createMockAthletes('ct-custom', 8);
      const eval8 = CompetitionDrawEligibilityService.evaluateTeamDrawEligibility(
        customComp,
        ct,
        athletes8,
      );
      expect(eval8.eligible).toBe(true);
      expect(eval8.minAthletes).toBe(8);
      expect(eval8.blockers).toHaveLength(0);
    });

    it('deve bloquear equipe com status rejected mesmo que tenha elenco completo', () => {
      const ct: CompetitionTeam = {
        id: 'ct-rej',
        competitionId: indoorComp.id,
        teamId: 't-rej',
        teamName: 'Equipe Inadimplente',
        teamShortName: 'INA',
        accessToken: 'token-rej',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: true,
        status: 'rejected',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const athletes = createMockAthletes('ct-rej', 10);
      const evalResult = CompetitionDrawEligibilityService.evaluateTeamDrawEligibility(
        indoorComp,
        ct,
        athletes,
      );

      expect(evalResult.eligible).toBe(false);
      expect(evalResult.blockers).toContain('Inscrição da equipe foi rejeitada pela organização.');
    });

    it('deve bloquear equipe que pertence a outra competição', () => {
      const ct: CompetitionTeam = {
        id: 'ct-other',
        competitionId: 'another-comp-id',
        teamId: 't-other',
        teamName: 'Equipe de Outro Torneio',
        teamShortName: 'OUT',
        accessToken: 'token-other',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: false,
        status: 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const athletes = createMockAthletes('ct-other', 8);
      const evalResult = CompetitionDrawEligibilityService.evaluateTeamDrawEligibility(
        indoorComp,
        ct,
        athletes,
      );

      expect(evalResult.eligible).toBe(false);
      expect(evalResult.blockers).toContain('Inscrição não pertence a esta competição.');
    });

    it('deve bloquear quando a competição estiver cancelada ou concluída', () => {
      const cancelledComp = { ...indoorComp, status: 'cancelled' as const };
      const completedComp = { ...indoorComp, status: 'completed' as const };

      const ct: CompetitionTeam = {
        id: 'ct-active',
        competitionId: indoorComp.id,
        teamId: 't-active',
        teamName: 'Equipe Sadia',
        teamShortName: 'SAD',
        accessToken: 'token-sad',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: false,
        status: 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const athletes = createMockAthletes('ct-active', 8);

      const resCancel = CompetitionDrawEligibilityService.evaluateTeamDrawEligibility(
        cancelledComp,
        ct,
        athletes,
      );
      expect(resCancel.eligible).toBe(false);
      expect(resCancel.blockers).toContain('Competição cancelada não permite participação em sorteio.');

      const resComp = CompetitionDrawEligibilityService.evaluateTeamDrawEligibility(
        completedComp,
        ct,
        athletes,
      );
      expect(resComp.eligible).toBe(false);
      expect(resComp.blockers).toContain('Competição já finalizada não aceita novos sorteios.');
    });
  });

  describe('evaluateCompetitionDrawEligibility — Relatório Coletivo e Prontidão do Sorteio', () => {
    it('deve gerar relatório completo preservando equipes elegíveis e inelegíveis com diagnósticos', () => {
      const ct1: CompetitionTeam = {
        id: 'ct-1',
        competitionId: indoorComp.id,
        teamId: 't-1',
        teamName: 'Time Completo 1',
        teamShortName: 'TC1',
        accessToken: 'tk-1',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: false,
        status: 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const ct2: CompetitionTeam = {
        id: 'ct-2',
        competitionId: indoorComp.id,
        teamId: 't-2',
        teamName: 'Time Completo 2',
        teamShortName: 'TC2',
        accessToken: 'tk-2',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: false,
        status: 'submitted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const ctIncomplete: CompetitionTeam = {
        id: 'ct-3',
        competitionId: indoorComp.id,
        teamId: 't-3',
        teamName: 'Time Incompleto',
        teamShortName: 'INC',
        accessToken: 'tk-3',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: false,
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const ctRejected: CompetitionTeam = {
        id: 'ct-4',
        competitionId: indoorComp.id,
        teamId: 't-4',
        teamName: 'Time Rejeitado',
        teamShortName: 'REJ',
        accessToken: 'tk-4',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: true,
        status: 'rejected',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const athletes = [
        ...createMockAthletes('ct-1', 7),
        ...createMockAthletes('ct-2', 6),
        ...createMockAthletes('ct-3', 3), // Incompleto: 3/6
        ...createMockAthletes('ct-4', 8), // Rejeitado
      ];

      const report = CompetitionDrawEligibilityService.evaluateCompetitionDrawEligibility({
        competition: indoorComp,
        competitionTeams: [ct1, ct2, ctIncomplete, ctRejected],
        athletes,
        groupsCount: 1,
      });

      expect(report.totalTeams).toBe(4);
      expect(report.eligibleCount).toBe(2);
      expect(report.blockedCount).toBe(2);
      expect(report.allEvaluations).toHaveLength(4);
      expect(report.eligibleTeams).toHaveLength(2);
      expect(report.ineligibleTeams).toHaveLength(2);

      // Verificação dos blockers
      const blocked3 = report.ineligibleTeams.find(t => t.competitionTeamId === 'ct-3');
      expect(blocked3?.blockers[0]).toContain('3/6');

      const blocked4 = report.ineligibleTeams.find(t => t.competitionTeamId === 'ct-4');
      expect(blocked4?.blockers[0]).toContain('rejeitada');

      // Prontidão: 2 equipes elegíveis para 1 grupo -> canExecuteDraw: true
      expect(report.canExecuteDraw).toBe(true);
      expect(report.drawBlockers).toHaveLength(0);
    });

    it('deve bloquear sorteio se a competição ainda estiver com inscrições abertas (registration-open)', () => {
      const openComp = { ...indoorComp, status: 'registration-open' as const };
      const ct1: CompetitionTeam = {
        id: 'ct-1',
        competitionId: openComp.id,
        teamId: 't-1',
        teamName: 'Time 1',
        teamShortName: 'T1',
        accessToken: 'tk-1',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: false,
        status: 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const ct2: CompetitionTeam = {
        id: 'ct-2',
        competitionId: openComp.id,
        teamId: 't-2',
        teamName: 'Time 2',
        teamShortName: 'T2',
        accessToken: 'tk-2',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: false,
        status: 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const athletes = [...createMockAthletes('ct-1', 6), ...createMockAthletes('ct-2', 6)];

      const report = CompetitionDrawEligibilityService.evaluateCompetitionDrawEligibility({
        competition: openComp,
        competitionTeams: [ct1, ct2],
        athletes,
      });

      // Individualmente são elegíveis
      expect(report.eligibleCount).toBe(2);
      // Porém o sorteio geral está bloqueado porque as inscrições não foram encerradas
      expect(report.canExecuteDraw).toBe(false);
      expect(report.drawBlockers).toContain(
        'Inscrições ainda abertas. É necessário encerrar formalmente as inscrições antes de realizar o sorteio.',
      );
    });

    it('deve bloquear sorteio se houver menos de 2 equipes elegíveis', () => {
      const ct1: CompetitionTeam = {
        id: 'ct-1',
        competitionId: indoorComp.id,
        teamId: 't-1',
        teamName: 'Único Time Apto',
        teamShortName: 'APT',
        accessToken: 'tk-1',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: false,
        status: 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const report = CompetitionDrawEligibilityService.evaluateCompetitionDrawEligibility({
        competition: indoorComp,
        competitionTeams: [ct1],
        athletes: createMockAthletes('ct-1', 8),
      });

      expect(report.canExecuteDraw).toBe(false);
      expect(report.drawBlockers.some(b => b.includes('mínimo necessário: 2'))).toBe(true);
    });

    it('deve bloquear sorteio se a quantidade de equipes elegíveis for insuficiente para os grupos configurados (mínimo técnico de 2 por grupo)', () => {
      const ct1: CompetitionTeam = {
        id: 'ct-1',
        competitionId: indoorComp.id,
        teamId: 't-1',
        teamName: 'Time A',
        teamShortName: 'TA',
        accessToken: 'tk-1',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: false,
        status: 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const ct2: CompetitionTeam = {
        id: 'ct-2',
        competitionId: indoorComp.id,
        teamId: 't-2',
        teamName: 'Time B',
        teamShortName: 'TB',
        accessToken: 'tk-2',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: false,
        status: 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 2 equipes aptas, porém 2 grupos solicitados (mínimo técnico é 4 equipes, 2 por grupo)
      const report = CompetitionDrawEligibilityService.evaluateCompetitionDrawEligibility({
        competition: indoorComp,
        competitionTeams: [ct1, ct2],
        athletes: [...createMockAthletes('ct-1', 6), ...createMockAthletes('ct-2', 6)],
        groupsCount: 2,
      });

      expect(report.canExecuteDraw).toBe(false);
      expect(report.drawBlockers.some(b => b.includes('mínimo técnico necessário para o sorteio: 4 equipes'))).toBe(true);
    });
  });
});
