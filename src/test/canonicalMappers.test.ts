/**
 * Canonical Mappers Test Suite — BaseOS Fase 8.3
 * 
 * Valida os mappers canônicos estritos que garantem conformidade com o PostgreSQL 17.6 real:
 * - competitionMapper: exatamente 20 colunas em public.competitions; campos regulamentares encapsulados em config (JSONB).
 * - teamMapper: exatamente 9 colunas em public.teams; campos legados expurgados.
 * - competitionTeamMapper: exatamente 12 colunas em public.competition_teams.
 */

import { describe, expect, it } from 'vitest';
import { competitionMapper } from '@/services/mappers/competitionMapper';
import { teamMapper } from '@/services/mappers/teamMapper';
import { competitionTeamMapper } from '@/services/mappers/competitionTeamMapper';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';

describe('competitionMapper (Fase 8.3)', () => {
  const allowedCompetitionColumns = new Set([
    'id', 'name', 'slug', 'modality', 'format', 'player_format', 'set_format',
    'gender_category', 'default_deadline', 'group_name', 'start_date', 'end_date',
    'venue', 'status', 'config', 'rules_snapshot', 'organizer_id', 'organization_id', 'logo_url',
    'supporters', 'created_at', 'updated_at',
  ]);

  it('toPersistence exporta APENAS as colunas permitidas no PostgreSQL real', () => {
    const domainInput: Partial<CompetitionRecord> & Record<string, unknown> = {
      id: 'comp-test-123',
      name: 'Copa Voltz 2026',
      modality: 'indoor',
      format: 'groups-playoffs',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'mixed',
      status: 'registration-open',
      groupsCount: 4,
      teamsPerGroup: 4,
      advancingPerGroup: 2,
      thirdPlaceMatch: true,
      pointsPerMatchWin: 3,
      pointsPerMatchLoss: 0,
      pointsPerSetRatio: false,
      tiebreakCriteria: ['points', 'head-to-head', 'set-average'],
      config: {
        registration: {
          maxTeams: 16,
          minAthletes: 6,
          maxAthletes: 14,
          maxCaptains: 1,
          maxLiberos: 2,
          requireJerseyNumberOnRegistration: false,
        },
      } as unknown as CompetitionRecord['config'],
    };

    const row = competitionMapper.toPersistence(domainInput);

    // Nenhuma chave fora das 20 colunas permitidas
    for (const key of Object.keys(row)) {
      expect(allowedCompetitionColumns.has(key)).toBe(true);
    }

    // Colunas de domínio proibidas como coluna de tabela
    expect(row).not.toHaveProperty('groups_count');
    expect(row).not.toHaveProperty('teams_per_group');
    expect(row).not.toHaveProperty('advancing_per_group');
    expect(row).not.toHaveProperty('third_place_match');
    expect(row).not.toHaveProperty('points_per_match_win');
    expect(row).not.toHaveProperty('points_per_match_loss');
    expect(row).not.toHaveProperty('tiebreak_criteria');

    // Campos regulamentares foram preservados dentro do JSONB config
    const config = row.config as Record<string, unknown>;
    expect(config).toBeDefined();
    expect(config.groupsCount).toBe(4);
    expect(config.teamsPerGroup).toBe(4);
    expect(config.advancingPerGroup).toBe(2);
    expect(config.thirdPlaceMatch).toBe(true);
    expect((config.registration as Record<string, unknown>)?.maxTeams).toBe(16);
  });

  it('toDomain projeta colunas do banco e descompacta campos de config de volta para a entidade', () => {
    const dbRow = {
      id: 'comp-456',
      name: 'Torneio Aberto',
      slug: 'torneio-aberto',
      modality: 'indoor',
      format: 'groups-playoffs',
      player_format: '6x6',
      set_format: '3-sets',
      gender_category: 'female',
      status: 'registration-open',
      config: {
        groupsCount: 2,
        teamsPerGroup: 3,
        advancingPerGroup: 1,
        registration: {
          maxTeams: 6,
        },
      },
      rules_snapshot: null,
      organizer_id: 'org-1',
      created_at: '2026-09-13T10:00:00Z',
      updated_at: '2026-09-13T10:00:00Z',
    };

    const domain = competitionMapper.toDomain(dbRow);
    expect(domain.id).toBe('comp-456');
    expect(domain.name).toBe('Torneio Aberto');
    expect(domain.genderCategory).toBe('female');
    expect(domain.groupsCount).toBe(2);
    expect(domain.teamsPerGroup).toBe(3);
    expect(domain.advancingPerGroup).toBe(1);
    expect(domain.config?.registration?.maxTeams).toBe(6);
  });

  it('toPersistence mapeia organizationId para organization_id e toDomain mapeia organization_id para organizationId', () => {
    const orgId = 'org-d700228a-3f04-4add-bc12-02fb83909afb';
    const domainInput: Partial<CompetitionRecord> = {
      id: 'comp-voltz-1',
      name: 'Copa Voltz 2026',
      organizationId: orgId,
    };

    const persistenceRow = competitionMapper.toPersistence(domainInput);
    expect(persistenceRow.organization_id).toBe(orgId);

    const backToDomain = competitionMapper.toDomain({
      id: 'comp-voltz-1',
      name: 'Copa Voltz 2026',
      organization_id: orgId,
    });
    expect(backToDomain.organizationId).toBe(orgId);
  });

  it('assertCompetitionOrganization valida obrigatoriedade do tenant e bloqueia se ausente', () => {
    const validOrgId = 'org-d700228a-3f04-4add-bc12-02fb83909afb';
    expect(competitionMapper.assertCompetitionOrganization({ organizationId: validOrgId })).toBe(validOrgId);

    expect(() => competitionMapper.assertCompetitionOrganization({ organizationId: undefined }))
      .toThrow('Não foi possível criar a competição porque nenhuma organização está ativa.');

    expect(() => competitionMapper.assertCompetitionOrganization({ organizationId: null as unknown as string }))
      .toThrow('Não foi possível criar a competição porque nenhuma organização está ativa.');

    expect(() => competitionMapper.assertCompetitionOrganization({ organizationId: '   ' }))
      .toThrow('Não foi possível criar a competição porque nenhuma organização está ativa.');
  });
});

