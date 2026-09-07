import { describe, it, expect } from 'vitest';
import { CompetitionRegistrationService } from '@/services/competitionRegistrationService';
import type { CompetitionRecord, MatchRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionAthleteInput, CompetitionTeam } from '@/types/registration';

describe('Fase 4.7 — Integridade do Domínio de Competição, Equipes, Atletas e Inscrições', () => {
  const indoorComp: CompetitionRecord = {
    id: 'comp-indoor-1',
    name: 'Campeonato Metropolitano 2026',
    modality: 'indoor',
    format: 'groups',
    playerFormat: '6x6',
    setFormat: '5-sets',
    genderCategory: 'male',
    status: 'registration-open',
    config: {
      version: 1,
      format: {
        defaultSetsToWin: 3,
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
        tiebreakCriteriaOrder: ['points', 'victories', 'set-average'],
        advancingPerGroup: 2,
      },
      registration: {
        minAthletes: 6,
        maxAthletes: 14,
        maxCaptains: 1,
        maxLiberos: 2,
        requireJerseyNumberOnRegistration: false,
      },
    },
  };

  const beachComp: CompetitionRecord = {
    ...indoorComp,
    id: 'comp-beach-1',
    modality: 'beach',
    playerFormat: '2x2',
    config: {
      ...indoorComp.config!,
      format: {
        defaultSetsToWin: 2,
        setRules: { regularSetPoints: 21, tiebreakPoints: 15, minAdvantage: 2 },
      },
      registration: {
        minAthletes: 2,
        maxAthletes: 4,
        maxCaptains: 1,
        maxLiberos: 0, // Praia não tem líbero
        requireJerseyNumberOnRegistration: false,
      },
    },
  };

  const compTeamA: CompetitionTeam = {
    id: 'ct-1',
    competitionId: indoorComp.id,
    teamId: 'team-alpha',
    teamName: 'Alpha Vôlei Clube',
    teamShortName: 'ALP',
    accessToken: 'tok-alpha',
    registrationDeadline: '2026-12-31T23:59:59Z',
    isLocked: false,
    status: 'in_progress',
    createdAt: '',
    updatedAt: '',
  };

  const compTeamB: CompetitionTeam = {
    id: 'ct-2',
    competitionId: indoorComp.id,
    teamId: 'team-beta',
    teamName: 'Beta Vôlei Clube',
    teamShortName: 'BET',
    accessToken: 'tok-beta',
    registrationDeadline: '2026-12-31T23:59:59Z',
    isLocked: false,
    status: 'in_progress',
    createdAt: '',
    updatedAt: '',
  };

  describe('1. Integridade de Inscrições e Agremiações', () => {
    it('bloqueia inscrição em competição cancelada ou concluída', () => {
      const cancelled = { ...indoorComp, status: 'cancelled' as const };
      const res = CompetitionRegistrationService.canRegisterTeam(cancelled, 'team-gamma', []);
      expect(res.ok).toBe(false);
      expect(res.errors[0]).toContain('cancelada');
    });

    it('bloqueia inscrição duplicada da mesma equipe na mesma competição', () => {
      const res = CompetitionRegistrationService.canRegisterTeam(indoorComp, 'team-alpha', [compTeamA]);
      expect(res.ok).toBe(false);
      expect(res.errors[0]).toContain('já está inscrita');
    });

    it('permite inscrição válida de equipe não registrada', () => {
      const res = CompetitionRegistrationService.canRegisterTeam(indoorComp, 'team-gamma', [compTeamA]);
      expect(res.ok).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('bloqueia remoção de inscrição se a equipe já possui partidas associadas', () => {
      const matches: MatchRecord[] = [
        {
          id: 'm-1',
          competitionId: indoorComp.id,
          round: 1,
          matchNumber: 1,
          teamAId: 'team-alpha',
          teamBId: 'team-beta',
          teamAName: 'Alpha',
          teamBName: 'Beta',
          teamAShortName: 'ALP',
          teamBShortName: 'BET',
          venue: 'Ginásio',
          scheduledTime: '2026-09-03T10:00:00Z',
          status: 'scheduled',
          sets: [],
          referees: [],
          createdAt: '',
          updatedAt: '',
        },
      ];

      const res = CompetitionRegistrationService.canRemoveRegistration(indoorComp, compTeamA, matches);
      expect(res.ok).toBe(false);
      expect(res.errors[0]).toContain('já possui partidas');
    });

    it('bloqueia exclusão de agremiação com histórico competitivo ou inscrições ativas', () => {
      const matches: MatchRecord[] = [
        {
          id: 'm-1',
          competitionId: indoorComp.id,
          round: 1,
          matchNumber: 1,
          teamAId: 'team-alpha',
          teamBId: 'team-beta',
          teamAName: 'Alpha',
          teamBName: 'Beta',
          teamAShortName: 'ALP',
          teamBShortName: 'BET',
          venue: 'Ginásio',
          scheduledTime: '2026-09-03T10:00:00Z',
          status: 'completed',
          sets: [],
          referees: [],
          createdAt: '',
          updatedAt: '',
        },
      ];

      // Bloqueio por partidas jogadas
      const resWithMatches = CompetitionRegistrationService.canDeleteTeam('team-alpha', matches, []);
      expect(resWithMatches.ok).toBe(false);
      expect(resWithMatches.errors[0]).toContain('partida(s)');

      // Bloqueio por inscrição ativa
      const resWithReg = CompetitionRegistrationService.canDeleteTeam('team-alpha', [], [compTeamA]);
      expect(resWithReg.ok).toBe(false);
      expect(resWithReg.errors[0]).toContain('inscrição(ões)');

      // Permitido para equipe limpa
      const clean = CompetitionRegistrationService.canDeleteTeam('team-fresh', [], []);
      expect(clean.ok).toBe(true);
    });
  });

  describe('2. Integridade de Atletas e Roster', () => {
    const existingAthlete: CompetitionAthlete = {
      id: 'ath-1',
      competitionTeamId: compTeamA.id,
      name: 'Giba Silva',
      jerseyNumber: 7,
      position: 'Ponteiro',
      documentNumber: '11122233344',
      isCaptain: true,
      isLibero: false,
      gender: 'male',
      createdAt: '',
      updatedAt: '',
    };

    it('bloqueia camisa duplicada na mesma equipe', () => {
      const input: CompetitionAthleteInput = {
        name: 'Serginho Dutra',
        jerseyNumber: 7, // Camisa 7 já é do Giba
        position: 'Líbero',
        isCaptain: false,
        isLibero: true,
        gender: 'male',
      };

      const res = CompetitionRegistrationService.validateAthleteRegistration(
        indoorComp,
        compTeamA,
        input,
        [existingAthlete],
        [existingAthlete],
      );

      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('Já existe atleta com a camisa 7');
    });

    it('permite atleta com camisa não informada (opcional até o dia do jogo)', () => {
      const input: CompetitionAthleteInput = {
        name: 'Wallace Souza',
        position: 'Oposto',
        isCaptain: false,
        isLibero: false,
        gender: 'male',
      };

      const res = CompetitionRegistrationService.validateAthleteRegistration(
        indoorComp,
        compTeamA,
        input,
        [existingAthlete],
        [existingAthlete],
      );

      expect(res.valid).toBe(true);
    });

    it('bloqueia mais de 1 capitão por equipe', () => {
      const input: CompetitionAthleteInput = {
        name: 'Bruninho Rezende',
        jerseyNumber: 1,
        position: 'Levantador',
        isCaptain: true, // Já existe capitão no elenco
        isLibero: false,
        gender: 'male',
      };

      const res = CompetitionRegistrationService.validateAthleteRegistration(
        indoorComp,
        compTeamA,
        input,
        [existingAthlete],
        [existingAthlete],
      );

      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('Só é permitido 1 capitão');
    });

    it('bloqueia líbero em competição de vôlei de praia (limite = 0)', () => {
      const input: CompetitionAthleteInput = {
        name: 'Emanuel Rego',
        jerseyNumber: 1,
        position: 'Defensor',
        isCaptain: false,
        isLibero: true, // Praia não aceita líberos
        gender: 'male',
      };

      const res = CompetitionRegistrationService.validateAthleteRegistration(
        beachComp,
        compTeamA,
        input,
        [],
        [],
      );

      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('líberos permitidos');
    });

    it('bloqueia inscrição do mesmo atleta em duas equipes na mesma competição', () => {
      const input: CompetitionAthleteInput = {
        name: 'Giba Silva',
        jerseyNumber: 10,
        position: 'Ponteiro',
        documentNumber: '11122233344', // Mesmo documento de Giba Silva do Alpha
        isCaptain: false,
        isLibero: false,
        gender: 'male',
      };

      const res = CompetitionRegistrationService.validateAthleteRegistration(
        indoorComp,
        compTeamB, // Tentando inscrever no Beta
        input,
        [],
        [existingAthlete], // existingAthlete está no Alpha
      );

      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('já está inscrito por outra equipe');
    });

    it('bloqueia remoção de atleta que já disputou partida oficial (preservação histórica)', () => {
      const matchWithAthlete: MatchRecord = {
        id: 'm-played',
        competitionId: indoorComp.id,
        round: 1,
        matchNumber: 1,
        teamAId: 'team-alpha',
        teamBId: 'team-beta',
        teamAName: 'Alpha',
        teamBName: 'Beta',
        teamAShortName: 'ALP',
        teamBShortName: 'BET',
        venue: 'Ginásio',
        scheduledTime: '2026-09-03T10:00:00Z',
        status: 'completed',
        checkedInAthleteIds: ['ath-1'],
        sets: [],
        referees: [],
        createdAt: '',
        updatedAt: '',
      };

      const res = CompetitionRegistrationService.canRemoveAthleteFromRoster(
        indoorComp,
        compTeamA,
        'ath-1',
        [matchWithAthlete],
      );

      expect(res.ok).toBe(false);
      expect(res.errors[0]).toContain('já participou de partidas oficiais');
    });

    it('valida o mínimo de atletas regulamentar para a modalidade', () => {
      // 5 atletas no indoor 6x6 (mínimo exigido = 6)
      const fiveAthletes = Array.from({ length: 5 }).map((_, i) => ({
        ...existingAthlete,
        id: `ath-${i}`,
      }));

      const res = CompetitionRegistrationService.validateRosterMinimum(fiveAthletes, indoorComp);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('Mínimo de 6 atletas');
    });
  });
});
