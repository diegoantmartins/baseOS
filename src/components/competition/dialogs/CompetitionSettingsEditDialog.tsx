import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CompetitionRecord, CompetitionSupporter } from '@/types/entities';
import type { CompetitionConfig, SetsToWin } from '@/types/competitionConfig';
import { parseLegacySetFormat } from '@/types/competitionConfig';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { CompetitionIdentityEditor } from './CompetitionIdentityEditor';
import { Settings2, Sparkles, Lock } from 'lucide-react';

export interface CompetitionSettingsEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition: CompetitionRecord;
  onSave: (updates: Partial<CompetitionRecord>) => Promise<void>;
  defaultTab?: 'sets' | 'identidade';
}

function setsToWinToLegacy(sets?: SetsToWin | number | string): '3-sets' | '5-sets' {
  if (typeof sets === 'string') {
    return parseLegacySetFormat(sets) === 3 ? '5-sets' : '3-sets';
  }
  return sets === 3 ? '5-sets' : '3-sets';
}

function resolveInitialSetFormat(competition: CompetitionRecord): '3-sets' | '5-sets' {
  if (competition.config?.format?.defaultSetsToWin !== undefined) {
    return setsToWinToLegacy(competition.config.format.defaultSetsToWin);
  }
  return setsToWinToLegacy(competition.setFormat);
}

function resolveInitialGroupStage(competition: CompetitionRecord): '3-sets' | '5-sets' {
  const override = competition.config?.format?.phaseOverrides?.groupStage ?? competition.phaseSetRules?.groupStage;
  if (override !== undefined) {
    return setsToWinToLegacy(override);
  }
  return resolveInitialSetFormat(competition);
}

function resolveInitialPlayoffs(competition: CompetitionRecord): '3-sets' | '5-sets' {
  const override =
    competition.config?.format?.phaseOverrides?.quarterfinals ??
    competition.config?.format?.phaseOverrides?.playoffs ??
    competition.phaseSetRules?.quarterfinals ??
    competition.phaseSetRules?.playoffs;
  if (override !== undefined) {
    return setsToWinToLegacy(override);
  }
  return resolveInitialSetFormat(competition);
}

function resolveInitialSemifinals(competition: CompetitionRecord): '3-sets' | '5-sets' {
  const override = competition.config?.format?.phaseOverrides?.semifinals ?? competition.phaseSetRules?.semifinals;
  if (override !== undefined) {
    return setsToWinToLegacy(override);
  }
  return '5-sets';
}

function resolveInitialFinal(competition: CompetitionRecord): '3-sets' | '5-sets' {
  const override = competition.config?.format?.phaseOverrides?.final ?? competition.phaseSetRules?.final;
  if (override !== undefined) {
    return setsToWinToLegacy(override);
  }
  return '5-sets';
}

