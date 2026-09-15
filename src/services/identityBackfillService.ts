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
