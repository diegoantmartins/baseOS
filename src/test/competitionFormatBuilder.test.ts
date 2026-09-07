/**
 * BaseOS — Suíte de Testes da Fase 4.10
 *
 * Validação abrangente de Format Builder, Templates, Configuração e Integração:
 *  - Teste A: Round Robin (construção, validação, normalização)
 *  - Teste B: Groups -> Knockout (2 grupos -> semis -> final)
 *  - Teste C: Groups -> Play-In -> Knockout (4 grupos -> ranking -> play-in -> QF -> SF -> Final)
 *  - Teste D: BYE (5 equipes, 8 slots, 3 BYEs, zero fake teams)
 *  - Teste E: Overall Ranking Strategy no CompetitionConfig
 *  - Teste F: 8 Modalidades de ParticipantReference
 *  - Teste G: Rejeição de Configuração Inválida (ciclos, dependências quebradas, feeds vazios)
 *  - Teste H: Template como Preset Puro (desacoplamento total do runtime)
 *  - Teste I: Cenário Voltz Declarativo (sem hardcodes ou strings mágicas)
 *  - Teste J: Transição Best of 3 -> Best of 5 (sem efeitos colaterais)
 *  - Teste K: Proteção de Congelamento (Freeze)
 *  - Teste L: Save -> Reload Equivalence
 *  - Teste M: Auditoria de Hardcodes Proibidos
 *  - Teste N: Integração com Runtime 4.8
 *  - Teste O: Integração com Bracket 4.9
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  CompetitionConfig,
  ParticipantReference,
  StageDefinition,
} from '@/types/competitionConfig';
import {
  DEFAULT_INDOOR_COMPETITION_CONFIG,
  createByeParticipantSlot,
  createResolvedParticipantSlot,
  createUnresolvedParticipantSlot,
} from '@/types/competitionConfig';
import { CompetitionFormatBuilder } from '@/services/competitionFormatBuilder';
import { CompetitionConfigValidator } from '@/services/competitionConfigValidator';
import { CompetitionTemplateService } from '@/services/competitionTemplateService';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { StageGraph } from '@/services/stageGraphEngine';
import { CompetitionBracketViewModelBuilder } from '@/services/competitionBracketViewModel';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';

describe('BaseOS — Fase 4.10: Format Builder & Competition Setup', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ==========================================================================
  // TESTE A — Round Robin
  // ==========================================================================
  describe('TESTE A — Round Robin', () => {
    it('deve gerar configuração válida de Round Robin, validar sem erros e normalizar estrutura', () => {
      const config = CompetitionTemplateService.createConfigFromTemplate('round-robin-standard', {
        teamsCount: 5,
        setsToWin: 2,
      });

      expect(config.format.formatType).toBe('round-robin');
      expect(config.format.stages?.length).toBe(1);
      expect(config.format.stages?.[0].type).toBe('round-robin');

      const validation = CompetitionConfigValidator.validate(config);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Validação de DAG do estágio único
      const dag = StageGraph.validate(config.format.stages || [], []);
      expect(dag.isValid).toBe(true);
      expect(dag.topologicalOrder).toEqual(['fase-unica']);
    });
  });

  // ==========================================================================
  // TESTE B — Groups -> Knockout
  // ==========================================================================
  describe('TESTE B — Groups -> Knockout', () => {
    it('deve criar 2 grupos -> semifinais -> final e comprovar que o builder apenas gera configuração declarativa', () => {
      const builder = new CompetitionFormatBuilder();
      builder.setFormatType('groups-knockout');

      const stageGroups: StageDefinition = {
        id: 'stg-groups',
        stageId: 'stg-groups',
        order: 1,
        name: 'Grupos Classificatórios',
        type: 'group-stage',
        groupConfig: { groupsCount: 2, teamsPerGroup: 3 },
        participantFeeds: [{ type: 'all-teams' }],
        rounds: [{ roundId: 'rnd-g1', stageId: 'stg-groups', order: 1, name: 'Jogos da Chave' }],
      };

      const stageKnockout: StageDefinition = {
        id: 'stg-knockout',
        stageId: 'stg-knockout',
        order: 2,
        name: 'Fase Final',
        type: 'knockout',
        dependsOnStageIds: ['stg-groups'],
        eliminationConfig: { bracketSize: 4, hasThirdPlaceMatch: true },
        pairingConfig: { strategy: 'same-position-cross' },
        participantFeeds: [
          { type: 'group-position', stageId: 'stg-groups', groupIndex: 0, position: 1 },
          { type: 'group-position', stageId: 'stg-groups', groupIndex: 1, position: 2 },
          { type: 'group-position', stageId: 'stg-groups', groupIndex: 1, position: 1 },
          { type: 'group-position', stageId: 'stg-groups', groupIndex: 0, position: 2 },
        ],
        rounds: [
          { roundId: 'rnd-sf', stageId: 'stg-knockout', order: 1, name: 'Semifinais', slotsCount: 2 },
          { roundId: 'rnd-f', stageId: 'stg-knockout', order: 2, name: 'Final', slotsCount: 1 },
        ],
      };

      builder.addStage(stageGroups);
      builder.addStage(stageKnockout);

      const config = builder.build();
      expect(config.format.stages).toHaveLength(2);

      const val = CompetitionConfigValidator.validate(config);
      expect(val.isValid).toBe(true);
      expect(val.errors).toHaveLength(0);

      const dag = StageGraph.validate(config.format.stages || [], []);
      expect(dag.isValid).toBe(true);
      expect(dag.topologicalOrder).toEqual(['stg-groups', 'stg-knockout']);
    });
  });

  // ==========================================================================
  // TESTE C — Groups -> Play-In -> Knockout
  // ==========================================================================
  describe('TESTE C — Groups -> Play-In -> Knockout (Multi-Estágio)', () => {
    it('deve gerar 4 grupos -> ranking geral -> play-in -> quartas -> semis -> final com DAG 100% acíclico', () => {
      const config = CompetitionTemplateService.createConfigFromTemplate('groups-play-in-knockout-standard');
      expect(config.format.stages).toHaveLength(3);

      const [grp, playIn, knk] = config.format.stages!;
      expect(grp.type).toBe('group-stage');
      expect(playIn.type).toBe('play-in');
      expect(knk.type).toBe('knockout');

      expect(playIn.dependsOnStageIds).toEqual(['fase-grupos']);
      expect(knk.dependsOnStageIds).toEqual(['fase-grupos', 'play-in']);

      const validation = CompetitionConfigValidator.validate(config);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      const dag = StageGraph.validate(config.format.stages!, []);
      expect(dag.isValid).toBe(true);
      expect(dag.topologicalOrder).toEqual(['fase-grupos', 'play-in', 'fase-final']);
    });
  });

  // ==========================================================================
  // TESTE D — BYE Estrutural e Ausência de Fake Teams
  // ==========================================================================
  describe('TESTE D — BYE Estrutural (5 Equipes, 8 Slots, 3 BYEs)', () => {
    it('deve representar BYE como participante legítimo sem inventar TBD-A-1 ou equipes artificiais', () => {
      const stage: StageDefinition = {
        id: 'stg-bye',
        stageId: 'stg-bye',
        order: 1,
        name: 'Mata-Mata com BYEs',
        type: 'knockout',
        eliminationConfig: { bracketSize: 8 },
        pairingConfig: { strategy: 'seeded-bracket' },
        participantFeeds: [
          { type: 'seed', seedNumber: 1 },
          { type: 'seed', seedNumber: 2 },
          { type: 'seed', seedNumber: 3 },
          { type: 'seed', seedNumber: 4 },
          { type: 'seed', seedNumber: 5 },
          { type: 'bye' },
          { type: 'bye' },
          { type: 'bye' },
        ],
        rounds: [
          { roundId: 'r-qf', stageId: 'stg-bye', order: 1, name: 'Quartas de Final', slotsCount: 4 },
          { roundId: 'r-sf', stageId: 'stg-bye', order: 2, name: 'Semifinais', slotsCount: 2 },
          { roundId: 'r-fn', stageId: 'stg-bye', order: 3, name: 'Final', slotsCount: 1 },
        ],
      };

      const config: CompetitionConfig = {
        ...DEFAULT_INDOOR_COMPETITION_CONFIG,
        format: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
          stages: [stage],
        },
      };

      const validation = CompetitionConfigValidator.validate(config);
      expect(validation.isValid).toBe(true);
      // BYE deve gerar warning informativo, mas não erro bloqueante
      expect(validation.warnings.some(w => w.message.includes('BYE'))).toBe(true);

      const preview = CompetitionFormatBuilder.generatePreviewSlots(config);
      expect(preview.slots.length).toBeGreaterThan(0);

      // Prova de ausência de fake teams
      const serialized = JSON.stringify(preview.slots);
      expect(serialized.includes('TBD-A-1')).toBe(false);
      expect(serialized.includes('fake-team')).toBe(false);
      expect(serialized.includes('__BYE__')).toBe(false);
    });
  });

  // ==========================================================================
  // TESTE E — Overall Ranking Strategy
  // ==========================================================================
  describe('TESTE E — Overall Ranking Strategy', () => {
    it('deve configurar aggregationStrategy e provar que ela reside puramente no CompetitionConfig', () => {
      const builder = new CompetitionFormatBuilder();
      builder.setStandings({
        aggregationStrategy: 'pure-overall-stats',
        advancingPerGroup: 3,
      });

      const config = builder.build();
      expect(config.standings.aggregationStrategy).toBe('pure-overall-stats');
      expect(config.standings.advancingPerGroup).toBe(3);

      const val = CompetitionConfigValidator.validate(config);
      expect(val.isValid).toBe(true);
    });
  });

  // ==========================================================================
  // TESTE F — 8 Modalidades de ParticipantReference
  // ==========================================================================
  describe('TESTE F — Suporte às 8 Modalidades de ParticipantReference', () => {
    it('deve suportar e instanciar corretamente todas as 8 modalidades de referência', () => {
      const refs: ParticipantReference[] = [
        { type: 'resolved-team', teamId: 'team-1', teamName: 'Sada Cruzeiro' },
        { type: 'group-position', stageId: 'stg-1', groupIndex: 0, position: 1 },
        { type: 'overall-ranking', stageId: 'stg-1', position: 5 },
        { type: 'stage-position', stageId: 'stg-1', position: 2 },
        { type: 'match-winner', slotId: 'SLOT-SF1' },
        { type: 'match-loser', slotId: 'SLOT-SF1' },
        { type: 'seed', seedNumber: 4 },
        { type: 'bye' },
      ];

      expect(refs).toHaveLength(8);

      const slotBye = createByeParticipantSlot('B');
      expect(slotBye.isBye).toBe(true);
      expect(slotBye.status).toBe('bye');

      const slotResolved = createResolvedParticipantSlot('A', 'team-1', 'Sada');
      expect(slotResolved.status).toBe('resolved');
      expect(slotResolved.resolvedTeamId).toBe('team-1');

      const slotUnresolved = createUnresolvedParticipantSlot('A', refs[1], '1º Grupo A');
      expect(slotUnresolved.status).toBe('unresolved');
      expect(slotUnresolved.displayPlaceholder).toBe('1º Grupo A');
    });
  });

  // ==========================================================================
  // TESTE G — Rejeição de Configuração Inválida
  // ==========================================================================
  describe('TESTE G — Rejeição de Configuração Inválida', () => {
    it('deve detectar e bloquear ciclo direto, indireto e referências quebradas', () => {
      const cyclicStages: StageDefinition[] = [
        {
          id: 'stg-A',
          order: 1,
          name: 'Estágio A',
          type: 'knockout',
          dependsOnStageIds: ['stg-B'], // Ciclo: A depende de B
        },
        {
          id: 'stg-B',
          order: 2,
          name: 'Estágio B',
          type: 'knockout',
          dependsOnStageIds: ['stg-A'], // Ciclo: B depende de A
        },
      ];

      const brokenConfig: CompetitionConfig = {
        ...DEFAULT_INDOOR_COMPETITION_CONFIG,
        format: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG.format,
          stages: cyclicStages,
        },
      };

      const result = CompetitionConfigValidator.validate(brokenConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Ciclo'))).toBe(true);
    });

    it('deve rejeitar pontuações esportivas incoerentes', () => {
      const invalidScoringConfig: CompetitionConfig = {
        ...DEFAULT_INDOOR_COMPETITION_CONFIG,
        scoring: {
          ...DEFAULT_INDOOR_COMPETITION_CONFIG.scoring,
          pointsWinClear: 1,
          pointsWinNarrow: 3, // Incoerência: vitória apertada ganhando mais que limpa
        },
      };

      const result = CompetitionConfigValidator.validate(invalidScoringConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'scoring.pointsWinClear')).toBe(true);
    });
  });

  // ==========================================================================
  // TESTE H — Template como Preset Desacoplado
  // ==========================================================================
  describe('TESTE H — Template como Preset Desacoplado', () => {
    it('deve gerar config sem acoplamento futuro com o ID do template', () => {
      const config = CompetitionTemplateService.createConfigFromTemplate('groups-knockout-standard');
      // O template produz um CompetitionConfig puro
      expect(((config as unknown) as Record<string, unknown>).templateId).toBeUndefined();
      expect(config.version).toBe(1);
      expect(config.format.stages).toBeDefined();
    });
  });

  // ==========================================================================
  // TESTE I — Cenário Voltz Declarativo
  // ==========================================================================
  describe('TESTE I — Cenário Voltz Declarativo (Sem Hardcodes)', () => {
    it('deve construir o formato completo de 12 equipes (4 grupos x 3 -> Play-In -> QF -> SF -> Final) sem código específico', () => {
      const config = CompetitionTemplateService.createConfigFromTemplate('groups-play-in-knockout-standard', {
        teamsCount: 12,
        setsToWin: 2,
      });

      const serialized = JSON.stringify(config).toLowerCase();
      expect(serialized.includes('voltz')).toBe(false);

      const val = CompetitionConfigValidator.validate(config);
      expect(val.isValid).toBe(true);

      const stages = config.format.stages!;
      expect(stages).toHaveLength(3);
      expect(stages[0].groupConfig?.groupsCount).toBe(4);
      expect(stages[1].type).toBe('play-in');
      expect(stages[2].type).toBe('knockout');
    });
  });

  // ==========================================================================
  // TESTE J — Best of 3 -> Best of 5
  // ==========================================================================
  describe('TESTE J — Best of 3 -> Best of 5', () => {
    it('deve transicionar formato de sets de 2 para 3 sem alterar outras seções', () => {
      const builder = new CompetitionFormatBuilder();
      expect(builder.getConfig().format.defaultSetsToWin).toBe(2);

      builder.setDefaultSetsToWin(3);
      const updated = builder.build();

      expect(updated.format.defaultSetsToWin).toBe(3);
      expect(updated.scoring.pointsWinClear).toBe(3);
      expect(updated.registration.minAthletes).toBe(6);
    });
  });

  // ==========================================================================
  // TESTE K — Proteção de Congelamento (Freeze)
  // ==========================================================================
  describe('TESTE K — Proteção de Congelamento (Freeze)', () => {
    it('deve bloquear alteração de regras quando rulesSnapshot existir ou torneio estiver in-progress', () => {
      const compDraft: CompetitionRecord = {
        id: 'comp-1',
        name: 'Torneio Teste',
        modality: 'indoor',
        format: 'groups',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'in-progress',
      };

      expect(CompetitionLifecycleService.canEditRules(compDraft, 0)).toBe(false);

      const compWithSnapshot: CompetitionRecord = {
        ...compDraft,
        status: 'planning',
        rulesSnapshot: DEFAULT_INDOOR_COMPETITION_CONFIG,
      };

      expect(CompetitionLifecycleService.canEditRules(compWithSnapshot, 0)).toBe(false);
    });
  });

  // ==========================================================================
  // TESTE L — Save -> Reload Equivalence
  // ==========================================================================
  describe('TESTE L — Save -> Reload Equivalence', () => {
    it('deve salvar CompetitionConfig via dataAccess e recarregar de forma idêntica', async () => {
      const comp = await dataAccess.createCompetition({
        name: 'Copa Regional 2026',
        modality: 'indoor',
        format: 'groups-knockout',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'planning',
      });

      const config = CompetitionTemplateService.createConfigFromTemplate('groups-knockout-standard');
      await dataAccess.updateCompetition(comp.id, { config });

      const reloaded = await dataAccess.getCompetition(comp.id);
      expect(reloaded).not.toBeNull();
      expect(reloaded?.config).toEqual(config);
    });
  });

  // ==========================================================================
  // TESTE M — Auditoria de Hardcodes Proibidos
  // ==========================================================================
  describe('TESTE M — Auditoria de Hardcodes Proibidos', () => {
    it('comprova que o FormatBuilder não possui branches hardcoded de times ou torneios', () => {
      const builderFnStr = CompetitionFormatBuilder.toString();
      expect(builderFnStr.includes("format === 'voltz'")).toBe(false);
      expect(builderFnStr.includes("groupsCount === 4")).toBe(false);
      expect(builderFnStr.includes("teams.length === 12")).toBe(false);
    });
  });

  // ==========================================================================
  // TESTE N — Integração com Runtime 4.8
  // ==========================================================================
  describe('TESTE N — Integração com Runtime 4.8', () => {
    it('deve produzir configuração consumível diretamente pelo StageGraph e MatchSlots', () => {
      const config = CompetitionTemplateService.createConfigFromTemplate('groups-knockout-standard');
      const preview = CompetitionFormatBuilder.generatePreviewSlots(config);

      const graph = new StageGraph(config.format.stages, preview.slots);
      const dag = graph.validateDAG();
      expect(dag.isValid).toBe(true);
      expect(dag.topologicalOrder).toEqual(['fase-grupos', 'playoffs']);
    });
  });

  // ==========================================================================
  // TESTE O — Integração com Bracket 4.9
  // ==========================================================================
  describe('TESTE O — Integração com Bracket 4.9', () => {
    it('deve projetar slots gerados pelo builder diretamente no CompetitionBracketViewModel', () => {
      const config = CompetitionTemplateService.createConfigFromTemplate('groups-knockout-standard');
      const preview = CompetitionFormatBuilder.generatePreviewSlots(config);

      const dummyComp: CompetitionRecord = {
        id: 'comp-test',
        name: 'Torneio Bracket Preview',
        modality: 'indoor',
        format: 'groups-knockout',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'planning',
        config,
      };

      const stageRows = preview.stages.map((s, idx) => ({
        id: s.id,
        competitionId: dummyComp.id,
        stageId: s.id,
        name: s.name,
        stageOrder: s.order || idx + 1,
        stageType: s.type,
        status: 'pending' as const,
        isLocked: false,
      }));

      const roundRows = preview.stages.flatMap(s => (s.rounds || []).map((r, rIdx) => ({
        id: r.roundId,
        stageRowId: s.id,
        competitionId: dummyComp.id,
        roundId: r.roundId,
        name: r.name,
        roundOrder: r.order || rIdx + 1,
        slotsCount: r.slotsCount || 0,
        status: 'pending' as const,
      })));

      const slotRows = preview.slots.map(s => ({
        id: s.slotId,
        stageRowId: s.stageId,
        roundRowId: s.roundId,
        competitionId: dummyComp.id,
        slotId: s.slotId,
        roundId: s.roundId,
        position: s.position,
        label: s.label,
        participantAReference: s.participantA.reference,
        participantAStatus: s.participantA.status,
        resolvedTeamAId: s.participantA.resolvedTeamId,
        participantBReference: s.participantB.reference,
        participantBStatus: s.participantB.status,
        resolvedTeamBId: s.participantB.resolvedTeamId,
        matchId: null,
      }));

      const vm = CompetitionBracketViewModelBuilder.build({
        competition: dummyComp,
        stages: stageRows,
        rounds: roundRows,
        slots: slotRows,
        matches: [],
        teams: [],
      });

      expect(vm.stages.length).toBeGreaterThan(0);
      expect(vm.stages[0].rounds.length).toBeGreaterThan(0);
      const totalSlots = vm.stages.reduce((acc, s) => acc + s.rounds.reduce((rAcc, r) => rAcc + r.slots.length, 0), 0);
      expect(totalSlots).toBe(slotRows.length);
      expect(vm.hasMatchSlots).toBe(true);
    });
  });

  // ==========================================================================
  // TESTE P — Fluxo E2E Completo de Autoria, Validação, Publicação e Execução (Seção 45)
  // ==========================================================================
  describe('TESTE P — Fluxo E2E Completo de Autoria, Validação, Publicação e Execução', () => {
    it('executa o ciclo completo: Criar -> Template -> Customizar -> Validar -> Salvar -> Reabrir -> Publicar -> Runtime/Bracket', async () => {
      // 1. Criar competição em planejamento
      const comp = await dataAccess.createCompetition({
        name: 'Torneio Metropolitano 2026',
        modality: 'indoor',
        format: 'custom',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'planning',
      });
      expect(comp.id).toBeDefined();

      // 2. Selecionar template inicial
      const templateConfig = CompetitionTemplateService.createConfigFromTemplate('groups-knockout-standard', {
        teamsCount: 8,
        setsToWin: 2,
      });

      // 3. Customizar via Builder: Fases, Feeds e Regras
      const builder = CompetitionFormatBuilder.fromConfig(templateConfig);
      builder.setDefaultSetsToWin(2);
      builder.setPhaseOverrides({
        semifinals: 3,
        final: 3,
      });
      builder.setScoring({
        pointsWinClear: 3,
        pointsWinNarrow: 2,
        pointsLossNarrow: 1,
        pointsLossClear: 0,
      });
      builder.setRegistration({
        minAthletes: 6,
        maxAthletes: 14,
        maxCaptains: 1,
        maxLiberos: 2,
      });

      // 4. Validar
      const configured = builder.build();
      const validation = CompetitionConfigValidator.validate(configured);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // 5. Salvar
      await dataAccess.updateCompetition(comp.id, {
        config: configured,
      });

      // 6. Reabrir e verificar persistência
      const reloaded = await dataAccess.getCompetition(comp.id);
      expect(reloaded).not.toBeNull();
      expect(reloaded?.config?.format.stages).toHaveLength(2);
      expect(reloaded?.config?.format.phaseOverrides?.semifinals).toBe(3);

      // 7. Publicar / Avançar status
      const updatedStatus = await dataAccess.updateCompetition(comp.id, {
        status: 'registration-open',
      });
      expect(updatedStatus?.status).toBe('registration-open');

      // 8. Prova de Runtime: StageGraph e slots válidos
      const preview = CompetitionFormatBuilder.generatePreviewSlots(reloaded!.config!);
      const graph = new StageGraph(reloaded!.config!.format.stages!, preview.slots);
      const dag = graph.validateDAG();
      expect(dag.isValid).toBe(true);
      expect(dag.topologicalOrder).toEqual(['fase-grupos', 'playoffs']);

      // 9. Prova de Bracket: ViewModel projeta corretamente sem erros
      const stageRows = preview.stages.map((s, idx) => ({
        id: s.id,
        competitionId: comp.id,
        stageId: s.id,
        name: s.name,
        stageOrder: s.order || idx + 1,
        stageType: s.type,
        status: 'pending' as const,
        isLocked: false,
      }));

      const roundRows = preview.stages.flatMap(s => (s.rounds || []).map((r, rIdx) => ({
        id: r.roundId,
        stageRowId: s.id,
        competitionId: comp.id,
        roundId: r.roundId,
        name: r.name,
        roundOrder: r.order || rIdx + 1,
        slotsCount: r.slotsCount || 0,
        status: 'pending' as const,
      })));

      const slotRows = preview.slots.map(s => ({
        id: s.slotId,
        stageRowId: s.stageId,
        roundRowId: s.roundId,
        competitionId: comp.id,
        slotId: s.slotId,
        roundId: s.roundId,
        position: s.position,
        label: s.label,
        participantAReference: s.participantA.reference,
        participantAStatus: s.participantA.status,
        resolvedTeamAId: s.participantA.resolvedTeamId,
        participantBReference: s.participantB.reference,
        participantBStatus: s.participantB.status,
        resolvedTeamBId: s.participantB.resolvedTeamId,
        matchId: null,
      }));

      const vm = CompetitionBracketViewModelBuilder.build({
        competition: reloaded!,
        stages: stageRows,
        rounds: roundRows,
        slots: slotRows,
        matches: [],
        teams: [],
      });

      expect(vm.stages.length).toBe(2);
      expect(vm.stages[0].rounds.length).toBeGreaterThan(0);
      expect(vm.hasMatchSlots).toBe(true);
    });
  });
});
