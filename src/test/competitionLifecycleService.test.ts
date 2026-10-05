import { describe, it, expect } from 'vitest';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';

describe('Fase 2 — CompetitionLifecycleService (Travas e Ciclo de Vida)', () => {
  const baseCompetition: CompetitionRecord = {
    id: 'comp-1',
    name: 'Copa Estadual 2026',
    modality: 'indoor',
    format: 'groups_and_playoffs',
    playerFormat: '6x6',
    setFormat: 'best-of-5',
    genderCategory: 'male',
    status: 'draft',
    groupsCount: 2,
    teamsPerGroup: 4,
    advancingPerGroup: 2,
  };

  const sampleTeams: TeamRecord[] = [
    { id: 'team-1', name: 'Clube A', shortName: 'CLA', modality: 'indoor', createdAt: '', updatedAt: '' },
    { id: 'team-2', name: 'Clube B', shortName: 'CLB', modality: 'indoor', createdAt: '', updatedAt: '' },
    { id: 'team-3', name: 'Clube C', shortName: 'CLC', modality: 'indoor', createdAt: '', updatedAt: '' },
    { id: 'team-4', name: 'Clube D', shortName: 'CLD', modality: 'indoor', createdAt: '', updatedAt: '' },
  ];

  const groupMatches: MatchRecord[] = [
    {
      id: 'm-1',
      competitionId: 'comp-1',
      round: 1,
      matchNumber: 1,
      phase: 'group-stage',
      teamAId: 'team-1',
      teamBId: 'team-2',
      teamAName: 'Clube A',
      teamBName: 'Clube B',
      teamAShortName: 'CLA',
      teamBShortName: 'CLB',
      venue: 'Ginásio Central',
      scheduledTime: '2026-08-30T10:00:00Z',
      status: 'scheduled',
      sets: [],
      referees: [],
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'm-2',
      competitionId: 'comp-1',
      round: 1,
      matchNumber: 2,
      phase: 'group-stage',
      teamAId: 'team-3',
      teamBId: 'team-4',
      teamAName: 'Clube C',
      teamBName: 'Clube D',
      teamAShortName: 'CLC',
      teamBShortName: 'CLD',
      venue: 'Ginásio Central',
      scheduledTime: '2026-08-30T12:00:00Z',
      status: 'scheduled',
      sets: [],
      referees: [],
      createdAt: '',
      updatedAt: '',
    },
  ];

  describe('Validação: Abertura de Inscrições (registration-open)', () => {
    it('deve permitir abertura quando nome e formato estiverem válidos', () => {
      const result = CompetitionLifecycleService.validateTransition(baseCompetition, 'registration-open');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve bloquear se a competição não tiver nome', () => {
      const invalid = { ...baseCompetition, name: '' };
      const result = CompetitionLifecycleService.validateTransition(invalid, 'registration-open');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('nome válido');
    });
  });

  describe('Validação: Encerramento de Inscrições (registration-closed)', () => {
    it('deve permitir fechamento administrativo mesmo sem o número mínimo de equipes para os grupos (Blocker 07: Fechamento ≠ Draw)', () => {
      // 2 grupos * 2 = 4 equipes para sorteio, mas o fechamento de inscrições é administrativo
      const result = CompetitionLifecycleService.validateTransition(
        { ...baseCompetition, status: 'registration-open' },
        'registration-closed',
        { teams: sampleTeams.slice(0, 2) }
      );
      expect(result.valid).toBe(true);
    });

    it('deve permitir encerramento quando houver equipes suficientes', () => {
      const result = CompetitionLifecycleService.validateTransition(
        { ...baseCompetition, status: 'registration-open' },
        'registration-closed',
        { teams: sampleTeams }
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('emite aviso ao fechar com zero equipes', () => {
      const result = CompetitionLifecycleService.validateTransition(
        { ...baseCompetition, status: 'registration-open' },
        'registration-closed',
        { teams: [] }
      );
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.toLowerCase().includes('nenhuma equipe'))).toBe(true);
    });
  });

  describe('Validação: Início dos Jogos (in-progress)', () => {
    it('deve bloquear início de jogos se nenhuma partida tiver sido gerada na tabela', () => {
      const result = CompetitionLifecycleService.validateTransition(
        { ...baseCompetition, status: 'draw-pending' },
        'in-progress',
        { teams: sampleTeams, matches: [] }
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('sem confrontos cadastrados');
    });

    it('deve permitir início de jogos quando houver partidas geradas', () => {
      const result = CompetitionLifecycleService.validateTransition(
        { ...baseCompetition, status: 'draw-pending' },
        'in-progress',
        { teams: sampleTeams, matches: groupMatches }
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Validação: Avanço para Playoffs (playoffs)', () => {
    it('deve bloquear avanço para playoffs se houver jogos da fase de grupos pendentes', () => {
      const result = CompetitionLifecycleService.validateTransition(
        { ...baseCompetition, status: 'in-progress' },
        'playoffs',
        { teams: sampleTeams, matches: groupMatches }
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('restam 2 jogos da fase inicial sem resultado homologado');
    });

    it('deve permitir avanço para playoffs quando todos os jogos da fase de grupos estiverem concluídos/homologados', () => {
      const completedGroupMatches: MatchRecord[] = groupMatches.map(m => ({
        ...m,
        status: 'homologated' as const,
      }));

      const result = CompetitionLifecycleService.validateTransition(
        { ...baseCompetition, status: 'in-progress' },
        'playoffs',
        { teams: sampleTeams, matches: completedGroupMatches }
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Validação: Finalização do Torneio (completed)', () => {
    it('deve bloquear finalização se houver partidas pendentes', () => {
      const result = CompetitionLifecycleService.validateTransition(
        { ...baseCompetition, status: 'playoffs' },
        'completed',
        { teams: sampleTeams, matches: groupMatches }
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('existem 2 partidas em aberto');
    });

    it('deve permitir finalização quando todas as partidas estiverem homologadas e campeão definido', () => {
      const allHomologated: MatchRecord[] = groupMatches.map(m => ({
        ...m,
        status: 'homologated' as const,
      }));

      const result = CompetitionLifecycleService.validateTransition(
        { ...baseCompetition, status: 'playoffs', championTeamId: 'team-1' },
        'completed',
        { teams: sampleTeams, matches: allHomologated, championTeamId: 'team-1' }
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Próximos Status Recomendados', () => {
    it('deve encadear o ciclo natural de forma sequencial', () => {
      expect(CompetitionLifecycleService.getNextRecommendedStatus('draft')).toBe('registration-open');
      expect(CompetitionLifecycleService.getNextRecommendedStatus('planning')).toBe('registration-open');
      expect(CompetitionLifecycleService.getNextRecommendedStatus('registration-open')).toBe('registration-closed');
      expect(CompetitionLifecycleService.getNextRecommendedStatus('registration-closed')).toBe('draw-pending');
      expect(CompetitionLifecycleService.getNextRecommendedStatus('draw-pending')).toBe('in-progress');
      expect(CompetitionLifecycleService.getNextRecommendedStatus('in-progress')).toBe('playoffs');
      expect(CompetitionLifecycleService.getNextRecommendedStatus('playoffs')).toBe('completed');
    });
  });

  describe('Fase 4.4 — Decisões Canônicas de Ciclo de Vida', () => {
    it('canEditCompetition: bloqueia apenas torneios finalizados ou cancelados', () => {
      expect(CompetitionLifecycleService.canEditCompetition({ ...baseCompetition, status: 'planning' })).toBe(true);
      expect(CompetitionLifecycleService.canEditCompetition({ ...baseCompetition, status: 'in-progress' })).toBe(true);
      expect(CompetitionLifecycleService.canEditCompetition({ ...baseCompetition, status: 'completed' })).toBe(false);
      expect(CompetitionLifecycleService.canEditCompetition({ ...baseCompetition, status: 'cancelled' })).toBe(false);
    });

    it('canEditRules: permite em planning sem partidas e bloqueia após início ou congelamento', () => {
      // 1. Permitido em planning com 0 partidas
      expect(CompetitionLifecycleService.canEditRules({ ...baseCompetition, status: 'planning' }, 0)).toBe(true);

      // 2. Bloqueado se status for in-progress, playoffs, completed ou cancelled
      expect(CompetitionLifecycleService.canEditRules({ ...baseCompetition, status: 'in-progress' }, 0)).toBe(false);
      expect(CompetitionLifecycleService.canEditRules({ ...baseCompetition, status: 'playoffs' }, 0)).toBe(false);
      expect(CompetitionLifecycleService.canEditRules({ ...baseCompetition, status: 'completed' }, 0)).toBe(false);
      expect(CompetitionLifecycleService.canEditRules({ ...baseCompetition, status: 'cancelled' }, 0)).toBe(false);

      // 3. Bloqueado se já possuir partidas jogadas mesmo em planning
      expect(CompetitionLifecycleService.canEditRules({ ...baseCompetition, status: 'planning' }, 1)).toBe(false);
      expect(CompetitionLifecycleService.canEditRules({ ...baseCompetition, status: 'planning' }, groupMatches)).toBe(false);

      // 4. Bloqueado incondicionalmente se já possuir rulesSnapshot
      const compWithSnapshot: CompetitionRecord = {
        ...baseCompetition,
        status: 'planning',
        rulesSnapshot: {
          version: 1,
          format: { defaultSetsToWin: 2, setRules: { regularSetPoints: 25, tiebreakPoints: 15, minAdvantage: 2 } },
          scoring: { systemType: 'fivb-standard', pointsWinClear: 3, pointsWinNarrow: 2, pointsLossNarrow: 1, pointsLossClear: 0, pointsWoWin: 3, pointsWoLoss: 0 },
          standings: { tiebreakCriteriaOrder: ['points'], advancingPerGroup: 2 },
          registration: { minAthletes: 6, maxAthletes: 14, maxCaptains: 1, maxLiberos: 2, requireJerseyNumberOnRegistration: false },
        },
      };
      expect(CompetitionLifecycleService.canEditRules(compWithSnapshot, 0)).toBe(false);
    });

    it('canCreateMatch: permite agendar partidas apenas antes de finalizado ou cancelado', () => {
      expect(CompetitionLifecycleService.canCreateMatch({ ...baseCompetition, status: 'planning' })).toBe(true);
      expect(CompetitionLifecycleService.canCreateMatch({ ...baseCompetition, status: 'in-progress' })).toBe(true);
      expect(CompetitionLifecycleService.canCreateMatch({ ...baseCompetition, status: 'completed' })).toBe(false);
      expect(CompetitionLifecycleService.canCreateMatch({ ...baseCompetition, status: 'cancelled' })).toBe(false);
    });

    it('canRecordResult: bloqueia resultados em competições finalizadas ou canceladas', () => {
      expect(CompetitionLifecycleService.canRecordResult({ ...baseCompetition, status: 'in-progress' }, groupMatches[0])).toBe(true);
      expect(CompetitionLifecycleService.canRecordResult({ ...baseCompetition, status: 'completed' }, groupMatches[0])).toBe(false);
      expect(CompetitionLifecycleService.canRecordResult({ ...baseCompetition, status: 'cancelled' }, groupMatches[0])).toBe(false);

      // Bloqueia se a partida em si já estiver homologada ou cancelada
      const homologatedMatch = { ...groupMatches[0], status: 'homologated' as const };
      expect(CompetitionLifecycleService.canRecordResult({ ...baseCompetition, status: 'in-progress' }, homologatedMatch)).toBe(false);
    });

    it('canCancelCompetition: permite cancelamento de competições ativas e impede em finalizadas', () => {
      expect(CompetitionLifecycleService.canCancelCompetition({ ...baseCompetition, status: 'planning' })).toBe(true);
      expect(CompetitionLifecycleService.canCancelCompetition({ ...baseCompetition, status: 'in-progress' })).toBe(true);
      expect(CompetitionLifecycleService.canCancelCompetition({ ...baseCompetition, status: 'completed' })).toBe(false);
      expect(CompetitionLifecycleService.canCancelCompetition({ ...baseCompetition, status: 'cancelled' })).toBe(false);
    });
  });

  describe('Fase 4.4 — Idempotência e Imutabilidade de rulesSnapshot', () => {
    it('cria rulesSnapshot imutável quando a competição ainda não possui', () => {
      const comp: CompetitionRecord = {
        ...baseCompetition,
        setFormat: '3-sets',
        rulesSnapshot: undefined,
      };

      const frozen = CompetitionLifecycleService.freezeRulesSnapshot(comp);
      expect(frozen.rulesSnapshot).toBeDefined();
      expect(frozen.rulesSnapshot?.format.defaultSetsToWin).toBe(2);
      expect(frozen.rulesSnapshot?.format.setRules.regularSetPoints).toBe(25);
    });

    it('preserva incondicionalmente snapshot preexistente sem sobrescrever (idempotência)', () => {
      const originalSnapshot = {
        version: 1 as const,
        format: { defaultSetsToWin: 3 as const, maxSets: 5, setRules: { regularSetPoints: 25, tiebreakPoints: 15, minAdvantage: 2 } },
        scoring: { systemType: 'fivb-standard' as const, pointsWinClear: 3, pointsWinNarrow: 2, pointsLossNarrow: 1, pointsLossClear: 0, pointsWoWin: 3, pointsWoLoss: 0 },
        standings: { tiebreakCriteriaOrder: ['points' as const], advancingPerGroup: 2 },
        registration: { minAthletes: 6, maxAthletes: 14, maxCaptains: 1, maxLiberos: 2, requireJerseyNumberOnRegistration: false },
      };

      const compWithExistingSnapshot: CompetitionRecord = {
        ...baseCompetition,
        setFormat: '1-set', // Alteração na prop externa não afeta o snapshot existente
        rulesSnapshot: originalSnapshot,
      };

      const frozenAgain = CompetitionLifecycleService.freezeRulesSnapshot(compWithExistingSnapshot);
      // O snapshot deve ser exatamente o original de 3 sets (melhor de 5), e não o novo de 1 set
      expect(frozenAgain.rulesSnapshot).toBe(originalSnapshot);
      expect(frozenAgain.rulesSnapshot?.format.defaultSetsToWin).toBe(3);
    });
  });
});

