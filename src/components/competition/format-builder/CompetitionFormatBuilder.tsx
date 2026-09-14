import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Settings,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Save,
  Trophy,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CompetitionConfig } from '@/types/competitionConfig';
import type { CompetitionRecord, MatchRecord } from '@/types/entities';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { dataAccess } from '@/services/dataAccess';
import { useCompetitionFormatBuilder } from '@/hooks/useCompetitionFormatBuilder';
import { FormatTemplateSelector } from './FormatTemplateSelector';
import { StageBuilder } from './StageBuilder';
import { RulesConfigEditor } from './RulesConfigEditor';
import { CompetitionValidationPanel } from './CompetitionValidationPanel';
import { CompetitionPreview } from './CompetitionPreview';
import { cn } from '@/lib/utils';

export type BuilderTab = 'templates' | 'stages' | 'rules' | 'validation' | 'preview';

export interface CompetitionFormatBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition?: CompetitionRecord | null;
  initialConfig?: CompetitionConfig;
  matches?: MatchRecord[];
  onSaved?: (config: CompetitionConfig) => void;
}

export const CompetitionFormatBuilder: React.FC<CompetitionFormatBuilderDialogProps> = ({
  open,
  onOpenChange,
  competition,
  initialConfig,
  matches,
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState<BuilderTab>('templates');
  const [internalMatches, setInternalMatches] = useState<MatchRecord[] | null>(null);

  useEffect(() => {
    if (open && competition?.id && !matches) {
      dataAccess.listMatches(competition.id)
        .then(setInternalMatches)
        .catch(() => setInternalMatches([]));
    }
  }, [open, competition?.id, matches]);

  const effectiveMatches = matches ?? internalMatches ?? [];
  const isRulesEditable = competition ? CompetitionLifecycleService.canEditRules(competition, effectiveMatches) : true;
  const isRulesLocked = !isRulesEditable;

  const resolvedInitialConfig = useMemo(() => {
    if (initialConfig) return initialConfig;
    if (competition) {
      return CompetitionRulesService.getConfig(competition);
    }
    return undefined;
  }, [initialConfig, competition]);

  const {
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
    setDefaultSetsToWin,
    setPhaseOverrides,
    setScoring,
    setStandings,
    setRegistration,
    resetDraft,
    saveConfig,
  } = useCompetitionFormatBuilder({
    initialConfig: resolvedInitialConfig,
    competitionId: competition?.id,
    onSaved: (saved) => {
      onSaved?.(saved);
      onOpenChange(false);
    },
  });

  const handleSave = async () => {
    if (!validationResult.isValid || isRulesLocked) return;
    if (competition?.id) {
      await saveConfig(competition.id);
    } else {
      onSaved?.(draftConfig);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 bg-zinc-950 border-border rounded-xl overflow-hidden shadow-2xl">
        {/* Header Superior */}
        <DialogHeader className="p-4 border-b border-border bg-zinc-900/60 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold text-foreground">
                  Formato e Regras da Competição
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Configuração declarativa de fases, formatos e regras esportivas da competição.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Badge de Validação */}
              {validationResult.isValid && validationResult.warnings.length === 0 ? (
                <Badge variant="outline" className="gap-1 text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Válido
                </Badge>
              ) : !validationResult.isValid ? (
                <Badge variant="outline" className="gap-1 text-rose-400 border-rose-500/30 bg-rose-500/10 text-xs">
                  <XCircle className="w-3.5 h-3.5" /> {validationResult.errors.length} Erros
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-amber-400 border-amber-500/30 bg-amber-500/10 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" /> {validationResult.warnings.length} Alertas
                </Badge>
              )}

              {isDirty && (
                <Badge variant="outline" className="text-xs text-primary-400 border-primary-500/30">
                  Alterações não salvas
                </Badge>
              )}
            </div>
          </div>

          {/* Navegação de Abas do Builder */}
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50">
            <Button
              type="button"
              variant={activeTab === 'templates' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('templates')}
              className="h-7 text-xs gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5" /> 1. Templates
            </Button>
            <Button
              type="button"
              variant={activeTab === 'stages' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('stages')}
              className="h-7 text-xs gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" /> 2. Fases ({draftConfig.format.stages?.length || 0})
            </Button>
            <Button
              type="button"
              variant={activeTab === 'rules' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('rules')}
              className="h-7 text-xs gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" /> 3. Regras e Sets
            </Button>
            <Button
              type="button"
              variant={activeTab === 'validation' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('validation')}
              className="h-7 text-xs gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> 4. Validação
            </Button>
            <Button
              type="button"
              variant={activeTab === 'preview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('preview')}
              className="h-7 text-xs gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" /> 5. Prévia do Chaveamento
            </Button>
          </div>
        </DialogHeader>

        {/* Banner Informativo quando as regras estão bloqueadas */}
        {isRulesLocked && (
          <div className="mx-5 mt-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 flex items-center gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              As regras esportivas e o formato desta competição estão congelados (competição iniciada ou com partidas registradas). Apenas a visualização está liberada.
            </span>
          </div>
        )}

        {/* Conteúdo Principal com Scroll */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'templates' && (
            <FormatTemplateSelector
              disabled={isRulesLocked}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={(tplId) => {
                if (isRulesLocked) return;
                applyTemplate(tplId, {
                  modality: competition?.modality,
                  setsToWin: draftConfig.format.defaultSetsToWin,
                });
                setActiveTab('stages');
              }}
            />
          )}

          {activeTab === 'stages' && (
            <StageBuilder
              disabled={isRulesLocked}
              stages={draftConfig.format.stages || []}
              onAddStage={addStage}
              onUpdateStage={updateStage}
              onRemoveStage={removeStage}
              onReorderStages={reorderStages}
            />
          )}

          {activeTab === 'rules' && (
            <RulesConfigEditor
              disabled={isRulesLocked}
              config={draftConfig}
              onUpdateSetsToWin={setDefaultSetsToWin}
              onUpdatePhaseOverrides={setPhaseOverrides}
              onUpdateScoring={setScoring}
              onUpdateStandings={setStandings}
              onUpdateRegistration={setRegistration}
            />
          )}

          {activeTab === 'validation' && (
            <CompetitionValidationPanel result={validationResult} />
          )}

          {activeTab === 'preview' && (
            <CompetitionPreview
              config={draftConfig}
              previewData={previewData}
            />
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="p-3.5 border-t border-border bg-zinc-900/60 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetDraft}
            disabled={!isDirty || isSaving || isRulesLocked}
            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Descartar Alterações
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Fechar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!validationResult.isValid || isSaving || !isDirty || isRulesLocked}
              className="h-8 text-xs gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
