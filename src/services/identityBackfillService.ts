import { normalizeCpf } from '@/services/identityService';
import type { AthleteIdentity, UserMembership } from '@/types/identity';

export type LegacyCompetitionAthlete = {
  id: string;
  competitionTeamId: string;
  name: string;
  documentNumber?: string;
  birthDate?: string;
};

export type AthleteBackfillPlan = {
  competitionAthleteId: string;
  athlete: AthleteIdentity;
  reuseExistingIdentity: boolean;
};

/**
 * Produz um plano determinístico, sem escrever dados. Nunca une registros por
 * nome: CPF ausente gera nova identidade e CPF conflitante bloqueia o backfill.
 */
export function planAthleteBackfill(
  legacyAthletes: readonly LegacyCompetitionAthlete[],
  existingAthletes: readonly AthleteIdentity[],
  now: string,
): AthleteBackfillPlan[] {
  const cpfOwner = new Map<string, AthleteIdentity>();
  for (const athlete of existingAthletes) {
    if (!athlete.normalizedCpf) continue;
    if (cpfOwner.has(athlete.normalizedCpf)) {
      throw new Error(`CPF duplicado na identidade global: ${athlete.normalizedCpf}.`);
    }
    cpfOwner.set(athlete.normalizedCpf, athlete);
  }

  return legacyAthletes.map((legacy) => {
    const normalizedCpf = normalizeCpf(legacy.documentNumber);
    const reusable = normalizedCpf ? cpfOwner.get(normalizedCpf) : undefined;
    if (reusable) {
      return { competitionAthleteId: legacy.id, athlete: reusable, reuseExistingIdentity: true };
    }

    const identity: AthleteIdentity = {
      id: `athlete-backfill-${legacy.id}`,
      normalizedCpf,
      name: legacy.name,
      birthDate: legacy.birthDate,
      createdAt: now,
      updatedAt: now,
    };
    if (normalizedCpf) cpfOwner.set(normalizedCpf, identity);
    return { competitionAthleteId: legacy.id, athlete: identity, reuseExistingIdentity: false };
  });
}

/** Cria membership legado equivalente sem substituir profiles.competition_team_id. */
export function planLegacyTeamMembership(
  userId: string,
  organizationId: string,
  competitionId: string,
  teamId: string,
  competitionTeamId: string,
  now: string,
): UserMembership {
  return {
    id: `membership-backfill-${userId}-${competitionTeamId}`,
    userId,
    organizationId,
    competitionId,
    teamId,
    competitionTeamId,
    role: 'team_manager',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

export type FullIdentityBackfillInput = {
  competitions: readonly { id: string; organizationId?: string }[];
  teams: readonly { id: string; organizationId?: string }[];
  competitionTeams: readonly { id: string; competitionId: string; teamId: string }[];
  competitionAthletes: readonly LegacyCompetitionAthlete[];
  existingAthletes?: readonly AthleteIdentity[];
  legacyProfiles?: readonly { id: string; competitionTeamId?: string; role?: string }[];
  defaultOrganizationId?: string;
  now?: string;
};

export type FullIdentityBackfillPlan = {
  athletePlans: AthleteBackfillPlan[];
  membershipPlans: UserMembership[];
  ambiguousProfiles: { userId: string; competitionTeamId?: string; reason: string }[];
  stats: {
    totalLegacyAthletes: number;
    reusedAthletes: number;
    newAthletes: number;
    athletesWithoutCpf: number;
    totalLegacyProfiles: number;
    createdMemberships: number;
    ambiguousProfilesCount: number;
  };
};

/**
 * Produz um planejamento completo do backfill local (atletas e memberships).
 * Determinístico, auditável e sem mutações de banco/storage.
 */
export function planFullIdentityBackfill(input: FullIdentityBackfillInput): FullIdentityBackfillPlan {
  const now = input.now || new Date().toISOString();
  const existingAthletes = input.existingAthletes || [];
  const athletePlans = planAthleteBackfill(input.competitionAthletes, existingAthletes, now);

  let reusedAthletes = 0;
  let newAthletes = 0;
  let athletesWithoutCpf = 0;

  for (const plan of athletePlans) {
    if (plan.reuseExistingIdentity) {
      reusedAthletes++;
    } else {
      newAthletes++;
    }
    if (!plan.athlete.normalizedCpf) {
      athletesWithoutCpf++;
    }
  }

  const membershipPlans: UserMembership[] = [];
  const ambiguousProfiles: { userId: string; competitionTeamId?: string; reason: string }[] = [];
  const legacyProfiles = input.legacyProfiles || [];

  for (const profile of legacyProfiles) {
    if (!profile.competitionTeamId) {
      if (profile.role === 'team') {
        ambiguousProfiles.push({
          userId: profile.id,
          reason: 'Perfil de equipe sem competition_team_id associado',
        });
      }
      continue;
    }

    const ct = input.competitionTeams.find(t => t.id === profile.competitionTeamId);
    if (!ct) {
      ambiguousProfiles.push({
        userId: profile.id,
        competitionTeamId: profile.competitionTeamId,
        reason: 'competition_team_id não localizado em competition_teams',
      });
      continue;
    }

    const team = input.teams.find(t => t.id === ct.teamId);
    const competition = input.competitions.find(c => c.id === ct.competitionId);
    const orgId = team?.organizationId || competition?.organizationId || input.defaultOrganizationId;

    if (!orgId) {
      ambiguousProfiles.push({
        userId: profile.id,
        competitionTeamId: profile.competitionTeamId,
        reason: 'Organização proprietária não identificada (ausente na equipe, na competição e sem default)',
      });
      continue;
    }

    membershipPlans.push(
      planLegacyTeamMembership(
        profile.id,
        orgId,
        ct.competitionId,
        ct.teamId,
        ct.id,
        now,
      ),
    );
  }

  return {
    athletePlans,
    membershipPlans,
    ambiguousProfiles,
    stats: {
      totalLegacyAthletes: input.competitionAthletes.length,
      reusedAthletes,
      newAthletes,
      athletesWithoutCpf,
      totalLegacyProfiles: legacyProfiles.length,
      createdMemberships: membershipPlans.length,
      ambiguousProfilesCount: ambiguousProfiles.length,
    },
  };
}
