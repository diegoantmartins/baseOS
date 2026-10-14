import { describe, it, expect } from 'vitest';
import { CompetitionRegistrationService } from '@/services/competitionRegistrationService';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionAthleteInput, CompetitionTeam } from '@/types/registration';

describe('QA Master — Regressão: Cadastros, Deduplicação de Atletas e Escudos de Equipes', () => {
  const comp: CompetitionRecord = {
    id: 'comp-qa-logos-1',
    name: 'Campeonato Voltz Teste',
    modality: 'indoor',
    format: 'groups',
    playerFormat: '6x6',
    setFormat: '3-sets',
    genderCategory: 'male',
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
        maxAthletes: 14,
        maxCaptains: 1,
        maxLiberos: 2,
        requireJerseyNumberOnRegistration: false,
      },
    },
  };

  const competitionTeam: CompetitionTeam = {
    id: 'ct-voltz-test-1',
    competitionId: comp.id,
    teamId: 'team-voltz-test-1',
    teamName: 'Voltz Prime',
    teamShortName: 'VPR',
    status: 'approved',
    registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
    isLocked: false,
    accessToken: 'test-token-valid-abc123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existingAthletes: CompetitionAthlete[] = [
    {
      id: 'ca-1',
      competitionTeamId: 'ct-voltz-test-1',
      athleteId: 'ath-1',
      name: 'Lucas Lima',
      gender: 'male',
      position: 'Ponteiro',
      documentNumber: '12345678901',
      jerseyNumber: 10,
      isCaptain: true,
      isLibero: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ca-2',
      competitionTeamId: 'ct-voltz-test-1',
      athleteId: 'ath-2',
      name: 'Rodrigo Silva',
      gender: 'male',
      position: 'Central',
      documentNumber: '98765432100',
      jerseyNumber: undefined, // sem camisa atribuída ainda
      isCaptain: false,
      isLibero: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  describe('Deduplicação e integridade do elenco', () => {
    it('deve bloquear tentativa de cadastrar o mesmo atleta (mesmo CPF) na mesma equipe', () => {
      const duplicateInput: CompetitionAthleteInput = {
        name: 'Lucas Lima Clonado',
        documentNumber: '12345678901', // Mesmo CPF do atleta ca-1
        gender: 'male',
        position: 'Ponteiro',
        jerseyNumber: 15,
        isCaptain: false,
        isLibero: false,
      };

      const result = CompetitionRegistrationService.validateAthleteRegistration(
        comp,
        competitionTeam,
        duplicateInput,
        existingAthletes,
        existingAthletes
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('já está cadastrado no elenco desta equipe'))).toBe(true);
    });

    it('deve bloquear tentativa de cadastrar o mesmo athleteId já presente no elenco', () => {
      const duplicateInput: CompetitionAthleteInput = {
        name: 'Lucas Lima Atualizado',
        documentNumber: '55544433322',
        athleteId: 'ath-1', // Mesmo athleteId de ca-1
        gender: 'male',
        position: 'Levantador',
        jerseyNumber: 15,
        isCaptain: false,
        isLibero: false,
      };

      const result = CompetitionRegistrationService.validateAthleteRegistration(
        comp,
        competitionTeam,
        duplicateInput,
        existingAthletes,
        existingAthletes
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('já está cadastrado no elenco desta equipe'))).toBe(true);
    });

    it('deve bloquear tentativa de cadastrar com mesmo documento exato mesmo sem formatação de CPF', () => {
      const duplicateInput: CompetitionAthleteInput = {
        name: 'Rodrigo Duplicado por Clique Duplo',
        documentNumber: '98765432100', // Mesmo doc de ca-2
        gender: 'male',
        position: 'Central',
        jerseyNumber: undefined,
        isCaptain: false,
        isLibero: false,
      };

      const result = CompetitionRegistrationService.validateAthleteRegistration(
        comp,
        competitionTeam,
        duplicateInput,
        existingAthletes,
        existingAthletes
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('já está cadastrado no elenco desta equipe'))).toBe(true);
    });

    it('deve permitir atleta novo com documento único mesmo sem camisa', () => {
      const newInput: CompetitionAthleteInput = {
        name: 'Novo Atleta Válido',
        documentNumber: '11122233344',
        gender: 'male',
        position: 'Oposto',
        jerseyNumber: undefined,
        isCaptain: false,
        isLibero: false,
      };

      const result = CompetitionRegistrationService.validateAthleteRegistration(
        comp,
        competitionTeam,
        newInput,
        existingAthletes,
        existingAthletes
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Atualização de perfil e escudo de equipe', () => {
    it('deve atualizar o escudo da equipe via dataAccess.updateTeamProfile', async () => {
      const team = await dataAccess.createTeam({
        name: 'Equipe Teste Escudo QA',
        shortName: 'ETE',
        modality: 'indoor',
        city: 'Cascavel',
        state: 'PR',
      });

      const res = await dataAccess.updateTeamProfile({
        teamId: team.id,
        name: 'Equipe Teste Escudo QA Atualizada',
        logoUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...',
        city: 'Cascavel',
        state: 'PR',
      });

      expect(res.ok).toBe(true);

      const refreshed = await dataAccess.getTeam(team.id);
      expect(refreshed?.name).toBe('Equipe Teste Escudo QA Atualizada');
      expect(refreshed?.logoUrl).toContain('data:image/jpeg;base64');
    });
  });
});
