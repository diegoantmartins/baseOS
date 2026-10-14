import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trophy, Users, GitFork, ArrowRight, Layers, Info } from 'lucide-react';

import type { StageDefinition, StageType } from '@/types/competitionConfig';
export type { StageDefinition };

export interface StageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: StageDefinition | null;
  onSave: (stage: StageDefinition) => void;
  existingStagesCount?: number;
}

export const StageDialog: React.FC<StageDialogProps> = ({
  open,
  onOpenChange,
  stage,
  onSave,
  existingStagesCount = 0,
}) => {
  // Seção 1: Identificação
  const [name, setName] = useState('');
  const [type, setType] = useState<StageType>('round-robin');

  // Seção 2: Entrada
  const [participantsCount, setParticipantsCount] = useState<number>(8);
  const [participantsOrigin, setParticipantsOrigin] = useState<'global' | 'stage-position' | 'overall-ranking'>('global');
  const [groupsCount, setGroupsCount] = useState<number>(2);
  const [rankStart, setRankStart] = useState<number>(1);
  const [rankEnd, setRankEnd] = useState<number>(4);

  // Seção 3: Saída / Mecânica
  const [advancingCount, setAdvancingCount] = useState<number>(4);
  const [hasThirdPlaceMatch, setHasThirdPlaceMatch] = useState<boolean>(false);

  // Preenche dados ao abrir ou alterar stage
  useEffect(() => {
    if (stage) {
      setName(stage.name || '');
      setType(stage.type || 'round-robin');
      setParticipantsCount(stage.participantsCount || 8);
      setParticipantsOrigin(stage.participantsOrigin || 'global');
      setGroupsCount(stage.groupsCount || 2);
      setAdvancingCount(stage.advancingCount || 4);
      setHasThirdPlaceMatch(stage.eliminationConfig?.hasThirdPlaceMatch ?? false);
      const feeds = stage.participantFeeds ?? [];
      const overallFeeds = feeds.filter((f) => f.type === 'overall-ranking') as Array<{ type: 'overall-ranking'; position: number }>;
      if (overallFeeds.length > 0) {
        setRankStart(overallFeeds[0].position);
        setRankEnd(overallFeeds[overallFeeds.length - 1].position);
      } else {
        setRankStart(1);
        setRankEnd(stage.participantsCount || 4);
      }
    } else {
      const nextOrder = existingStagesCount + 1;
      const isFirst = existingStagesCount === 0;
      setName(isFirst ? 'Fase de Grupos' : `Etapa ${nextOrder}`);
      setType(isFirst ? 'round-robin' : 'knockout');
      setParticipantsCount(isFirst ? 8 : 4);
      setParticipantsOrigin(isFirst ? 'global' : 'stage-position');
      setGroupsCount(isFirst ? 2 : 1);
      setAdvancingCount(isFirst ? 4 : 1);
      setHasThirdPlaceMatch(false);
      setRankStart(1);
      setRankEnd(4);
    }
  }, [stage, open, existingStagesCount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const order = stage ? stage.order : existingStagesCount + 1;
    const stageId = stage ? stage.id : `stage-${Date.now()}`;

    const isGroupType = type === 'round-robin' || type === 'group-stage';
    const isKnockoutType = type === 'knockout';
    const isPlayInType = type === 'play-in';
    const safeGroupsCount = isGroupType ? Math.max(1, Number(groupsCount) || 1) : undefined;
    const safeParticipantsCount = Math.max(2, Number(participantsCount) || 2);

    let participantFeeds = stage?.participantFeeds;
    if (participantsOrigin === 'overall-ranking') {
      const start = Math.max(1, Number(rankStart) || 1);
      const end = Math.max(start, Number(rankEnd) || (start + safeParticipantsCount - 1));
      participantFeeds = Array.from({ length: end - start + 1 }, (_, i) => ({
        type: 'overall-ranking' as const,
        stageId: 'fase-grupos',
        position: start + i,
      }));
    }

    const newStage: StageDefinition = {
      ...(stage || {}),
      id: stageId,
      stageId,
      order,
      name: name.trim() || `Fase ${order}`,
      type,
      participantsCount: safeParticipantsCount,
      participantsOrigin,
      groupsCount: safeGroupsCount,
      advancingCount: Math.max(1, Number(advancingCount) || 1),
      participantFeeds,
      groupConfig: isGroupType ? {
        groupsCount: safeGroupsCount || 1,
        teamsPerGroup: Math.max(2, Math.ceil(safeParticipantsCount / (safeGroupsCount || 1))),
        rounds: 'single',
      } : stage?.groupConfig,
      eliminationConfig: isKnockoutType || isPlayInType ? {
        bracketSize: safeParticipantsCount,
        seriesType: 'single-match',
        hasThirdPlaceMatch: isKnockoutType ? hasThirdPlaceMatch : false,
      } : stage?.eliminationConfig,
      pairingConfig: isPlayInType ? { strategy: 'high-low' } : stage?.pairingConfig,
    };

    onSave(newStage);
    onOpenChange(false);
  };

  // Cálculos auxiliares para a pré-visualização das mecânicas
  const teamsPerGroup = type === 'round-robin' && groupsCount > 0
    ? (participantsCount / groupsCount).toFixed(1).replace('.0', '')
    : null;

  const eliminatedCount = Math.max(0, participantsCount - advancingCount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white p-0 gap-0 rounded-2xl border border-slate-200 shadow-xl sm:max-w-xl">
        {/* Cabeçalho do Modal */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center text-[#d97706]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-[#0f172a] tracking-tight">
                {stage ? 'Editar Configuração da Fase' : 'Configurar Nova Fase da Competição'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Defina as regras de identificação, fluxo de entrada e vagas de avanço deste nó do torneio.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* ========================================================================= */}
          {/* SEÇÃO 1: IDENTIFICAÇÃO                                                    */}
          {/* ========================================================================= */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f172a]">
                1. Identificação da Fase
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="stage-name" className="text-xs font-medium text-[#0f172a]">
                  Nome da Fase <span className="text-amber-500">*</span>
                </Label>
                <Input
                  id="stage-name"
                  placeholder="Ex: Fase de Grupos, Play-In, Playoffs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-10 text-sm text-[#0f172a] border-slate-200 rounded-xl focus-visible:ring-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stage-type" className="text-xs font-medium text-[#0f172a]">
                  Tipo de Disputa <span className="text-amber-500">*</span>
                </Label>
                <Select
                  value={type}
                  onValueChange={(val: StageType) => setType(val)}
                >
                  <SelectTrigger
                    id="stage-type"
                    className="h-10 text-sm text-[#0f172a] border-slate-200 rounded-xl focus:ring-amber-500 bg-white"
                  >
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="round-robin" className="text-[#0f172a]">
                      Grupos / Todos contra Todos (Round-Robin)
                    </SelectItem>
                    <SelectItem value="play-in" className="text-[#0f172a]">
                      Repescagem / Play-In
                    </SelectItem>
                    <SelectItem value="knockout" className="text-[#0f172a]">
                      Mata-Mata Eliminatório (Knockout)
                    </SelectItem>
                    <SelectItem value="custom" className="text-[#0f172a]">
                      Formato Personalizado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Opção de Disputa de 3º Lugar para Mata-Mata */}
            {type === 'knockout' && (
              <div className="flex items-center gap-2 pt-2 px-1">
                <Checkbox
                  id="third-place-match"
                  checked={hasThirdPlaceMatch}
                  onCheckedChange={(checked) => setHasThirdPlaceMatch(Boolean(checked))}
                />
                <Label htmlFor="third-place-match" className="text-xs font-medium text-[#0f172a] cursor-pointer">
                  Incluir Disputa de 3º Lugar (confronto entre perdedores das semifinais)
                </Label>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* SEÇÃO 2: ENTRADA                                                          */}
          {/* ========================================================================= */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Users className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f172a]">
                2. Fluxo de Entrada de Participantes
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="participants-count" className="text-xs font-medium text-[#0f172a]">
                  Quantidade de Participantes
                </Label>
                <Input
                  id="participants-count"
                  type="number"
                  min={2}
                  max={64}
                  value={participantsCount}
                  onChange={(e) => setParticipantsCount(Number(e.target.value))}
                  className="h-10 text-sm text-[#0f172a] border-slate-200 rounded-xl focus-visible:ring-amber-500"
                />
                <p className="text-[11px] text-slate-500">
                  Total de equipes nesta etapa
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="participants-origin" className="text-xs font-medium text-[#0f172a]">
                  Origem dos Participantes
                </Label>
                <Select
                  value={participantsOrigin}
                  onValueChange={(val: 'global' | 'stage-position' | 'overall-ranking') =>
                    setParticipantsOrigin(val)
                  }
                >
                  <SelectTrigger
                    id="participants-origin"
                    className="h-10 text-sm text-[#0f172a] border-slate-200 rounded-xl focus:ring-amber-500 bg-white"
                  >
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="global" className="text-[#0f172a]">
                      Inscrição Geral do Torneio (Global)
                    </SelectItem>
                    <SelectItem value="stage-position" className="text-[#0f172a]">
                      Classificados da Fase Anterior
                    </SelectItem>
                    <SelectItem value="overall-ranking" className="text-[#0f172a]">
                      Classificação Geral Agregada
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500">
                  Como as equipes chegam a este estágio
                </p>
              </div>
            </div>

            {/* Faixa declarativa de Ranking Geral quando selecionado */}
            {participantsOrigin === 'overall-ranking' && (
              <div className="mt-2 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#0f172a]">
                    Faixa de Classificação Geral (Play-In / Repescagem):
                  </Label>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    {rankStart}º ao {rankEnd}º Geral
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">Posição Inicial</Label>
                    <Input
                      type="number"
                      min={1}
                      value={rankStart}
                      onChange={(e) => setRankStart(Number(e.target.value))}
                      className="h-9 text-xs bg-white border-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-500">Posição Final</Label>
                    <Input
                      type="number"
                      min={rankStart}
                      value={rankEnd}
                      onChange={(e) => setRankEnd(Number(e.target.value))}
                      className="h-9 text-xs bg-white border-slate-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Configuração Condicional de Grupos */}
            {type === 'round-robin' && (
              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="groups-count" className="text-xs font-semibold text-[#0f172a]">
                    Quantidade de Grupos / Chaves:
                  </Label>
                  <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                    {groupsCount} {groupsCount === 1 ? 'Grupo Único' : 'Grupos'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <Input
                    id="groups-count"
                    type="number"
                    min={1}
                    max={16}
                    value={groupsCount}
                    onChange={(e) => setGroupsCount(Number(e.target.value))}
                    className="h-9 text-sm text-[#0f172a] border-slate-200 rounded-lg bg-white focus-visible:ring-amber-500"
                  />
                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Média de <strong>{teamsPerGroup}</strong> equipes por grupo</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* SEÇÃO 3: SAÍDA / MECÂNICA                                                 */}
          {/* ========================================================================= */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <GitFork className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f172a]">
                3. Saída e Mecânica de Avanço
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="advancing-count" className="text-xs font-medium text-[#0f172a]">
                  Vagas de Avanço (Equipes Classificadas)
                </Label>
                <Input
                  id="advancing-count"
                  type="number"
                  min={1}
                  max={participantsCount}
                  value={advancingCount}
                  onChange={(e) => setAdvancingCount(Number(e.target.value))}
                  className="h-10 text-sm text-[#0f172a] border-slate-200 rounded-xl focus-visible:ring-amber-500"
                />
                <p className="text-[11px] text-slate-500">
                  Equipes que avançam para a fase seguinte
                </p>
              </div>

              {/* Card visual da mecânica de saída */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col justify-center space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Mecânica do Nó
                </span>
                <div className="flex items-center gap-2 text-xs text-[#0f172a]">
                  <span className="font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    +{advancingCount} avançam
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  {eliminatedCount > 0 ? (
                    <span className="text-slate-500">
                      {eliminatedCount} eliminados
                    </span>
                  ) : (
                    <span className="text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                      Fase Final (Campeão)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Rodapé com Ações */}
          <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-between sm:justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-full text-slate-600 hover:text-[#0f172a] hover:bg-slate-100 px-5 text-sm"
            >
              Cancelar
            </Button>

            {/* Única área vibrante do modal: Laranja da marca em formato pílula */}
            <Button
              type="submit"
              className="bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-full font-medium px-6 py-2.5 text-sm shadow-md shadow-amber-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {stage ? 'Salvar Alterações' : 'Salvar Fase'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
