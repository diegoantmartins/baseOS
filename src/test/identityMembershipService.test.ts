import { describe, expect, it } from 'vitest';
import { findAthleteByCpf, normalizeCpf } from '@/services/identityService';
import {
  listActiveMemberships,
  resolveInitialContext,
  selectActiveContext,
} from '@/services/membershipService';
import type { AthleteIdentity, UserMembership } from '@/types/identity';

const now = '2026-09-15T00:00:00.000Z';
const athlete: AthleteIdentity = {
  id: 'ath-1',
  normalizedCpf: '12345678901',
  name: 'Carlos Silva',
  birthDate: '2000-01-01',
  createdAt: now,
  updatedAt: now,
};

function membership(overrides: Partial<UserMembership> = {}): UserMembership {
  return {
    id: 'membership-1',
    userId: 'user-1',
    organizationId: 'org-1',
    competitionId: 'competition-2026',
    teamId: 'team-male',
    competitionTeamId: 'ct-2026-male',
    role: 'team_manager',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('IdentityService', () => {
  it('normaliza CPF e encontra identidade existente sem criar duplicata', () => {
    expect(normalizeCpf('123.456.789-01')).toBe('12345678901');
    expect(findAthleteByCpf([athlete], '123.456.789-01')).toBe(athlete);
  });

  it('aceita CPF ausente e rejeita documento em formato incompleto', () => {
    expect(normalizeCpf('')).toBeUndefined();
    expect(() => normalizeCpf('123.456')).toThrow('CPF deve conter 11 dígitos.');
  });
});

describe('MembershipService', () => {
  it('entra automaticamente quando há exatamente um contexto ativo', () => {
    const context = resolveInitialContext([membership()], 'user-1');
    expect(context).toMatchObject({
      membershipId: 'membership-1',
      competitionTeamId: 'ct-2026-male',
      role: 'team_manager',
    });
  });

  it('exige seletor quando há mais de um contexto ativo', () => {
    const memberships = [membership(), membership({ id: 'membership-2', teamId: 'team-female', competitionTeamId: 'ct-2026-female' })];
    expect(resolveInitialContext(memberships, 'user-1')).toBeNull();
    expect(selectActiveContext(memberships, 'user-1', 'membership-2')).toMatchObject({
      teamId: 'team-female',
      competitionTeamId: 'ct-2026-female',
    });
  });

  it('não expõe memberships bloqueadas, encerradas ou de outro usuário', () => {
    const memberships = [
      membership(),
      membership({ id: 'blocked', status: 'blocked' }),
      membership({ id: 'ended', status: 'ended' }),
      membership({ id: 'other-user', userId: 'user-2' }),
    ];
    expect(listActiveMemberships(memberships, 'user-1')).toHaveLength(1);
    expect(() => selectActiveContext(memberships, 'user-1', 'other-user'))
      .toThrow('Contexto indisponível para este usuário.');
  });
});

import { planAthleteBackfill, planLegacyTeamMembership } from '@/services/identityBackfillService';

describe('IdentityBackfillService', () => {
  it('reutiliza atleta somente por CPF normalizado e preserva CPF ausente como identidade distinta', () => {
    const plan = planAthleteBackfill([
      { id: 'ca-existing', competitionTeamId: 'ct-2025', name: 'Outro nome', documentNumber: '123.456.789-01' },
      { id: 'ca-no-cpf', competitionTeamId: 'ct-2026', name: 'Carlos Silva' },
    ], [athlete], now);
    expect(plan[0]).toMatchObject({ competitionAthleteId: 'ca-existing', athlete: { id: 'ath-1' }, reuseExistingIdentity: true });
    expect(plan[1]).toMatchObject({ athlete: { id: 'athlete-backfill-ca-no-cpf', name: 'Carlos Silva' }, reuseExistingIdentity: false });
  });

  it('cria membership legado sem substituir a identidade do usuário', () => {
    expect(planLegacyTeamMembership('user-1', 'org-1', 'comp-2026', 'team-1', 'ct-1', now))
      .toMatchObject({ userId: 'user-1', competitionTeamId: 'ct-1', role: 'team_manager', status: 'active' });
  });
});