describe('teamMapper (Fase 8.3)', () => {
  const allowedTeamColumns = new Set([
    'id', 'name', 'short_name', 'modality', 'coach_name', 'city', 'logo_url',
    'created_at', 'updated_at',
  ]);

  it('toPersistence remove estritamente campos legados inexistentes no PostgreSQL', () => {
    const domainInput: Partial<TeamRecord> & Record<string, unknown> = {
      id: 'team-tau-1',
      name: 'Vôlei Taubaté',
      shortName: 'TAU',
      modality: 'indoor',
      coachName: 'Renan Dal Zotto',
      city: 'Taubaté',
      // Campos legados que geravam erro 400 (PGRST204) na auditoria
      managerPassword: 'PlainTextPassword123!',
      registrationToken: 'legacy-token-abc',
      managerName: 'Gerente Carlos',
      managerEmail: 'carlos@volei.com',
      managerPhone: '11999999999',
      state: 'SP',
    };

    const row = teamMapper.toPersistence(domainInput);

    for (const key of Object.keys(row)) {
      expect(allowedTeamColumns.has(key)).toBe(true);
    }

    expect(row).not.toHaveProperty('manager_password');
    expect(row).not.toHaveProperty('managerPassword');
    expect(row).not.toHaveProperty('registration_token');
    expect(row).not.toHaveProperty('registrationToken');
    expect(row).not.toHaveProperty('manager_name');
    expect(row).not.toHaveProperty('manager_email');
    expect(row).not.toHaveProperty('manager_phone');
    expect(row).not.toHaveProperty('state');
    expect(row.name).toBe('Vôlei Taubaté');
    expect(row.coach_name).toBe('Renan Dal Zotto');
  });

  it('toDomain mapeia colunas de teams para camelCase', () => {
    const dbRow = {
      id: 'team-1',
      name: 'Cruzeiro',
      short_name: 'CRU',
      modality: 'indoor',
      coach_name: 'Filipe Ferraz',
      city: 'Belo Horizonte',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    const domain = teamMapper.toDomain(dbRow);
    expect(domain.id).toBe('team-1');
    expect(domain.name).toBe('Cruzeiro');
    expect(domain.shortName).toBe('CRU');
    expect(domain.coachName).toBe('Filipe Ferraz');
  });
});

describe('competitionTeamMapper (Fase 8.3)', () => {
  const allowedCompetitionTeamColumns = new Set([
    'id', 'competition_id', 'team_id', 'team_name', 'team_short_name',
    'access_token', 'registration_deadline', 'is_locked', 'status', 'custom_notes',
    'created_at', 'updated_at',
  ]);

  it('toPersistence mantém apenas as 12 colunas oficiais de competition_teams', () => {
    const domainInput: Partial<CompetitionTeam> = {
      id: 'ct-10-20',
      competitionId: 'comp-10',
      teamId: 'team-20',
      teamName: 'Sada Cruzeiro',
      teamShortName: 'SAD',
      registrationDeadline: '2026-10-01T23:59:59Z',
      isLocked: false,
      status: 'invited',
    };

    const row = competitionTeamMapper.toPersistence(domainInput);

    for (const key of Object.keys(row)) {
      expect(allowedCompetitionTeamColumns.has(key)).toBe(true);
    }

    expect(row.competition_id).toBe('comp-10');
    expect(row.team_id).toBe('team-20');
    expect(row.team_name).toBe('Sada Cruzeiro');
    expect(row.access_token).toBeDefined();
    expect(typeof row.access_token).toBe('string');
  });
});
