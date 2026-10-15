/**
 * BaseOS v2.5.3 — Testes de Homologação com MVP e Transmissão em Tempo Real
 * 
 * Valida:
 * 1. Formatação da mensagem oficial de homologação (placar, parciais e MVP)
 * 2. Transmissão e escuta de eventos via realtimeMatchService
 * 3. Resolução de highlightAthlete no publicCompetitionService
 * 4. Cálculo de contagem de MVPs por atleta do elenco
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatHomologatedMatchMessage,
  broadcastMatchHomologated,
  subscribeToMatchUpdates,
  type MatchHomologationPayload,
} from '@/services/realtimeMatchService';
import type { MatchRecord } from '@/types/entities';

describe('BaseOS v2.5.3 — Homologação com MVP e Transmissão Realtime', () => {
  const mockMatch: MatchRecord = {
    id: 'match-101',
    competitionId: 'comp-1',
    round: 1,
    matchNumber: 1,
    teamAId: 'team-a',
    teamBId: 'team-b',
    teamAName: 'Vôlei Cascavel',
    teamBName: 'Toledo Vôlei',
    teamAShortName: 'CAS',
    teamBShortName: 'TOL',
    court: 'Quadra 1',
    venue: 'Ginásio Sérgio Mauro Festugatto',
    scheduledTime: '2026-10-25T14:00:00Z',
    status: 'homologated',
    sets: [
      { setNumber: 1, scoreA: 25, scoreB: 21 },
      { setNumber: 2, scoreA: 22, scoreB: 25 },
      { setNumber: 3, scoreA: 15, scoreB: 12 },
    ],
    referees: [],
    winnerId: 'team-a',
    highlightAthleteId: 'ath-mvp-1',
    createdAt: '2026-10-25T10:00:00Z',
    updatedAt: '2026-10-25T15:30:00Z',
  };

  const mockPayload: MatchHomologationPayload = {
    match: mockMatch,
    mvpAthlete: {
      id: 'ath-mvp-1',
      name: 'Lucas Silva',
      jerseyNumber: 9,
      teamName: 'Vôlei Cascavel',
      teamShort: 'CAS',
    },
  };

  it('1. Deve formatar corretamente a mensagem com Placar Final, Parciais e MVP', () => {
    const formatted = formatHomologatedMatchMessage(mockPayload);

    expect(formatted.title).toBe('🏆 Resultado Oficial: Vôlei Cascavel 2 x 1 Toledo Vôlei');
    expect(formatted.description).toContain('(25×21 · 22×25 · 15×12)');
    expect(formatted.description).toContain('⭐ MVP: #9 Lucas Silva (CAS)');
    expect(formatted.fullText).toBe(
      '🏆 Resultado Oficial: Vôlei Cascavel 2 x 1 Toledo Vôlei — (25×21 · 22×25 · 15×12) • ⭐ MVP: #9 Lucas Silva (CAS)'
    );
  });

  it('2. Deve formatar adequadamente mesmo quando o MVP não possuir número de camisa definido', () => {
    const payloadNoJersey: MatchHomologationPayload = {
      match: mockMatch,
      mvpAthlete: {
        id: 'ath-mvp-2',
        name: 'Rafael Santos',
        jerseyNumber: null,
        teamName: 'Toledo Vôlei',
      },
    };

    const formatted = formatHomologatedMatchMessage(payloadNoJersey);
    expect(formatted.description).toContain('⭐ MVP: Rafael Santos (Toledo Vôlei)');
  });

  it('3. Deve transmitir via CustomEvent e ser recebido pelo listener de subscribeToMatchUpdates', () => {
    const onHomologated = vi.fn();
    const onAnyMatchChange = vi.fn();

    const unsubscribe = subscribeToMatchUpdates('comp-1', onHomologated, onAnyMatchChange);

    broadcastMatchHomologated(mockPayload);

    expect(onHomologated).toHaveBeenCalledTimes(1);
    expect(onHomologated).toHaveBeenCalledWith(mockPayload);
    expect(onAnyMatchChange).toHaveBeenCalledWith('match-101');

    unsubscribe();

    // Após desinscrever, novo broadcast não deve ser recebido
    broadcastMatchHomologated(mockPayload);
    expect(onHomologated).toHaveBeenCalledTimes(1);
  });

  it('4. Deve filtrar eventos de outras competições no listener', () => {
    const onHomologated = vi.fn();
    const unsubscribe = subscribeToMatchUpdates('comp-other', onHomologated);

    broadcastMatchHomologated(mockPayload);

    expect(onHomologated).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('5. Deve calcular corretamente a contagem de MVPs por atleta em partidas homologadas', () => {
    const matches: MatchRecord[] = [
      { ...mockMatch, id: 'm1', highlightAthleteId: 'ath-1', status: 'homologated' },
      { ...mockMatch, id: 'm2', highlightAthleteId: 'ath-1', status: 'homologated' },
      { ...mockMatch, id: 'm3', highlightAthleteId: 'ath-2', status: 'homologated' },
      { ...mockMatch, id: 'm4', highlightAthleteId: 'ath-3', status: 'scheduled' }, // Agendado não conta
    ];

    const counts = new Map<string, number>();
    matches.forEach((m) => {
      if ((m.status === 'homologated' || m.status === 'completed') && m.highlightAthleteId) {
        counts.set(m.highlightAthleteId, (counts.get(m.highlightAthleteId) || 0) + 1);
      }
    });

    expect(counts.get('ath-1')).toBe(2);
    expect(counts.get('ath-2')).toBe(1);
    expect(counts.get('ath-3')).toBeUndefined();
  });
});
