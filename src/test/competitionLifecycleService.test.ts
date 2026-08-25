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
    it('deve bloquear se não houver o número mínimo de equipes para os grupos', () => {
      // 2 grupos * 2 = 4 equipes necessárias, passando apenas 2 equipes
      const result = CompetitionLifecycleService.validateTransition(
        { ...baseCompetition, status: 'registration-open' },
        'registration-closed',
        { teams: sampleTeams.slice(0, 2) }
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('mínimo de 4 equipes');
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
      expect(result.errors[0]).toContain('restam 2 jogos da fase de grupos sem resultado');
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
      expect(CompetitionLifecycleService.getNextRecommendedStatus('registration-open')).toBe('registration-closed');
      expect(CompetitionLifecycleService.getNextRecommendedStatus('registration-closed')).toBe('draw-pending');
      expect(CompetitionLifecycleService.getNextRecommendedStatus('draw-pending')).toBe('in-progress');
      expect(CompetitionLifecycleService.getNextRecommendedStatus('in-progress')).toBe('playoffs');
      expect(CompetitionLifecycleService.getNextRecommendedStatus('playoffs')).toBe('completed');
    });
  });
});
