import { describe, it, expect, beforeEach } from 'vitest';
import { dataAccess } from '@/services/dataAccess';
import type { MatchRecord } from '@/types/entities';

describe('Fase 12 — Idempotência e Concorrência', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deve lidar com múltiplas finalizações concorrentes da mesma partida de forma segura e consistente', async () => {
    const competitions = await dataAccess.listCompetitions();
    const compId = competitions[0]?.id || 'comp-1';
    const teams = await dataAccess.listTeams();

    const match = await dataAccess.createMatch({
      competitionId: compId,
      round: 1,
      matchNumber: 10,
      teamAId: teams[0]?.id || 'team-1',
      teamBId: teams[1]?.id || 'team-2',
      teamAName: teams[0]?.name || 'Time A',
      teamBName: teams[1]?.name || 'Time B',
      teamAShortName: 'TMA',
      teamBShortName: 'TMB',
      venue: 'Arena Principal',
      scheduledTime: '2026-08-25T14:00:00Z',
      status: 'in-progress',
      sets: [],
      referees: [],
    });

    const finishPayload: Partial<MatchRecord> = {
      status: 'completed',
      winnerId: teams[0]?.id,
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 20 },
        { setNumber: 2, scoreA: 25, scoreB: 22 },
        { setNumber: 3, scoreA: 25, scoreB: 18 },
      ],
    };

    // Simula 10 requisições simultâneas de finalização da mesma partida
    const concurrentRequests = Array.from({ length: 10 }, () =>
      dataAccess.updateMatch(match.id, finishPayload),
    );

    const results = await Promise.all(concurrentRequests);

    // Todas devem retornar sucesso com estado final consistente
    for (const res of results) {
      expect(res.status).toBe('completed');
      expect(res.winnerId).toBe(teams[0]?.id);
      expect(res.sets.length).toBe(3);
    }

    // O estado persistido final deve ser idêntico e consistente
    const finalMatch = await dataAccess.getMatch(match.id);
    expect(finalMatch?.status).toBe('completed');
    expect(finalMatch?.winnerId).toBe(teams[0]?.id);
    expect(finalMatch?.sets.length).toBe(3);
  });
});
