/**
 * BaseOS — QA Master Ponta a Ponta (Passo 10)
 *
 * Suíte de Teste de Integração de "Caminho Dourado" (Golden Path Lifecycle)
 * Orquestra o ciclo de vida completo do BaseOS sem mockar serviços de domínio:
 *
 *  Passo 1 (Tenant): Inicialização da Organização multi-tenant e usuário com role 'admin'
 *  Passo 2 (Construtor): Injeção de StageDefinition[] (Grupos -> Eliminatória), validação de DAG e criação da competição
 *  Passo 3 (Inscrições): Cadastro de 4 equipes com atletas simulando a lógica de user_memberships
 *  Passo 4 (Sorteio): Execução do motor de sorteio (Draw Arena) e instanciação de nós em competition_match_slots
 *  Passo 5 (Cadência): Homologação atômica das partidas da Fase de Grupos com transição automática do estágio para 'completed'
 *  Passo 6 (Playoffs & Pódio): Homologação da Grande Final, acionamento do computePodium, transição global para 'completed'
 *                             e validação determinística de Campeão, Vice-campeão e imutabilidade pós-encerramento.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { clearEntireDatabase, dataAccess } from '@/services/dataAccess';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { CompetitionRuntimeService } from '@/services/competitionRuntimeService';
import { StageGraph } from '@/services/stageGraphEngine';
import { computePodium } from '@/services/playoffsService';
import type { StageDefinition } from '@/types/competitionConfig';
import { DEFAULT_INDOOR_COMPETITION_CONFIG } from '@/types/competitionConfig';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type { OrganizationRecord, UserMembership, AthleteIdentity } from '@/types/identity';
import type { DrawResult } from '@/types/draw';

describe('BaseOS — Golden Path E2E Lifecycle Suite (Passo 10)', () => {
  beforeEach(() => {
    localStorage.clear();
    clearEntireDatabase();
  });

  it('orquestra o Caminho Dourado (Golden Path) completo do SaaS: Tenant -> Construtor -> Inscrições -> Sorteio -> Cadência -> Playoffs & Pódio', async () => {
    // ========================================================================
    // PASSO 1 (Tenant): Inicialização Multi-Tenant e Administrador
    // ========================================================================
    const orgInput: Omit<OrganizationRecord, 'id' | 'createdAt' | 'updatedAt'> & { id: string } = {
      id: 'org-golden-voltz',
      name: 'Voltz Volleyball League',
      legalName: 'Voltz Sports & Entertainment Ltda',
      documentNumber: '12.345.678/0001-90',
      status: 'active',
    };

    const organization = await dataAccess.createOrganization(orgInput);
    expect(organization).toBeDefined();
    expect(organization.id).toBe('org-golden-voltz');
    expect(organization.status).toBe('active');

    // Usuário administrador associado à organização
    const adminUserId = 'usr-admin-master-01';
    const adminMembership: UserMembership = await dataAccess.createUserMembership({
      id: 'mem-admin-01',
      userId: adminUserId,
      organizationId: organization.id,
      role: 'admin',
      status: 'active',
    });

    expect(adminMembership).toBeDefined();
    expect(adminMembership.role).toBe('admin');
    expect(adminMembership.organizationId).toBe(organization.id);
    expect(adminMembership.status).toBe('active');

    const adminMemberships = await dataAccess.listUserMemberships(adminUserId);
    expect(adminMemberships).toHaveLength(1);
    expect(adminMemberships[0].role).toBe('admin');
    expect(adminMemberships[0].organizationId).toBe('org-golden-voltz');

    // ========================================================================
    // PASSO 2 (Construtor): Injeção de StageDefinition[] (Grupos -> Eliminatória)
    // ========================================================================
    const stageDefinitions: StageDefinition[] = [
      {
        id: 'stage-groups',
        stageId: 'stage-groups',
        order: 1,
        name: 'Fase de Grupos',
        type: 'group-stage',
        groupConfig: {
          groupsCount: 2,
          teamsPerGroup: 2,
          rounds: 'single',
        },
        participantFeeds: [{ type: 'all-teams' }],
        rounds: [
          { roundId: 'round-groups-1', stageId: 'stage-groups', order: 1, name: 'Rodada Classificatória' },
        ],
      },
      {
        id: 'stage-playoffs',
        stageId: 'stage-playoffs',
        order: 2,
        name: 'Fase Final (Playoffs)',
        type: 'knockout',
        dependsOnStageIds: ['stage-groups'],
        eliminationConfig: {
          bracketSize: 2,
          hasThirdPlaceMatch: false,
        },
        pairingConfig: {
          strategy: 'same-position-cross',
        },
        participantFeeds: [
          { type: 'group-position', stageId: 'stage-groups', groupIndex: 0, position: 1 },
          { type: 'group-position', stageId: 'stage-groups', groupIndex: 1, position: 1 },
        ],
        rounds: [
          { roundId: 'round-final-1', stageId: 'stage-playoffs', order: 1, name: 'Grande Final', slotsCount: 1 },
        ],
      },
    ];

    // Validação estrita do DAG via StageGraph
    const stageGraph = new StageGraph(stageDefinitions);
    const graphValidation = stageGraph.validateDAG();
    expect(graphValidation.isValid).toBe(true);
    expect(graphValidation.errors).toHaveLength(0);
    expect(graphValidation.topologicalOrder).toEqual(['stage-groups', 'stage-playoffs']);

    // Criação da Competição com as 2 fases embutidas no config
    const competitionRecord: CompetitionRecord = await dataAccess.createCompetition({
      id: 'comp-golden-2026',
      name: 'Circuito Ouro BaseOS 2026',
      slug: 'circuito-ouro-baseos-2026',
      organizationId: organization.id,
      modality: 'indoor',
      genderCategory: 'male',
      format: 'groups-knockout',
      playerFormat: '6x6',
      setFormat: '3-sets',
      status: 'registration-open',
      config: {
        ...DEFAULT_INDOOR_COMPETITION_CONFIG,
        format: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
          formatType: 'groups-knockout',
          defaultSetsToWin: 2,
          stages: stageDefinitions,
        },
        standings: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG.standings,
          tiebreakCriteriaOrder: ['points', 'head-to-head', 'set-average', 'points-average'],
          advancingPerGroup: 1,
        },
      },
    });

    expect(competitionRecord.id).toBe('comp-golden-2026');
    expect(competitionRecord.organizationId).toBe(organization.id);
    expect(competitionRecord.status).toBe('registration-open');

    // Persistência relacional dos estágios e rodadas
    const stageGroups = await dataAccess.createStage({
      competitionId: competitionRecord.id,
      stageId: 'stage-groups',
      name: 'Fase de Grupos',
      stageOrder: 1,
      stageType: 'groups',
      status: 'pending',
      isLocked: false,
    });

    const roundGroups = await dataAccess.createRound({
      competitionId: competitionRecord.id,
      stageRowId: stageGroups.id,
      roundId: 'round-groups-1',
      name: 'Rodada Classificatória',
      roundOrder: 1,
      slotsCount: 2,
      status: 'pending',
    });

    const stagePlayoffs = await dataAccess.createStage({
      competitionId: competitionRecord.id,
      stageId: 'stage-playoffs',
      name: 'Fase Final (Playoffs)',
      stageOrder: 2,
      stageType: 'knockout',
      status: 'pending',
      isLocked: false,
    });

    const roundFinal = await dataAccess.createRound({
      competitionId: competitionRecord.id,
      stageRowId: stagePlayoffs.id,
      roundId: 'round-final-1',
      name: 'Grande Final',
      roundOrder: 1,
      slotsCount: 1,
      status: 'pending',
    });

    expect(stageGroups.id).toBeDefined();
    expect(stagePlayoffs.id).toBeDefined();

    // ========================================================================
    // PASSO 3 (Inscrições): 4 Equipes & Lógica Multi-Tenant de user_memberships
    // ========================================================================
    const rawTeamsData = [
      { id: 'team-alpha', name: 'Alpha Vôlei Clube', shortName: 'ALF' },
      { id: 'team-beta', name: 'Beta Voleibol', shortName: 'BET' },
      { id: 'team-gama', name: 'Gama Esporte Clube', shortName: 'GAM' },
      { id: 'team-delta', name: 'Delta Sports', shortName: 'DEL' },
    ];

    const teams: TeamRecord[] = [];
    for (const t of rawTeamsData) {
      const createdTeam = await dataAccess.createTeam({
        id: t.id,
        name: t.name,
        shortName: t.shortName,
        modality: 'indoor',
        organizationId: organization.id,
      });
      teams.push(createdTeam);

      // Inscrição oficial da equipe na competição
      await dataAccess.createCompetitionTeam({
        competitionId: competitionRecord.id,
        teamId: createdTeam.id,
        teamName: createdTeam.name,
        teamShortName: createdTeam.shortName,
        registrationDeadline: new Date(Date.now() + 86400000).toISOString(),
        isLocked: false,
        status: 'approved',
      });
    }

    // Cadastro de Atletas Multi-Tenant com CPF único e vinculação de user_memberships
    const athletesData = [
      { name: 'Lucas Alpha', cpf: '11122233301', teamId: 'team-alpha' },
      { name: 'Mateus Beta', cpf: '22233344402', teamId: 'team-beta' },
      { name: 'Gabriel Gama', cpf: '33344455503', teamId: 'team-gama' },
      { name: 'Rafael Delta', cpf: '44455566604', teamId: 'team-delta' },
    ];

    for (const a of athletesData) {
      const athlete: AthleteIdentity = await dataAccess.createAthlete({
        name: a.name,
        normalizedCpf: a.cpf,
      });

      // Vinculação de identidade à organização e à equipe via user_memberships
      await dataAccess.createUserMembership({
        userId: athlete.id,
        organizationId: organization.id,
        teamId: a.teamId,
        competitionId: competitionRecord.id,
        role: 'athlete',
        status: 'active',
      });
    }

    // Validação da integridade dos membros da organização
    const orgMembers = await dataAccess.listOrganizationMembers(organization.id);
    expect(orgMembers.length).toBeGreaterThanOrEqual(4);

    const competitionTeams = await dataAccess.listCompetitionTeams(competitionRecord.id);
    expect(competitionTeams).toHaveLength(4);

    // Fechamento canônico das inscrições
    const closeResult = await CompetitionLifecycleService.closeRegistrations(
      competitionRecord.id,
      adminUserId,
    );
    expect(closeResult.ok).toBe(true);
    expect(closeResult.competition?.status).toBe('registration-closed');

    // ========================================================================
    // PASSO 4 (Sorteio): Draw Arena & Instanciação de competition_match_slots
    // ========================================================================
    // Sorteio: 2 grupos de 2 equipes
    const drawResult: DrawResult = {
      competitionId: competitionRecord.id,
      config: {
        groupsCount: 2,
        seedingMode: 'random',
        seed: 42,
        headSeeds: [],
      },
      groups: [
        {
          name: 'Grupo A',
          teams: [
            { teamId: 'team-alpha', seed: 1 },
            { teamId: 'team-beta', seed: 2 },
          ],
        },
        {
          name: 'Grupo B',
          teams: [
            { teamId: 'team-gama', seed: 3 },
            { teamId: 'team-delta', seed: 4 },
          ],
        },
      ],
      matches: [
        {
          round: 1,
          matchNumber: 1,
          teamAId: 'team-alpha',
          teamBId: 'team-beta',
          groupName: 'Grupo A',
          phase: 'Fase de Grupos',
        },
        {
          round: 1,
          matchNumber: 2,
          teamAId: 'team-gama',
          teamBId: 'team-delta',
          groupName: 'Grupo B',
          phase: 'Fase de Grupos',
        },
      ],
    };

    await dataAccess.saveDraw(drawResult);

    // Instanciação dos nós de chaveamento em competition_match_slots
    // Slot 1: Confronto Grupo A com rota de progressão do vencedor para a Final (Lado A)
    await dataAccess.createMatchSlot({
      competitionId: competitionRecord.id,
      stageRowId: stageGroups.id,
      roundRowId: roundGroups.id,
      slotId: 'SLOT-GA-01',
      position: 1,
      label: 'Fase de Grupos',
      participantAReference: { type: 'resolved-team', teamId: 'team-alpha', teamName: 'Alpha Vôlei Clube' },
      participantBReference: { type: 'resolved-team', teamId: 'team-beta', teamName: 'Beta Voleibol' },
      participantAStatus: 'resolved',
      participantBStatus: 'resolved',
      resolvedTeamAId: 'team-alpha',
      resolvedTeamBId: 'team-beta',
      progressionRoute: {
        sourceSlotId: 'SLOT-GA-01',
        onWinner: {
          targetStageId: stagePlayoffs.id,
          targetRoundId: roundFinal.id,
          targetSlotId: 'SLOT-FINAL-01',
          targetSide: 'A',
        },
      },
    });

    // Slot 2: Confronto Grupo B com rota de progressão do vencedor para a Final (Lado B)
    await dataAccess.createMatchSlot({
      competitionId: competitionRecord.id,
      stageRowId: stageGroups.id,
      roundRowId: roundGroups.id,
      slotId: 'SLOT-GB-01',
      position: 2,
      label: 'Fase de Grupos',
      participantAReference: { type: 'resolved-team', teamId: 'team-gama', teamName: 'Gama Esporte Clube' },
      participantBReference: { type: 'resolved-team', teamId: 'team-delta', teamName: 'Delta Sports' },
      participantAStatus: 'resolved',
      participantBStatus: 'resolved',
      resolvedTeamAId: 'team-gama',
      resolvedTeamBId: 'team-delta',
      progressionRoute: {
        sourceSlotId: 'SLOT-GB-01',
        onWinner: {
          targetStageId: stagePlayoffs.id,
          targetRoundId: roundFinal.id,
          targetSlotId: 'SLOT-FINAL-01',
          targetSide: 'B',
        },
      },
    });

    // Slot 3: Grande Final com referências estruturais aos vencedores dos slots de grupo
    await dataAccess.createMatchSlot({
      competitionId: competitionRecord.id,
      stageRowId: stagePlayoffs.id,
      roundRowId: roundFinal.id,
      slotId: 'SLOT-FINAL-01',
      position: 1,
      label: 'Grande Final',
      participantAReference: { type: 'match-winner', slotId: 'SLOT-GA-01' },
      participantBReference: { type: 'match-winner', slotId: 'SLOT-GB-01' },
      participantAStatus: 'unresolved',
      participantBStatus: 'unresolved',
      resolvedTeamAId: null,
      resolvedTeamBId: null,
      matchId: null,
    });

    // Materialização atômica das partidas da Fase de Grupos
    const matGA = await dataAccess.materializeSlotMatch({
      competitionId: competitionRecord.id,
      slotId: 'SLOT-GA-01',
      phase: 'Fase de Grupos',
      venue: 'Ginásio Principal',
    });
    const matGB = await dataAccess.materializeSlotMatch({
      competitionId: competitionRecord.id,
      slotId: 'SLOT-GB-01',
      phase: 'Fase de Grupos',
      venue: 'Ginásio Principal',
    });

    expect(matGA.ok).toBe(true);
    expect(matGB.ok).toBe(true);
    expect(matGA.matchId).toBeTruthy();
    expect(matGB.matchId).toBeTruthy();

    await dataAccess.updateMatch(matGA.matchId!, { groupName: 'Grupo A', phase: 'Fase de Grupos' });
    await dataAccess.updateMatch(matGB.matchId!, { groupName: 'Grupo B', phase: 'Fase de Grupos' });

    // Transição formal para 'groups-defined' após o sorteio
    const advanceResult = await CompetitionLifecycleService.advanceToGroupsDefinedAfterDraw(
      competitionRecord.id,
      adminUserId,
    );
    expect(advanceResult.ok).toBe(true);
    expect(advanceResult.competition?.status).toBe('groups-defined');

    // Confirma bloqueio (lock) das inscrições de equipes
    const lockedTeams = await dataAccess.listCompetitionTeams(competitionRecord.id);
    expect(lockedTeams.every(t => t.isLocked)).toBe(true);

    // ========================================================================
    // PASSO 5 (Cadência): Homologação da Fase de Grupos & Transição de Fase
    // ========================================================================
    // 5.1. Execução e Homologação do Jogo do Grupo A (Alpha vence por 2x0)
    await dataAccess.updateMatch(matGA.matchId!, {
      status: 'homologated',
      winnerId: 'team-alpha',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 18 },
        { setNumber: 2, scoreA: 25, scoreB: 20 },
      ],
    });

    const progGA = await CompetitionRuntimeService.handleMatchCompleted(
      competitionRecord.id,
      matGA.matchId!,
    );
    expect(progGA.ok).toBe(true);

    // Verifica que Alpha avançou para a Final (Lado A), mas a Final ainda não materializou partida
    const finalSlotMid = await dataAccess.getMatchSlotByLogicalId(competitionRecord.id, 'SLOT-FINAL-01');
    expect(finalSlotMid?.resolvedTeamAId).toBe('team-alpha');
    expect(finalSlotMid?.resolvedTeamBId).toBeNull();
    expect(finalSlotMid?.matchId).toBeNull();

    // 5.2. Execução e Homologação do Jogo do Grupo B (Gama vence por 2x1)
    await dataAccess.updateMatch(matGB.matchId!, {
      status: 'homologated',
      winnerId: 'team-gama',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 22 },
        { setNumber: 2, scoreA: 20, scoreB: 25 },
        { setNumber: 3, scoreA: 15, scoreB: 11 },
      ],
    });

    const progGB = await CompetitionRuntimeService.handleMatchCompleted(
      competitionRecord.id,
      matGB.matchId!,
    );
    expect(progGB.ok).toBe(true);

    // Agora ambos os lados da Final estão resolvidos e o Match da Final deve estar materializado
    const finalSlotReady = await dataAccess.getMatchSlotByLogicalId(competitionRecord.id, 'SLOT-FINAL-01');
    expect(finalSlotReady?.resolvedTeamAId).toBe('team-alpha');
    expect(finalSlotReady?.resolvedTeamBId).toBe('team-gama');
    expect(finalSlotReady?.matchId).toBeTruthy();

    // Sincronização do Ciclo de Vida: avalia conclusão da Fase de Grupos
    const lifecycleAfterGroups = await CompetitionLifecycleService.syncLifecycleAfterMatchProgression(
      competitionRecord.id,
      'Operador QA Cadência',
    );
    expect(lifecycleAfterGroups.ok).toBe(true);

    // Validações de Fase 1:
    // 1. Fase de Grupos deve ter status = 'completed'
    const stagesAfterGroups = await dataAccess.listStages(competitionRecord.id);
    const stageGroupsReloaded = stagesAfterGroups.find(s => s.id === stageGroups.id);
    expect(stageGroupsReloaded?.status).toBe('completed');

    // 2. Competição global NÃO concluiu prematuramente porque os Playoffs estão pendentes
    const compAfterGroups = await dataAccess.getCompetition(competitionRecord.id);
    expect(compAfterGroups?.status).toBe('in-progress');
    expect(compAfterGroups?.championTeamId).toBeUndefined();

    // 3. Fase de Playoffs permanece em status pending/in-progress
    const stagePlayoffsReloaded = stagesAfterGroups.find(s => s.id === stagePlayoffs.id);
    expect(stagePlayoffsReloaded?.status).not.toBe('completed');

    // ========================================================================
    // PASSO 6 (Playoffs & Pódio): Homologação da Final, computePodium e Encerramento
    // ========================================================================
    const finalMatchId = finalSlotReady!.matchId!;
    const finalMatch = await dataAccess.getMatch(finalMatchId);
    expect(finalMatch).not.toBeNull();
    expect(finalMatch?.teamAId).toBe('team-alpha');
    expect(finalMatch?.teamBId).toBe('team-gama');

    // Homologação da Grande Final: Alpha vence Gama por 2x1 (25x23, 21x25, 15x12)
    await dataAccess.updateMatch(finalMatchId, {
      phase: 'Grande Final',
      status: 'homologated',
      winnerId: 'team-alpha',
      sets: [
        { setNumber: 1, scoreA: 25, scoreB: 23 },
        { setNumber: 2, scoreA: 21, scoreB: 25 },
        { setNumber: 3, scoreA: 15, scoreB: 12 },
      ],
    });

    // Sincronização do Ciclo de Vida após conclusão de todas as partidas da competição
    const lifecycleFinal = await CompetitionLifecycleService.syncLifecycleAfterMatchProgression(
      competitionRecord.id,
      'Operador QA Final',
    );

    expect(lifecycleFinal.ok).toBe(true);
    expect(lifecycleFinal.updated).toBe(true);

    // Validação direta do computePodium
    const allMatches = await dataAccess.listMatches(competitionRecord.id);
    const calculatedPodium = computePodium(allMatches, competitionRecord);
    expect(calculatedPodium.championTeamId).toBe('team-alpha');
    expect(calculatedPodium.runnerUpTeamId).toBe('team-gama');

    // Validações do Torneio Concluído no Banco / DataAccess:
    const finishedComp = await dataAccess.getCompetition(competitionRecord.id);
    expect(finishedComp).not.toBeNull();
    expect(finishedComp?.status).toBe('completed');
    expect(finishedComp?.championTeamId).toBe('team-alpha');
    expect(finishedComp?.runnerUpTeamId).toBe('team-gama');

    // Validação de conclusão de todos os estágios do DAG
    const finalStages = await dataAccess.listStages(competitionRecord.id);
    expect(finalStages.every(s => s.status === 'completed')).toBe(true);

    // Validação de Imutabilidade e Blindagem Pós-Encerramento
    expect(CompetitionLifecycleService.canEditCompetition(finishedComp!)).toBe(false);
    expect(CompetitionLifecycleService.canEditRules(finishedComp!)).toBe(false);
    expect(CompetitionLifecycleService.canCreateMatch(finishedComp!)).toBe(false);
    expect(CompetitionLifecycleService.canRecordResult(finishedComp!)).toBe(false);
    expect(CompetitionLifecycleService.canCancelCompetition(finishedComp!)).toBe(false);
  });
});
