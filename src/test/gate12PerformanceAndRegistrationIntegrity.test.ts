import { beforeEach, describe, expect, it } from 'vitest';
import {
  addAthlete,
  updateAthlete,
  removeAthlete,
  listRoster,
  sortRosterAthletes,
} from '@/services/registrationService';
import { dataAccess, resetLocalData } from '@/services/dataAccess';
import { authService } from '@/services/authService';
import type { CompetitionAthleteInput } from '@/types/registration';
import type { AuthSession } from '@/types/auth';

describe('Gate 12.4.2 — Integridade de Cadastro, Otimização de Consultas e Exclusão', () => {
  beforeEach(async () => {
    resetLocalData();
    await dataAccess.updateCompetition('comp-masculino-2026', { status: 'registration-open' });
  });

  const baseAthleteInput: CompetitionAthleteInput = {
    name: 'Carlos Oliveira',
    documentNumber: '11122233344',
    jerseyNumber: 15,
    position: 'Ponteiro',
    isCaptain: false,
    isLibero: false,
    gender: 'male',
  };

  describe('9.1 — Consultas Seletivas por Competição e Duplicidade Entre Equipes', () => {
    it('listCompetitionAthletesByCompetition retorna apenas atletas da competição alvo', async () => {
      const compTeams = await dataAccess.listCompetitionTeams('comp-masculino-2026');
      const compTeamIds = compTeams.map((t) => t.id);
      const athletesComp1 = await dataAccess.listCompetitionAthletesByCompetition('comp-masculino-2026');
      expect(athletesComp1.length).toBeGreaterThan(0);
      athletesComp1.forEach((a) => {
        expect(compTeamIds).toContain(a.competitionTeamId);
      });

      // Competição vazia ou inexistente retorna array vazio
      const emptyComp = await dataAccess.listCompetitionAthletesByCompetition('comp-inexistente');
      expect(emptyComp).toEqual([]);
    });

    it('getCompetitionAthlete localiza pontualmente pelo ID sem scan global', async () => {
      const roster = await dataAccess.listCompetitionAthletes('ct-m-1');
      const firstAthlete = roster[0];
      expect(firstAthlete).toBeDefined();

      const found = await dataAccess.getCompetitionAthlete(firstAthlete.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(firstAthlete.id);
      expect(found?.name).toBe(firstAthlete.name);

      const notFound = await dataAccess.getCompetitionAthlete('ath-id-que-nao-existe');
      expect(notFound).toBeNull();
    });

    it('bloqueia mesmo atleta já cadastrado em outra equipe da mesma competição', async () => {
      // Cadastra atleta no time ct-m-1
      const res1 = await addAthlete('ct-m-1', {
        ...baseAthleteInput,
        name: 'Roberto Duplicado',
        documentNumber: '99988877766',
        jerseyNumber: 25,
      });
      expect(res1.ok).toBe(true);

      // Tenta cadastrar o mesmo atleta no time ct-m-2 da mesma competição comp-1
      const res2 = await addAthlete('ct-m-2', {
        ...baseAthleteInput,
        name: 'Roberto Duplicado Outro Nome',
        documentNumber: '99988877766', // Mesmo documento
        jerseyNumber: 26,
      });
      expect(res2.ok).toBe(false);
      expect(res2.errors.some((e) => e.includes('já está inscrito') || e.includes('duplicado'))).toBe(true);
    });

    it('permite o mesmo atleta em competição DIFERENTE sem falso bloqueio cruzado', async () => {
      // Cadastra atleta na comp-1 (time ct-m-1)
      const res1 = await addAthlete('ct-m-1', {
        ...baseAthleteInput,
        name: 'Julia Campeonatos',
        documentNumber: '77766655544',
        jerseyNumber: 27,
      });
      expect(res1.ok).toBe(true);

      // Cria uma segunda competição isolada
      const comp2 = await dataAccess.createCompetition({
        name: 'Torneio Independente 2026',
        slug: 'torneio-independente-2026',
        modality: 'indoor',
        format: 'groups',
        playerFormat: '6x6',
        setFormat: 'best_of_3',
        genderCategory: 'male',
        defaultDeadline: new Date(Date.now() + 86400000).toISOString(),
        groupName: 'Geral',
        startDate: '2026-11-01',
        endDate: '2026-11-02',
        venue: 'Ginásio B',
        status: 'registration-open',
      });

      // Cria time e inscrição na comp2
      const teamX = await dataAccess.createTeam({
        name: 'Vôlei Independente',
        shortName: 'VIN',
        modality: 'indoor',
        city: 'Cascavel',
      });

      const ct2 = await dataAccess.createCompetitionTeam({
        competitionId: comp2.id,
        teamId: teamX.id,
        teamName: teamX.name,
        teamShortName: teamX.shortName,
        registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
        isLocked: false,
        status: 'invited',
      });

      // Tenta cadastrar o mesmo atleta no torneio 2 -> DEVE SER PERMITIDO!
      const res2 = await addAthlete(ct2.id, {
        ...baseAthleteInput,
        name: 'Julia Campeonatos',
        documentNumber: '77766655544',
        jerseyNumber: 27,
      });
      expect(res2.ok).toBe(true);
      expect(res2.athlete).toBeDefined();
    });

    it('mantém camisas opcionais (1-99)', async () => {
      const res = await addAthlete('ct-m-1', {
        ...baseAthleteInput,
        name: 'Atleta Sem Camisa Inicial',
        documentNumber: '44433322211',
        jerseyNumber: undefined,
      });
      expect(res.ok).toBe(true);
      expect(res.athlete?.jerseyNumber).toBeUndefined();

      // Camisa inválida (> 99) deve ser rejeitada
      const resInvalida = await addAthlete('ct-m-1', {
        ...baseAthleteInput,
        name: 'Atleta Camisa 150',
        documentNumber: '44433322212',
        jerseyNumber: 150,
      });
      expect(resInvalida.ok).toBe(false);
      expect(resInvalida.errors.some((e) => e.includes('1 e 99'))).toBe(true);
    });
  });

  describe('9.2 — Atualização do Estado e Ordenação Canônica', () => {
    it('sortRosterAthletes ordena canonicamente: camisas crescentes, sem número ao fim e nome alfabético', () => {
      const elencoDesordenado = [
        { id: '1', name: 'Zélia', jerseyNumber: null },
        { id: '2', name: 'Bruno', jerseyNumber: 12 },
        { id: '3', name: 'Amanda', jerseyNumber: 5 },
        { id: '4', name: 'Carlos', jerseyNumber: undefined },
        { id: '5', name: 'Daniel', jerseyNumber: 12 },
      ];

      const ordenado = sortRosterAthletes(elencoDesordenado);
      expect(ordenado.map((a) => a.id)).toEqual(['3', '2', '5', '4', '1']);
    });

    it('atualiza atleta pontualmente com dados consistentes', async () => {
      const resAdd = await addAthlete('ct-m-1', {
        ...baseAthleteInput,
        name: 'Atleta Para Editar',
        documentNumber: '55566677788',
        jerseyNumber: 33,
      });
      expect(resAdd.ok).toBe(true);
      const athId = resAdd.athlete!.id;

      const resUp = await updateAthlete(athId, {
        ...baseAthleteInput,
        name: 'Atleta Editado Com Sucesso',
        documentNumber: '55566677788',
        jerseyNumber: 35,
      });
      expect(resUp.ok).toBe(true);
      expect(resUp.athlete?.name).toBe('Atleta Editado Com Sucesso');
      expect(resUp.athlete?.jerseyNumber).toBe(35);
    });

    it('retorna erro se atleta a ser editado não existir', async () => {
      const resUp = await updateAthlete('ath-inexistente', {
        ...baseAthleteInput,
        name: 'Fantasma',
        documentNumber: '11111111111',
      });
      expect(resUp.ok).toBe(false);
      expect(resUp.errors).toContain('Atleta não encontrado.');
    });
  });

  describe('9.3 — Tratamento Explícito de Erro em Exclusão e Falso Sucesso', () => {
    it('remove atleta existente com sucesso no LocalStorage', async () => {
      const resAdd = await addAthlete('ct-m-1', {
        ...baseAthleteInput,
        name: 'Atleta Para Remover',
        documentNumber: '88899900011',
        jerseyNumber: 44,
      });
      expect(resAdd.ok).toBe(true);
      const athId = resAdd.athlete!.id;

      const resDel = await removeAthlete(athId);
      expect(resDel.ok).toBe(true);
      expect(resDel.errors).toEqual([]);

      // Confirma que não existe mais
      const found = await dataAccess.getCompetitionAthlete(athId);
      expect(found).toBeNull();
    });

    it('retorna erro se atleta a ser removido não existir', async () => {
      const resDel = await removeAthlete('ath-inexistente-123');
      expect(resDel.ok).toBe(false);
      expect(resDel.errors).toContain('Atleta não encontrado.');
    });

    it('deleteCompetitionAthlete lança erro ao tentar excluir ID que não existe', async () => {
      await expect(dataAccess.deleteCompetitionAthlete('ath-fantasma-999')).rejects.toThrow(
        'Atleta "ath-fantasma-999" não encontrado para exclusão.',
      );
    });
  });

  describe('9.4 — Compatibilidade e Mapeamento de Papéis (team vs team_manager)', () => {
    it('authService.hasRole valida perfil team quando usuário possui role team_manager', () => {
      const sessionManager: AuthSession = {
        user: {
          id: 'user-manager-1',
          email: 'manager@equipe.com',
          name: 'Gestor Teste',
          role: 'team_manager',
        },
      };

      // Exigindo ['team'], usuário com 'team_manager' deve ter acesso autorizado
      expect(authService.hasRole(sessionManager, ['team'])).toBe(true);
      expect(authService.hasRole(sessionManager, ['team_manager'])).toBe(true);
    });

    it('authService.hasRole valida perfil team_manager quando usuário possui role team legado', () => {
      const sessionLegacyTeam: AuthSession = {
        user: {
          id: 'user-team-1',
          email: 'time@equipe.com',
          name: 'Representante Legado',
          role: 'team',
        },
      };

      expect(authService.hasRole(sessionLegacyTeam, ['team'])).toBe(true);
      expect(authService.hasRole(sessionLegacyTeam, ['team_manager'])).toBe(true);
      expect(authService.hasRole(sessionLegacyTeam, ['admin'])).toBe(false);
    });
  });

  describe('9.5 — Integridade Referencial na Exclusão de Equipes', () => {
    it('bloqueia exclusão de equipe com partidas associadas no histórico', async () => {
      // Cria equipe com partida
      const team = await dataAccess.createTeam({
        name: 'Equipe Com Jogo',
        shortName: 'ECJ',
        modality: 'indoor',
      });
      const ct = await dataAccess.createCompetitionTeam({
        competitionId: 'comp-masculino-2026',
        teamId: team.id,
        teamName: team.name,
        teamShortName: team.shortName,
        registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
        isLocked: false,
        status: 'invited',
      });
      await dataAccess.createMatch({
        competitionId: 'comp-masculino-2026',
        teamAId: team.id,
        teamBId: 'team-outro',
        round: 1,
        matchNumber: 99,
        teamAName: team.name,
        teamBName: 'Outro',
        teamAShortName: team.shortName,
        teamBShortName: 'OUT',
        venue: 'Ginásio Central',
        court: 'Quadra 1',
        scheduledTime: '10:00',
        status: 'scheduled',
        sets: [],
        referees: [],
      });

      await expect(dataAccess.deleteCompetitionTeam(ct.id)).rejects.toThrow(
        'partidas associadas',
      );
      await expect(dataAccess.deleteTeam(team.id)).rejects.toThrow(
        'partidas vinculadas',
      );
    });

    it('exclui inscrição e agremiação sem histórico com integridade referencial limpa', async () => {
      const team = await dataAccess.createTeam({
        name: 'Equipe Limpa Para Exclusão',
        shortName: 'ELP',
        modality: 'indoor',
      });
      const ct = await dataAccess.createCompetitionTeam({
        competitionId: 'comp-masculino-2026',
        teamId: team.id,
        teamName: team.name,
        teamShortName: team.shortName,
        registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
        isLocked: false,
        status: 'invited',
      });

      // Exclusão da inscrição da competição
      await dataAccess.deleteCompetitionTeam(ct.id);
      const remainingCt = await dataAccess.getCompetitionTeamById(ct.id);
      expect(remainingCt).toBeNull();

      // Exclusão da agremiação sem inscrições ativas
      await dataAccess.deleteTeam(team.id);
      const remainingTeam = await dataAccess.getTeam(team.id);
      expect(remainingTeam).toBeNull();
    });
  });
});
