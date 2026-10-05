import React, { useState, useEffect } from 'react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Copy,
  Layers,
  Users,
  GitFork,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StageDialog } from './StageDialog';
import type { StageDefinition } from '@/types/competitionConfig';
import { cn } from '@/lib/utils';

export interface CompetitionStageBuilderProps {
  stages?: StageDefinition[];
  initialStages?: StageDefinition[];
  onChange?: (stages: StageDefinition[]) => void;
  readOnly?: boolean;
  className?: string;
}

export const CompetitionStageBuilder: React.FC<CompetitionStageBuilderProps> = ({
  stages: controlledStages,
  initialStages = [
    {
      id: 'stage-1',
      order: 1,
      name: 'Fase de Grupos',
      type: 'round-robin',
      participantsCount: 8,
      participantsOrigin: 'global',
      groupsCount: 2,
      advancingCount: 4,
    },
    {
      id: 'stage-2',
      order: 2,
      name: 'Eliminatória Ouro',
      type: 'knockout',
      participantsCount: 4,
      participantsOrigin: 'stage-position',
      advancingCount: 1,
    },
  ],
  onChange,
  readOnly = false,
  className = '',
}) => {
  const [internalStages, setInternalStages] = useState<StageDefinition[]>(controlledStages ?? initialStages);
  const [editingStage, setEditingStage] = useState<StageDefinition | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    if (controlledStages) {
      setInternalStages(controlledStages);
    }
  }, [controlledStages]);

  const stages = controlledStages ?? internalStages;

  const updateStages = (newStages: StageDefinition[]) => {
    // Reordena o campo order estritamente de 1..N
    const reordered = newStages.map((s, idx) => ({
      ...s,
      order: idx + 1,
    }));
    if (!controlledStages) {
      setInternalStages(reordered);
    }
    onChange?.(reordered);
  };

  const handleOpenAddDialog = () => {
    setEditingStage(null);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (stage: StageDefinition) => {
    setEditingStage(stage);
    setDialogOpen(true);
  };

  const handleSaveStage = (savedStage: StageDefinition) => {
    if (editingStage) {
      // Edição
      const updated = stages.map((s) => (s.id === savedStage.id ? savedStage : s));
      updateStages(updated);
    } else {
      // Nova fase
      updateStages([...stages, savedStage]);
    }
  };

  const handleRemoveStage = (id: string) => {
    if (readOnly) return;
    const filtered = stages.filter((s) => s.id !== id);
    updateStages(filtered);
  };

  const handleDuplicateStage = (stage: StageDefinition) => {
    if (readOnly) return;
    const duplicated: StageDefinition = {
      ...stage,
      id: `stage-${Date.now()}`,
      name: `${stage.name} (Cópia)`,
      order: stages.length + 1,
    };
    updateStages([...stages, duplicated]);
  };

  const handleMoveUp = (index: number) => {
    if (readOnly || index === 0) return;
    const copy = [...stages];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    updateStages(copy);
  };

  const handleMoveDown = (index: number) => {
    if (readOnly || index === stages.length - 1) return;
    const copy = [...stages];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    updateStages(copy);
  };

  const getStageHeaderLabel = (stage: StageDefinition) => {
    const orderStr = String(stage.order).padStart(2, '0');
    const typeLabel =
      stage.type === 'round-robin' || stage.type === 'group-stage'
        ? 'GRUPOS'
        : stage.type === 'knockout'
        ? 'ELIMINATÓRIA'
        : stage.type === 'play-in'
        ? 'PLAY-IN'
        : 'PERSONALIZADO';
    return `${orderStr} ${typeLabel}`;
  };

  const getOriginLabel = (origin: StageDefinition['participantsOrigin']) => {
    switch (origin) {
      case 'global':
        return 'Inscrição Geral';
      case 'stage-position':
        return 'Classificados da Fase Anterior';
      case 'overall-ranking':
        return 'Ranking Geral Agregado';
      default:
        return origin;
    }
  };

  return (
    <div className={cn('bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-6', className)}>
      {/* ========================================================================= */}
      {/* TOPO: TÍTULO, DESCRIÇÃO E BOTÃO "DEBUG PAYLOAD"                          */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/70 text-[#d97706]">
              <Layers className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#0f172a] tracking-tight">
              Linha do Tempo de Fases da Competição
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-xl">
            Construa o grafo progressivo do campeonato empilhando as etapas em sequência. Cada nó define a entrada, a mecânica e o avanço.
          </p>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* LISTA VERTICAL DE FASES (TIMELINE EM CARDS BRANCOS)                       */}
      {/* ========================================================================= */}
      {stages.length === 0 ? (
        <div className="p-10 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-white shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0f172a]">Nenhuma fase adicionada ao torneio</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Inicie a montagem da competição adicionando a primeira etapa (ex: Fase de Grupos ou Turno Único).
            </p>
          </div>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
          {stages.map((stage, idx) => (
            <div key={stage.id} className="relative group">
              {/* Conector Visual de Linha do Tempo (Marcador Circular) */}
              <div className="absolute -left-6 sm:-left-8 top-6 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-4 border-amber-500 shadow-sm z-10 transition-transform group-hover:scale-125" />

              {/* Card Branco da Fase */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  {/* Cabeçalho da Fase: ex "01 GRUPOS" + Nome da Fase */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-extrabold text-xs tracking-wider uppercase text-[#0f172a] bg-slate-100/90 px-2.5 py-1 rounded-md border border-slate-200/70">
                      {getStageHeaderLabel(stage)}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-[#0f172a] tracking-tight">
                      {stage.name}
                    </h3>
                  </div>

                  {/* Ações Rápidas por Nó */}
                  {!readOnly && (
                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={idx === 0}
                        onClick={() => handleMoveUp(idx)}
                        className="h-8 w-8 rounded-full text-slate-500 hover:text-[#0f172a] hover:bg-slate-100 disabled:opacity-30"
                        title="Mover para cima"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={idx === stages.length - 1}
                        onClick={() => handleMoveDown(idx)}
                        className="h-8 w-8 rounded-full text-slate-500 hover:text-[#0f172a] hover:bg-slate-100 disabled:opacity-30"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicateStage(stage)}
                        className="h-8 w-8 rounded-full text-slate-500 hover:text-[#0f172a] hover:bg-slate-100"
                        title="Duplicar fase"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditDialog(stage)}
                        className="h-8 w-8 rounded-full text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        title="Editar configurações da fase"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveStage(stage.id)}
                        className="h-8 w-8 rounded-full text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        title="Excluir fase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Corpo do Card: Informações Técnicas e Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3.5 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" /> Participantes
                    </span>
                    <p className="font-bold text-[#0f172a]">
                      {stage.participantsCount} equipes
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-slate-500">
                      Origem
                    </span>
                    <p className="font-semibold text-[#0f172a] truncate" title={getOriginLabel(stage.participantsOrigin)}>
                      {getOriginLabel(stage.participantsOrigin)}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-slate-500">
                      Mecânica
                    </span>
                    <p className="font-semibold text-[#0f172a]">
                      {stage.type === 'round-robin'
                        ? `${stage.groupsCount ?? 1} ${(stage.groupsCount ?? 1) === 1 ? 'Chave única' : 'Grupos'}`
                        : stage.type === 'knockout'
                        ? 'Chave Eliminatória'
                        : 'Customizado'}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <GitFork className="w-3 h-3 text-emerald-500" /> Avançam
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[11px] font-bold border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0">
                        {stage.advancingCount} {stage.advancingCount === 1 ? 'vaga (Campeão)' : 'vagas'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* RODAPÉ: BOTÃO LARGO "+ ADICIONAR FASE" EM FORMATO PÍLULA                 */}
      {/* ========================================================================= */}
      {!readOnly && (
        <div className="pt-2">
          <Button
            type="button"
            onClick={handleOpenAddDialog}
            className="w-full h-12 rounded-full border-2 border-dashed border-slate-300 bg-white hover:bg-slate-50 hover:border-amber-500 text-[#0f172a] hover:text-[#d97706] font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.005] active:scale-[0.995]"
          >
            <Plus className="w-4 h-4 text-amber-500" />
            <span>Adicionar Fase</span>
          </Button>
        </div>
      )}

      {/* Modal de Configuração (StageDialog) */}
      <StageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        stage={editingStage}
        onSave={handleSaveStage}
        existingStagesCount={stages.length}
      />
    </div>
  );
};
