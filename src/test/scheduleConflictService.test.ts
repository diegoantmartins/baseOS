import { describe, it, expect } from 'vitest';
import { detectScheduleConflicts } from '@/services/scheduleConflictService';
import type { CompetitionRecord, MatchRecord, VenueRecord } from '@/types/entities';

const mockCompetition: CompetitionRecord = {
  id: 'comp-1',
  name: 'Copa Toledo',
  modality: 'indoor',
  format: 'round-robin',
  playerFormat: '6x6',
  setFormat: '3-sets',
  genderCategory: 'male',
  defaultMatchIntervalMinutes: 75,
  minTeamRestMinutes: 30,
  status: 'in-progress',
};

const mockVenues: VenueRecord[] = [
  {
    id: 'v-1',
    name: 'Ginásio UNIPAR',
    courts: ['Quadra 1', 'Quadra 2'],
    courtDetails: [
      { id: 'c1', name: 'Quadra 1', status: 'active' },
      { id: 'c2', name: 'Quadra 2', status: 'blocked', notes: 'Reforma do piso' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const existingMatch: MatchRecord = {
  id: 'match-1',
  competitionId: 'comp-1',
  round: 1,
  matchNumber: 1,
  teamAId: 'team-1',
  teamBId: 'team-2',
  teamAName: 'Osasco',
  teamBName: 'Minas',
  teamAShortName: 'OSA',
  teamBShortName: 'MIN',
  venue: 'Ginásio UNIPAR',
  court: 'Quadra 1',
  scheduledTime: '2026-09-01T14:00:00',
  status: 'scheduled',
  sets: [],
  referees: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('scheduleConflictService', () => {
  it('detecta conflito de mesma quadra no mesmo horário (severidade: error)', () => {
    const conflicts = detectScheduleConflicts({
      matchId: 'match-2',
      scheduledTime: '2026-09-01T14:00:00',
      venueName: 'Ginásio UNIPAR',
      courtName: 'Quadra 1',
      teamAId: 'team-3',
      teamBId: 'team-4',
      competition: mockCompetition,
      allMatches: [existingMatch],
      venues: mockVenues,
    });

    expect(conflicts.length).toBe(1);
    expect(conflicts[0].severity).toBe('error');
    expect(conflicts[0].type).toBe('court_overlap');
  });

  it('detecta aviso de quadra quando o intervalo é menor que a duração estimada da partida', () => {
    const conflicts = detectScheduleConflicts({
      matchId: 'match-2',
      scheduledTime: '2026-09-01T14:30:00', // 30 min depois (jogo estimado 75 min)
      venueName: 'Ginásio UNIPAR',
      courtName: 'Quadra 1',
      teamAId: 'team-3',
      teamBId: 'team-4',
      competition: mockCompetition,
      allMatches: [existingMatch],
      venues: mockVenues,
    });

    expect(conflicts.length).toBe(1);
    expect(conflicts[0].severity).toBe('warning');
    expect(conflicts[0].type).toBe('court_overlap');
  });

  it('detecta conflito de mesma equipe jogando simultaneamente (severidade: error)', () => {
    const conflicts = detectScheduleConflicts({
      matchId: 'match-2',
      scheduledTime: '2026-09-01T14:00:00',
      venueName: 'Ginásio UNIPAR',
      courtName: 'Quadra 2', // Quadra diferente, mas equipe 1 joga
      teamAId: 'team-1',
      teamBId: 'team-3',
      competition: mockCompetition,
      allMatches: [existingMatch],
      venues: mockVenues,
    });

    const teamOverlap = conflicts.find(c => c.type === 'team_overlap');
    expect(teamOverlap).toBeDefined();
    expect(teamOverlap?.severity).toBe('error');
  });

  it('detecta violação de descanso mínimo entre jogos da mesma equipe', () => {
    const conflicts = detectScheduleConflicts({
      matchId: 'match-2',
      scheduledTime: '2026-09-01T15:30:00', // 90 min depois (75 min jogo + 30 min descanso = 105 min necessário)
      venueName: 'Ginásio UNIPAR',
      courtName: 'Quadra 1',
      teamAId: 'team-1',
      teamBId: 'team-3',
      competition: mockCompetition,
      allMatches: [existingMatch],
      venues: mockVenues,
    });

    const restWarning = conflicts.find(c => c.type === 'team_rest_time');
    expect(restWarning).toBeDefined();
    expect(restWarning?.severity).toBe('warning');
  });

  it('detecta tentativa de agendamento em quadra bloqueada / em manutenção', () => {
    const conflicts = detectScheduleConflicts({
      matchId: 'match-2',
      scheduledTime: '2026-09-01T18:00:00',
      venueName: 'Ginásio UNIPAR',
      courtName: 'Quadra 2', // Marcada como blocked
      teamAId: 'team-3',
      teamBId: 'team-4',
      competition: mockCompetition,
      allMatches: [existingMatch],
      venues: mockVenues,
    });

    const courtBlocked = conflicts.find(c => c.type === 'court_unavailable');
    expect(courtBlocked).toBeDefined();
    expect(courtBlocked?.severity).toBe('error');
  });
});
