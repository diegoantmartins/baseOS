import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CompetitionRecord, ModalityRecord, VenueRecord } from '@/types/entities';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { CompetitionTemplateService } from '@/services/competitionTemplateService';

export interface CompetitionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: Omit<CompetitionRecord, 'id'>) => Promise<void>;
  modalities: ModalityRecord[];
  venues: VenueRecord[];
}

export function CompetitionFormDialog({
  open,
  onOpenChange,
  onSubmit,
  venues,
}: CompetitionFormDialogProps) {
  const [name, setName] = useState('');
  const [modality, setModality] = useState<'indoor' | 'beach'>('indoor');
  const [genderCategory, setGenderCategory] = useState<'male' | 'female' | 'mixed'>('female');
  const [playerFormat, setPlayerFormat] = useState('6x6');
  const [setsFormat, setSetsFormat] = useState('3-sets');
  const [format, setFormat] = useState('group-stage-knockout');
  const [groupsCount, setGroupsCount] = useState(2);
  const [advancingPerGroup, setAdvancingPerGroup] = useState(2);
  const [bestThirdsCount, setBestThirdsCount] = useState(0);
  const [venue, setVenue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [defaultDeadline, setDefaultDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setModality('indoor');
      setGenderCategory('female');
      setPlayerFormat('6x6');
      setSetsFormat('3-sets');
      setFormat('group-stage-knockout');
      setGroupsCount(2);
      setAdvancingPerGroup(2);
      setBestThirdsCount(0);
      setVenue(venues[0]?.name || '');
      setStartDate('');
      setEndDate('');
      setDefaultDeadline('');
    }
  }, [open, venues]);

  const canSubmit = name.trim().length >= 3;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const baseRecord: Omit<CompetitionRecord, 'id'> = {
      name: name.trim(),
      modality,
      format,
      playerFormat,
      setFormat: setsFormat,
      genderCategory,
      status: 'planning',
      groupsCount,
      advancingPerGroup,
      bestThirdsCount,
      venue: venue.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      defaultDeadline: defaultDeadline || undefined,
      defaultMatchIntervalMinutes: 75,
      minTeamRestMinutes: 30,
      tiebreakCriteriaOrder: [
        'points',
        'head-to-head',
        'set-average',
        'points-average',
        'sets-balance',
        'points-balance',
        'victories',
        'draw',
      ],
      phaseSetRules: {
        groupStage: setsFormat === '5-sets' ? '5-sets' : '3-sets',
        playoffs: setsFormat === '5-sets' ? '5-sets' : '3-sets',
        semifinals: '5-sets',
        final: '5-sets',
      },
    };

    const templateId = format === 'group-stage-knockout' ? 'groups-knockout-standard'
      : format === 'round-robin' ? 'round-robin-standard'
      : format === 'single-elimination' ? 'knockout-pure-standard'
      : format;

    let canonicalConfig = CompetitionTemplateService.createConfigFromTemplate(templateId, {
      modality,
      setsToWin: setsFormat === '5-sets' ? 3 : 2,
    });

    if (!canonicalConfig) {
      canonicalConfig = CompetitionRulesService.normalizeLegacyToConfig({
        id: 'initial',
        ...baseRecord,
      });
    }

    try {
      await onSubmit({
        ...baseRecord,
        config: canonicalConfig,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-5 bg-zinc-950 border-border rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">Nova Competição</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Defina os parâmetros técnicos e regulamentares da nova competição.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5 py-1">
          <div className="space-y-1">
            <Label htmlFor="comp-name" className="text-[10px] uppercase font-semibold text-muted-foreground">
              Nome da Competição
            </Label>
            <Input
              id="comp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Superliga Regional 2026"
              className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Modalidade</Label>
              <Select value={modality} onValueChange={(v: 'indoor' | 'beach') => setModality(v)}>
                <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="indoor" className="text-xs">Vôlei de Quadra</SelectItem>
                  <SelectItem value="beach" className="text-xs">Vôlei de Praia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Categoria / Naipe</Label>
              <Select value={genderCategory} onValueChange={(v: 'male' | 'female' | 'mixed') => setGenderCategory(v)}>
                <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="female" className="text-xs">Feminino</SelectItem>
                  <SelectItem value="male" className="text-xs">Masculino</SelectItem>
                  <SelectItem value="mixed" className="text-xs">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Formato de Atletas</Label>
              <Select value={playerFormat} onValueChange={setPlayerFormat}>
                <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="6x6" className="text-xs">6x6 (Quadra)</SelectItem>
                  <SelectItem value="4x4" className="text-xs">4x4 (Misto / Areia)</SelectItem>
                  <SelectItem value="2x2" className="text-xs">2x2 (Dupla)</SelectItem>
                  <SelectItem value="3x3" className="text-xs">3x3 (Trio)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Sets Padrão</Label>
              <Select value={setsFormat} onValueChange={setSetsFormat}>
                <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="3-sets" className="text-xs">Melhor de 3 sets</SelectItem>
                  <SelectItem value="5-sets" className="text-xs">Melhor de 5 sets</SelectItem>
                  <SelectItem value="1-set" className="text-xs">Set Único</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Sistema de Disputa</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="group-stage-knockout" className="text-xs">
                  Fase de Grupos + Mata-mata (Recomendado)
                </SelectItem>
                <SelectItem value="round-robin" className="text-xs">Todos contra Todos (Pontos Corridos)</SelectItem>
                <SelectItem value="single-elimination" className="text-xs">Eliminatória Simples (Mata-mata direto)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {format === 'group-stage-knockout' && (
            <div className="grid grid-cols-3 gap-2.5 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Nº Grupos</Label>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={groupsCount}
                  onChange={(e) => setGroupsCount(Number(e.target.value))}
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Classif./Grupo</Label>
                <Input
                  type="number"
                  min={1}
                  max={4}
                  value={advancingPerGroup}
                  onChange={(e) => setAdvancingPerGroup(Number(e.target.value))}
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Melhores 3ºs</Label>
                <Input
                  type="number"
                  min={0}
                  max={4}
                  value={bestThirdsCount}
                  onChange={(e) => setBestThirdsCount(Number(e.target.value))}
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="comp-venue" className="text-[10px] uppercase font-semibold text-muted-foreground">
              Local Principal / Ginásio
            </Label>
            <Input
              id="comp-venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Ex.: Ginásio UNIPAR Toledo"
              className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="comp-start" className="text-[10px] uppercase font-semibold text-muted-foreground">Início</Label>
              <Input
                id="comp-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="comp-end" className="text-[10px] uppercase font-semibold text-muted-foreground">Fim</Label>
              <Input
                id="comp-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="comp-deadline" className="text-[10px] uppercase font-semibold text-muted-foreground">
                Prazo Inscrições
              </Label>
              <Input
                id="comp-deadline"
                type="date"
                value={defaultDeadline}
                onChange={(e) => setDefaultDeadline(e.target.value)}
                className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="h-8 text-xs rounded-md font-medium shadow-none"
          >
            {submitting ? 'Criando...' : 'Criar Competição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