export function CompetitionSettingsEditDialog({
  open,
  onOpenChange,
  competition,
  onSave,
  defaultTab = 'sets',
}: CompetitionSettingsEditDialogProps) {
  const [activeTab, setActiveTab] = useState<'sets' | 'identidade'>(defaultTab);
  const [setFormat, setSetFormat] = useState(() => resolveInitialSetFormat(competition));
  const [groupStage, setGroupStage] = useState(() => resolveInitialGroupStage(competition));
  const [playoffs, setPlayoffs] = useState(() => resolveInitialPlayoffs(competition));
  const [semifinals, setSemifinals] = useState(() => resolveInitialSemifinals(competition));
  const [final, setFinal] = useState(() => resolveInitialFinal(competition));

  // Identidade e Apoiadores
  const [logoUrl, setLogoUrl] = useState<string | undefined>(competition.logoUrl);
  const [supporters, setSupporters] = useState<CompetitionSupporter[]>(competition.supporters || []);
  const [saving, setSaving] = useState(false);

  const isLocked = CompetitionRulesService.areRulesLocked(competition);

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
      setLogoUrl(competition.logoUrl);
      setSupporters(competition.supporters || []);
      setSetFormat(resolveInitialSetFormat(competition));
      setGroupStage(resolveInitialGroupStage(competition));
      setPlayoffs(resolveInitialPlayoffs(competition));
      setSemifinals(resolveInitialSemifinals(competition));
      setFinal(resolveInitialFinal(competition));
    }
  }, [open, competition, defaultTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isLocked) {
        // Regras bloqueadas: salva apenas a identidade e apoiadores
        await onSave({
          logoUrl: logoUrl || undefined,
          supporters: supporters.length > 0 ? supporters : [],
        });
        onOpenChange(false);
        return;
      }

      const updatedPhaseRules = {
        groupStage: groupStage as '3-sets' | '5-sets',
        playoffs: playoffs as '3-sets' | '5-sets',
        semifinals: semifinals as '3-sets' | '5-sets',
        final: final as '3-sets' | '5-sets',
      };

      let updatedConfig: CompetitionConfig;
      if (competition.config) {
        const baseConfig: CompetitionConfig = JSON.parse(JSON.stringify(competition.config));
        updatedConfig = {
          ...baseConfig,
          format: {
            ...baseConfig.format,
            defaultSetsToWin: parseLegacySetFormat(setFormat),
            phaseOverrides: {
              ...baseConfig.format.phaseOverrides,
              groupStage: parseLegacySetFormat(groupStage),
              playoffs: parseLegacySetFormat(playoffs),
              quarterfinals: parseLegacySetFormat(playoffs),
              semifinals: parseLegacySetFormat(semifinals),
              final: parseLegacySetFormat(final),
            },
          },
        };
      } else {
        updatedConfig = CompetitionRulesService.normalizeLegacyToConfig({
          ...competition,
          setFormat: setFormat as '3-sets' | '5-sets',
          phaseSetRules: updatedPhaseRules,
        });
      }

      await onSave({
        setFormat: setFormat as '3-sets' | '5-sets',
        phaseSetRules: updatedPhaseRules,
        config: updatedConfig,
        logoUrl: logoUrl || undefined,
        supporters: supporters.length > 0 ? supporters : [],
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader className="pb-2 border-b border-border">
          <DialogTitle className="text-sm font-semibold text-foreground">
            Configurações e Identidade da Competição
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Gerencie o formato de disputa e a identidade visual oficial do torneio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden pt-2">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'sets' | 'identidade')}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="grid grid-cols-2 h-8 bg-zinc-900 border border-border p-0.5 rounded-lg mb-3">
              <TabsTrigger
                value="sets"
                className="text-xs h-7 data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground gap-1.5"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Regulamento e Sets
              </TabsTrigger>
              <TabsTrigger
                value="identidade"
                className="text-xs h-7 data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Identidade e Apoiadores
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto pr-1">
              {/* ── ABA 1: REGULAMENTO E SETS ── */}
              <TabsContent value="sets" className="space-y-3.5 m-0 focus-visible:outline-none">
                {isLocked && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-200">Regras de Sets Congeladas</p>
                      <p className="text-[11px] text-amber-300/80 mt-0.5">
                        As regras esportivas não podem mais ser alteradas porque a competição já possui partidas geradas
                        ou está em andamento. Você ainda pode editar a identidade visual e os apoiadores na aba ao lado.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Formato de Sets Padrão</Label>
                  <Select
                    disabled={isLocked}
                    value={setFormat}
                    onValueChange={(v: '3-sets' | '5-sets') => setSetFormat(v)}
                  >
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
                  <Label className="text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
                    Formatos Específicos por Fase
                  </Label>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Grupos</Label>
                      <Select
                        disabled={isLocked}
                        value={groupStage}
                        onValueChange={(v: '3-sets' | '5-sets') => setGroupStage(v)}
                      >
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
                      <Select
                        disabled={isLocked}
                        value={playoffs}
                        onValueChange={(v: '3-sets' | '5-sets') => setPlayoffs(v)}
                      >
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
                      <Select
                        disabled={isLocked}
                        value={semifinals}
                        onValueChange={(v: '3-sets' | '5-sets') => setSemifinals(v)}
                      >
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
                      <Select
                        disabled={isLocked}
                        value={final}
                        onValueChange={(v: '3-sets' | '5-sets') => setFinal(v)}
                      >
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
              </TabsContent>

              {/* ── ABA 2: IDENTIDADE E APOIADORES ── */}
              <TabsContent value="identidade" className="space-y-4 m-0 focus-visible:outline-none">
                <CompetitionIdentityEditor
                  logoUrl={logoUrl}
                  onLogoChange={setLogoUrl}
                  supporters={supporters}
                  onSupportersChange={setSupporters}
                />
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="gap-2 pt-3 border-t border-border mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="h-8 text-xs rounded-md font-medium shadow-none bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

