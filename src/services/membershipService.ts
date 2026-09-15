import type { ActiveContext, UserMembership } from '@/types/identity';

/** Retorna somente memberships operacionais do usuário autenticado. */
export function listActiveMemberships(
  memberships: readonly UserMembership[],
  userId: string,
): UserMembership[] {
  return memberships.filter((membership) => (
    membership.userId === userId && membership.status === 'active'
  ));
}

/**
 * Converte uma membership ativa em contexto de navegação. O frontend pode
 * armazenar este objeto como preferência, mas nunca deve tratá-lo como prova de
 * autorização para uma URL, query ou payload.
 */
export function toActiveContext(membership: UserMembership): ActiveContext {
  if (membership.status !== 'active') {
    throw new Error('Somente memberships ativas podem ser selecionadas como contexto.');
  }

  return {
    membershipId: membership.id,
    id: membership.id,
    organizationId: membership.organizationId,
    competitionId: membership.competitionId,
    teamId: membership.teamId,
    competitionTeamId: membership.competitionTeamId,
    role: membership.role,
  };
}

/**
 * Resolve o redirecionamento pós-login sem aceitar IDs arbitrários do cliente.
 * - zero contextos: não há acesso operacional;
 * - um contexto: entrada automática;
 * - vários contextos: exige seletor explícito.
 */
export function resolveInitialContext(
  memberships: readonly UserMembership[],
  userId: string,
): ActiveContext | null {
  const active = listActiveMemberships(memberships, userId);
  return active.length === 1 ? toActiveContext(active[0]) : null;
}

/** Seleciona um contexto somente pelo ID de uma membership ativa do usuário. */
export function selectActiveContext(
  memberships: readonly UserMembership[],
  userId: string,
  membershipId: string,
): ActiveContext {
  const membership = listActiveMemberships(memberships, userId)
    .find((candidate) => candidate.id === membershipId);

  if (!membership) {
    throw new Error('Contexto indisponível para este usuário.');
  }

  return toActiveContext(membership);
}
