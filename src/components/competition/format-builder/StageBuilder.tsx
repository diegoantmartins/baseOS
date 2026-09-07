import React, { useState } from 'react';
import { Plus, ArrowUp, ArrowDown, Edit2, Trash2, Layers, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { StageDefinition } from '@/types/competitionConfig';
import { getStageId } from '@/types/competitionConfig';
import { StageEditorDialog } from './StageEditorDialog';
import { cn } from '@/lib/utils';

export interface StageBuilderProps {
  stages: StageDefinition[];
  onAddStage: (stage: StageDefinition) => void;
  onUpdateStage: (stageId: string, updates: Partial<StageDefinition>) => void;
  onRemoveStage: (stageId: string) => void;
  onReorderStages: (stageIds: string[]) => void;
  className?: string;
}

const STAGE_TYPE_LABELS: Record<string, string> = {
  'group-stage': 'Fase de Grupos',
  'round-robin': 'Todos contra Todos',
  'play-in': 'Play-In (Repescagem)',
  'knockout': 'Mata-Mata Eliminatório',
  'third-place': 'Disputa de 3º Lugar',
  'custom': 'Personalizado',
};

export const StageBuilder: React.FC<StageBuilderProps> = ({
  stages,
  onAddStage,
  onUpdateStage,
  onRemoveStage,
  onReorderStages,
  className = '',
}) => {
  const [editingStage, setEditingStage] = useState<StageDefinition | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const stageIds = stages.map(s => getStageId(s));
    const temp = stageIds[index - 1];
    stageIds[index - 1] = stageIds[index];
    stageIds[index] = temp;
    onReorderStages(stageIds);
  };

  const handleMoveDown = (index: number) => {
    if (index === stages.length - 1) return;
    const stageIds = stages.map(s => getStageId(s));
    const temp = stageIds[index + 1];
    stageIds[index + 1] = stageIds[index];
    stageIds[index] = temp;
    onReorderStages(stageIds);
  };

  const handleDuplicate = (stage: StageDefinition) => {
    const sId = getStageId(stage);
    const duplicated: StageDefinition = {
      ...JSON.parse(JSON.stringify(stage)),
      id: `${sId}-copia`,
      stageId: `${sId}-copia`,
      name: `${stage.name} (Cópia)`,
      order: stages.length + 1,
    };
    onAddStage(duplicated);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Fases da Competição (Stage Graph)</h3>
          <p className="text-xs text-text-secondary">
            Configure as etapas sequenciais do torneio. O sistema valida dependências e aciclicidade.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditingStage(null);
            setEditorOpen(true);
          }}
          className="gap-1.5 text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar Fase
        </Button>
      </div>

      {stages.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-border-subtle bg-surface-elevated/30">
          <Layers className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold text-text-primary">Nenhuma fase configurada</p>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Adicione uma fase manualmente ou selecione um template inicial.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {stages.map((stage, idx) => {
            const sId = getStageId(stage);
            const roundsCount = stage.rounds?.length || 0;
            const feedsCount = (stage.participantFeeds?.length || stage.participantFeed?.length) || 0;

            return (
              <div
                key={sId}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border-subtle bg-surface-elevated/70 transition-all hover:border-primary-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={idx === 0}
                      onClick={() => handleMoveUp(idx)}
                      className="h-5 w-5 p-0 text-text-muted hover:text-text-primary disabled:opacity-30"
                      aria-label="Mover fase para cima"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={idx === stages.length - 1}
                      onClick={() => handleMoveDown(idx)}
                      className="h-5 w-5 p-0 text-text-muted hover:text-text-primary disabled:opacity-30"
                      aria-label="Mover fase para baixo"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>

                  <div className="w-7 h-7 rounded-lg bg-primary-500/10 text-primary-400 font-bold text-xs flex items-center justify-center border border-primary-500/20">
                    {idx + 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-text-primary">{stage.name}</h4>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal text-text-muted">
                        {STAGE_TYPE_LABELS[stage.type] || stage.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-text-secondary">
                      <span className="font-mono text-[10px] text-text-muted">ID: {sId}</span>
                      <span>•</span>
                      <span>{roundsCount} {roundsCount === 1 ? 'rodada' : 'rodadas'}</span>
                      {feedsCount > 0 && (
                        <>
                          <span>•</span>
                          <span>{feedsCount} feeds</span>
                        </>
                      )}
                      {stage.dependsOnStageIds && stage.dependsOnStageIds.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-primary-400">Depende de: {stage.dependsOnStageIds.join(', ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingStage(stage);
                      setEditorOpen(true);
                    }}
                    className="h-7 text-xs gap-1 text-text-secondary hover:text-text-primary"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicate(stage)}
                    className="h-7 w-7 p-0 text-text-muted hover:text-text-primary"
                    aria-label="Duplicar fase"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveStage(sId)}
                    className="h-7 w-7 p-0 text-state-error hover:bg-state-error/10"
                    aria-label="Remover fase"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editorOpen && (
        <StageEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          stage={editingStage}
          allStages={stages}
          onSave={(updated) => {
            if (editingStage) {
              onUpdateStage(getStageId(editingStage), updated);
            } else {
              onAddStage(updated);
            }
          }}
        />
      )}
    </div>
  );
};
