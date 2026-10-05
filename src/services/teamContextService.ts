/**
 * teamContextService.ts
 *
 * Serviço de Resolução de Contexto de Equipe e Memberships da Fase 11.
 *
 * Responsabilidades:
 *   1. Mapear memberships ativas do usuário para contextos de equipe disponíveis.
 *   2. Preservar compatibilidade com o vínculo legado (profiles.competition_team_id).
 *   3. Gerenciar e validar a seleção explícita de equipe ativa (sem confiar em estado cego).
 *   4. Bloquear qualquer tentativa de chaveamento não autorizado (cross-team/cross-org).
 */

import { dataAccess } from './dataAccess';
import type { UserProfile } from '@/types/auth';
import type { UserMembership } from '@/types/identity';
import type { CompetitionTeam } from '@/types/registration';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';

export interface UserAvailableTeamContext {
  id?: string;
  membershipId?: string;
  competitionTeamId: string;
  teamId: string;
  teamName: string;
  teamShortName: string;
  competitionId: string;
  competitionName: string;
  organizationId?: string;
  role: string;
  accessToken: string;
  isLegacyFallback?: boolean;
}

export type TeamContextCandidate =
  | UserAvailableTeamContext
  | {
      id?: string;
      competitionTeamId?: string;
      teamId?: string;
      name?: string;
      teamName?: string;
      competitionId?: string;
    };

const STORAGE_PREFIX = 'baseos_active_team_context_';

export class TeamContextService {
  /**
   * Retorna todas as equipes disponíveis para o usuário autenticado.
   * Prioriza memberships ativas e usa profiles.competition_team_id como fallback de compatibilidade.
   */
  public static async getUserAvailableTeams(
    user: UserProfile | null | undefined,
    preloadedMemberships?: UserMembership[],
  ): Promise<UserAvailableTeamContext[]> {
    if (!user) return [];

    const available: UserAvailableTeamContext[] = [];
    const seenCtIds = new Set<string>();

    // 1. Busca memberships ativas
    const memberships = preloadedMemberships ?? (await dataAccess.listUserMemberships(user.id));
    const activeMemberships = memberships.filter(
      (m) => m.userId === user.id && m.status === 'active' && (m.role === 'team_manager' || m.role === 'admin' || m.role === 'organizer')
    );

    const [allCompetitionTeams, allTeams, allCompetitions] = await Promise.all([
      dataAccess.listCompetitionTeams ? dataAccess.listCompetitionTeams() : Promise.resolve([]),
      dataAccess.listTeams(),
      dataAccess.listCompetitions(),
    ]);

    for (const mem of activeMemberships) {
      let targetCt: CompetitionTeam | null = null;

      if (mem.competitionTeamId) {
        targetCt = (await dataAccess.getCompetitionTeamById(mem.competitionTeamId)) || null;
      } else if (mem.teamId) {
        // Se a membership tem apenas teamId, busca a participação na competição indicada ou primeira disponível
        const matches = allCompetitionTeams.filter(
          (ct) => ct.teamId === mem.teamId && (!mem.competitionId || ct.competitionId === mem.competitionId)
        );
        if (matches.length > 0) {
          targetCt = matches[0];
        }
      }

      if (targetCt && !seenCtIds.has(targetCt.id)) {
        seenCtIds.add(targetCt.id);
        const teamRec = allTeams.find((t) => t.id === targetCt.teamId);
        const compRec = allCompetitions.find((c) => c.id === targetCt.competitionId);

        available.push({
          id: targetCt.id,
          membershipId: mem.id,
          competitionTeamId: targetCt.id,
          teamId: targetCt.teamId,
          teamName: targetCt.teamName || teamRec?.name || 'Equipe',
          teamShortName: targetCt.teamShortName || teamRec?.shortName || 'EQP',
          competitionId: targetCt.competitionId,
          competitionName: compRec?.name || 'Competição',
          organizationId: mem.organizationId || compRec?.organizationId || teamRec?.organizationId,
          role: mem.role,
          accessToken: targetCt.accessToken,
          isLegacyFallback: false,
        });
      } else if (mem.teamId && !targetCt && !seenCtIds.has(mem.teamId)) {
        // Suporte a membership com equipe direta sem inscrição prévia em competição
        seenCtIds.add(mem.teamId);
        const teamRec = allTeams.find((t) => t.id === mem.teamId);
        const effectiveId = mem.competitionTeamId || mem.teamId;
        available.push({
          id: effectiveId,
          membershipId: mem.id,
          competitionTeamId: effectiveId,
          teamId: mem.teamId,
          teamName: teamRec?.name || 'Equipe',
          teamShortName: teamRec?.shortName || 'EQP',
          competitionId: mem.competitionId || '',
          competitionName: 'Geral',
          organizationId: mem.organizationId || teamRec?.organizationId,
          role: mem.role,
          accessToken: '',
          isLegacyFallback: false,
        });
      }
    }

    // 2. Fallback de Compatibilidade: profiles.competition_team_id (se ainda não incluído)
    if (user.competitionTeamId && !seenCtIds.has(user.competitionTeamId)) {
      try {
        const ct = await dataAccess.getCompetitionTeamById(user.competitionTeamId);
        if (ct) {
          seenCtIds.add(ct.id);
          const teamRec = allTeams.find((t) => t.id === ct.teamId);
          const compRec = allCompetitions.find((c) => c.id === ct.competitionId);

          available.push({
            id: ct.id,
            competitionTeamId: ct.id,
            teamId: ct.teamId,
            teamName: ct.teamName || teamRec?.name || 'Equipe',
            teamShortName: ct.teamShortName || teamRec?.shortName || 'EQP',
            competitionId: ct.competitionId,
            competitionName: compRec?.name || 'Competição',
            organizationId: compRec?.organizationId || teamRec?.organizationId,
            role: 'team_manager',
            accessToken: ct.accessToken,
            isLegacyFallback: true,
          });
        }
      } catch {
        // Ignora falha de busca no fallback legado
      }
    }

    return available;
  }

