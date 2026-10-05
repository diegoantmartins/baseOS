/**
 * Entidades de identidade e acesso contextual da Fase 11.
 *
 * A identidade é permanente; o vínculo (membership) é histórico e pode mudar.
 * Estes tipos não concedem acesso por si só: a autorização final é feita por
 * RLS/RPC usando a mesma membership persistida.
 */

export type MembershipRole =
  | 'admin'
  | 'organizer'
  | 'team_manager'
  | 'coach'
  | 'athlete'
  | 'referee'
  | 'scorer'
  | 'viewer';

export type MembershipStatus = 'pending' | 'active' | 'blocked' | 'ended';

export type OrganizationStatus = 'active' | 'blocked' | 'archived';

export type OrganizationRecord = {
  id: string;
  name: string;
  legalName?: string;
  documentNumber?: string;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
};

export type AthleteIdentity = {
  id: string;
  /** CPF somente com dígitos; ausente quando ainda não informado. */
  normalizedCpf?: string;
  name: string;
  birthDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type UserMembership = {
  id: string;
  userId: string;
  organizationId: string;
  competitionId?: string;
  teamId?: string;
  /** Ponte temporária para a participação exata da equipe na competição. */
  competitionTeamId?: string;
  role: MembershipRole;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
};

/** Contexto ativo escolhido apenas entre memberships ativas do próprio usuário. */
export type ActiveContext = Pick<
  UserMembership,
  'id' | 'organizationId' | 'competitionId' | 'teamId' | 'competitionTeamId' | 'role'
> & {
  membershipId: string;
};

export type OrganizationInvitationStatus = 'pending' | 'accepted' | 'expired' | 'canceled';

export type OrganizationInvitation = {
  id: string;
  organizationId: string;
  email: string;
  role: MembershipRole;
  teamId?: string;
  token: string;
  status: OrganizationInvitationStatus;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
};

export type OrganizationMemberDetail = UserMembership & {
  userName?: string;
  userEmail?: string;
  teamName?: string;
};
