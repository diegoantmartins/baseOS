import { beforeEach, describe, expect, it } from 'vitest';
import { registerTeamInCompetition } from '@/services/registrationService';
import { dataAccess } from '@/services/dataAccess';
import { authService } from '@/services/authService';
import { OperationalAuditService } from '@/services/operationalAuditService';
import type { CompetitionRecord } from '@/types/entities';

describe('teamRegistrationFlow — registerTeamInCompetition', () => {
  let competition: CompetitionRecord;

  beforeEach(async () => {
    // Configura uma competição padrão com defaultDeadline válido para os testes
    competition = await dataAccess.createCompetition({
      name: 'Taça Cidade Maravilhosa 2026',
      modality: 'indoor',
      format: 'groups_and_playoffs',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'male',
      defaultDeadline: '2026-11-20T23:59:00.000Z',
      status: 'registration-open',
    });
  });

  describe('Caso A: Nova Equipe', () => {
    it('deve criar TeamRecord, CompetitionTeam, PersonRecord e gerar link do portal', async () => {
      const result = await registerTeamInCompetition({
        competitionId: competition.id,
        name: 'Vôlei Futuro São Caetano',
        shortName: 'VFS',
        city: 'São Caetano do Sul',
        state: 'SP',
        coachName: 'Prof. Marcos',
        managerName: 'Renata Vasconcelos',
        managerPhone: '(11) 98888-7777',
        managerEmail: 'renata@voleifuturo.com.br',
        operator: 'Admin Diego',
      });

      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.isExistingTeamReused).toBe(false);

      // 1. TeamRecord criada
      expect(result.team).toBeDefined();
      expect(result.team?.name).toBe('Vôlei Futuro São Caetano');
      expect(result.team?.shortName).toBe('VFS');

      // 2. CompetitionTeam criada
      expect(result.competitionTeam).toBeDefined();
      expect(result.competitionTeam?.competitionId).toBe(competition.id);
      expect(result.competitionTeam?.teamId).toBe(result.team?.id);
      expect(result.competitionTeam?.status).toBe('invited');
      expect(result.competitionTeam?.registrationDeadline).toBe('2026-11-20T23:59:00.000Z');

      // 3. Link seguro gerado
      expect(result.token).toBe(result.competitionTeam?.accessToken);
      expect(result.portalUrl).toContain(`/equipe/inscricao/${result.competitionTeam?.accessToken}`);


      // 5. Trilha de auditoria gravada
      const auditLogs = await OperationalAuditService.listAuditLogs({ competitionId: competition.id });
      const regLog = auditLogs.find(l => l.action === 'TEAM_REGISTERED_IN_COMPETITION');
      expect(regLog).toBeDefined();
      expect(regLog?.user).toBe('Admin Diego');
      expect(regLog?.entityId).toBe(result.competitionTeam?.id);
    });

    it('deve provisionar usuário de acesso Auth quando fornecido managerEmail e managerPassword', async () => {
      const result = await registerTeamInCompetition({
        competitionId: competition.id,
        name: 'Minas Tênis Clube',
        shortName: 'MTC',
        managerName: 'Marcos Pacheco',
        managerEmail: 'pacheco@minas.com.br',
        managerPassword: 'SenhaSegura@2026',
      });

      expect(result.ok).toBe(true);
      expect(result.userId).toBeDefined();
      expect(result.competitionTeam).toBeDefined();

      // Verifica se o usuário provisionado consegue autenticar
      const loginRes = await authService.signIn('pacheco@minas.com.br', 'SenhaSegura@2026');
      expect(loginRes.ok).toBe(true);
      expect(loginRes.session?.user.email).toBe('pacheco@minas.com.br');
      expect(loginRes.session?.user.role).toBe('team');
      expect(loginRes.session?.user.competitionTeamId).toBe(result.competitionTeam?.id);
    });
  });

  describe('Caso B: Reutilização de Equipe Existente', () => {
    it('deve reutilizar TeamRecord existente no sistema ao cadastrar em nova competição', async () => {
      // Cria a equipe previamente no sistema
      const existingTeam = await dataAccess.createTeam({
        name: 'Clube Campestre de Vôlei',
        shortName: 'CCV',
        modality: 'indoor',
        city: 'Campinas',
        managerName: 'Roberto Carlos',
      });

      // Inscreve a equipe na competição passando os dados
      const result = await registerTeamInCompetition({
        competitionId: competition.id,
        name: 'Clube Campestre de Vôlei',
        shortName: 'CCV',
        managerName: 'Roberto Carlos',
        managerEmail: 'roberto@campestre.com',
      });

      expect(result.ok).toBe(true);
      expect(result.isExistingTeamReused).toBe(true);
      expect(result.team?.id).toBe(existingTeam.id);
      expect(result.competitionTeam?.teamId).toBe(existingTeam.id);
      expect(result.competitionTeam?.competitionId).toBe(competition.id);
    });

    it('deve permitir seleção direta por teamId', async () => {
      const existingTeam = await dataAccess.createTeam({
        name: 'Praia Clube Uberlândia',
        shortName: 'PCU',
        modality: 'indoor',
      });

      const result = await registerTeamInCompetition({
        competitionId: competition.id,
        teamId: existingTeam.id,
        name: existingTeam.name,
        shortName: existingTeam.shortName,
        managerName: 'Gestor Praia',
      });

      expect(result.ok).toBe(true);
      expect(result.isExistingTeamReused).toBe(true);
      expect(result.team?.id).toBe(existingTeam.id);
    });
  });

  describe('Caso C: Duplicidade e Idempotência', () => {
    it('deve rejeitar cadastro se a equipe já estiver inscrita na mesma competição', async () => {
      // Primeira inscrição
      const first = await registerTeamInCompetition({
        competitionId: competition.id,
        name: 'Botafogo Vôlei',
        shortName: 'BOT',
        managerName: 'Felipe Neto',
      });
      expect(first.ok).toBe(true);

      // Tentativa de duplicar
      const second = await registerTeamInCompetition({
        competitionId: competition.id,
        name: 'Botafogo Vôlei',
        shortName: 'BOT',
        managerName: 'Felipe Neto',
      });

      expect(second.ok).toBe(false);
      expect(second.errors[0]).toContain('já está inscrita nesta competição');

      // Verifica que não foi criada uma segunda inscrição
      const allCompTeams = await dataAccess.listCompetitionTeams(competition.id);
      const botafogoRegistrations = allCompTeams.filter(ct => ct.teamName === 'Botafogo Vôlei');
      expect(botafogoRegistrations).toHaveLength(1);
    });
  });

  describe('Regras de Prazo e Validações de Domínio', () => {
    it('deve bloquear a inscrição caso a competição não possua defaultDeadline configurado', async () => {
      const compWithoutDeadline = await dataAccess.createCompetition({
        name: 'Torneio Sem Prazo',
        modality: 'indoor',
        format: 'groups_and_playoffs',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        defaultDeadline: undefined,
        status: 'registration-open',
      });

      const result = await registerTeamInCompetition({
        competitionId: compWithoutDeadline.id,
        name: 'Equipe Teste Sem Prazo',
        shortName: 'TSP',
        managerName: 'Responsável',
      });

      expect(result.ok).toBe(false);
      expect(result.errors[0]).toContain('precisa ter um prazo de inscrição configurado');
    });

    it('deve rejeitar inscrição em competição finalizada ou cancelada', async () => {
      const completedComp = await dataAccess.createCompetition({
        name: 'Torneio Encerrado',
        modality: 'indoor',
        format: 'groups_and_playoffs',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        defaultDeadline: '2026-01-01T00:00:00.000Z',
        status: 'completed',
      });

      const result = await registerTeamInCompetition({
        competitionId: completedComp.id,
        name: 'Equipe Tardia',
        shortName: 'ETD',
        managerName: 'Responsável',
      });

      expect(result.ok).toBe(false);
      expect(result.errors[0]).toContain('finalizada ou cancelada');
    });

    it('deve validar tamanho do nome e da sigla', async () => {
      const invalidName = await registerTeamInCompetition({
        competitionId: competition.id,
        name: 'A',
        shortName: 'ABC',
        managerName: 'Gestor',
      });
      expect(invalidName.ok).toBe(false);
      expect(invalidName.errors).toContain('O nome da equipe deve ter pelo menos 2 caracteres.');

      const invalidShort = await registerTeamInCompetition({
        competitionId: competition.id,
        name: 'Equipe Válida',
        shortName: 'LONG',
        managerName: 'Gestor',
      });
      expect(invalidShort.ok).toBe(false);
      expect(invalidShort.errors).toContain('A sigla da equipe deve ter exatamente 3 caracteres.');

      const missingManager = await registerTeamInCompetition({
        competitionId: competition.id,
        name: 'Equipe Válida',
        shortName: 'EQV',
        managerName: '',
      });
      expect(missingManager.ok).toBe(false);
      expect(missingManager.errors).toContain('O nome do responsável é obrigatório.');
    });

    it('deve bloquear tentativa de vincular equipe pertencente a outra organização', async () => {
      // Cria uma equipe na Organização X
      const foreignTeam = await dataAccess.createTeam({
        name: 'Clube Rival Estrangeiro',
        shortName: 'CRE',
        modality: 'indoor',
        organizationId: 'org-outra-qualquer',
      });

      // Competição pertence à organização padrão (org-1)
      const result = await registerTeamInCompetition({
        competitionId: competition.id,
        teamId: foreignTeam.id,
        name: foreignTeam.name,
        shortName: foreignTeam.shortName,
        managerName: 'Gestor Estrangeiro',
      });

      expect(result.ok).toBe(false);
      expect(result.errors[0]).toContain('pertence a outra organização');
    });
  });
});
