import { beforeEach, describe, expect, it } from 'vitest';
import { dataAccess, resetLocalData } from '@/services/dataAccess';
import { AuditService } from '@/lib/security';
import { OperationalAuditService } from '@/services/operationalAuditService';
import type { CompetitionRecord, MatchRecord } from '@/types/entities';

describe('Fase 4.9.1 — OperationalAuditService & Trilha Canônica de Auditoria', () => {
  let mockComp: CompetitionRecord;
  let mockMatch: MatchRecord;

  beforeEach(async () => {
    resetLocalData();
    AuditService.clearLogs();

    mockComp = await dataAccess.createCompetition({
      name: 'Superliga Master 2026',
      modality: 'indoor',
      format: 'groups-playoffs',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'male',
      status: 'in-progress',
    });

    mockMatch = await dataAccess.createMatch({
      competitionId: mockComp.id,
      round: 1,
      matchNumber: 101,
      teamAId: 'team-1',
      teamBId: 'team-2',
      teamAName: 'Vortex Vôlei Clube',
      teamBName: 'Titanium Voleibol',
      teamAShortName: 'VVC',
      teamBShortName: 'TIT',
      venue: 'Ginásio Central',
      court: 'Quadra 1',
      phase: 'classificatória',
      groupName: 'Grupo A',
      scheduledTime: '2026-09-10T19:00:00Z',
      status: 'scheduled',
      sets: [],
      referees: [],
    });
  });

  describe('1. Resposta às 7 Perguntas Canônicas', () => {
    it('deve registrar e responder inequívocamente todas as 7 perguntas canônicas de auditoria', async () => {
      const entry = await OperationalAuditService.recordEvent({
        user: 'coordenador@voleipro.app',
        action: 'MATCH_HOMOLOGATED',
        entityType: 'match',
        entityId: mockMatch.id,
        competitionId: mockComp.id,
        competitionName: mockComp.name,
        previousValue: { status: 'completed', score: '25x20, 25x22' },
        newValue: { status: 'homologated', winnerId: 'team-1' },
        details: 'Partida #101 homologada formalmente após validação de súmula.',
        type: 'success',
      });

      // 1. Quem fez?
      expect(entry.user).toBe('coordenador@voleipro.app');
      // 2. Quando fez?
      expect(entry.timestamp).toBeDefined();
      expect(new Date(entry.timestamp).getTime()).not.toBeNaN();
      // 3. O que fez?
      expect(entry.action).toBe('MATCH_HOMOLOGATED');
      // 4. Em qual competição?
      expect(entry.competitionId).toBe(mockComp.id);
      expect(entry.competitionName).toBe('Superliga Master 2026');
      // 5. Em qual entidade?
      expect(entry.entityType).toBe('match');
      expect(entry.entityId).toBe(mockMatch.id);
      // 6. Qual era o estado anterior?
      expect(entry.previousValue).toContain('completed');
      expect(entry.previousValue).toContain('25x20');
      // 7. Qual foi o novo estado?
      expect(entry.newValue).toContain('homologated');
      expect(entry.newValue).toContain('team-1');
    });
  });

  describe('2. Mutações de Partidas (Matches Domain)', () => {
    it('registra homologação oficial de partida com vencedor e placar (recordMatchHomologation)', async () => {
      const matchWithSets: MatchRecord = {
        ...mockMatch,
        status: 'completed',
        sets: [
          { setNumber: 1, scoreA: 25, scoreB: 20 },
          { setNumber: 2, scoreA: 25, scoreB: 22 },
        ],
        winnerId: 'team-1',
      };

      const entry = await OperationalAuditService.recordMatchHomologation({
        match: matchWithSets,
        competition: mockComp,
        operator: 'Arbitragem Oficial',
        winnerName: 'Vortex Vôlei Clube',
      });

      expect(entry.action).toBe('MATCH_HOMOLOGATED');
      expect(entry.entityType).toBe('match');
      expect(entry.entityId).toBe(mockMatch.id);
      expect(entry.competitionId).toBe(mockComp.id);
      expect(entry.details).toContain('homologado oficialmente');
      expect(entry.details).toContain('Vortex Vôlei Clube');
      expect(entry.newValue).toContain('homologated');
    });

    it('registra lançamento ou edição de resultado com parciais (recordMatchResult)', async () => {
      const newSets = [
        { setNumber: 1, scoreA: 25, scoreB: 23 },
        { setNumber: 2, scoreA: 21, scoreB: 25 },
        { setNumber: 3, scoreA: 15, scoreB: 12 },
      ];

      const entry = await OperationalAuditService.recordMatchResult({
        match: mockMatch,
        competition: mockComp,
        operator: 'Mesa Apontador',
        newSets,
        winnerId: 'team-1',
        winnerName: 'Vortex Vôlei Clube',
      });

      expect(entry.action).toBe('MATCH_RESULT_RECORDED');
      expect(entry.entityId).toBe(mockMatch.id);
      expect(entry.details).toContain('25x23');
      expect(entry.details).toContain('15x12');
      expect(entry.newValue).toContain('team-1');
    });

    it('registra reabertura de partida para status completed (recordMatchReopen)', async () => {
      const homologatedMatch: MatchRecord = {
        ...mockMatch,
        status: 'homologated',
        homologatedAt: new Date().toISOString(),
        homologatedBy: 'Superintendente',
      };

      const entry = await OperationalAuditService.recordMatchReopen({
        match: homologatedMatch,
        competition: mockComp,
        operator: 'Diretor Técnico',
      });

      expect(entry.action).toBe('MATCH_REOPENED');
      expect(entry.previousValue).toContain('homologated');
      expect(entry.newValue).toContain('completed');
      expect(entry.details).toContain('reaberto de \'homologated\' para \'completed\'');
    });

    it('registra cancelamento de partida com justificativa (recordMatchCancellation)', async () => {
      const entry = await OperationalAuditService.recordMatchCancellation({
        match: mockMatch,
        competition: mockComp,
        operator: 'Coordenador Operacional',
        reason: 'Impraticabilidade da quadra por intempéries climáticas',
      });

      expect(entry.action).toBe('MATCH_CANCELLED');
      expect(entry.details).toContain('cancelado');
      expect(entry.details).toContain('intempéries climáticas');
      expect(entry.newValue).toContain('cancelled');
    });

    it('registra edição de agendamento de partida com campos alterados (recordMatchEdit)', async () => {
      const updates: Partial<MatchRecord> = {
        scheduledTime: '2026-09-11T20:30:00Z',
        court: 'Quadra Central 2',
      };

      const entry = await OperationalAuditService.recordMatchEdit({
        match: mockMatch,
        competition: mockComp,
        operator: 'Gestor de Tabela',
        updates,
      });

      expect(entry.action).toBe('MATCH_SCHEDULE_UPDATED');
      expect(entry.details).toContain('Quadra Central 2');
      expect(entry.newValue).toContain('2026-09-11T20:30:00Z');
    });

    it('registra sincronização e geração de confrontos eliminatórios (recordPlayoffSync)', async () => {
      const entry = await OperationalAuditService.recordPlayoffSync({
        competition: mockComp,
        operator: 'Organizador Master',
        createdCount: 4,
        updatedCount: 2,
      });

      expect(entry.action).toBe('PLAYOFFS_SYNCED');
      expect(entry.competitionId).toBe(mockComp.id);
      expect(entry.details).toContain('4 jogos criados e 2 atualizados');
    });
  });

  describe('3. Mutações de Competição e Sorteio (Competition & Draw Domain)', () => {
    it('registra transição de status no ciclo de vida (recordCompetitionTransition)', async () => {
      const entry = await OperationalAuditService.recordCompetitionTransition({
        competition: mockComp,
        operator: 'Presidente Federação',
        previousStatus: 'planning',
        newStatus: 'in-progress',
      });

      expect(entry.action).toBe('COMPETITION_STATUS_CHANGED');
      expect(entry.competitionId).toBe(mockComp.id);
      expect(entry.previousValue).toContain('planning');
      expect(entry.newValue).toContain('in-progress');
    });

    it('registra criação de nova competição (recordCompetitionCreation)', async () => {
      const newComp = await dataAccess.createCompetition({
        name: 'Copa Regional de Vôlei de Praia',
        modality: 'beach',
        format: 'groups-playoffs',
        playerFormat: '2x2',
        setFormat: '3-sets',
        genderCategory: 'mixed',
        status: 'planning',
      });

      const entry = await OperationalAuditService.recordCompetitionCreation({
        competition: newComp,
        operator: 'Comitê Organizador',
      });

      expect(entry.action).toBe('COMPETITION_CREATED');
      expect(entry.details).toContain('Copa Regional de Vôlei de Praia');
      expect(entry.details).toContain('beach');
    });

    it('registra oficialização de sorteio de grupos e confrontos (recordDrawExecution)', async () => {
      const entry = await OperationalAuditService.recordDrawExecution({
        competition: mockComp,
        operator: 'Mesa do Sorteio',
        mode: 'seeded',
        groupsCount: 2,
        matchesCount: 12,
      });

      expect(entry.action).toBe('DRAW_EXECUTED');
      expect(entry.entityType).toBe('draw');
      expect(entry.details).toContain('modo: seeded, 2 grupos, 12 confrontos');
    });
  });

  describe('4. Persistência e Filtros Relacionais', () => {
    it('permite consultar e filtrar logs por competição, entidade e tipo', async () => {
      await OperationalAuditService.recordEvent({
        user: 'user1',
        action: 'MATCH_HOMOLOGATED',
        entityType: 'match',
        entityId: 'match-1',
        competitionId: 'comp-A',
        details: 'Jogo 1 de comp A',
      });

      await OperationalAuditService.recordEvent({
        user: 'user2',
        action: 'MATCH_HOMOLOGATED',
        entityType: 'match',
        entityId: 'match-2',
        competitionId: 'comp-B',
        details: 'Jogo 2 de comp B',
      });

      await OperationalAuditService.recordEvent({
        user: 'user3',
        action: 'DRAW_EXECUTED',
        entityType: 'draw',
        entityId: 'draw-A',
        competitionId: 'comp-A',
        details: 'Sorteio comp A',
      });

      // Filtro por competição
      const compALogs = await OperationalAuditService.listAuditLogs({ competitionId: 'comp-A' });
      expect(compALogs).toHaveLength(2);
      expect(compALogs.every((l) => l.competitionId === 'comp-A')).toBe(true);

      // Filtro por tipo de entidade
      const matchLogs = await OperationalAuditService.listAuditLogs({ entityType: 'match' });
      expect(matchLogs).toHaveLength(2);

      // Filtro por entityId específico
      const match1Logs = await OperationalAuditService.listAuditLogs({ entityId: 'match-1' });
      expect(match1Logs).toHaveLength(1);
      expect(match1Logs[0].entityId).toBe('match-1');
    });

    it('mantém sincronismo com o AuditService legado para exibição imediata em SettingsPage', async () => {
      await OperationalAuditService.recordEvent({
        user: 'admin@voleipro.app',
        action: 'COMPETITION_STATUS_CHANGED',
        entityType: 'competition',
        entityId: mockComp.id,
        competitionId: mockComp.id,
        details: 'Competição encerrada com sucesso',
      });

      const legacyLogs = AuditService.getLogs();
      const found = legacyLogs.find((l) => l.details?.includes('Competição encerrada com sucesso'));
      expect(found).toBeDefined();
      expect(found?.user).toBe('admin@voleipro.app');
    });
  });
});
