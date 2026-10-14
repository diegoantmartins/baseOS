/**
 * teamService.ts — Serviço Canônico de Gestão do Ciclo de Vida de Equipes
 *
 * Responsabilidades:
 * 1. Validação de autorização (RBAC/RLS) para gestão, edição, exclusão e duplicação.
 * 2. Edição de dados cadastrais e escudo da equipe com persistência garantida.
 * 3. Duplicação segura de equipes com novo identificador e isolamento de vínculos operacionais.
 * 4. Exclusão segura de equipes com verificação estrita de integridade referencial
 *    (sem exclusão em cascata indiscriminada de histórico ou partidas).
 */

import { dataAccess, generateToken } from './dataAccess';
import { TeamContextService } from './teamContextService';
import type { UserProfile } from '@/types/auth';
import type { TeamRecord, MatchRecord } from '@/types/entities';
import type { CompetitionTeam, CompetitionAthlete } from '@/types/registration';
import type { UserMembership } from '@/types/identity';

export interface IntegrityCheckResult {
  ok: boolean;
  errors: string[];
}

export interface DuplicateTeamResult {
  ok: boolean;
  errors?: string[];
  team?: TeamRecord;
  competitionTeam?: CompetitionTeam;
}

export interface DeleteTeamResult {
  ok: boolean;
  errors?: string[];
}

export class TeamService {
  /**
   * Valida se o usuário tem autorização explícita para administrar/editar a equipe.
   */
  public static async isUserAuthorizedForTeam(
    user: UserProfile | null | undefined,
    teamId: string,
    competitionTeamId?: string,
  ): Promise<boolean> {
    if (!user) return false;

    // Administradores de plataforma e organizadores têm acesso
    if (user.role === 'admin' || user.isPlatformAdmin) return true;

    // Busca memberships ativas do usuário
    const memberships = await dataAccess.listUserMemberships(user.id);
    const active = memberships.filter(
      (m) =>
        m.userId === user.id &&
        m.status === 'active' &&
        (m.role === 'team_manager' || m.role === 'admin' || m.role === 'organizer')
    );

    // Checa vínculo direto por teamId
    if (active.some((m) => m.teamId === teamId)) {
      return true;
    }

    // Checa vínculo por competitionTeamId
    if (competitionTeamId && active.some((m) => m.competitionTeamId === competitionTeamId)) {
      return true;
    }

    // Checa vínculo indireto (membership aponta para competitionTeam que pertence à teamId)
    const allCt = await (dataAccess.listCompetitionTeams ? dataAccess.listCompetitionTeams() : Promise.resolve([]));
    const isLinkedViaCt = active.some((m) => {
      if (!m.competitionTeamId) return false;
      const ct = allCt.find((c) => c.id === m.competitionTeamId);
      return ct && ct.teamId === teamId;
    });

    if (isLinkedViaCt) return true;

    // Fallback legado de perfil
    if (user.competitionTeamId) {
      if (competitionTeamId && user.competitionTeamId === competitionTeamId) return true;
      const legacyCt = await dataAccess.getCompetitionTeamById(user.competitionTeamId);
      if (legacyCt && legacyCt.teamId === teamId) return true;
    }

    return false;
  }

  /**
   * Avalia se uma equipe pode ser excluída pelo usuário no portal.
   * Regras:
   * 1. Usuário deve ser autorizado para a equipe.
   * 2. Equipe não pode possuir partidas criadas ou finalizadas no histórico.
   * 3. Equipe não pode possuir atletas inscritos no elenco da competição atual (devem ser removidos previamente).
   * 4. Não pode haver inscrições ativas em outras competições.
   */
  public static async canDeleteTeam(
    user: UserProfile | null | undefined,
    teamId: string,
    competitionTeamId?: string,
  ): Promise<IntegrityCheckResult> {
    const errors: string[] = [];

    if (!user) {
      return { ok: false, errors: ['Operação exige usuário autenticado.'] };
    }

    const authorized = await this.isUserAuthorizedForTeam(user, teamId, competitionTeamId);
    if (!authorized) {
      return {
        ok: false,
        errors: ['Acesso negado: você não possui autorização para excluir esta equipe.'],
      };
    }

    const currentOrgId = dataAccess.getActiveOrganizationId ? dataAccess.getActiveOrganizationId() : null;
    if (!currentOrgId && user.organizationId && dataAccess.setActiveOrganizationId) {
      dataAccess.setActiveOrganizationId(user.organizationId);
    }

    const [allMatches, allCt] = await Promise.all([
      dataAccess.listMatches(),
      dataAccess.listCompetitionTeams ? dataAccess.listCompetitionTeams() : Promise.resolve([]),
    ]);

    // 1. Checagem de partidas no histórico esportivo
    const teamMatches = allMatches.filter((m: MatchRecord) => m.teamAId === teamId || m.teamBId === teamId);
    if (teamMatches.length > 0) {
      errors.push(
        `Esta agremiação não pode ser excluída pois possui ${teamMatches.length} partida(s) registradas no histórico esportivo.`
      );
    }

    // 2. Checagem de atletas no elenco da inscrição da competição atual
    if (competitionTeamId) {
      const athletes = await dataAccess.listCompetitionAthletes(competitionTeamId);
      if (athletes && athletes.length > 0) {
        errors.push(
          `Esta equipe possui ${athletes.length} atleta(s) cadastrado(s) no elenco. Remova os atletas antes de excluir a equipe.`
        );
      }
    }

    // 3. Checagem de inscrições em outras competições
    const otherRegistrations = allCt.filter(
      (ct: CompetitionTeam) => ct.teamId === teamId && (!competitionTeamId || ct.id !== competitionTeamId)
    );
    if (otherRegistrations.length > 0) {
      errors.push(
        `Esta agremiação está vinculada a outras ${otherRegistrations.length} inscrição(ões) de competição. Remova as inscrições antes de excluir a equipe.`
      );
    }

    return { ok: errors.length === 0, errors };
  }