  /**
   * Valida se a equipe de destino pode ser selecionada.
   */
  public static canSwitchToTeam(
    targetId: string,
    availableTeams: Array<{ id?: string; competitionTeamId?: string; teamId?: string }>,
  ): boolean {
    if (!targetId || !availableTeams || availableTeams.length === 0) return false;
    return availableTeams.some(
      (t) => (t.id && t.id === targetId) || t.competitionTeamId === targetId || t.teamId === targetId,
    );
  }

  /**
   * Obtém a equipe ativa do usuário com validação de segurança.
   * Se houver seleção salva no storage e ela for válida, usa-a.
   * Caso contrário, adota a primeira equipe disponível.
   */
  public static getActiveTeamContext<T extends TeamContextCandidate = UserAvailableTeamContext>(
    userId: string,
    availableTeams: T[],
  ): T | null;
  public static getActiveTeamContext<T extends TeamContextCandidate = UserAvailableTeamContext>(
    availableTeams: T[],
  ): T | null;
  public static getActiveTeamContext<T extends TeamContextCandidate = UserAvailableTeamContext>(
    firstArg: string | T[],
    secondArg?: T[],
  ): T | null {
    let userId = 'default';
    let availableTeams: T[] = [];

    if (Array.isArray(firstArg)) {
      availableTeams = firstArg;
    } else if (typeof firstArg === 'string') {
      userId = firstArg;
      availableTeams = Array.isArray(secondArg) ? secondArg : [];
    }

    if (!availableTeams || availableTeams.length === 0) return null;

    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const storedCtId =
          window.sessionStorage.getItem(`${STORAGE_PREFIX}${userId}`) ||
          window.sessionStorage.getItem('baseos_active_team_id');
        if (storedCtId) {
          const match = availableTeams.find(
            (t) => (t.id && t.id === storedCtId) || t.competitionTeamId === storedCtId || t.teamId === storedCtId,
          );
          if (match) return match;
        }
      }
    } catch {
      // Fallback para default
    }

    return availableTeams[0];
  }

  /**
   * Define a equipe ativa para o usuário.
   * Valida obrigatoriamente que a equipe pertença às equipes autorizadas para evitar IDOR.
   */
  public static setActiveTeamContext<T extends TeamContextCandidate = UserAvailableTeamContext>(
    userId: string,
    competitionTeamId: string,
    availableTeams: T[],
  ): T;
  public static setActiveTeamContext<T extends TeamContextCandidate = UserAvailableTeamContext>(
    targetTeam: TeamContextCandidate,
    availableTeams: T[],
  ): T;
  public static setActiveTeamContext<T extends TeamContextCandidate = UserAvailableTeamContext>(
    targetId: string,
    availableTeams: T[],
  ): T;
  public static setActiveTeamContext<T extends TeamContextCandidate = UserAvailableTeamContext>(
    arg1: string | TeamContextCandidate,
    arg2: string | T[],
    arg3?: T[],
  ): T {
    let userId = 'default';
    let targetId = '';
    let availableTeams: T[] = [];

    if (typeof arg1 === 'string' && typeof arg2 === 'string' && Array.isArray(arg3)) {
      userId = arg1;
      targetId = arg2;
      availableTeams = arg3;
    } else if (typeof arg1 === 'object' && arg1 !== null && Array.isArray(arg2)) {
      targetId = arg1.id || arg1.competitionTeamId || arg1.teamId || '';
      availableTeams = arg2;
    } else if (typeof arg1 === 'string' && Array.isArray(arg2)) {
      targetId = arg1;
      availableTeams = arg2;
    }

    const match = availableTeams.find(
      (t) => (t.id && t.id === targetId) || t.competitionTeamId === targetId || t.teamId === targetId,
    );
    if (!match) {
      throw new Error('Acesso negado: a equipe selecionada não pertence às memberships ativas do usuário (operação não autorizada).');
    }

    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(`${STORAGE_PREFIX}${userId}`, targetId);
        window.sessionStorage.setItem('baseos_active_team_id', targetId);
      }
    } catch {
      // Ignore sessionStorage issues in SSR/tests
    }

    return match;
  }

  /**
   * Limpa a seleção de equipe ativa (ex.: no logout).
   */
  public static clearActiveTeamContext(userId?: string): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        if (userId) {
          window.sessionStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
        } else {
          Object.keys(window.sessionStorage).forEach((key) => {
            if (key.startsWith(STORAGE_PREFIX)) {
              window.sessionStorage.removeItem(key);
            }
          });
        }
        window.sessionStorage.removeItem('baseos_active_team_id');
      }
    } catch {
      // Ignore
    }
  }
}
