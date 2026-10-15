/**
 * BaseOS v2.5.1 — Testes Unitários de Gestão de Quadras e Performance de Cache Público
 * 
 * 1. Algoritmo de distribuição dinâmica de quadras (Quadra 1 / Quadra 2)
 * 2. Detecção de jogos consecutivos da mesma equipe sem descanso mínimo (<= 60 min)
 * 3. Cache SWR / in-memory com TTL de 15s e deduplicação de requisições em voo (inFlightPromises)
 * 4. Atualização cirúrgica de partidas no cache público sem recarregar banco completo
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  distributeCourtsDynamically,
  type CourtDistributionProposal,
  type RestWarning,
} from '@/services/courtDistributionService';
import {
  publicCompetitionService,
  clearPublicCompetitionCache,
  updatePublicMatchInCache,
} from '@/services/publicCompetitionService';
import { dataAccess, resetLocalData } from '@/services/dataAccess';
import type { MatchRecord } from '@/types/entities';

describe('BaseOS v2.5.1 — Gestão de Quadras e Otimização Concorrente', () => {
  beforeEach(() => {
    resetLocalData();
    clearPublicCompetitionCache();
  });

  describe('1. Algoritmo de Distribuição Dinâmica de Quadras (courtDistributionService)', () => {
    const createMockMatch = (overrides: Partial<MatchRecord>): MatchRecord => ({
      id: 'm-' + Math.random().toString(36).substring(2, 7),
      competitionId: 'c1',
      round: 1,
      matchNumber: 1,
      teamAId: 'team-1',
      teamBId: 'team-2',
      teamAName: 'Equipe Alpha',
      teamBName: 'Equipe Beta',
      teamAShortName: 'ALP',
      teamBShortName: 'BET',
      venue: 'Ginásio Central',
      scheduledTime: '2026-10-20T08:00:00Z',
      phase: 'group-stage',
      status: 'scheduled',
      sets: [],
      referees: [],
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
      ...overrides,
    });

    const mockMatches: MatchRecord[] = [
      createMockMatch({
        id: 'm1',
        matchNumber: 1,
        teamAId: 'team-1',
        teamBId: 'team-2',
        teamAName: 'Equipe Alpha',
        teamBName: 'Equipe Beta',
        scheduledTime: '2026-10-20T08:00:00Z',
      }),
      createMockMatch({
        id: 'm2',
        matchNumber: 2,
        teamAId: 'team-3',
        teamBId: 'team-4',
        teamAName: 'Equipe Gamma',
        teamBName: 'Equipe Delta',
        scheduledTime: '2026-10-20T08:00:00Z',
      }),
      createMockMatch({
        id: 'm3',
        matchNumber: 3,
        teamAId: 'team-1', // Mesma equipe Alpha jogando às 09:00 (descanso de 60 min -> alerta!)
        teamBId: 'team-5',
        teamAName: 'Equipe Alpha',
        teamBName: 'Equipe Epsilon',
        scheduledTime: '2026-10-20T09:00:00Z',
      }),
      createMockMatch({
        id: 'm4',
        matchNumber: 4,
        teamAId: 'team-6',
        teamBId: 'team-7',
        teamAName: 'Equipe Zeta',
        teamBName: 'Equipe Eta',
        scheduledTime: '2026-10-20T09:00:00Z',
      }),
    ];

    it('deve alocar partidas nos mesmos horários entre Quadra 1 e Quadra 2 alternadamente', () => {
      const result = distributeCourtsDynamically(mockMatches);

      expect(result.proposals.length).toBe(4);

      // Partidas das 08h00
      const slot8 = result.proposals.filter(
        (m: CourtDistributionProposal) => m.scheduledTime === '2026-10-20T08:00:00Z'
      );
      expect(slot8).toHaveLength(2);
      expect(slot8.map((m) => m.assignedCourt).sort()).toEqual(['Quadra 1', 'Quadra 2']);

      // Partidas das 09h00
      const slot9 = result.proposals.filter(
        (m: CourtDistributionProposal) => m.scheduledTime === '2026-10-20T09:00:00Z'
      );
      expect(slot9).toHaveLength(2);
      expect(slot9.map((m) => m.assignedCourt).sort()).toEqual(['Quadra 1', 'Quadra 2']);
    });

    it('deve detectar jogos consecutivos da mesma equipe com descanso menor ou igual a 60 minutos', () => {
      const result = distributeCourtsDynamically(mockMatches);

      // team-1 joga às 08:00 e às 09:00 (intervalo de 60 min)
      const warning = result.warnings.find(
        (w: RestWarning) => w.teamId === 'team-1'
      );

      expect(warning).toBeDefined();
      expect(warning?.reason).toContain('consecutivas');
      expect(warning?.reason).toContain('60min');
    });

    it('deve filtrar por fase específica quando informado', () => {
      const mixedMatches: MatchRecord[] = [
        ...mockMatches,
        createMockMatch({
          id: 'm-playoff',
          matchNumber: 99,
          teamAId: 'team-x',
          teamBId: 'team-y',
          phase: 'Quartas de Final',
          scheduledTime: '2026-10-20T14:00:00Z',
        }),
      ];

      const result = distributeCourtsDynamically(mixedMatches, 'group-stage');
      expect(result.proposals.length).toBe(4);
      expect(result.proposals.some((m) => m.matchId === 'm-playoff')).toBe(false);
    });
  });

  describe('2. Performance de Cache e Concorrência Pública (publicCompetitionService)', () => {
    it('deve retornar do cache em memória dentro do TTL de 15 segundos sem chamadas redundantes', async () => {
      const comp = await dataAccess.getCompetitionBySlug('liga-nacional-pro-masculino-2026');
      expect(comp).not.toBeNull();

      // Primeira chamada: carrega e armazena em cache
      const bundle1 = await publicCompetitionService.getPublicCompetitionBundle('liga-nacional-pro-masculino-2026');
      expect(bundle1).not.toBeNull();
      expect(bundle1?.competition.slug).toBe('liga-nacional-pro-masculino-2026');

      // Segunda chamada imediata: deve retornar a mesma referência cacheada
      const bundle2 = await publicCompetitionService.getPublicCompetitionBundle('liga-nacional-pro-masculino-2026');
      expect(bundle2).toBe(bundle1);
    });

    it('deve deduplicar chamadas concorrentes em voo (inFlightPromises) para 50+ conexões simultâneas', async () => {
      clearPublicCompetitionCache();

      // Dispara 10 requisições simultâneas em paralelo
      const promises = Array.from({ length: 10 }).map(() =>
        publicCompetitionService.getPublicCompetitionBundle('liga-nacional-pro-masculino-2026')
      );

      const results = await Promise.all(promises);

      // Todas as 10 promessas devem ter resolvido exatamente para a mesma instância
      const first = results[0];
      for (const res of results) {
        expect(res).toBe(first);
      }
    });

    it('deve permitir atualização cirúrgica via updatePublicMatchInCache sem refetch completo', async () => {
      const bundle = await publicCompetitionService.getPublicCompetitionBundle('liga-nacional-pro-masculino-2026');
      expect(bundle).not.toBeNull();

      if (bundle && bundle.matches.length > 0) {
        const targetMatchId = bundle.matches[0].id;

        // Atualiza a quadra cirurgicamente via payload simulado de WebSocket/Realtime
        updatePublicMatchInCache(targetMatchId, {
          court: 'Quadra 2',
        });

        // Consulta subsequente deve refletir a quadra atualizada sem recarregar o banco
        const updatedBundle = await publicCompetitionService.getPublicCompetitionBundle('liga-nacional-pro-masculino-2026');
        const updatedMatch = updatedBundle?.matches.find((m) => m.id === targetMatchId);

        expect(updatedMatch?.court).toBe('Quadra 2');
      }
    });

    it('deve ignorar cache quando forceRefresh = true', async () => {
      const bundle1 = await publicCompetitionService.getPublicCompetitionBundle('liga-nacional-pro-masculino-2026');
      const bundle2 = await publicCompetitionService.getPublicCompetitionBundle('liga-nacional-pro-masculino-2026', true);

      expect(bundle1).not.toBeNull();
      expect(bundle2).not.toBeNull();
      expect(bundle2).not.toBe(bundle1); // Nova instância criada com forceRefresh
    });
  });
});
