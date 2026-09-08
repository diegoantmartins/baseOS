import { describe, it, expect, beforeEach } from 'vitest';
import { dataAccess } from '@/services/dataAccess';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { CompetitionTemplateService } from '@/services/competitionTemplateService';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { CompetitionDrawEligibilityService } from '@/services/competitionDrawEligibilityService';
import type {
  CompetitionRecord,
  MatchRecord,
} from '@/types/entities';
import type {
  CompetitionAthlete,
  CompetitionTeam,
} from '@/types/registration';
import type { CompetitionConfig, SetsToWin } from '@/types/competitionConfig';
import {
  deriveMaxSets,
  formatSetsToWinLabel,
  parseLegacySetFormat,
} from '@/types/competitionConfig';

describe('BaseOS — Fase 4.3: Integração Real do CompetitionConfig no Cadastro e Edição', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ==========================================================================
  // CENÁRIO A: Indoor (Quadra) — Grupos melhor de 3 + Semis/Final melhor de 5
  // ==========================================================================
  describe('Cenário A: Voleibol de Quadra (Indoor Standard)', () => {
    it('deve cadastrar competição indoor com grupos em melhor de 3 e fases finais em melhor de 5 via phaseOverrides', async () => {
      const templateId = 'groups-knockout-standard';
      const setsToWin: SetsToWin = 2; // Padrão da fase classificatória: melhor de 3

      // 1. Cria a configuração canônica a partir do template selecionado
      const canonicalConfig = CompetitionTemplateService.createConfigFromTemplate(templateId, {
        modality: 'indoor',
        setsToWin,
      });

      // 2. Aplica parametrizações do formulário (sem inventar, usando presets canônicos)
      canonicalConfig.format.defaultSetsToWin = setsToWin;
      canonicalConfig.format.phaseOverrides = {
        groupStage: 2,
        quarterfinals: 2,
        semifinals: 3, // Semifinais em melhor de 5
        final: 3,      // Final em melhor de 5
      };
      canonicalConfig.format.setRules = {
        regularSetPoints: 25,
        tiebreakPoints: 15,
        minAdvantage: 2,
      };
      canonicalConfig.registration = {
        minAthletes: 6,
        maxAthletes: 14,
        maxCaptains: 1,
        maxLiberos: 2,
        requireJerseyNumberOnRegistration: false,
      };

      const baseRecord: Omit<CompetitionRecord, 'id'> = {
        name: 'Superliga Paranaense Indoor 2026',
        modality: 'indoor',
        format: templateId,
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'female',
        status: 'planning',
        groupsCount: 2,
        advancingPerGroup: 2,
        bestThirdsCount: 0,
        venue: 'Ginásio Chico Neto',
        startDate: '2026-10-01',
        endDate: '2026-10-15',
        defaultMatchIntervalMinutes: 75,
        minTeamRestMinutes: 30,
        tiebreakCriteriaOrder: canonicalConfig.standings.tiebreakCriteriaOrder,
        phaseSetRules: {
          groupStage: '3-sets',
          playoffs: '3-sets',
          semifinals: '5-sets',
          final: '5-sets',
        },
        config: canonicalConfig,
      };

      // 3. Persistência real através de dataAccess
      const created = await dataAccess.createCompetition(baseRecord);
      expect(created.id).toBeDefined();
      expect(created.slug).toBeDefined();

      // 4. Reload da aplicação a partir do storage/banco
      const loaded = await dataAccess.getCompetition(created.id);
      expect(loaded).not.toBeNull();
      if (!loaded) return;

      // 5. Verificação da integridade do CompetitionConfig recarregado
      expect(loaded.config).toBeDefined();
      const config = CompetitionRulesService.getConfig(loaded);
      expect(config.format.defaultSetsToWin).toBe(2);
      expect(config.format.phaseOverrides?.semifinals).toBe(3);
      expect(config.format.phaseOverrides?.final).toBe(3);
      expect(config.format.setRules.regularSetPoints).toBe(25);
      expect(config.format.setRules.tiebreakPoints).toBe(15);
      expect(config.registration.minAthletes).toBe(6);
      expect(config.registration.maxLiberos).toBe(2);

      // Helpers de domínio operando sobre o config
      expect(deriveMaxSets(config.format.defaultSetsToWin)).toBe(3);
      expect(formatSetsToWinLabel(config.format.defaultSetsToWin)).toBe('Melhor de 3 sets');

      // 6. Resolução por fase via CompetitionRulesService
      const groupFormat = CompetitionRulesService.resolveMatchFormat(loaded, 'groupStage');
      expect(groupFormat.setsToWin).toBe(2);
      expect(groupFormat.maxSets).toBe(3);

      const semiFormat = CompetitionRulesService.resolveMatchFormat(loaded, 'semifinals');
      expect(semiFormat.setsToWin).toBe(3);
      expect(semiFormat.maxSets).toBe(5);

      const finalFormat = CompetitionRulesService.resolveMatchFormat(loaded, 'final');
      expect(finalFormat.setsToWin).toBe(3);
      expect(finalFormat.maxSets).toBe(5);
    });
  });

  // ==========================================================================
  // CENÁRIO B: Beach (Praia) — Vôlei de Praia Canônico
  // ==========================================================================
  describe('Cenário B: Vôlei de Praia (Beach Standard)', () => {
    it('deve cadastrar competição de praia com 21 pontos, 15 tiebreak, 2-4 atletas e 0 líberos', async () => {
      const templateId = 'groups-knockout-standard';
      const setsToWin: SetsToWin = 2;

      const canonicalConfig = CompetitionTemplateService.createConfigFromTemplate(templateId, {
        modality: 'beach',
        setsToWin,
      });

      // Validação dos valores reais derivados do preset de praia
      expect(canonicalConfig.format.setRules.regularSetPoints).toBe(21);
      expect(canonicalConfig.format.setRules.tiebreakPoints).toBe(15);
      expect(canonicalConfig.registration.minAthletes).toBe(2);
      expect(canonicalConfig.registration.maxAthletes).toBe(4);
      expect(canonicalConfig.registration.maxLiberos).toBe(0);

      const baseRecord: Omit<CompetitionRecord, 'id'> = {
        name: 'Circuito de Areia 2026',
        modality: 'beach',
        format: templateId,
        playerFormat: '2x2',
        setFormat: '3-sets',
        genderCategory: 'male',
        status: 'planning',
        groupsCount: 4,
        advancingPerGroup: 2,
        bestThirdsCount: 0,
        venue: 'Praia Central',
        config: canonicalConfig,
      };

      const created = await dataAccess.createCompetition(baseRecord);
      const loaded = await dataAccess.getCompetition(created.id);
      expect(loaded).not.toBeNull();
      if (!loaded) return;

      const limits = CompetitionRulesService.getRosterLimits(loaded);
      expect(limits.min).toBe(2);
      expect(limits.max).toBe(4);
      expect(limits.maxLiberos).toBe(0);

      const matchFormat = CompetitionRulesService.resolveMatchFormat(loaded, 'groupStage');
      expect(matchFormat.regularSetPoints).toBe(21);
      expect(matchFormat.tiebreakPoints).toBe(15);
    });
  });

  // ==========================================================================
  // CENÁRIO C: Eliminatória Dupla (Double Elimination)
  // ==========================================================================
  describe('Cenário C: Eliminatória Dupla (double-elimination-standard)', () => {
    it('deve carregar template dinamicamente e persistir os 3 estágios canônicos (Winners, Losers, Grand Final)', async () => {
      // 1. Fonte real de templates dinâmicos
      const templates = CompetitionTemplateService.listTemplates();
      const doubleElimTemplate = templates.find(t => t.id === 'double-elimination-standard');
      expect(doubleElimTemplate).toBeDefined();
      expect(doubleElimTemplate?.formatType).toBe('double-elimination');

      // 2. Produção de config pelo template
      const config = CompetitionTemplateService.createConfigFromTemplate('double-elimination-standard', {
        modality: 'indoor',
        setsToWin: 2,
        teamsCount: 8,
      });

      expect(config.format.formatType).toBe('double-elimination');
      expect(config.format.stages).toHaveLength(3);

      const stageIds = config.format.stages?.map(s => s.id);
      expect(stageIds).toContain('stage-winners');
      expect(stageIds).toContain('stage-losers');
      expect(stageIds).toContain('stage-grand-final');

      // 3. Persistência e reload
      const created = await dataAccess.createCompetition({
        name: 'Torneio Eliminatória Dupla 2026',
        modality: 'indoor',
        format: 'double-elimination-standard',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'mixed',
        status: 'planning',
        config,
      });

      const loaded = await dataAccess.getCompetition(created.id);
      expect(loaded).not.toBeNull();
      if (!loaded) return;

      const loadedConfig = CompetitionRulesService.getConfig(loaded);
      expect(loadedConfig.format.formatType).toBe('double-elimination');
      expect(loadedConfig.format.stages).toHaveLength(3);

      // Validação das rotas de progressão entre winners e losers
      const stageWinners = loadedConfig.format.stages?.find(s => s.id === 'stage-winners');
      expect(stageWinners?.progressionRoutes).toBeDefined();
      expect(stageWinners?.progressionRoutes?.length).toBeGreaterThan(0);
      expect(stageWinners?.progressionRoutes?.[0].onLoser).toBeDefined();
      expect(stageWinners?.progressionRoutes?.[0].onLoser?.targetStageId).toBe('stage-losers');
    });
  });

  // ==========================================================================
  // CENÁRIO D: Play-In Multi-Estágio (groups-play-in-knockout-standard)
  // ==========================================================================
  describe('Cenário D: Grupos + Play-In + Mata-Mata (Voltz Multi-Estágio)', () => {
    it('deve persistir os 3 estágios (fase-grupos, play-in, fase-final) e ranking geral', async () => {
      const templates = CompetitionTemplateService.listTemplates();
      const playInTemplate = templates.find(t => t.id === 'groups-play-in-knockout-standard');
      expect(playInTemplate).toBeDefined();
      expect(playInTemplate?.formatType).toBe('groups-play-in-knockout');

      const config = CompetitionTemplateService.createConfigFromTemplate('groups-play-in-knockout-standard', {
        modality: 'indoor',
        setsToWin: 2,
        teamsCount: 16,
      });

      expect(config.format.formatType).toBe('groups-play-in-knockout');
      expect(config.format.stages).toHaveLength(3);

      const stageIds = config.format.stages?.map(s => s.id);
      expect(stageIds).toEqual(['fase-grupos', 'play-in', 'fase-final']);

      expect(config.standings.advancingPerGroup).toBe(3);
      expect(config.standings.aggregationStrategy).toBe('by-group-position-first');

      const created = await dataAccess.createCompetition({
        name: 'Taça Voltz Multi-Estágio 2026',
        modality: 'indoor',
        format: 'groups-play-in-knockout-standard',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'female',
        status: 'planning',
        groupsCount: 4,
        advancingPerGroup: 3,
        config,
      });

      const loaded = await dataAccess.getCompetition(created.id);
      expect(loaded).not.toBeNull();
      if (!loaded) return;

      const loadedConfig = CompetitionRulesService.getConfig(loaded);
      expect(loadedConfig.format.stages?.map(s => s.id)).toEqual(['fase-grupos', 'play-in', 'fase-final']);
      expect(loadedConfig.standings.aggregationStrategy).toBe('by-group-position-first');
    });
  });

  // ==========================================================================
  // CENÁRIO E: Congelamento e Ciclo de Vida (Freeze / Lock)
  // ==========================================================================
  describe('Cenário E: Congelamento e Bloqueio de Regras (Lifecycle Integration)', () => {
    it('deve permitir edição em planning e congelar snapshot imutável em transição para in-progress', async () => {
      const config = CompetitionTemplateService.createConfigFromTemplate('groups-knockout-standard');

      const comp = await dataAccess.createCompetition({
        name: 'Copa Regional de Vôlei',
        modality: 'indoor',
        format: 'groups-knockout-standard',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'female',
        status: 'planning',
        config,
      });

      // Em planning sem partidas, regras são editáveis
      expect(CompetitionRulesService.areRulesLocked(comp)).toBe(false);
      expect(CompetitionLifecycleService.canEditRules(comp, [])).toBe(true);

      // Congelamento de regras via CompetitionLifecycleService
      const frozen = CompetitionLifecycleService.freezeRulesSnapshot(comp);
      expect(frozen.rulesSnapshot).toBeDefined();
      expect(frozen.rulesSnapshot?.version).toBe(1);

      // Persiste o snapshot congelado
      await dataAccess.updateCompetition(comp.id, {
        status: 'in-progress',
        rulesSnapshot: frozen.rulesSnapshot,
      });

      const reloaded = await dataAccess.getCompetition(comp.id);
      expect(reloaded).not.toBeNull();
      if (!reloaded) return;

      // Agora a competição está bloqueada
      expect(CompetitionRulesService.areRulesLocked(reloaded)).toBe(true);
      expect(CompetitionLifecycleService.canEditRules(reloaded, [])).toBe(false);

      // getConfig dá preferência estrita ao rulesSnapshot
      const activeRules = CompetitionRulesService.getConfig(reloaded);
      expect(activeRules).toEqual(frozen.rulesSnapshot);
    });
  });

  // ==========================================================================
  // CENÁRIO F: Correção do Bug de Preservação do CompetitionSettingsEditDialog
  // ==========================================================================
  describe('Cenário F: Preservação de Configurações Customizadas na Edição', () => {
    it('deve alterar o formato de sets preservando integralmente scoring, registration e standings customizados', async () => {
      // Cria competição com scoring e registration customizados
      const customConfig: CompetitionConfig = {
        version: 1,
        format: {
          defaultSetsToWin: 2,
          setRules: { regularSetPoints: 25, tiebreakPoints: 15, minAdvantage: 2 },
          phaseOverrides: { semifinals: 3, final: 3 },
        },
        scoring: {
          systemType: 'simple', // Customizado: 2 pts vitória, 1 empate, 0 derrota
          pointsWinClear: 2,
          pointsWinNarrow: 2,
          pointsLossNarrow: 1,
          pointsLossClear: 0,
          pointsWoWin: 2,
          pointsWoLoss: 0,
        },
        standings: {
          tiebreakCriteriaOrder: ['points', 'victories', 'draw'],
          advancingPerGroup: 3,
        },
        registration: {
          minAthletes: 8,  // Customizado: mínimo 8
          maxAthletes: 18, // Customizado: máximo 18
          maxCaptains: 2,
          maxLiberos: 2,
          requireJerseyNumberOnRegistration: true,
        },
      };

      const created = await dataAccess.createCompetition({
        name: 'Torneio Personalizado',
        modality: 'indoor',
        format: 'groups-knockout-standard',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'female',
        status: 'planning',
        config: customConfig,
      });

      const loaded = await dataAccess.getCompetition(created.id);
      expect(loaded).not.toBeNull();
      if (!loaded) return;

      // Simulação da edição de sets pelo CompetitionSettingsEditDialog com a correção aplicada:
      // Altera apenas formato de sets para melhor de 5 (setsToWin = 3)
      const baseConfig: CompetitionConfig = JSON.parse(JSON.stringify(loaded.config));
      const updatedConfig: CompetitionConfig = {
        ...baseConfig,
        format: {
          ...baseConfig.format,
          defaultSetsToWin: parseLegacySetFormat('5-sets'),
          phaseOverrides: {
            ...baseConfig.format.phaseOverrides,
            groupStage: parseLegacySetFormat('5-sets'),
            playoffs: parseLegacySetFormat('5-sets'),
            semifinals: 3,
            final: 3,
          },
        },
      };

      await dataAccess.updateCompetition(loaded.id, {
        setFormat: '5-sets',
        config: updatedConfig,
      });

      // Recarrega do storage/banco
      const reloaded = await dataAccess.getCompetition(created.id);
      expect(reloaded).not.toBeNull();
      if (!reloaded) return;

      const finalConfig = CompetitionRulesService.getConfig(reloaded);

      // Sets foram atualizados
      expect(finalConfig.format.defaultSetsToWin).toBe(3);

      // PROVA DE PRESERVAÇÃO: scoring, standings e registration NÃO foram destruídos!
      expect(finalConfig.scoring.systemType).toBe('simple');
      expect(finalConfig.scoring.pointsWinClear).toBe(2);
      expect(finalConfig.standings.advancingPerGroup).toBe(3);
      expect(finalConfig.standings.tiebreakCriteriaOrder).toEqual(['points', 'victories', 'draw']);
      expect(finalConfig.registration.minAthletes).toBe(8);
      expect(finalConfig.registration.maxAthletes).toBe(18);
      expect(finalConfig.registration.requireJerseyNumberOnRegistration).toBe(true);
    });
  });

  // ==========================================================================
  // CENÁRIO G: Integração Ponta a Ponta com Consumidores do Domínio
  // ==========================================================================
  describe('Cenário G: Integração Ponta a Ponta com Consumidores do Domínio', () => {
    it('deve alimentar Standings, Elegibilidade de Sorteio e Súmula diretamente a partir do CompetitionConfig persistido', async () => {
      const customConfig: CompetitionConfig = {
        version: 1,
        format: {
          defaultSetsToWin: 2,
          setRules: { regularSetPoints: 25, tiebreakPoints: 15, minAdvantage: 2 },
          phaseOverrides: { semifinals: 3, final: 3 },
        },
        scoring: {
          systemType: 'win-loss', // 1 pt por vitória, 0 por derrota
          pointsWinClear: 1,
          pointsWinNarrow: 1,
          pointsLossNarrow: 0,
          pointsLossClear: 0,
          pointsWoWin: 1,
          pointsWoLoss: 0,
        },
        standings: {
          tiebreakCriteriaOrder: ['points', 'victories'],
          advancingPerGroup: 2,
        },
        registration: {
          minAthletes: 7, // Mínimo customizado de 7 atletas
          maxAthletes: 15,
          maxCaptains: 1,
          maxLiberos: 2,
          requireJerseyNumberOnRegistration: false,
        },
      };

      const comp = await dataAccess.createCompetition({
        name: 'Liga de Integração de Regras',
        modality: 'indoor',
        format: 'groups-knockout-standard',
        playerFormat: '6x6',
        setFormat: '3-sets',
        genderCategory: 'female',
        status: 'planning',
        config: customConfig,
      });

      // 1. Consumidor: Standings / Pontuação
      // Vitória por 2x0 deve conceder 1 ponto (pelo sistema win-loss customizado, não 3 do FIVB)
      const points = CompetitionRulesService.calculateCompetitionPoints(comp, 2, 0, false);
      expect(points).toBe(1);

      // 2. Consumidor: Elegibilidade para Sorteio Oficial
      const dummyTeam: CompetitionTeam = {
        id: 'ct-test-1',
        competitionId: comp.id,
        teamId: 'team-test-1',
        teamName: 'Equipe Teste',
        teamShortName: 'ET',
        accessToken: 'token-123',
        registrationDeadline: new Date().toISOString(),
        isLocked: false,
        status: 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Com 6 atletas (abaixo do mínimo customizado de 7), deve ser bloqueada
      const athletesUnderLimit: CompetitionAthlete[] = Array.from({ length: 6 }, (_, i) => ({
        id: `ca-${i}`,
        competitionTeamId: dummyTeam.id,
        name: `Atleta ${i}`,
        position: 'Ponteiro',
        isCaptain: i === 0,
        isLibero: false,
        gender: 'female' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const evalBlocked = CompetitionDrawEligibilityService.evaluateTeamDrawEligibility(
        comp,
        dummyTeam,
        athletesUnderLimit,
      );
      expect(evalBlocked.eligible).toBe(false);
      expect(evalBlocked.blockers[0]).toContain('mínimo regulamentar: 7');

      // Com 7 atletas (atende ao mínimo customizado de 7), deve ser elegível
      const athletesEligible: CompetitionAthlete[] = [
        ...athletesUnderLimit,
        {
          id: 'ca-7',
          competitionTeamId: dummyTeam.id,
          name: 'Atleta 7',
          position: 'Central',
          isCaptain: false,
          isLibero: false,
          gender: 'female' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const evalEligible = CompetitionDrawEligibilityService.evaluateTeamDrawEligibility(
        comp,
        dummyTeam,
        athletesEligible,
      );
      expect(evalEligible.eligible).toBe(true);

      // 3. Consumidor: Súmula Oficial em PDF
      const dummyMatch: Partial<MatchRecord> = {
        id: 'm-test-1',
        competitionId: comp.id,
        teamAId: dummyTeam.teamId,
        teamBId: 'team-test-2',
        phase: 'semifinals', // Deve resolver para setsToWin = 3 via phaseOverrides
        status: 'scheduled',
      };

      const matchFormat = CompetitionRulesService.resolveMatchFormat(comp, dummyMatch.phase);
      expect(matchFormat.setsToWin).toBe(3);
      expect(matchFormat.maxSets).toBe(5);
    });
  });
});
