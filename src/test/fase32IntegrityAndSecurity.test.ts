import { beforeEach, describe, expect, it } from 'vitest';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { CompetitionDrawEligibilityService } from '@/services/competitionDrawEligibilityService';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import {
  addAthlete,
  isRegistrationLocked,
  updateAthlete,
  removeAthlete,
} from '@/services/registrationService';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionLifecycleStatus, CompetitionRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';

describe('BaseOS — Fase 3.2: Integridade de Lifecycle, Segurança do Portal e Consistência do Sorteio', () => {
  let competition: CompetitionRecord;
  let compTeamA: CompetitionTeam;
  let compTeamB: CompetitionTeam;

  beforeEach(async () => {
    competition = await dataAccess.createCompetition({
      name: 'Torneio Fase 3.2 Integridade',
      modality: 'indoor',
      format: 'groups_and_playoffs',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'male',
      groupsCount: 2,
      status: 'registration-open',
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
          tiebreakCriteriaOrder: ['points', 'victories'],
          advancingPerGroup: 2,
        },
        registration: {
          minAthletes: 6,
          maxAthletes: 12, // Limite dinâmico configurado (não-hardcoded)
          maxCaptains: 1,
          maxLiberos: 2,
          requireJerseyNumberOnRegistration: false,
        },
      },
    });

    const teamA = await dataAccess.createTeam({
      name: 'Equipe Alfa',
      shortName: 'ALF',
      modality: 'indoor',
    });

    const teamB = await dataAccess.createTeam({
      name: 'Equipe Beta',
      shortName: 'BET',
      modality: 'indoor',
    });

    compTeamA = await dataAccess.createCompetitionTeam({
      competitionId: competition.id,
      teamId: teamA.id,
      teamName: teamA.name,
      teamShortName: teamA.shortName,
      registrationDeadline: '2026-12-31T23:59:59.000Z',
      isLocked: false,
      status: 'in_progress',
    });

    compTeamB = await dataAccess.createCompetitionTeam({
      competitionId: competition.id,
      teamId: teamB.id,
      teamName: teamB.name,
      teamShortName: teamB.shortName,
      registrationDeadline: '2026-12-31T23:59:59.000Z',
      isLocked: false,
      status: 'in_progress',
    });
  });

  describe('BLOCKER 07 — Desacoplamento entre Fechamento (Close) e Prontidão do Sorteio (Draw Readiness)', () => {
    it('permite que o organizador feche inscrições administrativamente mesmo com apenas 2 equipes em torneio de 2 grupos', async () => {
      // 2 grupos necessitam de 4 equipes para sorteio, mas o fechamento de inscrições NÃO deve ser impedido
      const closeResult = await CompetitionLifecycleService.closeRegistrations(competition.id, 'Organizador Chefe');
      expect(closeResult.ok).toBe(true);
      expect(closeResult.competition?.status).toBe('registration-closed');

      const saved = await dataAccess.getCompetition(competition.id);
      expect(saved?.status).toBe('registration-closed');
    });

    it('bloqueia o sorteio (canExecuteDraw = false) quando o número de equipes for menor que groupsCount * 2', () => {
      // Cria mock de atletas suficientes para validar cada equipe individualmente (6 atletas)
      const mockAthletes = [
        ...Array.from({ length: 6 }, (_, i) => ({
          id: `ath-a-${i}`,
          competitionTeamId: compTeamA.id,
          name: `Atleta A${i}`,
          jerseyNumber: i + 1,
          position: 'Ponteiro',
          gender: 'male' as const,
          isCaptain: i === 0,
          isLibero: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        ...Array.from({ length: 6 }, (_, i) => ({
          id: `ath-b-${i}`,
          competitionTeamId: compTeamB.id,
          name: `Atleta B${i}`,
          jerseyNumber: i + 1,
          position: 'Central',
          gender: 'male' as const,
          isCaptain: i === 0,
          isLibero: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      ];

      const closedComp: CompetitionRecord = { ...competition, status: 'registration-closed' };

      // Avaliação para 2 grupos com apenas 2 equipes elegíveis
      const report = CompetitionDrawEligibilityService.evaluateCompetitionDrawEligibility({
        competition: closedComp,
        competitionTeams: [compTeamA, compTeamB],
        athletes: mockAthletes,
        groupsCount: 2,
      });

      expect(report.eligibleCount).toBe(2);
      expect(report.canExecuteDraw).toBe(false);
      expect(report.drawBlockers.some(b => b.includes('mínimo técnico necessário para o sorteio: 4 equipes'))).toBe(true);
    });
  });

  describe('BLOCKER 04 & 05 — Guarda Real de Persistência antes de groups-defined', () => {
    it('rejeita avanço de lifecycle se nenhuma partida foi salva no repositório', async () => {
      await CompetitionLifecycleService.closeRegistrations(competition.id, 'Admin');

      const advanceRes = await CompetitionLifecycleService.advanceToGroupsDefinedAfterDraw(
        competition.id,
        'Admin',
      );

      expect(advanceRes.ok).toBe(false);
      expect(advanceRes.errors[0]).toContain('nenhuma partida foi encontrada ou persistida');

      // Verifica que o status permaneceu registration-closed e equipes NÃO foram travadas prematuramente
      const currentComp = await dataAccess.getCompetition(competition.id);
      expect(currentComp?.status).toBe('registration-closed');

      const teams = await dataAccess.listCompetitionTeams(competition.id);
      expect(teams.some(t => !t.isLocked)).toBe(true);
    });

    it('avança para groups-defined com sucesso quando as partidas existem e foram devidamente confirmadas', async () => {
      await CompetitionLifecycleService.closeRegistrations(competition.id, 'Admin');

      // Simula persistência real do sorteio com partidas
      await dataAccess.saveDrawWithMatches(
        {
          competitionId: competition.id,
          config: { groupsCount: 1, seedingMode: 'random', seed: 2026, headSeeds: [] },
          groups: [{ name: 'Grupo A', teams: [{ teamId: compTeamA.teamId, seed: 1 }, { teamId: compTeamB.teamId, seed: 2 }] }],
          matches: [],
          status: 'preview',
        },
        [
          {
            round: 1,
            matchNumber: 1,
            teamAId: compTeamA.teamId,
            teamBId: compTeamB.teamId,
            teamAName: compTeamA.teamName,
            teamBName: compTeamB.teamName,
            teamAShortName: compTeamA.teamShortName,
            teamBShortName: compTeamB.teamShortName,
            groupName: 'Grupo A',
            phase: 'classificatória',
            scheduledTime: '2026-11-20T14:00:00.000Z',
            venue: 'Arena Principal',
          },
        ],
      );

      const advanceRes = await CompetitionLifecycleService.advanceToGroupsDefinedAfterDraw(
        competition.id,
        'Comitê de Competição',
      );

      expect(advanceRes.ok).toBe(true);
      expect(advanceRes.competition?.status).toBe('groups-defined');

      const currentComp = await dataAccess.getCompetition(competition.id);
      expect(currentComp?.status).toBe('groups-defined');

      const teams = await dataAccess.listCompetitionTeams(competition.id);
      expect(teams.every(t => t.isLocked)).toBe(true);
    });

    it('rejeita avanço para groups-defined se houver equipe sorteada em grupo sem partidas cadastradas', async () => {
      const compIncomplete = await dataAccess.createCompetition({
        name: 'Torneio Sorteio Incompleto',
        modality: 'indoor',
        format: 'groups_and_playoffs',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'female',
        status: 'registration-closed',
      });

      // Salva sorteio com equipes compTeamA e compTeamB, porém partida apenas com compTeamA e uma equipe terceira
      await dataAccess.saveDrawWithMatches(
        {
          competitionId: compIncomplete.id,
          config: { groupsCount: 1, seedingMode: 'random', seed: 100, headSeeds: [] },
          groups: [{ name: 'Grupo X', teams: [{ teamId: compTeamA.teamId, seed: 1 }, { teamId: compTeamB.teamId, seed: 2 }] }],
          matches: [],
          status: 'preview',
        },
        [
          {
            round: 1,
            matchNumber: 1,
            teamAId: compTeamA.teamId,
            teamBId: 'outra-equipe',
            teamAName: compTeamA.teamName,
            teamBName: 'Outra Equipe',
            teamAShortName: compTeamA.teamShortName,
            teamBShortName: 'OUT',
            groupName: 'Grupo X',
            phase: 'classificatória',
            scheduledTime: '2026-11-20T14:00:00.000Z',
            venue: 'Quadra 1',
          },
        ],
      );

      const res = await CompetitionLifecycleService.advanceToGroupsDefinedAfterDraw(
        compIncomplete.id,
        'Organizador',
      );

      expect(res.ok).toBe(false);
      expect(res.errors[0]).toContain('Inconsistência no sorteio: 1 equipe(s) sorteadas em grupos não possuem partidas cadastradas');
    });

    it('normaliza status legados draft -> planning e registration -> registration-open no acesso a dados', async () => {
      const compDraft = await dataAccess.createCompetition({
        name: 'Competição Legada Draft',
        modality: 'indoor',
        format: 'single_round_robin',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'draft' as unknown as CompetitionLifecycleStatus,
      });

      const loadedDraft = await dataAccess.getCompetition(compDraft.id);
      expect(loadedDraft?.status).toBe('planning');

      const compReg = await dataAccess.createCompetition({
        name: 'Competição Legada Registration',
        modality: 'beach',
        format: 'single_round_robin',
        playerFormat: '2x2',
        setFormat: '3-sets',
        genderCategory: 'female',
        status: 'registration' as unknown as CompetitionLifecycleStatus,
      });

      const loadedReg = await dataAccess.getCompetition(compReg.id);
      expect(loadedReg?.status).toBe('registration-open');
    });
  });

  describe('BLOCKER 10 — Bloqueio do Portal em Todos os Estados Pós-Fechamento', () => {
    it('rejeita mutações de atletas em todos os estágios não-abertos', async () => {
      const lockedStatuses: CompetitionLifecycleStatus[] = [
        'planning',
        'draft',
        'registration-closed',
        'draw-pending',
        'groups-defined',
        'in-progress',
        'playoffs',
        'completed',
        'cancelled',
      ];

      for (const status of lockedStatuses) {
        const testComp: CompetitionRecord = { ...competition, status };
        expect(isRegistrationLocked(compTeamA, testComp)).toBe(true);

        const addResult = await addAthlete(
          compTeamA.id,
          {
            name: `Atleta Teste ${status}`,
            jerseyNumber: 10,
            position: 'Ponteiro',
            gender: 'male',
            isCaptain: false,
            isLibero: false,
          },
          undefined,
          testComp,
        );

        expect(addResult.ok).toBe(false);
        expect(addResult.errors.some(e => e.includes('encerrado ou bloqueado'))).toBe(true);
      }
    });
  });

  describe('BLOCKER 09 — Limite Dinâmico do CompetitionConfig (Sem Hardcodes)', () => {
    it('obtém limites de elenco exclusivamente da configuração canônica do torneio', () => {
      const limits = CompetitionRulesService.getRosterLimits(competition);
      expect(limits.min).toBe(6);
      expect(limits.max).toBe(12); // Definido no CompetitionConfig (diferente de 14)
    });

    it('impede cadastro de atleta além do limite dinâmico configurado (maxAthletes = 12)', async () => {
      // Cadastra 12 atletas válidos
      for (let i = 1; i <= 12; i++) {
        const res = await addAthlete(
          compTeamA.id,
          {
            name: `Atleta Regular ${i}`,
            jerseyNumber: i,
            position: 'Ponteiro',
            gender: 'male',
            isCaptain: i === 1,
            isLibero: i === 12,
          },
          '6x6',
          competition,
        );
        expect(res.ok).toBe(true);
      }

      // Tentativa de adicionar o 13º atleta em competição com maxAthletes = 12
      const overflowRes = await addAthlete(
        compTeamA.id,
        {
          name: 'Atleta Excedente 13',
          jerseyNumber: 13,
          position: 'Levantador',
          gender: 'male',
          isCaptain: false,
          isLibero: false,
        },
        '6x6',
        competition,
      );

      expect(overflowRes.ok).toBe(false);
      expect(overflowRes.errors[0]).toContain('Limite máximo de 12 atletas por equipe atingido');
    });
  });
});
