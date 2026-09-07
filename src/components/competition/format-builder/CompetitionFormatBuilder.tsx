import React, { useState } from 'react';
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
import type { CompetitionRecord } from '@/types/entities';
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
  onSaved?: (config: CompetitionConfig) => void;
}

export const CompetitionFormatBuilder: React.FC<CompetitionFormatBuilderDialogProps> = ({
  open,
  onOpenChange,
  competition,
  initialConfig,
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState<BuilderTab>('templates');

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
    initialConfig: initialConfig || competition?.config,
    competitionId: competition?.id,
    onSaved: (saved) => {
      onSaved?.(saved);
      onOpenChange(false);
    },
  });

  const handleSave = async () => {
    if (!validationResult.isValid) return;
    if (competition?.id) {
      await saveConfig(competition.id);
    } else {
      onSaved?.(draftConfig);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 bg-surface-base border-border rounded-xl overflow-hidden shadow-2xl">
        {/* Header Superior */}
        <DialogHeader className="p-4 border-b border-border-subtle bg-surface-elevated/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold text-text-primary">
                  Format Builder & Regulamento Esportivo
                </DialogTitle>
                <DialogDescription className="text-xs text-text-secondary">
                  Autoria declarativa de formatos, fases, feeds e regras esportivas do BaseOS.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Badge de Validação */}
              {validationResult.isValid && validationResult.warnings.length === 0 ? (
                <Badge variant="outline" className="gap-1 text-state-success border-state-success/30 bg-state-success/10 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Válido
                </Badge>
              ) : !validationResult.isValid ? (
                <Badge variant="outline" className="gap-1 text-state-error border-state-error/30 bg-state-error/10 text-xs">
                  <XCircle className="w-3.5 h-3.5" /> {validationResult.errors.length} Erros
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-state-warning border-state-warning/30 bg-state-warning/10 text-xs">
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
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border-subtle/50">
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
              <Settings className="w-3.5 h-3.5" /> 3. Regras & Sets
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

        {/* Conteúdo Principal com Scroll */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'templates' && (
            <FormatTemplateSelector
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={(tplId) => {
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
              stages={draftConfig.format.stages || []}
              onAddStage={addStage}
              onUpdateStage={updateStage}
              onRemoveStage={removeStage}
              onReorderStages={reorderStages}
            />
          )}

          {activeTab === 'rules' && (
            <RulesConfigEditor
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
        <div className="p-3.5 border-t border-border-subtle bg-surface-elevated/40 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetDraft}
            disabled={!isDirty || isSaving}
            className="h-8 text-xs gap-1.5 text-text-secondary hover:text-text-primary"
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
              disabled={!validationResult.isValid || isSaving || !isDirty}
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
