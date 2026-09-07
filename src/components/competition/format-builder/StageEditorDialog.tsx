import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type {
  PairingStrategyType,
  ParticipantFeedDefinition,
  RoundDefinition,
  StageDefinition,
  StageType,
} from '@/types/competitionConfig';
import { getStageId } from '@/types/competitionConfig';

export interface StageEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: StageDefinition | null;
  allStages: StageDefinition[];
  onSave: (updatedStage: StageDefinition) => void;
}

export const StageEditorDialog: React.FC<StageEditorDialogProps> = ({
  open,
  onOpenChange,
  stage,
  allStages,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [stageId, setStageId] = useState('');
  const [type, setType] = useState<StageType>('group-stage');
  const [dependsOnStageIds, setDependsOnStageIds] = useState<string[]>([]);
  const [groupsCount, setGroupsCount] = useState(2);
  const [teamsPerGroup, setTeamsPerGroup] = useState(3);
  const [bracketSize, setBracketSize] = useState(8);
  const [pairingStrategy, setPairingStrategy] = useState<PairingStrategyType>('seeded-bracket');
  const [rounds, setRounds] = useState<RoundDefinition[]>([]);
  const [feeds, setFeeds] = useState<ParticipantFeedDefinition[]>([]);

  useEffect(() => {
    if (stage && open) {
      setName(stage.name || '');
      setStageId(getStageId(stage) || '');
      setType(stage.type || 'group-stage');
      setDependsOnStageIds(stage.dependsOnStageIds || []);
      setGroupsCount(stage.groupConfig?.groupsCount || 2);
      setTeamsPerGroup(stage.groupConfig?.teamsPerGroup || 3);
      setBracketSize(stage.eliminationConfig?.bracketSize || 8);
      const strat = (stage.pairingConfig && 'strategy' in stage.pairingConfig)
        ? (stage.pairingConfig as { strategy: PairingStrategyType }).strategy
        : stage.pairing?.strategy || 'seeded-bracket';
      setPairingStrategy(strat);
      setRounds(stage.rounds ? JSON.parse(JSON.stringify(stage.rounds)) : []);
      setFeeds(stage.participantFeeds ? JSON.parse(JSON.stringify(stage.participantFeeds)) : []);
    } else if (open) {
      const generatedId = `fase-${allStages.length + 1}`;
      setName(`Fase ${allStages.length + 1}`);
      setStageId(generatedId);
      setType('group-stage');
      setDependsOnStageIds([]);
      setGroupsCount(2);
      setTeamsPerGroup(3);
      setBracketSize(8);
      setPairingStrategy('seeded-bracket');
      setRounds([{ roundId: `${generatedId}-r1`, stageId: generatedId, order: 1, name: 'Rodada 1' }]);
      setFeeds([{ type: 'all-teams' }]);
    }
  }, [stage, open, allStages.length]);

  const handleSave = () => {
    if (!name.trim() || !stageId.trim()) return;

    const updated: StageDefinition = {
      id: stageId.trim(),
      stageId: stageId.trim(),
      order: stage?.order ?? allStages.length + 1,
      name: name.trim(),
      type,
      dependsOnStageIds: dependsOnStageIds.length > 0 ? dependsOnStageIds : undefined,
      groupConfig: type === 'group-stage' ? { groupsCount, teamsPerGroup, rounds: 'single' } : undefined,
      eliminationConfig: (type === 'knockout' || type === 'play-in') ? { bracketSize } : undefined,
      pairingConfig: { strategy: pairingStrategy },
      rounds,
      participantFeeds: feeds,
    };

    onSave(updated);
    onOpenChange(false);
  };

  const handleAddRound = () => {
    const nextOrder = rounds.length + 1;
    const newRound: RoundDefinition = {
      roundId: `${stageId}-r${nextOrder}`,
      stageId,
      order: nextOrder,
      name: `Rodada ${nextOrder}`,
      slotsCount: Math.max(1, Math.pow(2, Math.max(0, 3 - nextOrder))),
    };
    setRounds([...rounds, newRound]);
  };

  const handleRemoveRound = (idx: number) => {
    setRounds(rounds.filter((_, i) => i !== idx).map((r, i) => ({ ...r, order: i + 1 })));
  };

  const handleAddFeed = () => {
    setFeeds([...feeds, { type: 'seed', seedNumber: feeds.length + 1 }]);
  };

  const handleRemoveFeed = (idx: number) => {
    setFeeds(feeds.filter((_, i) => i !== idx));
  };

  const otherStages = allStages.filter(s => getStageId(s) !== stageId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-surface-base border-border p-5 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-text-primary">
            {stage ? 'Editar Fase da Competição' : 'Nova Fase'}
          </DialogTitle>
          <DialogDescription className="text-xs text-text-secondary">
            Configure a estrutura, dependências, rodadas e origens dos participantes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-text-muted">Nome da Fase</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Fase de Grupos, Play-In, Playoffs"
                className="h-8 text-xs bg-surface-elevated border-border-subtle"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-text-muted">Identificador Técnico (ID)</Label>
              <Input
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                placeholder="Ex.: fase-grupos, playin, final"
                className="h-8 text-xs bg-surface-elevated border-border-subtle font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-text-muted">Tipo da Fase</Label>
              <Select value={type} onValueChange={(v: StageType) => setType(v)}>
                <SelectTrigger className="h-8 text-xs bg-surface-elevated border-border-subtle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-elevated border-border-subtle">
                  <SelectItem value="group-stage">Fase de Grupos</SelectItem>
                  <SelectItem value="round-robin">Todos contra Todos</SelectItem>
                  <SelectItem value="play-in">Play-In (Repescagem)</SelectItem>
                  <SelectItem value="knockout">Mata-Mata (Eliminatória)</SelectItem>
                  <SelectItem value="third-place">Disputa de 3º Lugar</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-text-muted">Estratégia de Pareamento</Label>
              <Select value={pairingStrategy} onValueChange={(v: PairingStrategyType) => setPairingStrategy(v)}>
                <SelectTrigger className="h-8 text-xs bg-surface-elevated border-border-subtle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-elevated border-border-subtle">
                  <SelectItem value="seeded-bracket">Chaveamento por Sementes (Seeded)</SelectItem>
                  <SelectItem value="high-low">Maior vs Menor (High-Low)</SelectItem>
                  <SelectItem value="same-position-cross">Cruzamento entre Grupos (1ºA x 2ºB)</SelectItem>
                  <SelectItem value="round-robin">Turno Único (Berger)</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Parâmetros de Grupos */}
          {type === 'group-stage' && (
            <div className="p-3 rounded-lg bg-surface-elevated/40 border border-border-subtle grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-text-muted">Quantidade de Grupos</Label>
                <Input
                  type="number"
                  min={1}
                  max={16}
                  value={groupsCount}
                  onChange={(e) => setGroupsCount(Number(e.target.value))}
                  className="h-8 text-xs bg-surface-base border-border-subtle"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-text-muted">Equipes por Grupo</Label>
                <Input
                  type="number"
                  min={2}
                  max={16}
                  value={teamsPerGroup}
                  onChange={(e) => setTeamsPerGroup(Number(e.target.value))}
                  className="h-8 text-xs bg-surface-base border-border-subtle"
                />
              </div>
            </div>
          )}

          {/* Parâmetros de Eliminatória */}
          {(type === 'knockout' || type === 'play-in') && (
            <div className="p-3 rounded-lg bg-surface-elevated/40 border border-border-subtle grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-text-muted">Tamanho da Chave (Slots)</Label>
                <Select value={String(bracketSize)} onValueChange={(v) => setBracketSize(Number(v))}>
                  <SelectTrigger className="h-8 text-xs bg-surface-base border-border-subtle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-elevated border-border-subtle">
                    <SelectItem value="2">2 Equipes (Final direta)</SelectItem>
                    <SelectItem value="4">4 Equipes (Semifinais + Final)</SelectItem>
                    <SelectItem value="8">8 Equipes (Quartas, Semis, Final)</SelectItem>
                    <SelectItem value="16">16 Equipes (Oitavas até Final)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Dependências de Fases Anteriores */}
          {otherStages.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-border-subtle">
              <Label className="text-[10px] uppercase font-semibold text-text-muted">
                Depende da conclusão de:
              </Label>
              <div className="flex flex-wrap gap-2">
                {otherStages.map(s => {
                  const sId = getStageId(s);
                  const isDep = dependsOnStageIds.includes(sId);
                  return (
                    <Button
                      key={sId}
                      type="button"
                      variant={isDep ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setDependsOnStageIds(prev =>
                          prev.includes(sId) ? prev.filter(x => x !== sId) : [...prev, sId]
                        );
                      }}
                      className="h-7 text-xs"
                    >
                      {s.name} ({sId})
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rodadas */}
          <div className="space-y-2 pt-2 border-t border-border-subtle">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase font-semibold text-text-muted">Rodadas da Fase</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddRound} className="h-6 text-[11px] gap-1">
                <Plus className="w-3 h-3" /> Adicionar Rodada
              </Button>
            </div>
            <div className="space-y-1.5">
              {rounds.map((round, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-surface-elevated/50 border border-border-subtle">
                  <span className="text-[10px] font-mono text-text-muted w-5">{idx + 1}º</span>
                  <Input
                    value={round.name}
                    onChange={(e) => {
                      const updated = [...rounds];
                      updated[idx].name = e.target.value;
                      setRounds(updated);
                    }}
                    placeholder="Nome da rodada (ex: Quartas de Final)"
                    className="h-7 text-xs bg-surface-base border-border-subtle flex-1"
                  />
                  <Input
                    value={round.roundId}
                    onChange={(e) => {
                      const updated = [...rounds];
                      updated[idx].roundId = e.target.value;
                      setRounds(updated);
                    }}
                    placeholder="ID (ex: quartas)"
                    className="h-7 text-xs bg-surface-base border-border-subtle w-28 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRound(idx)}
                    className="h-7 w-7 p-0 text-state-error hover:bg-state-error/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border-subtle gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim() || !stageId.trim()}>
            Salvar Fase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
