import { describe, it, expect } from 'vitest';
import { MatchCheckinService } from '@/services/matchCheckinService';
import { RefereeAssignmentService } from '@/services/refereeAssignmentService';
import type { CompetitionAthlete } from '@/types/registration';
import type { CompetitionRecord, MatchRecord, MatchRefereeRecord } from '@/types/entities';

describe('Fase 4 — Check-in Presencial e Escalação de Arbitragem', () => {
  const indoorComp: CompetitionRecord = {
    id: 'comp-indoor',
    name: 'Campeonato Paulista Indoor',
    modality: 'indoor',
    format: 'groups_and_playoffs',
    playerFormat: '6x6',
    setFormat: 'best-of-5',
    genderCategory: 'female',
    status: 'in-progress',
  };

  const beachComp: CompetitionRecord = {
    id: 'comp-beach',
    name: 'Circuito Praiano',
    modality: 'beach',
    format: 'groups_and_playoffs',
    playerFormat: '2x2',
    setFormat: 'best-of-3',
    genderCategory: 'male',
    status: 'in-progress',
  };

  const createMockAthlete = (partial: Partial<CompetitionAthlete> & { id: string; competitionTeamId: string; name: string }): CompetitionAthlete => ({
    jerseyNumber: 1,
    position: 'Ponteiro',
    isCaptain: false,
    isLibero: false,
    gender: 'female',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  });

  const athletesTeamA: CompetitionAthlete[] = [
    createMockAthlete({ id: 'ath-1', competitionTeamId: 'ct-1', name: 'Ana Silva', jerseyNumber: 1, isCaptain: true, position: 'Levantador' }),
    createMockAthlete({ id: 'ath-2', competitionTeamId: 'ct-1', name: 'Bia Santos', jerseyNumber: 2, isLibero: true, position: 'Líbero' }),
    createMockAthlete({ id: 'ath-3', competitionTeamId: 'ct-1', name: 'Carla Lima', jerseyNumber: 3, position: 'Ponteiro' }),
    createMockAthlete({ id: 'ath-4', competitionTeamId: 'ct-1', name: 'Debora Vaz', jerseyNumber: 4, position: 'Central' }),
    createMockAthlete({ id: 'ath-5', competitionTeamId: 'ct-1', name: 'Elena Souza', jerseyNumber: 5, position: 'Oposto' }),
    createMockAthlete({ id: 'ath-6', competitionTeamId: 'ct-1', name: 'Fernanda Rocha', jerseyNumber: 6, position: 'Central' }),
    createMockAthlete({ id: 'ath-7', competitionTeamId: 'ct-1', name: 'Gabriela Dias', jerseyNumber: 7, position: 'Ponteiro' }),
  ];

  const athletesTeamB: CompetitionAthlete[] = [
    createMockAthlete({ id: 'ath-11', competitionTeamId: 'ct-2', name: 'Juliana Paes', jerseyNumber: 10, isCaptain: true, position: 'Levantador' }),
    createMockAthlete({ id: 'ath-12', competitionTeamId: 'ct-2', name: 'Larissa Manoela', jerseyNumber: 12, position: 'Ponteiro' }),
    createMockAthlete({ id: 'ath-13', competitionTeamId: 'ct-2', name: 'Marina Ruy', jerseyNumber: 14, position: 'Central' }),
    createMockAthlete({ id: 'ath-14', competitionTeamId: 'ct-2', name: 'Nathalia Dill', jerseyNumber: 16, position: 'Oposto' }),
    createMockAthlete({ id: 'ath-15', competitionTeamId: 'ct-2', name: 'Olivia Silva', jerseyNumber: 18, position: 'Central' }),
    createMockAthlete({ id: 'ath-16', competitionTeamId: 'ct-2', name: 'Patricia Poeta', jerseyNumber: 20, position: 'Ponteiro' }),
  ];

  describe('MatchCheckinService (Quórum e Elegibilidade Presencial)', () => {
    it('deve exigir mínimo de 6 atletas para vôlei de quadra (indoor)', () => {
      // 5 atletas presentes no Time A -> Bloqueado
      const checkedIn5 = ['ath-1', 'ath-2', 'ath-3', 'ath-4', 'ath-5', 'ath-11', 'ath-12', 'ath-13', 'ath-14', 'ath-15', 'ath-16'];
      const result5 = MatchCheckinService.validateMatchCheckin(indoorComp, athletesTeamA, athletesTeamB, checkedIn5);
      expect(result5.valid).toBe(false);
      expect(result5.errors[0]).toContain('apenas 5 atleta(s)');

      // 6 atletas presentes no Time A e 6 no Time B -> Válido
      const checkedIn6 = ['ath-1', 'ath-2', 'ath-3', 'ath-4', 'ath-5', 'ath-6', 'ath-11', 'ath-12', 'ath-13', 'ath-14', 'ath-15', 'ath-16'];
      const result6 = MatchCheckinService.validateMatchCheckin(indoorComp, athletesTeamA, athletesTeamB, checkedIn6);
      expect(result6.valid).toBe(true);
      expect(result6.teamAPresent).toBe(6);
      expect(result6.teamBPresent).toBe(6);
    });

    it('deve exigir mínimo de 2 atletas para vôlei de praia (beach)', () => {
      const checkedIn1 = ['ath-1', 'ath-11'];
      const result1 = MatchCheckinService.validateMatchCheckin(beachComp, athletesTeamA, athletesTeamB, checkedIn1);
      expect(result1.valid).toBe(false);
      expect(result1.errors[0]).toContain('apenas 1 atleta(s)');

      const checkedIn2 = ['ath-1', 'ath-2', 'ath-11', 'ath-12'];
      const result2 = MatchCheckinService.validateMatchCheckin(beachComp, athletesTeamA, athletesTeamB, checkedIn2);
      expect(result2.valid).toBe(true);
      expect(result2.minRequired).toBe(2);
    });

    it('deve detectar duplicidade de número de camisa entre atletas presentes', () => {
      const athleteDuplicate = createMockAthlete({
        id: 'ath-dup',
        competitionTeamId: 'ct-1',
        name: 'Clara Duplicada',
        jerseyNumber: 1, // Mesmo número da Ana Silva (#1)
      });

      const teamWithDup = [...athletesTeamA, athleteDuplicate];
      const checkedInDup = ['ath-1', 'ath-dup', 'ath-2', 'ath-3', 'ath-4', 'ath-5', 'ath-11', 'ath-12', 'ath-13', 'ath-14', 'ath-15', 'ath-16'];

      const result = MatchCheckinService.validateMatchCheckin(indoorComp, teamWithDup, athletesTeamB, checkedInDup);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('camisa #1 duplicado'))).toBe(true);
    });
  });

  describe('RefereeAssignmentService (Conflitos de Escala de Arbitragem)', () => {
    const matchA: MatchRecord = {
      id: 'm-ref-1',
      competitionId: 'comp-indoor',
      round: 1,
      matchNumber: 10,
      teamAId: 'ct-1',
      teamBId: 'ct-2',
      teamAName: 'Time A',
      teamBName: 'Time B',
      teamAShortName: 'TMA',
      teamBShortName: 'TMB',
      venue: 'Ginásio Central',
      court: 'Quadra 1',
      scheduledTime: '2026-08-30T14:00:00Z',
      status: 'scheduled',
      sets: [],
      referees: [{ role: '1º Árbitro', name: 'Rodrigo Medeiros' }],
      createdAt: '',
      updatedAt: '',
    };

    const matchB: MatchRecord = {
      id: 'm-ref-2',
      competitionId: 'comp-indoor',
      round: 1,
      matchNumber: 11,
      teamAId: 'ct-3',
      teamBId: 'ct-4',
      teamAName: 'Time C',
      teamBName: 'Time D',
      teamAShortName: 'TMC',
      teamBShortName: 'TMD',
      venue: 'Ginásio Central',
      court: 'Quadra 2',
      scheduledTime: '2026-08-30T14:30:00Z', // 30 min depois (mesmo intervalo de 75min)
      status: 'scheduled',
      sets: [],
      referees: [],
      createdAt: '',
      updatedAt: '',
    };

    it('deve detectar quando o mesmo árbitro for escalado em dois jogos simultâneos', () => {
      const newRefereesForMatchB: MatchRefereeRecord[] = [
        { role: 'Apontador', name: 'Rodrigo Medeiros' }, // Conflito com Jogo 10
      ];

      const conflicts = RefereeAssignmentService.detectRefereeConflicts(
        matchB,
        newRefereesForMatchB,
        [matchA]
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].refereeName).toBe('Rodrigo Medeiros');
      expect(conflicts[0].matchNumberB).toBe(10);
    });

    it('não deve acusar conflito se os jogos forem em horários distantes', () => {
      const matchDifferentTime = {
        ...matchB,
        scheduledTime: '2026-08-30T18:00:00Z', // 4 horas depois
      };

      const newReferees: MatchRefereeRecord[] = [
        { role: '1º Árbitro', name: 'Rodrigo Medeiros' },
      ];

      const conflicts = RefereeAssignmentService.detectRefereeConflicts(
        matchDifferentTime,
        newReferees,
        [matchA]
      );

      expect(conflicts).toHaveLength(0);
    });
  });
});
