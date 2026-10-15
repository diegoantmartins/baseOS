/**
 * BaseOS — useCompetitionFormatBuilder
 *
 * Hook de autoria de configuração e formato de competição.
 *
 * Responsabilidades:
 * - Gerenciar o estado do rascunho (draft) de CompetitionConfig de forma reativa;
 * - Detectar alterações não salvas (isDirty);
 * - Executar validação imediata em memória via CompetitionConfigValidator;
 * - Gerar dados de pré-visualização (preview) localmente sem persistência;
 * - Integrar com dataAccess para salvar a configuração respeitando o congelamento (freeze).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type {
  CompetitionConfig,
  ParticipantFeedDefinition,
  PhaseFormatOverrides,
  ProgressionRoute,
  RegistrationRulesConfig,
  RoundDefinition,
  ScoringSystemConfig,
  SetsToWin,
  StageDefinition,
  StandingsConfig,
} from '@/types/competitionConfig';
import { DEFAULT_INDOOR_COMPETITION_CONFIG, normalizeCompetitionConfig } from '@/types/competitionConfig';
import { CompetitionConfigValidator, type ConfigValidationResult } from '@/services/competitionConfigValidator';
import { CompetitionFormatBuilder } from '@/services/competitionFormatBuilder';
import { CompetitionTemplateService, type CreateConfigOptions } from '@/services/competitionTemplateService';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { dataAccess } from '@/services/dataAccess';

export interface UseCompetitionFormatBuilderProps {
  initialConfig?: CompetitionConfig;
  competitionId?: string;
  onSaved?: (updatedConfig: CompetitionConfig) => void;
}

export function useCompetitionFormatBuilder({
  initialConfig,
  competitionId,
  onSaved,
}: UseCompetitionFormatBuilderProps = {}) {
  const baseInitial = useMemo(() => {
    if (initialConfig && initialConfig.format?.stages && initialConfig.format.stages.length > 0) {
      return normalizeCompetitionConfig(initialConfig);
    }
    if (initialConfig) {
      const templateId = initialConfig.format?.formatType || 'round-robin-standard';
      const templateConfig = CompetitionTemplateService.createConfigFromTemplate(templateId, {
        setsToWin: initialConfig.format?.defaultSetsToWin,
      });
      return normalizeCompetitionConfig({
        ...templateConfig,
        ...initialConfig,
        format: {
          ...templateConfig.format,
          ...(initialConfig.format || {}),
          stages: templateConfig.format.stages,
        },
      });
    }
    return CompetitionTemplateService.createConfigFromTemplate('groups-knockout-standard', {
      modality: 'indoor',
    });
  }, [initialConfig]);

  const [draftConfig, setDraftConfig] = useState<CompetitionConfig>(baseInitial);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Sincroniza o rascunho com a configuração base recebida
  useEffect(() => {
    setDraftConfig(baseInitial);
  }, [baseInitial]);

  // Validação pura em tempo real
  const validationResult: ConfigValidationResult = useMemo(() => {
    return CompetitionConfigValidator.validate(draftConfig);
  }, [draftConfig]);

  // Dirty State (alterações não salvas)
  const isDirty = useMemo(() => {
    return JSON.stringify(draftConfig) !== JSON.stringify(baseInitial);
  }, [draftConfig, baseInitial]);

  // Preview local de slots e fases (zero persistência)
  const previewData = useMemo(() => {
    return CompetitionFormatBuilder.generatePreviewSlots(draftConfig);
  }, [draftConfig]);

  // ==========================================================================
  // Ações de Modificação do Rascunho
  // ==========================================================================

  const applyTemplate = useCallback((templateId: string, options?: CreateConfigOptions) => {
    const config = CompetitionTemplateService.createConfigFromTemplate(templateId, options);
    setDraftConfig(config);
    setSelectedTemplateId(templateId);
    toast.info('Template aplicado ao rascunho. Você pode customizá-lo livremente.');
  }, []);

  const addStage = useCallback((stage: StageDefinition) => {
    setDraftConfig((prev) => {
      const builder = CompetitionFormatBuilder.fromConfig(prev);
      builder.addStage(stage);
      return builder.build();
    });
  }, []);

  const updateStage = useCallback((stageId: string, updates: Partial<StageDefinition>) => {
    setDraftConfig((prev) => {
      const builder = CompetitionFormatBuilder.fromConfig(prev);
      builder.updateStage(stageId, updates);
      return builder.build();
    });
  }, []);

  const removeStage = useCallback((stageId: string) => {
    setDraftConfig((prev) => {
      const builder = CompetitionFormatBuilder.fromConfig(prev);
      builder.removeStage(stageId);
      return builder.build();
    });
  }, []);

  const reorderStages = useCallback((stageIds: string[]) => {
    setDraftConfig((prev) => {
      const builder = CompetitionFormatBuilder.fromConfig(prev);
      builder.reorderStages(stageIds);
      return builder.build();
    });
  }, []);

  const setStageRounds = useCallback((stageId: string, rounds: RoundDefinition[]) => {
    setDraftConfig((prev) => {
      const builder = CompetitionFormatBuilder.fromConfig(prev);
      builder.setStageRounds(stageId, rounds);
      return builder.build();
    });
  }, []);

  const setStageFeeds = useCallback((stageId: string, feeds: ParticipantFeedDefinition[]) => {
    setDraftConfig((prev) => {
      const builder = CompetitionFormatBuilder.fromConfig(prev);
      builder.setStageFeeds(stageId, feeds);
      return builder.build();
    });
  }, []);

  const setStageProgressionRoutes = useCallback((stageId: string, routes: ProgressionRoute[]) => {
    setDraftConfig((prev) => {
      const builder = CompetitionFormatBuilder.fromConfig(prev);
      builder.setStageProgressionRoutes(stageId, routes);
      return builder.build();
    });
  }, []);

  const setDefaultSetsToWin = useCallback((setsToWin: SetsToWin) => {
    setDraftConfig((prev) => {
      const builder = CompetitionFormatBuilder.fromConfig(prev);
      builder.setDefaultSetsToWin(setsToWin);
      return builder.build();
    });
  }, []);

  const setPhaseOverrides = useCallback((overrides: PhaseFormatOverrides) => {
    setDraftConfig((prev) => {
      const builder = CompetitionFormatBuilder.fromConfig(prev);
      builder.setPhaseOverrides(overrides);
      return builder.build();
    });
  }, []);

  const setScoring = useCallback((scoring: Partial<ScoringSystemConfig>) => {
    setDraftConfig((prev) => {
      const builder = CompetitionFormatBuilder.fromConfig(prev);
      builder.setScoring(scoring);
      return builder.build();
    });
  }, []);

  const setStandings = useCallback((standings: Partial<StandingsConfig>) => {
    setDraftConfig((prev) => {
      const builder = CompetitionFormatBuilder.fromConfig(prev);
      builder.setStandings(standings);
      return builder.build();
    });
  }, []);

  const setRegistration = useCallback((registration: Partial<RegistrationRulesConfig>) => {
    setDraftConfig((prev) => {
      const builder = CompetitionFormatBuilder.fromConfig(prev);
      builder.setRegistration(registration);
      return builder.build();
    });
  }, []);

  const resetDraft = useCallback(() => {
    setDraftConfig(JSON.parse(JSON.stringify(baseInitial)));
    toast.info('Configurações restauradas ao estado original.');
  }, [baseInitial]);

  // ==========================================================================
  // Salvamento Seguro via DataAccess
  // ==========================================================================

  const saveConfig = useCallback(async (targetCompId?: string): Promise<boolean> => {
    const id = targetCompId || competitionId;
    if (!id) {
      toast.error('Identificador da competição não informado para salvar.');
      return false;
    }

    if (!validationResult.isValid) {
      toast.error(`Existem erros bloqueantes na configuração (${validationResult.errors.length} erros).`);
      return false;
    }

    setIsSaving(true);
    try {
      const comp = await dataAccess.getCompetition(id);
      if (!comp) {
        toast.error('Competição não encontrada.');
        return false;
      }

      // Validação de congelamento (Freeze)
      const matches = await dataAccess.listMatches();
      const compMatches = matches.filter((m) => m.competitionId === id);
      if (!CompetitionLifecycleService.canEditRules(comp, compMatches)) {
        toast.error('As regras desta competição estão congeladas pois já existem partidas ou jogos em andamento.');
        return false;
      }

      const updated = await dataAccess.updateCompetition(id, {
        config: draftConfig,
        setFormat: draftConfig.format.defaultSetsToWin === 3 ? '5-sets' : '3-sets',
        advancingPerGroup: draftConfig.standings.advancingPerGroup,
        bestThirdsCount: draftConfig.standings.bestThirds?.enabled ? draftConfig.standings.bestThirds.count : 0,
        useBestThirds: draftConfig.standings.bestThirds?.enabled,
        maxTeams: draftConfig.registration.maxTeams,
        teamsCount: draftConfig.registration.maxTeams,
      });

      if (updated) {
        toast.success('Formato e regras da competição salvos com sucesso!');
        onSaved?.(draftConfig);
        return true;
      }
      return false;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar configuração da competição.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [competitionId, validationResult, draftConfig, onSaved]);

  return {
    draftConfig,
    validationResult,
    isDirty,
    isSaving,
    selectedTemplateId,
    previewData,
    applyTemplate,
    addStage,
    updateStage,
    removeStage,
    reorderStages,
    setStageRounds,
    setStageFeeds,
    setStageProgressionRoutes,
    setDefaultSetsToWin,
    setPhaseOverrides,
    setScoring,
    setStandings,
    setRegistration,
    resetDraft,
    saveConfig,
  };
}
