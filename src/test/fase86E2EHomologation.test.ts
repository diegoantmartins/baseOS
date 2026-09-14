/**
 * BaseOS — Fase 8.6: Homologação Funcional E2E Real
 * 
 * Suíte de Homologação Funcional Ponta a Ponta do Fluxo Operacional do Organizador e Equipe:
 * 1. Criação de competição com capacidade canônica explícita (config.registration.maxTeams).
 * 2. Convite de equipe e geração de link seguro de auto-inscrição (/equipe/inscricao/:token).
 * 3. Acesso público da equipe, preenchimento de elenco e validação de regras regulamentares.
 * 4. Submissão de inscrição (in_progress -> submitted) sem ocupação de vaga.
 * 5. Revisão e aprovação formal pelo organizador (submitted -> approved) com ocupação de vaga.
 * 6. Gestão de capacidade máxima, bloqueio de overbooking e rejeição formal.
 * 7. Caminhos negativos (duplicidade, elenco incompleto, estados inelegíveis ao sorteio).
 * 8. Trava de edição (is_locked) preservando elegibilidade ao sorteio.
 * 9. Esteira visual e guia de ação contextual (CompetitionActionGuideService).
 * 10. Auditoria de linguagem da Central de Ajuda.
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { dataAccess } from '@/services/dataAccess';
import { registerTeamInCompetition, addAthlete, markRosterSubmitted } from '@/services/registrationService';
import { CompetitionRegistrationService } from '@/services/competitionRegistrationService';
import { CompetitionDrawEligibilityService } from '@/services/competitionDrawEligibilityService';
import { CompetitionActionGuideService } from '@/services/competitionActionGuideService';
import { competitionMapper } from '@/services/mappers';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { authService } from '@/services/authService';
import { HELP_ARTICLES } from '@/data/helpArticles';
import type { CompetitionRecord } from '@/types/entities';
import type { CompetitionTeam, CompetitionAthleteInput } from '@/types/registration';

const makeAthlete = (
  name: string,
  jerseyNumber: number,
  position = 'Ponteiro',
  isCaptain = false,
  isLibero = false,
): CompetitionAthleteInput => ({
  name,
  jerseyNumber,
  position,
  isCaptain,
  isLibero,
  gender: 'male',
});

describe('BaseOS — Fase 8.6: Homologação Funcional E2E do Fluxo do Organizador', () => {
  let compId: string;
  let competition: CompetitionRecord;

  beforeAll(async () => {
    if (isSupabaseConfigured()) {
      await authService.signIn('diegoantmartins89@gmail.com', 'Au15022020...');
    }
  });

  beforeEach(async () => {
    // Criação da Competição via mapper canônico com capacidade explícita de 2 vagas
    const created = await dataAccess.createCompetition({
      name: 'BASEOS QA 8.6 TAÇA REGIONAL',
      slug: 'baseos-qa-8-6-taca-regional',
      modality: 'indoor',
      format: 'groups-playoffs',
      playerFormat: '6x6',
      setFormat: '3-sets',
      genderCategory: 'male',
      status: 'registration-open',
      groupsCount: 2,
      teamsPerGroup: 2,
      advancingPerGroup: 2,
      defaultDeadline: '2026-12-31T23:59:59Z',
      config: {
        registration: {
          minAthletes: 6,
          maxAthletes: 14,
          maxCaptains: 1,
          maxLiberos: 2,
          requireJerseyNumberOnRegistration: false,
          maxTeams: 2, // CAPACIDADE CANÔNICA EXPLÍCITA: 2 VAGAS
        },
      } as unknown as CompetitionRecord['config'],
    });

    compId = created.id;
    const fetched = await dataAccess.getCompetition(compId);
    if (!fetched) throw new Error('Falha ao instanciar competição de teste da Fase 8.6');
    competition = fetched;
  });

  describe('Cenário 1: Criação e Persistência Canônica da Capacidade', () => {
    it('persiste maxTeams exclusivamente em config.registration.maxTeams sem inferência', () => {
      expect(competition.id).toBeDefined();
      expect(competition.name).toBe('BASEOS QA 8.6 TAÇA REGIONAL');
      expect(competition.status).toBe('registration-open');

      // 1. Verificação do local canônico de maxTeams
      const capacity = CompetitionRegistrationService.getCapacity(competition);
      expect(capacity.isConfigured).toBe(true);
      expect(capacity.maxTeams).toBe(2);

      // 2. Comprova que não há inferência de groupsCount * teamsPerGroup
      const persistencePayload = competitionMapper.toPersistence(competition);
      expect(persistencePayload).not.toHaveProperty('max_teams');
      expect(persistencePayload).not.toHaveProperty('maxTeams');
      expect(persistencePayload).not.toHaveProperty('groups_count');
      expect((persistencePayload.config as { registration?: { maxTeams?: number } })?.registration?.maxTeams).toBe(2);
    });

    it('exibe Action Guide em NO_TEAMS quando a competição acaba de ser criada', () => {
      const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
        competition,
        competitionTeams: [],
        athletes: [],
        matches: [],
      });

      expect(guide.scenario).toBe('NO_TEAMS');
      expect(guide.title).toBe('Convidar Equipes');
      expect(guide.primaryAction.label).toBe('Convidar Equipes');
      expect(guide.primaryAction.route).toBe(`/competicoes/${compId}/inscricoes`);
    });
  });

  describe('Cenário 2: Convite de Equipe e Geração do Link Seguro', () => {
    it('cria TeamRecord global, CompetitionTeam com status invited e token de auto-inscrição', async () => {
      const regResult = await registerTeamInCompetition({
        competitionId: compId,
        name: 'Equipe QA 8.6 A',
        shortName: 'QAA',
        city: 'Belo Horizonte',
        coachName: 'Técnico Homologação A',
        managerName: 'Gestor Homologação A',
        operator: 'Organizador QA',
      });

      expect(regResult.ok).toBe(true);
      expect(regResult.team).toBeDefined();
      expect(regResult.team?.name).toBe('Equipe QA 8.6 A');
      expect(regResult.competitionTeam).toBeDefined();
      expect(regResult.competitionTeam?.status).toBe('invited');
      expect(regResult.competitionTeam?.isLocked).toBe(false);

      // Verificação do link seguro
      expect(regResult.token).toBeDefined();
      expect(regResult.token!.length).toBeGreaterThan(10);
      expect(regResult.portalUrl).toContain(`/equipe/inscricao/${regResult.token}`);

      // Comprova que nenhuma senha de gestor foi gerada nem persistida
      const teamObj = (regResult.team ?? {}) as Record<string, unknown>;
      expect('managerPassword' in teamObj).toBe(false);
      expect('manager_password' in teamObj).toBe(false);
    });
  });

  describe('Cenário 3 e 4: Preenchimento de Elenco e Validações Regulamentares da Equipe', () => {
    let ctA: CompetitionTeam;

    beforeEach(async () => {
      const reg = await registerTeamInCompetition({
        competitionId: compId,
        name: 'Equipe QA 8.6 A',
        shortName: 'QAA',
        city: 'Belo Horizonte',
        coachName: 'Técnico Homologação A',
        managerName: 'Gestor A',
      });
      ctA = reg.competitionTeam!;
    });

    it('permite adicionar atletas até o mínimo regulamentar (6 atletas indoor)', async () => {
      const athletesData: CompetitionAthleteInput[] = [
        makeAthlete('Atleta QA 01', 1, 'Levantador', true, false),
        makeAthlete('Atleta QA 02', 2, 'Líbero', false, true),
        makeAthlete('Atleta QA 03', 3, 'Ponteiro', false, false),
        makeAthlete('Atleta QA 04', 4, 'Ponteiro', false, false),
        makeAthlete('Atleta QA 05', 5, 'Central', false, false),
        makeAthlete('Atleta QA 06', 6, 'Oposto', false, false),
      ];

      for (const a of athletesData) {
        const res = await addAthlete(ctA.id, a, '6x6', competition);
        expect(res.ok).toBe(true);
      }

      const athletes = await dataAccess.listCompetitionAthletes(ctA.id);
      expect(athletes).toHaveLength(6);
    });

    it('impede cadastro de segundo capitão na mesma equipe', async () => {
      // Atleta 1: Capitão
      await addAthlete(ctA.id, makeAthlete('Capitão 1', 1, 'Levantador', true, false), '6x6', competition);

      // Atleta 2: Tentativa de segundo capitão
      const res = await addAthlete(ctA.id, makeAthlete('Capitão 2', 2, 'Ponteiro', true, false), '6x6', competition);
      expect(res.ok).toBe(false);
      expect(res.errors.some(e => e.includes('Já existe um capitão') || e.includes('capitão'))).toBe(true);
    });

    it('impede cadastro de terceiro líbero (máximo 2)', async () => {
      await addAthlete(ctA.id, makeAthlete('Líbero 1', 1, 'Líbero', false, true), '6x6', competition);
      await addAthlete(ctA.id, makeAthlete('Líbero 2', 2, 'Líbero', false, true), '6x6', competition);

      // Tentativa de 3º líbero
      const res = await addAthlete(ctA.id, makeAthlete('Líbero 3', 3, 'Líbero', false, true), '6x6', competition);
      expect(res.ok).toBe(false);
      expect(res.errors.some(e => e.includes('máximo') || e.includes('líbero'))).toBe(true);
    });

    it('impede duplicidade de número de camisa na mesma equipe', async () => {
      await addAthlete(ctA.id, makeAthlete('Jogador A', 10, 'Ponteiro', false, false), '6x6', competition);
      const res = await addAthlete(ctA.id, makeAthlete('Jogador B', 10, 'Central', false, false), '6x6', competition);
      expect(res.ok).toBe(false);
      expect(res.errors.some(e => e.includes('já está em uso') || e.includes('camisa'))).toBe(true);
    });
  });

  describe('Cenário 5 e 6: Submissão (submitted) e Aprovação Formal (approved)', () => {
    let ctA: CompetitionTeam;

    beforeEach(async () => {
      const reg = await registerTeamInCompetition({
        competitionId: compId,
        name: 'Equipe QA 8.6 A',
        shortName: 'QAA',
        managerName: 'Gestor A',
      });
      ctA = reg.competitionTeam!;

      // Cadastra 6 atletas válidos
      for (let i = 1; i <= 6; i++) {
        await addAthlete(
          ctA.id,
          makeAthlete(`Atleta QA A${i}`, i, i === 1 ? 'Levantador' : i === 2 ? 'Líbero' : 'Ponteiro', i === 1, i === 2),
          '6x6',
          competition,
        );
      }
    });

    it('submissão (markRosterSubmitted) transita status para submitted SEM ocupar vaga definitiva', async () => {
      const submitRes = await markRosterSubmitted(ctA.id);
      expect(submitRes).toBeDefined();
      expect(submitRes?.status).toBe('submitted');

      const updatedCtA = (await dataAccess.listCompetitionTeams(compId)).find(t => t.id === ctA.id)!;
      expect(updatedCtA.status).toBe('submitted');

      // INVARIANTE CRÍTICA: submitted NÃO ocupa vaga
      const capacity = CompetitionRegistrationService.getCapacity(competition);
      const approvedCount = [updatedCtA].filter(t => t.status === 'approved').length;
      expect(approvedCount).toBe(0);
      expect(capacity.maxTeams - approvedCount).toBe(2);
    });

    it('organizador detecta pendência e aprova a equipe ocupando exatamente 1 vaga', async () => {
      await markRosterSubmitted(ctA.id);
      const teamsList = await dataAccess.listCompetitionTeams(compId);
      const athletes = await dataAccess.listCompetitionAthletes();
      const currentCtA = teamsList.find(t => t.id === ctA.id)!;

      // 1. Orientação Contextual: Pendência de revisão detectada
      const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
        competition,
        competitionTeams: teamsList,
        athletes,
        matches: [],
      });
      expect(guide.scenario).toBe('PENDING_REVIEWS');
      expect(guide.title).toBe('Revisar Inscrições');

      // 2. Validação de aprovação
      const check = CompetitionRegistrationService.canApproveTeam(competition, currentCtA, teamsList, athletes);
      expect(check.ok).toBe(true);

      // 3. Aprovação formal
      await dataAccess.updateCompetitionTeam(ctA.id, { status: 'approved' });
      const refreshedTeams = await dataAccess.listCompetitionTeams(compId);
      const approvedCtA = refreshedTeams.find(t => t.id === ctA.id)!;
      expect(approvedCtA.status).toBe('approved');

      // 4. Vaga ocupada definitivamente
      const capacity = CompetitionRegistrationService.getCapacity(competition);
      const approvedCount = refreshedTeams.filter(t => t.status === 'approved').length;
      expect(approvedCount).toBe(1);
      expect(capacity.maxTeams - approvedCount).toBe(1);
    });
  });

  describe('Cenário 7 e 8: Segunda Equipe, Capacidade Máxima e Bloqueio de Overbooking', () => {
    let ctA: CompetitionTeam;
    let ctB: CompetitionTeam;
    let ctC: CompetitionTeam;

    beforeEach(async () => {
      // Equipe A aprovada
      const regA = await registerTeamInCompetition({ competitionId: compId, name: 'Equipe QA A', shortName: 'EQA', managerName: 'Gestor A' });
      ctA = regA.competitionTeam!;
      for (let i = 1; i <= 6; i++) {
        await addAthlete(ctA.id, makeAthlete(`A${i}`, i, 'Ponteiro', i === 1, false), '6x6', competition);
      }
      await dataAccess.updateCompetitionTeam(ctA.id, { status: 'approved' });

      // Equipe B com elenco completo e submetida
      const regB = await registerTeamInCompetition({ competitionId: compId, name: 'Equipe QA B', shortName: 'EQB', managerName: 'Gestor B' });
      ctB = regB.competitionTeam!;
      for (let i = 1; i <= 6; i++) {
        await addAthlete(ctB.id, makeAthlete(`B${i}`, i, 'Ponteiro', i === 1, false), '6x6', competition);
      }
      await markRosterSubmitted(ctB.id);

      // Equipe C (terceira agremiação para teste de limite)
      const regC = await registerTeamInCompetition({ competitionId: compId, name: 'Equipe QA C Excedente', shortName: 'EQC', managerName: 'Gestor C' });
      ctC = regC.competitionTeam!;
      for (let i = 1; i <= 6; i++) {
        await addAthlete(ctC.id, makeAthlete(`C${i}`, i, 'Ponteiro', i === 1, false), '6x6', competition);
      }
      await markRosterSubmitted(ctC.id);
    });

    it('aprovação da Equipe B atinge a capacidade máxima (2/2) e bloqueia a Equipe C', async () => {
      const teamsBefore = await dataAccess.listCompetitionTeams(compId);
      const athletes = await dataAccess.listCompetitionAthletes();
      const currentCtB = teamsBefore.find(t => t.id === ctB.id)!;

      // Aprova Equipe B
      const canApproveB = CompetitionRegistrationService.canApproveTeam(competition, currentCtB, teamsBefore, athletes);
      expect(canApproveB.ok).toBe(true);
      await dataAccess.updateCompetitionTeam(ctB.id, { status: 'approved' });

      // Atualiza lista de equipes
      const teamsAfter = await dataAccess.listCompetitionTeams(compId);
      const capacity = CompetitionRegistrationService.getCapacity(competition);
      const approvedCount = teamsAfter.filter(t => t.status === 'approved').length;
      expect(approvedCount).toBe(2);
      expect(capacity.maxTeams).toBe(2);
      expect(capacity.maxTeams - approvedCount).toBe(0);

      // TENTATIVA DE OVERBOOKING: Aprovar Equipe C com capacidade lotada
      const targetCtC = teamsAfter.find(t => t.id === ctC.id)!;
      const canApproveC = CompetitionRegistrationService.canApproveTeam(competition, targetCtC, teamsAfter, athletes);
      expect(canApproveC.ok).toBe(false);
      expect(canApproveC.errors.some(e => e.includes('Capacidade máxima de equipes atingida'))).toBe(true);
    });
  });

  describe('Cenário 9: Rejeição Formal de Inscrição (rejected)', () => {
    it('rejeição formal transita status para rejected e equipe não ocupa vaga nem entra no sorteio', async () => {
      const reg = await registerTeamInCompetition({ competitionId: compId, name: 'Equipe Recusada', shortName: 'REC', managerName: 'Gestor REC' });
      const ct = reg.competitionTeam!;
      await markRosterSubmitted(ct.id);

      // Organizador rejeita
      const canReject = CompetitionRegistrationService.canRejectTeam(competition, ct);
      expect(canReject.ok).toBe(true);

      await dataAccess.updateCompetitionTeam(ct.id, { status: 'rejected' });
      const updatedCt = (await dataAccess.listCompetitionTeams(compId)).find(t => t.id === ct.id)!;
      expect(updatedCt.status).toBe('rejected');

      // Não consome vaga
      const capacity = CompetitionRegistrationService.getCapacity(competition);
      const approvedCount = [updatedCt].filter(t => t.status === 'approved').length;
      expect(approvedCount).toBe(0);

      // Não entra no sorteio
      const eligibility = CompetitionDrawEligibilityService.evaluateCompetitionDrawEligibility({
        competition,
        competitionTeams: [updatedCt],
        athletes: [],
      });
      const teamRep = eligibility.allEvaluations.find(t => t.competitionTeamId === ct.id)!;
      expect(teamRep.status).toBe('rejected');
      expect(teamRep.eligible).toBe(false);
    });
  });

  describe('Cenário 10 e 11: Caminhos Negativos (Duplicidade e Elenco Incompleto)', () => {
    it('bloqueia duplicidade de cadastro da mesma equipe global na mesma competição', async () => {
      // 1º registro com sucesso
      const reg1 = await registerTeamInCompetition({
        competitionId: compId,
        name: 'Vôlei Único',
        shortName: 'VUN',
        managerName: 'Gestor Unico',
      });
      expect(reg1.ok).toBe(true);

      const teamsInComp = await dataAccess.listCompetitionTeams(compId);

      // Tentativa de 2º registro da mesma equipe
      const checkDup = CompetitionRegistrationService.canRegisterTeam(competition, reg1.team!.id, teamsInComp);
      expect(checkDup.ok).toBe(false);
      expect(checkDup.errors.some(e => e.includes('já está inscrita nesta competição'))).toBe(true);
    });

    it('bloqueia aprovação de equipe com elenco incompleto (abaixo do mínimo)', async () => {
      const reg = await registerTeamInCompetition({
        competitionId: compId,
        name: 'Elenco Incompleto',
        shortName: 'INC',
        managerName: 'Gestor Incompleto',
      });
      const ct = reg.competitionTeam!;

      // Cadastra apenas 3 atletas (mínimo regulamentar é 6)
      for (let i = 1; i <= 3; i++) {
        await addAthlete(ct.id, makeAthlete(`Atleta Inc ${i}`, i, 'Ponteiro', i === 1, false), '6x6', competition);
      }
      await markRosterSubmitted(ct.id);

      const athletes = await dataAccess.listCompetitionAthletes();
      const teams = await dataAccess.listCompetitionTeams(compId);
      const currentCt = teams.find(t => t.id === ct.id)!;

      // Tenta aprovar
      const check = CompetitionRegistrationService.canApproveTeam(competition, currentCt, teams, athletes);
      expect(check.ok).toBe(false);
      expect(check.errors.some(e => e.includes('Elenco incompleto') || e.includes('mínimo'))).toBe(true);
    });
  });

  describe('Cenário 12 e 13: Elegibilidade para o Sorteio Oficial e Trava de Elenco (is_locked)', () => {
    let ctA: CompetitionTeam;
    let ctB: CompetitionTeam;

    beforeEach(async () => {
      // Equipe A aprovada e travada (is_locked = true)
      const regA = await registerTeamInCompetition({ competitionId: compId, name: 'Equipe Alfa', shortName: 'ALF', managerName: 'Gestor Alfa' });
      ctA = regA.competitionTeam!;
      for (let i = 1; i <= 6; i++) {
        await addAthlete(ctA.id, makeAthlete(`Alfa ${i}`, i, 'Ponteiro', i === 1, false), '6x6', competition);
      }
      await dataAccess.updateCompetitionTeam(ctA.id, { status: 'approved', isLocked: true });

      // Equipe B aprovada e destravada
      const regB = await registerTeamInCompetition({ competitionId: compId, name: 'Equipe Beta', shortName: 'BET', managerName: 'Gestor Beta' });
      ctB = regB.competitionTeam!;
      for (let i = 1; i <= 6; i++) {
        await addAthlete(ctB.id, makeAthlete(`Beta ${i}`, i, 'Ponteiro', i === 1, false), '6x6', competition);
      }
      await dataAccess.updateCompetitionTeam(ctB.id, { status: 'approved', isLocked: false });
    });

    it('APPROVED + LOCKED permanece 100% elegível para o Sorteio Oficial', async () => {
      const teams = await dataAccess.listCompetitionTeams(compId);
      const athletes = await dataAccess.listCompetitionAthletes();

      const report = CompetitionDrawEligibilityService.evaluateCompetitionDrawEligibility({
        competition,
        competitionTeams: teams,
        athletes,
      });

      const teamAReport = report.allEvaluations.find(t => t.competitionTeamId === ctA.id)!;
      expect(teamAReport.status).toBe('approved');
      expect(teamAReport.eligible).toBe(true); // CONFIRMAÇÃO: is_locked = true NÃO bloqueia o sorteio
    });

    it('libera o Sorteio Oficial quando há 2 ou mais equipes aptas e inscrições encerradas', async () => {
      // 1. Encerra formalmente as inscrições e ajusta para 1 grupo (quórum mínimo de 2 equipes)
      await dataAccess.updateCompetition(compId, { status: 'registration-closed', groupsCount: 1 });
      const closedComp = (await dataAccess.getCompetition(compId))!;

      const teams = await dataAccess.listCompetitionTeams(compId);
      const athletes = await dataAccess.listCompetitionAthletes();

      const report = CompetitionDrawEligibilityService.evaluateCompetitionDrawEligibility({
        competition: closedComp,
        competitionTeams: teams,
        athletes,
        groupsCount: 1,
      });

      expect(report.eligibleCount).toBe(2);
      expect(report.canExecuteDraw).toBe(true);
      expect(report.drawBlockers).toHaveLength(0);
    });

    it('bloqueia o Sorteio Oficial com justificativa clara se houver menos de 2 equipes aptas', async () => {
      // Rebaixa Equipe B para submitted
      await dataAccess.updateCompetitionTeam(ctB.id, { status: 'submitted' });

      const teams = await dataAccess.listCompetitionTeams(compId);
      const athletes = await dataAccess.listCompetitionAthletes();

      const report = CompetitionDrawEligibilityService.evaluateCompetitionDrawEligibility({
        competition,
        competitionTeams: teams,
        athletes,
      });

      expect(report.eligibleCount).toBe(1);
      expect(report.canExecuteDraw).toBe(false);
      expect(report.drawBlockers.some(b => b.includes('mínimo') || b.includes('aptas') || b.includes('2') || b.includes('Inscrições ainda abertas'))).toBe(true);
    });
  });

  describe('Cenário 14 e 15: Esteira Visual e Central de Ajuda', () => {
    it('CompetitionActionGuideService transita para READY_FOR_DRAW quando quórum está apto e inscrições encerradas', async () => {
      // Equipe 1 e 2 aprovadas com siglas de 3 caracteres válidas (TM1 e TM2)
      const reg1 = await registerTeamInCompetition({ competitionId: compId, name: 'Time Um', shortName: 'TM1', managerName: 'Gestor TM1' });
      const reg2 = await registerTeamInCompetition({ competitionId: compId, name: 'Time Dois', shortName: 'TM2', managerName: 'Gestor TM2' });
      expect(reg1.ok).toBe(true);
      expect(reg2.ok).toBe(true);

      for (let i = 1; i <= 6; i++) {
        await addAthlete(reg1.competitionTeam!.id, makeAthlete(`TM1-${i}`, i, 'Ponteiro', i === 1, false), '6x6', competition);
        await addAthlete(reg2.competitionTeam!.id, makeAthlete(`TM2-${i}`, i, 'Ponteiro', i === 1, false), '6x6', competition);
      }
      await dataAccess.updateCompetitionTeam(reg1.competitionTeam!.id, { status: 'approved' });
      await dataAccess.updateCompetitionTeam(reg2.competitionTeam!.id, { status: 'approved' });

      // Encerra inscrições e parametriza 1 grupo para liberar o sorteio
      await dataAccess.updateCompetition(compId, { status: 'registration-closed', groupsCount: 1 });
      const closedComp = (await dataAccess.getCompetition(compId))!;
      const teams = await dataAccess.listCompetitionTeams(compId);
      const athletes = await dataAccess.listCompetitionAthletes();

      const guide = CompetitionActionGuideService.evaluateCompetitionActionGuide({
        competition: closedComp,
        competitionTeams: teams,
        athletes,
        matches: [],
      });

      expect(guide.scenario).toBe('READY_FOR_DRAW');
      expect(guide.title).toBe('Realizar Sorteio Oficial');
      expect(guide.primaryAction.route).toBe(`/sorteio/${compId}`);
    });

    it('artigos da Central de Ajuda não contêm jargão técnico voltado ao desenvolvedor', () => {
      const technicalJargons = ['postgrest', 'jsonb', 'rls', 'pgrst', 'sql injection', 'undefined_column', 'migration'];
      
      for (const article of HELP_ARTICLES) {
        const stepsText = article.steps ? article.steps.map(s => s.instruction).join(' ') : '';
        const fullContent = `${article.title} ${article.description || ''} ${article.objective || ''} ${stepsText} ${article.result || ''}`.toLowerCase();
        for (const jargon of technicalJargons) {
          expect(fullContent).not.toContain(jargon);
        }
      }
    });
  });
});
