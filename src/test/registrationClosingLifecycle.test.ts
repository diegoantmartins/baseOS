import { beforeEach, describe, expect, it } from 'vitest';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import {
  addAthlete,
  isRegistrationLocked,
  removeAthlete,
  updateAthlete,
} from '@/services/registrationService';
import { dataAccess } from '@/services/dataAccess';
import { OperationalAuditService } from '@/services/operationalAuditService';
import type { CompetitionRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';

describe('Registration Closing Lifecycle & Deep Defense Locking (Fase 3)', () => {
  let competition: CompetitionRecord;
  let compTeamA: CompetitionTeam;
  let compTeamB: CompetitionTeam;

  beforeEach(async () => {
    // Cria competição em 'registration-open' com 1 grupo (requer mínimo 2 equipes para fechar)
    competition = await dataAccess.createCompetition({
      name: 'Copa Metropolitana 2026',
      modality: 'indoor',
      format: 'groups_and_playoffs',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'male',
      groupsCount: 1,
      status: 'registration-open',
    });

    // Registra duas equipes na competição
    const teamA = await dataAccess.createTeam({
      name: 'Clube Campestre',
      shortName: 'CAM',
      modality: 'indoor',
    });

    const teamB = await dataAccess.createTeam({
      name: 'Associação Pinheiros',
      shortName: 'PIN',
      modality: 'indoor',
    });

    compTeamA = await dataAccess.createCompetitionTeam({
      competitionId: competition.id,
      teamId: teamA.id,
      teamName: teamA.name,
      teamShortName: teamA.shortName,
      registrationDeadline: '2026-12-31T23:59:59.000Z',
      isLocked: false,
      status: 'in_progress',
    });

    compTeamB = await dataAccess.createCompetitionTeam({
      competitionId: competition.id,
      teamId: teamB.id,
      teamName: teamB.name,
      teamShortName: teamB.shortName,
      registrationDeadline: '2026-12-31T23:59:59.000Z',
      isLocked: false,
      status: 'in_progress',
    });
  });

  describe('Fechamento Canônico de Inscrições (closeRegistrations)', () => {
    it('deve fechar inscrições com sucesso, atualizar o status da competição e auditar o evento', async () => {
      const result = await CompetitionLifecycleService.closeRegistrations(
        competition.id,
        'Diretor Técnico Carlos',
      );

      expect(result.ok).toBe(true);
      expect(result.competition?.status).toBe('registration-closed');

      // Verifica persistência no repositório
      const savedComp = await dataAccess.getCompetition(competition.id);
      expect(savedComp?.status).toBe('registration-closed');

      // Verifica auditoria operacional
      const auditLogs = await OperationalAuditService.listAuditLogs({ competitionId: competition.id });
      const transitionLog = auditLogs.find(
        l => l.action === 'COMPETITION_STATUS_CHANGED' && l.newValue?.includes('registration-closed'),
      );
      expect(transitionLog).toBeDefined();
      expect(transitionLog?.user).toBe('Diretor Técnico Carlos');
      expect(transitionLog?.previousValue).toContain('registration-open');
    });

    it('deve ser estritamente idempotente se a competição já estiver com inscrições encerradas', async () => {
      // Primeiro fechamento
      await CompetitionLifecycleService.closeRegistrations(competition.id, 'Operador 1');

      const logsBefore = await OperationalAuditService.listAuditLogs({ competitionId: competition.id });
      const countBefore = logsBefore.filter(l => l.action === 'COMPETITION_STATUS_CHANGED').length;

      // Segundo fechamento (idempotência)
      const secondResult = await CompetitionLifecycleService.closeRegistrations(competition.id, 'Operador 2');
      expect(secondResult.ok).toBe(true);
      expect(secondResult.competition?.status).toBe('registration-closed');

      // Não deve gerar uma segunda entrada duplicada de alteração de status
      const logsAfter = await OperationalAuditService.listAuditLogs({ competitionId: competition.id });
      const countAfter = logsAfter.filter(l => l.action === 'COMPETITION_STATUS_CHANGED').length;
      expect(countAfter).toBe(countBefore);
    });

    it('permite fechamento administrativo de inscrições mesmo com poucas equipes (desacoplado do sorteio)', async () => {
      // Cria competição configurada para 3 grupos
      const largeComp = await dataAccess.createCompetition({
        name: 'Grand Prix 3 Grupos',
        modality: 'indoor',
        format: 'groups_and_playoffs',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        groupsCount: 3,
        status: 'registration-open',
      });

      // Apenas 2 equipes cadastradas
      await dataAccess.createCompetitionTeam({
        competitionId: largeComp.id,
        teamId: 'team-x',
        teamName: 'Time X',
        teamShortName: 'TX',
        registrationDeadline: '2026-12-31T23:59:59.000Z',
        isLocked: false,
        status: 'in_progress',
      });

      // O fechamento de inscrições é uma decisão administrativa e não é bloqueado pela quantidade de equipes
      const result = await CompetitionLifecycleService.closeRegistrations(largeComp.id, 'Admin');
      expect(result.ok).toBe(true);
      expect(result.competition?.status).toBe('registration-closed');

      const closed = await dataAccess.getCompetition(largeComp.id);
      expect(closed?.status).toBe('registration-closed');
    });

    it('deve rejeitar encerramento se a competição estiver em status incompatível (ex.: completed)', async () => {
      const completedComp = await dataAccess.createCompetition({
        name: 'Torneio Finalizado',
        modality: 'indoor',
        format: 'round-robin',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'completed',
      });

      const result = await CompetitionLifecycleService.closeRegistrations(completedComp.id, 'Admin');
      expect(result.ok).toBe(false);
      expect(result.errors[0]).toContain('Não é possível encerrar inscrições');
    });
  });

  describe('Defesa em Profundidade: Bloqueio do Portal e Mutação de Elenco', () => {
    it('antes do fechamento (registration-open): permite cadastrar, atualizar e remover atleta', async () => {
      // 1. Adicionar atleta
      const addRes = await addAthlete(compTeamA.id, {
        name: 'Giba Silva',
        position: 'Ponteiro',
        jerseyNumber: 7,
        isCaptain: false,
        isLibero: false,
        gender: 'male',
      });
      expect(addRes.ok).toBe(true);
      expect(addRes.athlete?.id).toBeDefined();

      // 2. Atualizar atleta
      const updateRes = await updateAthlete(addRes.athlete!.id, {
        name: 'Gilberto Godoy Filho (Giba)',
        position: 'Ponteiro',
        jerseyNumber: 7,
        isCaptain: true,
        isLibero: false,
        gender: 'male',
      });
      expect(updateRes.ok).toBe(true);

      // 3. Remover atleta
      const removeRes = await removeAthlete(addRes.athlete!.id);
      expect(removeRes.ok).toBe(true);
    });

    it('após o fechamento (registration-closed): isRegistrationLocked é verdadeiro e o domínio rejeita mutações', async () => {
      // 1. Cadastra um atleta enquanto aberto
      const addBefore = await addAthlete(compTeamA.id, {
        name: 'Bruninho Rezende',
        position: 'Levantador',
        jerseyNumber: 1,
        isCaptain: true,
        isLibero: false,
        gender: 'male',
      });
      expect(addBefore.ok).toBe(true);

      // 2. Encerra formalmente as inscrições
      await CompetitionLifecycleService.closeRegistrations(competition.id, 'Organização');
      const closedComp = await dataAccess.getCompetition(competition.id);

      // 3. isRegistrationLocked deve ser verdadeiro mesmo com deadline futuro e isLocked: false
      expect(isRegistrationLocked(compTeamA, closedComp)).toBe(true);

      // 4. Tentativa de ADICIONAR novo atleta deve ser REJEITADA
      const addAfter = await addAthlete(compTeamA.id, {
        name: 'Lucão Satkamp',
        position: 'Central',
        jerseyNumber: 16,
        isCaptain: false,
        isLibero: false,
        gender: 'male',
      });
      expect(addAfter.ok).toBe(false);
      expect(addAfter.errors.some(e => e.includes('encerrado ou bloqueado'))).toBe(true);

      // 5. Tentativa de EDITAR atleta existente deve ser REJEITADA
      const updateAfter = await updateAthlete(addBefore.athlete!.id, {
        name: 'Bruno Mossa Rezende',
        position: 'Levantador',
        jerseyNumber: 1,
        isCaptain: true,
        isLibero: false,
        gender: 'male',
      });
      expect(updateAfter.ok).toBe(false);
      expect(updateAfter.errors.some(e => e.includes('encerrado ou bloqueado'))).toBe(true);

      // 6. Tentativa de REMOVER atleta deve ser REJEITADA
      const removeAfter = await removeAthlete(addBefore.athlete!.id);
      expect(removeAfter.ok).toBe(false);
      expect(removeAfter.errors.some(e => e.includes('encerrado ou bloqueado'))).toBe(true);
    });
  });

  describe('Transição Pós-Sorteio Oficial (advanceToGroupsDefinedAfterDraw)', () => {
    it('deve REJEITAR avanço para groups-defined se nenhuma partida tiver sido persistida (guarda de integridade)', async () => {
      // Inscrições encerradas
      await CompetitionLifecycleService.closeRegistrations(competition.id, 'Organizador');

      // Tentativa de avançar sem ter persistido sorteio e partidas
      const res = await CompetitionLifecycleService.advanceToGroupsDefinedAfterDraw(
        competition.id,
        'Comitê de Sorteio',
      );

      expect(res.ok).toBe(false);
      expect(res.errors[0]).toContain('nenhuma partida foi encontrada ou persistida');

      const saved = await dataAccess.getCompetition(competition.id);
      expect(saved?.status).toBe('registration-closed');
    });

    it('deve avançar o status para groups-defined, trancar inscrições e auditar a transição quando partidas existem', async () => {
      // Inscrições encerradas
      await CompetitionLifecycleService.closeRegistrations(competition.id, 'Organizador');

      // Persiste partidas simulando salvamento pelo módulo de sorteio
      await dataAccess.saveDrawWithMatches(
        {
          competitionId: competition.id,
          config: { groupsCount: 1, seedingMode: 'random', seed: 2026, headSeeds: [] },
          groups: [{ name: 'Grupo A', teams: [{ teamId: compTeamA.teamId, seed: 1 }, { teamId: compTeamB.teamId, seed: 2 }] }],
          matches: [],
          status: 'preview',
        },
        [
          {
            round: 1,
            matchNumber: 1,
            teamAId: compTeamA.teamId,
            teamBId: compTeamB.teamId,
            teamAName: compTeamA.teamName,
            teamBName: compTeamB.teamName,
            teamAShortName: compTeamA.teamShortName,
            teamBShortName: compTeamB.teamShortName,
            groupName: 'Grupo A',
            phase: 'classificatória',
            scheduledTime: '2026-12-01T10:00:00.000Z',
            venue: 'Ginásio Central',
          },
        ],
      );

      // Avança para groups-defined
      const res = await CompetitionLifecycleService.advanceToGroupsDefinedAfterDraw(
        competition.id,
        'Comitê de Sorteio',
      );

      expect(res.ok).toBe(true);
      expect(res.competition?.status).toBe('groups-defined');

      const saved = await dataAccess.getCompetition(competition.id);
      expect(saved?.status).toBe('groups-defined');

      // Equipes devem ter sido travadas (isLocked = true)
      const teams = await dataAccess.listCompetitionTeams(competition.id);
      expect(teams.every(t => t.isLocked)).toBe(true);

      // Auditoria
      const logs = await OperationalAuditService.listAuditLogs({ competitionId: competition.id });
      const groupLog = logs.find(
        l => l.action === 'COMPETITION_STATUS_CHANGED' && l.newValue?.includes('groups-defined'),
      );
      expect(groupLog).toBeDefined();
      expect(groupLog?.user).toBe('Comitê de Sorteio');
    });

    it('é idempotente se a competição já estiver em groups-defined', async () => {
      await CompetitionLifecycleService.closeRegistrations(competition.id, 'Op');

      await dataAccess.saveDrawWithMatches(
        {
          competitionId: competition.id,
          config: { groupsCount: 1, seedingMode: 'random', seed: 2026, headSeeds: [] },
          groups: [{ name: 'Grupo A', teams: [{ teamId: compTeamA.teamId, seed: 1 }, { teamId: compTeamB.teamId, seed: 2 }] }],
          matches: [],
          status: 'preview',
        },
        [
          {
            round: 1,
            matchNumber: 1,
            teamAId: compTeamA.teamId,
            teamBId: compTeamB.teamId,
            teamAName: compTeamA.teamName,
            teamBName: compTeamB.teamName,
            teamAShortName: compTeamA.teamShortName,
            teamBShortName: compTeamB.teamShortName,
            groupName: 'Grupo A',
            phase: 'classificatória',
            scheduledTime: '2026-12-01T10:00:00.000Z',
            venue: 'Ginásio Central',
          },
        ],
      );

      await CompetitionLifecycleService.advanceToGroupsDefinedAfterDraw(competition.id, 'Op');

      const logsBefore = await OperationalAuditService.listAuditLogs({ competitionId: competition.id });
      const countBefore = logsBefore.filter(l => l.action === 'COMPETITION_STATUS_CHANGED').length;

      // Chamada repetida
      const repeatRes = await CompetitionLifecycleService.advanceToGroupsDefinedAfterDraw(
        competition.id,
        'Op',
      );
      expect(repeatRes.ok).toBe(true);

      const logsAfter = await OperationalAuditService.listAuditLogs({ competitionId: competition.id });
      const countAfter = logsAfter.filter(l => l.action === 'COMPETITION_STATUS_CHANGED').length;
      expect(countAfter).toBe(countBefore);
    });

    it('impede adição de atletas quando a competição está em groups-defined (Caso C)', async () => {
      await CompetitionLifecycleService.closeRegistrations(competition.id, 'Organizador');

      await dataAccess.saveDrawWithMatches(
        {
          competitionId: competition.id,
          config: { groupsCount: 1, seedingMode: 'random', seed: 2026, headSeeds: [] },
          groups: [{ name: 'Grupo A', teams: [{ teamId: compTeamA.teamId, seed: 1 }, { teamId: compTeamB.teamId, seed: 2 }] }],
          matches: [],
          status: 'preview',
        },
        [
          {
            round: 1,
            matchNumber: 1,
            teamAId: compTeamA.teamId,
            teamBId: compTeamB.teamId,
            teamAName: compTeamA.teamName,
            teamBName: compTeamB.teamName,
            teamAShortName: compTeamA.teamShortName,
            teamBShortName: compTeamB.teamShortName,
            groupName: 'Grupo A',
            phase: 'classificatória',
            scheduledTime: '2026-12-01T10:00:00.000Z',
            venue: 'Ginásio Central',
          },
        ],
      );

      await CompetitionLifecycleService.advanceToGroupsDefinedAfterDraw(competition.id, 'Organizador');

      const addResult = await addAthlete(
        compTeamA.id,
        {
          name: 'Atleta Tardia',
          jerseyNumber: 15,
          position: 'setter',
          gender: 'female',
          isCaptain: false,
          isLibero: false,
        },
        '6x6',
      );

      expect(addResult.ok).toBe(false);
      expect(addResult.errors[0]).toContain('Prazo de inscrição do elenco desta equipe encerrado ou bloqueado');
    });

    it('bloqueia mutação de elenco em todos os estágios posteriores ao fechamento (draw-pending, in-progress, playoffs)', async () => {
      const postStatuses: Array<'draw-pending' | 'in-progress' | 'playoffs' | 'completed' | 'cancelled'> = [
        'draw-pending',
        'in-progress',
        'playoffs',
        'completed',
        'cancelled',
      ];

      for (const st of postStatuses) {
        const testComp: CompetitionRecord = { ...competition, status: st };
        expect(isRegistrationLocked(compTeamA, testComp)).toBe(true);

        const tryAdd = await addAthlete(
          compTeamA.id,
          {
            name: `Atleta Teste ${st}`,
            position: 'Ponteiro',
            jerseyNumber: 12,
            isCaptain: false,
            isLibero: false,
            gender: 'male',
          },
          undefined,
          testComp,
        );
        expect(tryAdd.ok).toBe(false);
        expect(tryAdd.errors.some(e => e.includes('encerrado ou bloqueado'))).toBe(true);
      }
    });
  });
});
