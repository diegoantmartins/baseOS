import { describe, it, expect, beforeEach } from 'vitest';
import { TeamService } from '@/services/teamService';
import { TeamContextService } from '@/services/teamContextService';
import { dataAccess } from '@/services/dataAccess';
import type { UserProfile } from '@/types/auth';
import type { TeamRecord, CompetitionRecord, MatchRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';

describe('BaseOS — Portal da Equipe: Edição, Salvamento, Exclusão e Duplicação', () => {
  const orgA = 'org-vortex-portal-test';
  const orgB = 'org-rival-portal-test';

  const managerUserA: UserProfile = {
    id: 'user-manager-a',
    email: 'gestor.a@vortex.test',
    name: 'Gestor Vortex A',
    role: 'team',
    organizationId: orgA,
  };

  const managerUserB: UserProfile = {
    id: 'user-manager-b',
    email: 'gestor.b@rival.test',
    name: 'Gestor Rival B',
    role: 'team',
    organizationId: orgB,
  };

  let testComp: CompetitionRecord;
  let testTeamA: TeamRecord;
  let testCtA: CompetitionTeam;

  beforeEach(async () => {
    dataAccess.setActiveOrganizationId(orgA);

    // 1. Cria competição de teste na Org A
    testComp = await dataAccess.createCompetition({
      id: `comp-test-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: 'Torneio Homologação Portal',
      slug: `torneio-portal-${Date.now()}`,
      organizationId: orgA,
      modality: 'indoor',
      genderCategory: 'male',
      defaultDeadline: new Date(Date.now() + 86400000 * 10).toISOString(),
      status: 'in-progress',
    });

    // 2. Cria equipe A na Org A
    testTeamA = await dataAccess.createTeam({
      id: `team-a-${Date.now()}`,
      name: 'Vortex Alfa Clube',
      shortName: 'VAC',
      modality: 'indoor',
      organizationId: orgA,
      city: 'Curitiba',
      state: 'PR',
      coachName: 'Prof. Bernardo',
      logoUrl: 'https://exemplo.com/logo-a.png',
    });

    // 3. Cria inscrição na competição
    testCtA = await dataAccess.createCompetitionTeam({
      competitionId: testComp.id,
      teamId: testTeamA.id,
      teamName: testTeamA.name,
      teamShortName: testTeamA.shortName,
      registrationDeadline: testComp.defaultDeadline!,
      status: 'invited',
      isLocked: false,
    });

    // 4. Cria membership ativa para o gestor A
    await dataAccess.createUserMembership({
      id: `mem-a-${Date.now()}`,
      userId: managerUserA.id,
      organizationId: orgA,
      competitionId: testComp.id,
      teamId: testTeamA.id,
      competitionTeamId: testCtA.id,
      role: 'team_manager',
      status: 'active',
    });
  });

  // =========================================================================
  // CENÁRIO 1 E 2: EDIÇÃO E SALVAMENTO DA EQUIPE (PERSISTÊNCIA GARANTIDA)
  // =========================================================================
  describe('Cenário 1 e 2: Edição, Salvamento e Recarregamento do Portal', () => {
    it('1.1 Permite editar nome, sigla, técnico, cidade, UF e escudo com persistência efetiva', async () => {
      const updateResult = await dataAccess.updateTeamProfile({
        teamId: testTeamA.id,
        competitionTeamId: testCtA.id,
        name: 'Vortex Alfa Renovado',
        shortName: 'VAR',
        coachName: 'Técnico Atualizado',
        city: 'Londrina',
        state: 'PR',
        logoUrl: 'https://exemplo.com/novo-escudo.png',
      });

      expect(updateResult.ok).toBe(true);

      // Recarrega do banco/dataAccess diretamente
      const refreshedTeam = await dataAccess.getTeam(testTeamA.id);
      expect(refreshedTeam?.name).toBe('Vortex Alfa Renovado');
      expect(refreshedTeam?.shortName).toBe('VAR');
      expect(refreshedTeam?.coachName).toBe('Técnico Atualizado');
      expect(refreshedTeam?.city).toBe('Londrina');
      expect(refreshedTeam?.state).toBe('PR');
      expect(refreshedTeam?.logoUrl).toBe('https://exemplo.com/novo-escudo.png');

      // Verifica sincronização na inscrição da competição
      const refreshedCt = await dataAccess.getCompetitionTeamById(testCtA.id);
      expect(refreshedCt?.teamName).toBe('Vortex Alfa Renovado');
      expect(refreshedCt?.teamShortName).toBe('VAR');
    });

    it('1.2 Recarregar o portal mantém os dados atualizados no contexto de equipes disponíveis', async () => {
      await dataAccess.updateTeamProfile({
        teamId: testTeamA.id,
        competitionTeamId: testCtA.id,
        name: 'Vortex Super Vôlei',
        shortName: 'VSV',
      });

      // Simula recarregamento do portal pelo gestor A
      const available = await TeamContextService.getUserAvailableTeams(managerUserA);
      expect(available.length).toBeGreaterThan(0);

      const activeContext = TeamContextService.getActiveTeamContext(managerUserA.id, available);
      expect(activeContext?.teamName).toBe('Vortex Super Vôlei');
      expect(activeContext?.teamShortName).toBe('VSV');
    });
  });

  // =========================================================================
  // CENÁRIO 3: TRATAMENTO DE ERRO DE PERSISTÊNCIA (SEM FALSO SUCESSO)
  // =========================================================================
  describe('Cenário 3: Tentar Salvar com Erro de Persistência', () => {
    it('3.1 Retorna erro claro e sem falso sucesso quando o ID da equipe não existe', async () => {
      const res = await dataAccess.updateTeamProfile({
        teamId: 'team-inexistente-xyz',
        name: 'Equipe Fantasma',
        shortName: 'FNT',
      });

      expect(res.ok).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error).toContain('não encontrada');
    });
  });

  // =========================================================================
  // CENÁRIO 4: EXCLUSÃO DE EQUIPE AUTORIZADA SEM DEPENDÊNCIAS IMPEDITIVAS
  // =========================================================================
  describe('Cenário 4: Exclusão de Equipe Autorizada sem Dependências', () => {
    it('4.1 Permite excluir equipe autorizada sem partidas nem atletas, limpando contexto e memberships', async () => {
      // Equipe recém-criada sem partidas nem atletas
      const check = await TeamService.canDeleteTeam(managerUserA, testTeamA.id, testCtA.id);
      expect(check.ok).toBe(true);
      expect(check.errors).toHaveLength(0);

      const deleteRes = await TeamService.deleteTeam(managerUserA, testTeamA.id, testCtA.id);
      expect(deleteRes.ok).toBe(true);

      // Equipe foi removida do dataAccess
      const deletedTeam = await dataAccess.getTeam(testTeamA.id);
      expect(deletedTeam).toBeNull();

      const deletedCt = await dataAccess.getCompetitionTeamById(testCtA.id);
      expect(deletedCt).toBeNull();

      // Memberships do usuário para esta equipe foram limpas
      const availableAfter = await TeamContextService.getUserAvailableTeams(managerUserA);
      const stillPresent = availableAfter.some((t) => t.teamId === testTeamA.id || t.competitionTeamId === testCtA.id);
      expect(stillPresent).toBe(false);
    });
  });

  // =========================================================================
  // CENÁRIO 5: EXCLUSÃO DE EQUIPE COM DEPENDÊNCIAS (INTEGRIDADE PRESERVADA)
  // =========================================================================
  describe('Cenário 5: Exclusão com Dependências (Histórico e Elenco)', () => {
    it('5.1 Bloqueia exclusão de equipe que possui partidas vinculadas no histórico', async () => {
      // Registra uma partida envolvendo a equipe A
      await dataAccess.createMatch({
        competitionId: testComp.id,
        matchNumber: 1,
        round: 1,
        teamAId: testTeamA.id,
        teamBId: 'team-outro-qualquer',
        teamAName: testTeamA.name,
        teamBName: 'Rival',
        teamAShortName: testTeamA.shortName,
        teamBShortName: 'RIV',
        venue: 'Quadra Central',
        scheduledTime: '2026-10-10T14:00:00Z',
        status: 'completed',
        winnerId: testTeamA.id,
        sets: [],
        referees: [],
      });

      const check = await TeamService.canDeleteTeam(managerUserA, testTeamA.id, testCtA.id);
      expect(check.ok).toBe(false);
      expect(check.errors[0]).toContain('partida(s) registradas no histórico esportivo');

      // Tentativa de exclusão é bloqueada
      const deleteRes = await TeamService.deleteTeam(managerUserA, testTeamA.id, testCtA.id);
      expect(deleteRes.ok).toBe(false);
      expect(deleteRes.errors?.[0]).toContain('partida(s)');

      // Equipe e partida permanecem intactas no banco
      const teamStillExists = await dataAccess.getTeam(testTeamA.id);
      expect(teamStillExists).not.toBeNull();
    });

    it('5.2 Bloqueia exclusão de equipe que possui atletas ativos no elenco', async () => {
      // Adiciona atleta na equipe A
      await dataAccess.createCompetitionAthlete({
        competitionTeamId: testCtA.id,
        name: 'Atleta Teste Bloqueio',
        position: 'Ponteiro',
        jerseyNumber: 10,
        gender: 'male',
        isCaptain: false,
        isLibero: false,
      });

      const check = await TeamService.canDeleteTeam(managerUserA, testTeamA.id, testCtA.id);
      expect(check.ok).toBe(false);
      expect(check.errors[0]).toContain('atleta(s) cadastrado(s) no elenco');

      const deleteRes = await TeamService.deleteTeam(managerUserA, testTeamA.id, testCtA.id);
      expect(deleteRes.ok).toBe(false);
      expect(deleteRes.errors?.[0]).toContain('Remova os atletas antes de excluir');
    });
  });

  // =========================================================================
  // CENÁRIO 6: SEGURANÇA E BLOQUEIO DE OPERAÇÕES NÃO AUTORIZADAS (IDOR)
  // =========================================================================
  describe('Cenário 6: Bloqueio de Operações Não Autorizadas (Cross-Tenant / Cross-Team)', () => {
    it('6.1 Bloqueia usuário de outra organização tentando excluir equipe alheia', async () => {
      // Gestor B (Org B) tenta excluir equipe da Org A
      const check = await TeamService.canDeleteTeam(managerUserB, testTeamA.id, testCtA.id);
      expect(check.ok).toBe(false);
      expect(check.errors[0]).toContain('Acesso negado');

      const deleteRes = await TeamService.deleteTeam(managerUserB, testTeamA.id, testCtA.id);
      expect(deleteRes.ok).toBe(false);
      expect(deleteRes.errors?.[0]).toContain('Acesso negado');

      // A equipe A permanece intacta
      expect(await dataAccess.getTeam(testTeamA.id)).not.toBeNull();
    });

    it('6.2 Bloqueia usuário sem permissão tentando duplicar equipe alheia', async () => {
      const dupRes = await TeamService.duplicateTeam(managerUserB, testTeamA.id, testComp.id);
      expect(dupRes.ok).toBe(false);
      expect(dupRes.errors?.[0]).toContain('Acesso negado');
    });
  });

  // =========================================================================
  // CENÁRIOS 7, 8 E 9: FLUXO COMPLETO DE EQUIPES DUPLICADAS
  // =========================================================================
  describe('Cenários 7, 8 e 9: Ciclo de Vida da Equipe Duplicada (Criação, Edição e Exclusão)', () => {
    it('7.1 Duplica equipe com identificador próprio, preservando organização sem herdar partidas', async () => {
      // Cria uma partida na equipe original para comprovar isolamento
      await dataAccess.createMatch({
        competitionId: testComp.id,
        matchNumber: 2,
        round: 1,
        teamAId: testTeamA.id,
        teamBId: 'rival-orig',
        teamAName: testTeamA.name,
        teamBName: 'Rival',
        teamAShortName: testTeamA.shortName,
        teamBShortName: 'RIV',
        venue: 'Quadra 2',
        scheduledTime: '2026-10-10T16:00:00Z',
        status: 'completed',
        winnerId: testTeamA.id,
        sets: [],
        referees: [],
      });

      const dupRes = await TeamService.duplicateTeam(managerUserA, testTeamA.id, testComp.id);
      expect(dupRes.ok).toBe(true);
      expect(dupRes.team).toBeDefined();
      expect(dupRes.competitionTeam).toBeDefined();

      const duplicatedTeam = dupRes.team!;
      const duplicatedCt = dupRes.competitionTeam!;

      // 1. Identificador novo e independente
      expect(duplicatedTeam.id).not.toBe(testTeamA.id);
      expect(duplicatedCt.id).not.toBe(testCtA.id);

      // 2. Mesma organização e modalidade
      expect(duplicatedTeam.organizationId).toBe(testTeamA.organizationId);
      expect(duplicatedTeam.modality).toBe(testTeamA.modality);
      expect(duplicatedTeam.name).toContain('(Cópia)');

      // 3. NÃO herdou partidas da equipe original
      const allMatches = await dataAccess.listMatches();
      const dupMatches = allMatches.filter(
        (m) => m.teamAId === duplicatedTeam.id || m.teamBId === duplicatedTeam.id
      );
      expect(dupMatches).toHaveLength(0);

      // 4. Aparece no contexto de equipes disponíveis do gestor
      const available = await TeamContextService.getUserAvailableTeams(managerUserA);
      const foundInAvailable = available.find((t) => t.teamId === duplicatedTeam.id);
      expect(foundInAvailable).toBeDefined();
      expect(foundInAvailable?.competitionTeamId).toBe(duplicatedCt.id);

      // 8. Edita e salva a equipe duplicada de forma independente
      const editDupRes = await dataAccess.updateTeamProfile({
        teamId: duplicatedTeam.id,
        competitionTeamId: duplicatedCt.id,
        name: 'Vortex B - Time Sub-21',
        shortName: 'VB2',
        city: 'Cascavel',
      });
      expect(editDupRes.ok).toBe(true);

      const refreshedDup = await dataAccess.getTeam(duplicatedTeam.id);
      expect(refreshedDup?.name).toBe('Vortex B - Time Sub-21');
      expect(refreshedDup?.city).toBe('Cascavel');

      // A equipe original não foi alterada
      const origRefreshed = await dataAccess.getTeam(testTeamA.id);
      expect(origRefreshed?.name).toBe(testTeamA.name);

      // 9. Exclui a equipe duplicada autorizada (sem dependências)
      const deleteDupRes = await TeamService.deleteTeam(managerUserA, duplicatedTeam.id, duplicatedCt.id);
      expect(deleteDupRes.ok).toBe(true);

      expect(await dataAccess.getTeam(duplicatedTeam.id)).toBeNull();
      expect(await dataAccess.getCompetitionTeamById(duplicatedCt.id)).toBeNull();

      // Equipe original continua existindo e intacta
      expect(await dataAccess.getTeam(testTeamA.id)).not.toBeNull();
    });
  });

  // =========================================================================
  // CENÁRIOS 10 E 11: CONSISTÊNCIA DE SESSÃO E NÃO-REGRESSÃO
  // =========================================================================
  describe('Cenários 10 e 11: Consistência Após Operações e Não-Regressão', () => {
    it('10.1 Estado do TeamContextService é consistente com o banco após múltiplas operações', async () => {
      // Duplica duas equipes
      const dup1 = await TeamService.duplicateTeam(managerUserA, testTeamA.id, testComp.id);
      const dup2 = await TeamService.duplicateTeam(managerUserA, testTeamA.id, testComp.id);
      expect(dup1.ok).toBe(true);
      expect(dup2.ok).toBe(true);

      let available = await TeamContextService.getUserAvailableTeams(managerUserA);
      expect(available.length).toBeGreaterThanOrEqual(3);

      // Exclui a primeira duplicada
      await TeamService.deleteTeam(managerUserA, dup1.team!.id, dup1.competitionTeam!.id);

      available = await TeamContextService.getUserAvailableTeams(managerUserA);
      expect(available.some((t) => t.teamId === dup1.team!.id)).toBe(false);
      expect(available.some((t) => t.teamId === dup2.team!.id)).toBe(true);
      expect(available.some((t) => t.teamId === testTeamA.id)).toBe(true);

      // Exclui a segunda duplicada
      await TeamService.deleteTeam(managerUserA, dup2.team!.id, dup2.competitionTeam!.id);
      available = await TeamContextService.getUserAvailableTeams(managerUserA);
      expect(available.some((t) => t.teamId === dup2.team!.id)).toBe(false);
    });

    it('11.1 Administradores da organização continuam autorizados a excluir e gerenciar equipes', async () => {
      const adminUser: UserProfile = {
        id: 'admin-org-user',
        email: 'admin@vortex.test',
        name: 'Administrador Org',
        role: 'admin',
        organizationId: orgA,
      };

      const check = await TeamService.canDeleteTeam(adminUser, testTeamA.id, testCtA.id);
      expect(check.ok).toBe(true);
    });
  });
});
