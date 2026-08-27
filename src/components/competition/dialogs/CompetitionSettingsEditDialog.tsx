import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CompetitionRecord } from '@/types/entities';

export interface CompetitionSettingsEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition: CompetitionRecord;
  onSave: (updates: Partial<CompetitionRecord>) => Promise<void>;
}

export function CompetitionSettingsEditDialog({
  open,
  onOpenChange,
  competition,
  onSave,
}: CompetitionSettingsEditDialogProps) {
  const [setFormat, setSetFormat] = useState(competition.setFormat || '3-sets');
  const [groupStage, setGroupStage] = useState(
    competition.phaseSetRules?.groupStage || competition.setFormat || '3-sets',
  );
  const [playoffs, setPlayoffs] = useState(
    competition.phaseSetRules?.playoffs || competition.setFormat || '3-sets',
  );
  const [semifinals, setSemifinals] = useState(
    competition.phaseSetRules?.semifinals || '5-sets',
  );
  const [final, setFinal] = useState(competition.phaseSetRules?.final || '5-sets');

  useEffect(() => {
    if (open) {
      setSetFormat(competition.setFormat || '3-sets');
      setGroupStage(competition.phaseSetRules?.groupStage || competition.setFormat || '3-sets');
      setPlayoffs(competition.phaseSetRules?.playoffs || competition.setFormat || '3-sets');
      setSemifinals(competition.phaseSetRules?.semifinals || '5-sets');
      setFinal(competition.phaseSetRules?.final || '5-sets');
    }
  }, [open, competition]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      setFormat: setFormat as '3-sets' | '5-sets',
      phaseSetRules: {
        groupStage: groupStage as '3-sets' | '5-sets',
        playoffs: playoffs as '3-sets' | '5-sets',
        semifinals: semifinals as '3-sets' | '5-sets',
        final: final as '3-sets' | '5-sets',
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">Editar Configurações da Competição</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Ajuste o formato de sets por fase.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Formato de Sets Padrão</Label>
            <Select value={setFormat} onValueChange={(v: '3-sets' | '5-sets') => setSetFormat(v)}>
              <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                <SelectValue placeholder="Selecione o formato padrão" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="3-sets" className="text-xs">Melhor de 3 sets</SelectItem>
                <SelectItem value="5-sets" className="text-xs">Melhor de 5 sets</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-border">
            <Label className="text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">Formatos Específicos por Fase</Label>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Grupos</Label>
                <Select value={groupStage} onValueChange={(v: '3-sets' | '5-sets') => setGroupStage(v)}>
                  <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="3-sets" className="text-xs">3 Sets</SelectItem>
                    <SelectItem value="5-sets" className="text-xs">5 Sets</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Quartas de Final</Label>
                <Select value={playoffs} onValueChange={(v: '3-sets' | '5-sets') => setPlayoffs(v)}>
                  <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="3-sets" className="text-xs">3 Sets</SelectItem>
                    <SelectItem value="5-sets" className="text-xs">5 Sets</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Semifinais</Label>
                <Select value={semifinals} onValueChange={(v: '3-sets' | '5-sets') => setSemifinals(v)}>
                  <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="3-sets" className="text-xs">3 Sets</SelectItem>
                    <SelectItem value="5-sets" className="text-xs">5 Sets</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Finais</Label>
                <Select value={final} onValueChange={(v: '3-sets' | '5-sets') => setFinal(v)}>
                  <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="3-sets" className="text-xs">3 Sets</SelectItem>
                    <SelectItem value="5-sets" className="text-xs">5 Sets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="h-8 text-xs rounded-md font-medium shadow-none">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
