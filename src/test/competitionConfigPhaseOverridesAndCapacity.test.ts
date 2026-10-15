import { describe, it, expect } from 'vitest';
import { CompetitionConfigValidator } from '@/services/competitionConfigValidator';
import { CompetitionRegistrationService } from '@/services/competitionRegistrationService';
import {
  DEFAULT_INDOOR_COMPETITION_CONFIG,
  normalizePhaseOverrides,
  type CompetitionConfig,
} from '@/types/competitionConfig';
import type { CompetitionRecord } from '@/types/entities';
import type { CompetitionTeam, CompetitionAthlete } from '@/types/registration';

describe('BASEOS v2.5.4 — Normalização de phaseOverrides e Resolução de maxTeams', () => {
  describe('1. Normalização de phaseOverrides em CompetitionConfigValidator', () => {
    it('deve normalizar strings legadas ("3-sets", "5-sets", "1-set") em SetsToWin numérico sem travar', () => {
      const rawConfig = {
        ...DEFAULT_INDOOR_COMPETITION_CONFIG,
        format: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
          phaseOverrides: {
            groupStage: '3-sets',
            playoffs: '3-sets',
            quarterfinals: '3-sets',
            semifinals: '5-sets',
            final: '5-sets',
          },
        },
      } as unknown as CompetitionConfig;

      const result = CompetitionConfigValidator.validate(rawConfig);

      // Validação não deve conter erros de sobrescrita inválida
      const phaseErrors = result.errors.filter((e) => e.field.includes('phaseOverrides'));
      expect(phaseErrors).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it('deve aceitar IDs dinâmicos de fases do motor como chaves válidas em phaseOverrides', () => {
      const rawConfig = {
        ...DEFAULT_INDOOR_COMPETITION_CONFIG,
        format: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
          stages: [
            { id: 'stage-classificatoria', name: 'Classificatória', type: 'group-stage', order: 1 },
            { id: 'stage-repescagem', name: 'Repescagem', type: 'play-in', order: 2 },
            { id: 'stage-finais', name: 'Finais', type: 'knockout', order: 3 },
          ],
          phaseOverrides: {
            'stage-classificatoria': '3-sets',
            'stage-repescagem': 2,
            'stage-finais': 3,
          },
        },
      } as unknown as CompetitionConfig;

      const result = CompetitionConfigValidator.validate(rawConfig);
      const phaseErrors = result.errors.filter((e) => e.field.includes('phaseOverrides'));
      expect(phaseErrors).toHaveLength(0);
    });

    it('normalizePhaseOverrides deve converter strings legadas e descartar valores corrompidos', () => {
      const rawOverrides = {
        groupStage: '3-sets',
        playoffs: '5-sets',
        extra: '1-set',
        invalid: 'invalid-string',
      };

      const normalized = normalizePhaseOverrides(rawOverrides);
      expect(normalized.groupStage).toBe(2);
      expect(normalized.playoffs).toBe(3);
      expect(normalized.extra).toBe(1);
      expect(normalized.invalid).toBeUndefined();
    });
  });

  describe('2. Resolução de Capacidade (maxTeams) e Desbloqueio de Inscrições', () => {
    const baseCompetition: CompetitionRecord = {
      id: 'comp-test-123',
      name: 'Torneio Teste',
      modality: 'indoor',
      genderCategory: 'male',
      status: 'registration-open',
    };

    it('deve resolver maxTeams a partir de competition.maxTeams se fornecido', () => {
      const comp: CompetitionRecord = {
        ...baseCompetition,
        maxTeams: 12,
      };

      const capacity = CompetitionRegistrationService.getCapacity(comp);
      expect(capacity.isConfigured).toBe(true);
      expect(capacity.maxTeams).toBe(12);
    });

    it('deve resolver maxTeams a partir de config.registration.maxTeams', () => {
      const comp: CompetitionRecord = {
        ...baseCompetition,
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          registration: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.registration,
            maxTeams: 16,
          },
        },
      };

      const capacity = CompetitionRegistrationService.getCapacity(comp);
      expect(capacity.isConfigured).toBe(true);
      expect(capacity.maxTeams).toBe(16);
    });

    it('deve resolver maxTeams a partir de config.format.stages[0].participantsCount (Fallback do Motor)', () => {
      const comp: CompetitionRecord = {
        ...baseCompetition,
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          format: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
            stages: [
              {
                id: 'stage-1',
                name: 'Fase de Grupos',
                type: 'group-stage',
                order: 1,
                participantsCount: 10,
              },
            ],
          },
          registration: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.registration,
            maxTeams: undefined,
          },
        },
      };

      const capacity = CompetitionRegistrationService.getCapacity(comp);
      expect(capacity.isConfigured).toBe(true);
      expect(capacity.maxTeams).toBe(10);
    });

    it('deve permitir a aprovação de inscrição (canApproveTeam) usando a capacidade resolvida da Fase 1', () => {
      const comp: CompetitionRecord = {
        ...baseCompetition,
        config: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG,
          format: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
            stages: [
              {
                id: 'stage-1',
                name: 'Classificatória',
                type: 'group-stage',
                order: 1,
                participantsCount: 10,
              },
            ],
          },
          registration: {
            ...DEFAULT_INDOOR_COMPETITION_CONFIG.registration,
            minAthletes: 6,
            maxAthletes: 14,
            maxCaptains: 1,
            maxLiberos: 2,
            requireJerseyNumberOnRegistration: false,
            maxTeams: undefined, // não informado explicitamente
          },
        },
      };

      const targetTeam: CompetitionTeam = {
        id: 'ct-overzone',
        competitionId: comp.id,
        teamId: 'team-overzone',
        teamName: 'OVERZONE',
        teamShortName: 'OVZ',
        accessToken: 'tok-overzone',
        registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
        isLocked: false,
        status: 'submitted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 6 atletas válidos inscritos
      const nowIso = new Date().toISOString();
      const athletes: CompetitionAthlete[] = [
        { id: 'a1', competitionTeamId: targetTeam.id, name: 'Atleta 1', position: 'Ponteiro', gender: 'male', isCaptain: true, isLibero: false, createdAt: nowIso, updatedAt: nowIso },
        { id: 'a2', competitionTeamId: targetTeam.id, name: 'Atleta 2', position: 'Central', gender: 'male', isCaptain: false, isLibero: false, createdAt: nowIso, updatedAt: nowIso },
        { id: 'a3', competitionTeamId: targetTeam.id, name: 'Atleta 3', position: 'Oposto', gender: 'male', isCaptain: false, isLibero: false, createdAt: nowIso, updatedAt: nowIso },
        { id: 'a4', competitionTeamId: targetTeam.id, name: 'Atleta 4', position: 'Levantador', gender: 'male', isCaptain: false, isLibero: false, createdAt: nowIso, updatedAt: nowIso },
        { id: 'a5', competitionTeamId: targetTeam.id, name: 'Atleta 5', position: 'Ponteiro', gender: 'male', isCaptain: false, isLibero: false, createdAt: nowIso, updatedAt: nowIso },
        { id: 'a6', competitionTeamId: targetTeam.id, name: 'Atleta 6', position: 'Líbero', gender: 'male', isCaptain: false, isLibero: true, createdAt: nowIso, updatedAt: nowIso },
      ];

      // Apenas 1 equipe aprovada anteriormente
      const existingRegistrations: CompetitionTeam[] = [
        {
          id: 'ct-other-1',
          competitionId: comp.id,
          teamId: 'team-other-1',
          teamName: 'Outra Equipe',
          teamShortName: 'OUT',
          accessToken: 'tok-other',
          registrationDeadline: new Date().toISOString(),
          isLocked: false,
          status: 'approved',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        targetTeam,
      ];

      const check = CompetitionRegistrationService.canApproveTeam(
        comp,
        targetTeam,
        existingRegistrations,
        athletes,
      );

      expect(check.ok).toBe(true);
      expect(check.errors).toHaveLength(0);
    });
  });
});