  /**
   * Executa a exclusão segura de uma equipe através do portal.
   */
  public static async deleteTeam(
    user: UserProfile | null | undefined,
    teamId: string,
    competitionTeamId?: string,
  ): Promise<DeleteTeamResult> {
    const check = await this.canDeleteTeam(user, teamId, competitionTeamId);
    if (!check.ok) {
      return { ok: false, errors: check.errors };
    }

    try {
      // 1. Se informada inscrição na competição, remove a inscrição
      if (competitionTeamId) {
        if (dataAccess.deleteCompetitionTeam) {
          await dataAccess.deleteCompetitionTeam(competitionTeamId);
        }
      }

      // 2. Remove memberships do usuário vinculadas a esta equipe
      if (user?.id) {
        const memberships = await dataAccess.listUserMemberships(user.id);
        const related = memberships.filter(
          (m: UserMembership) =>
            m.userId === user.id &&
            (m.teamId === teamId || (competitionTeamId && m.competitionTeamId === competitionTeamId))
        );
        for (const m of related) {
          await dataAccess.deleteUserMembership(m.id);
        }
      }

      // 3. Se não houver outras inscrições de competição para esta equipe, exclui a agremiação global
      const allCt = await (dataAccess.listCompetitionTeams ? dataAccess.listCompetitionTeams() : Promise.resolve([]));
      const remainingCt = allCt.filter((ct: CompetitionTeam) => ct.teamId === teamId && ct.id !== competitionTeamId);

      if (remainingCt.length === 0) {
        await dataAccess.deleteTeam(teamId);
      }

      // 4. Limpa contexto ativo se pertencia a esta equipe
      if (user?.id) {
        TeamContextService.clearActiveTeamContext(user.id);
      }

      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir equipe.';
      return { ok: false, errors: [msg] };
    }
  }

  /**
   * Duplica uma equipe existente com novo identificador e ciclo de vida isolado.
   * Regras:
   * 1. Usuário deve ter autorização na equipe de origem.
   * 2. Novo identificador único gerado.
   * 3. Mesma organização e modalidade.
   * 4. NÃO herda partidas, outras inscrições ou permissões de outros usuários.
   * 5. Cria vínculo (membership) de team_manager para o usuário autenticado.
   * 6. Se fornecido contexto de competição, cria nova CompetitionTeam com status 'invited'.
   */
  public static async duplicateTeam(
    user: UserProfile | null | undefined,
    sourceTeamId: string,
    competitionId?: string,
  ): Promise<DuplicateTeamResult> {
    if (!user) {
      return { ok: false, errors: ['Operação exige usuário autenticado.'] };
    }

    const authorized = await this.isUserAuthorizedForTeam(user, sourceTeamId);
    if (!authorized) {
      return {
        ok: false,
        errors: ['Acesso negado: você não possui autorização para duplicar esta equipe.'],
      };
    }

    const sourceTeam = await dataAccess.getTeam(sourceTeamId);
    if (!sourceTeam) {
      return { ok: false, errors: ['Equipe de origem não encontrada.'] };
    }

    const newTeamId = `team-dup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const baseName = `${sourceTeam.name} (Cópia)`.slice(0, 50);

    // Gera sigla com 3-4 caracteres garantida
    const sourceShort = (sourceTeam.shortName || 'EQP').trim().toUpperCase();
    let newShort = sourceShort.length <= 3 ? `${sourceShort}2` : `${sourceShort.slice(0, 3)}2`;
    if (newShort.length < 2) newShort = 'CP1';

    try {
      // 1. Cria a nova entidade global da equipe
      const createdTeam = await dataAccess.createTeam({
        id: newTeamId,
        name: baseName,
        shortName: newShort,
        modality: sourceTeam.modality,
        organizationId: sourceTeam.organizationId,
        genderCategory: sourceTeam.genderCategory,
        city: sourceTeam.city,
        coachName: sourceTeam.coachName,
        logoUrl: sourceTeam.logoUrl,
      });

      let createdCt: CompetitionTeam | undefined;

      // 2. Se contexto de competição informado, cria a inscrição na competição
      if (competitionId) {
        const comp = await dataAccess.getCompetition(competitionId);
        const deadlineIso = comp?.defaultDeadline || new Date(Date.now() + 86400000 * 30).toISOString();

        createdCt = await dataAccess.createCompetitionTeam({
          competitionId,
          teamId: createdTeam.id,
          teamName: createdTeam.name,
          teamShortName: createdTeam.shortName,
          registrationDeadline: deadlineIso,
          isLocked: false,
          status: 'invited',
        });
      }

      // 3. Cria membership oficial de gestor para o usuário autenticado
      await dataAccess.createUserMembership({
        userId: user.id,
        organizationId: sourceTeam.organizationId || '',
        competitionId: competitionId || undefined,
        teamId: createdTeam.id,
        competitionTeamId: createdCt?.id || undefined,
        role: 'team_manager',
        status: 'active',
      });

      return {
        ok: true,
        team: createdTeam,
        competitionTeam: createdCt,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao duplicar equipe.';
      return { ok: false, errors: [msg] };
    }
  }
}
