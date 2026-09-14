import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CompetitionRecord, ModalityRecord, VenueRecord, CompetitionSupporter } from '@/types/entities';
import type { CompetitionConfig, SetsToWin } from '@/types/competitionConfig';
import {
  DEFAULT_BEACH_COMPETITION_CONFIG,
  DEFAULT_INDOOR_COMPETITION_CONFIG,
  deriveMaxSets,
  formatSetsToWinLabel,
} from '@/types/competitionConfig';
import { CompetitionTemplateService } from '@/services/competitionTemplateService';
import { CompetitionIdentityEditor } from './CompetitionIdentityEditor';
import {
  Calendar,
  Layers,
  Settings2,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Volleyball,
} from 'lucide-react';

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
  // Aba ativa
  const [activeTab, setActiveTab] = useState<'geral' | 'disputa' | 'sets' | 'inscricao' | 'identidade'>('geral');

  // Aba 1 — Dados Gerais
  const [name, setName] = useState('');
  const [modality, setModality] = useState<'indoor' | 'beach'>('indoor');
  const [genderCategory, setGenderCategory] = useState<'male' | 'female' | 'mixed'>('female');
  const [venue, setVenue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [defaultDeadline, setDefaultDeadline] = useState('');

  // Aba 2 — Sistema de Disputa (Carregamento dinâmico via CompetitionTemplateService.listTemplates())
  const templates = CompetitionTemplateService.listTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('groups-knockout-standard');
  const [groupsCount, setGroupsCount] = useState<number>(2);
  const [advancingPerGroup, setAdvancingPerGroup] = useState<number>(2);
  const [bestThirdsCount, setBestThirdsCount] = useState<number>(0);

  // Aba 3 — Sets & Pontuação (baseado em CompetitionConfig)
  const [setsToWin, setSetsToWin] = useState<SetsToWin>(2);
  const [hasFinalPhaseOverride, setHasFinalPhaseOverride] = useState<boolean>(true); // Semis e final em melhor de 5 por padrão no indoor
  const [regularSetPoints, setRegularSetPoints] = useState<number>(25);
  const [tiebreakPoints, setTiebreakPoints] = useState<number>(15);
  const [minAdvantage, setMinAdvantage] = useState<number>(2);
  const [scoringSystemType, setScoringSystemType] = useState<'fivb-standard' | 'simple' | 'win-loss'>('fivb-standard');

  // Aba 4 — Regras de Inscrição (baseado em RegistrationRulesConfig)
  const [minAthletes, setMinAthletes] = useState<number>(6);
  const [maxAthletes, setMaxAthletes] = useState<number>(14);
  const [maxLiberos, setMaxLiberos] = useState<number>(2);
  const [maxCaptains, setMaxCaptains] = useState<number>(1);
  const [requireJerseyNumber, setRequireJerseyNumber] = useState<boolean>(false);
  const [maxTeams, setMaxTeams] = useState<number>(16);

  // Aba 5 — Identidade Visual e Apoiadores
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [supporters, setSupporters] = useState<CompetitionSupporter[]>([]);

  const [submitting, setSubmitting] = useState(false);

  // Função utilitária para aplicar clone seguro do preset ao alternar modalidade
  const applyModalityPreset = (targetModality: 'indoor' | 'beach') => {
    setModality(targetModality);
    const preset = JSON.parse(
      JSON.stringify(targetModality === 'indoor' ? DEFAULT_INDOOR_COMPETITION_CONFIG : DEFAULT_BEACH_COMPETITION_CONFIG),
    ) as CompetitionConfig;

    setSetsToWin(preset.format.defaultSetsToWin);
    setRegularSetPoints(preset.format.setRules.regularSetPoints);
    setTiebreakPoints(preset.format.setRules.tiebreakPoints);
    setMinAdvantage(preset.format.setRules.minAdvantage);
    setHasFinalPhaseOverride(targetModality === 'indoor'); // Indoor usa semis/final em melhor de 5; praia melhor de 3 uniforme

    setMinAthletes(preset.registration.minAthletes);
    setMaxAthletes(preset.registration.maxAthletes);
    setMaxLiberos(preset.registration.maxLiberos);
    setMaxCaptains(preset.registration.maxCaptains);
    setRequireJerseyNumber(preset.registration.requireJerseyNumberOnRegistration);
    setMaxTeams(targetModality === 'indoor' ? 16 : 8);
  };

  useEffect(() => {
    if (open) {
      setActiveTab('geral');
      setName('');
      setGenderCategory('female');
      setVenue(venues[0]?.name || '');
      setStartDate('');
      setEndDate('');
      setDefaultDeadline('');
      setSelectedTemplateId('groups-knockout-standard');
      setGroupsCount(2);
      setAdvancingPerGroup(2);
      setBestThirdsCount(0);
      setLogoUrl(undefined);
      setSupporters([]);
      setMaxTeams(16);
      applyModalityPreset('indoor');
    }
  }, [open, venues]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
  const isGroupBasedTemplate =
    selectedTemplate?.formatType === 'groups-knockout' ||
    selectedTemplate?.formatType === 'groups-play-in-knockout' ||
    selectedTemplate?.id.includes('groups');

  const canSubmit = name.trim().length >= 3;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    try {
      // 1. Cria a configuração canônica a partir do template de disputa selecionado
      const canonicalConfig = CompetitionTemplateService.createConfigFromTemplate(selectedTemplateId, {
        modality,
        setsToWin,
      });

      // 2. Aplica as customizações regulamentares informadas pelo organizador
      canonicalConfig.format.defaultSetsToWin = setsToWin;
      canonicalConfig.format.setRules = {
        regularSetPoints,
        tiebreakPoints,
        minAdvantage,
      };

      if (hasFinalPhaseOverride) {
        canonicalConfig.format.phaseOverrides = {
          groupStage: setsToWin,
          quarterfinals: setsToWin,
          semifinals: 3,
          final: 3,
        };
      } else {
        canonicalConfig.format.phaseOverrides = undefined;
      }

      if (scoringSystemType === 'fivb-standard') {
        canonicalConfig.scoring = {
          systemType: 'fivb-standard',
          pointsWinClear: 3,
          pointsWinNarrow: 2,
          pointsLossNarrow: 1,
          pointsLossClear: 0,
          pointsWoWin: 3,
          pointsWoLoss: 0,
        };
      } else if (scoringSystemType === 'simple') {
        canonicalConfig.scoring = {
          systemType: 'simple',
          pointsWinClear: 2,
          pointsWinNarrow: 2,
          pointsLossNarrow: 1,
          pointsLossClear: 0,
          pointsWoWin: 2,
          pointsWoLoss: 0,
        };
      } else if (scoringSystemType === 'win-loss') {
        canonicalConfig.scoring = {
          systemType: 'win-loss',
          pointsWinClear: 1,
          pointsWinNarrow: 1,
          pointsLossNarrow: 0,
          pointsLossClear: 0,
          pointsWoWin: 1,
          pointsWoLoss: 0,
        };
      }

      canonicalConfig.standings = {
        ...canonicalConfig.standings,
        advancingPerGroup,
        bestThirds: {
          enabled: bestThirdsCount > 0,
          count: bestThirdsCount,
        },
      };

      canonicalConfig.registration = {
        minAthletes,
        maxAthletes,
        maxCaptains,
        maxLiberos,
        requireJerseyNumberOnRegistration: requireJerseyNumber,
        maxTeams,
      };

      // 3. Monta baseRecord mantendo campos legados sincronizados para retrocompatibilidade
      const legacySetFormat = setsToWin === 3 ? '5-sets' : setsToWin === 1 ? '1-set' : '3-sets';
      const legacyPhaseSetFormat: '3-sets' | '5-sets' = setsToWin === 3 ? '5-sets' : '3-sets';
      const playerFormat = modality === 'beach' ? '2x2' : '6x6';

      const baseRecord: Omit<CompetitionRecord, 'id'> = {
        name: name.trim(),
        modality,
        format: selectedTemplateId,
        playerFormat,
        setFormat: legacySetFormat,
        genderCategory,
        status: 'registration-open',
        logoUrl: logoUrl || undefined,
        supporters: supporters.length > 0 ? supporters : [],
        groupsCount: isGroupBasedTemplate ? groupsCount : 1,
        advancingPerGroup: isGroupBasedTemplate ? advancingPerGroup : 1,
        bestThirdsCount: isGroupBasedTemplate ? bestThirdsCount : 0,
        venue: venue.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        defaultDeadline: defaultDeadline || undefined,
        defaultMatchIntervalMinutes: 75,
        minTeamRestMinutes: 30,
        tiebreakCriteriaOrder: canonicalConfig.standings.tiebreakCriteriaOrder,
        phaseSetRules: hasFinalPhaseOverride
          ? {
              groupStage: legacyPhaseSetFormat,
              playoffs: legacyPhaseSetFormat,
              semifinals: '5-sets',
              final: '5-sets',
            }
          : undefined,
        config: canonicalConfig,
      };

      await onSubmit(baseRecord);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-5 bg-zinc-950 border-zinc-800 rounded-xl shadow-none">
        <DialogHeader className="pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <DialogTitle className="text-sm font-semibold text-foreground">Nova Competição</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure os parâmetros de disputa, regras de sets, pontuação e limites de elenco integrados ao domínio do BaseOS.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'geral' | 'disputa' | 'sets' | 'inscricao' | 'identidade')}
          className="flex-1 flex flex-col overflow-hidden pt-2"
        >
          <TabsList className="grid grid-cols-5 h-8 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg mb-3">
            <TabsTrigger value="geral" className="text-xs h-7 data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="disputa" className="text-xs h-7 data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground gap-1">
              <Layers className="w-3.5 h-3.5" />
              Disputa
            </TabsTrigger>
            <TabsTrigger value="sets" className="text-xs h-7 data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground gap-1">
              <Settings2 className="w-3.5 h-3.5" />
              Sets
            </TabsTrigger>
            <TabsTrigger value="inscricao" className="text-xs h-7 data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground gap-1">
              <Users className="w-3.5 h-3.5" />
              Inscrição
            </TabsTrigger>
            <TabsTrigger value="identidade" className="text-xs h-7 data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Identidade
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-1">
            {/* ABA 1 — GERAL */}
            <TabsContent value="geral" className="space-y-3.5 mt-0">
              <div className="space-y-1">
                <Label htmlFor="comp-name" className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Nome da Competição *
                </Label>
                <Input
                  id="comp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Superliga Regional de Voleibol 2026"
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Modalidade</Label>
                  <Select
                    value={modality}
                    onValueChange={(v: 'indoor' | 'beach') => applyModalityPreset(v)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="indoor" className="text-xs">Voleibol de Quadra (Indoor)</SelectItem>
                      <SelectItem value="beach" className="text-xs">Vôlei de Praia (Beach)</SelectItem>
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

              <div className="space-y-1">
                <Label htmlFor="comp-venue" className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Local Principal / Ginásio
                </Label>
                <Input
                  id="comp-venue"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Ex.: Complexo Esportivo Municipal"
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="comp-start" className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Início
                  </Label>
                  <Input
                    id="comp-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="comp-end" className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Fim
                  </Label>
                  <Input
                    id="comp-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="comp-deadline" className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Prazo Inscrição
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
            </TabsContent>

            {/* ABA 2 — SISTEMA DE DISPUTA */}
            <TabsContent value="disputa" className="space-y-3.5 mt-0">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Modelo de Disputa (Template Oficial)
                </Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 max-h-56">
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate && (
                <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <p className="text-xs text-zinc-300 leading-relaxed">{selectedTemplate.description}</p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                      Recomendado: {selectedTemplate.recommendedTeamsMin} a {selectedTemplate.recommendedTeamsMax} equipes
                    </span>
                    {selectedTemplate.tags.map((tag) => (
                      <span key={tag} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {isGroupBasedTemplate && (
                <div className="space-y-2 pt-1 border-t border-zinc-800">
                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Parâmetros da Fase de Grupos
                  </Label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-zinc-400">Nº de Grupos</Label>
                      <Input
                        type="number"
                        min={1}
                        max={8}
                        value={groupsCount}
                        onChange={(e) => setGroupsCount(Number(e.target.value))}
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-zinc-400">Classificados / Grupo</Label>
                      <Input
                        type="number"
                        min={1}
                        max={4}
                        value={advancingPerGroup}
                        onChange={(e) => setAdvancingPerGroup(Number(e.target.value))}
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-zinc-400">Melhores 3ºs</Label>
                      <Input
                        type="number"
                        min={0}
                        max={4}
                        value={bestThirdsCount}
                        onChange={(e) => setBestThirdsCount(Number(e.target.value))}
                        className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ABA 3 — SETS & PONTUAÇÃO */}
            <TabsContent value="sets" className="space-y-3.5 mt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Sets Padrão para Vitória
                  </Label>
                  <Select
                    value={String(setsToWin)}
                    onValueChange={(v) => setSetsToWin(Number(v) as SetsToWin)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="2" className="text-xs">
                        {formatSetsToWinLabel(2)} (máx. {deriveMaxSets(2)} sets)
                      </SelectItem>
                      <SelectItem value="3" className="text-xs">
                        {formatSetsToWinLabel(3)} (máx. {deriveMaxSets(3)} sets)
                      </SelectItem>
                      <SelectItem value="1" className="text-xs">
                        {formatSetsToWinLabel(1)} (máx. {deriveMaxSets(1)} set)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                    Sistema de Pontuação
                  </Label>
                  <Select
                    value={scoringSystemType}
                    onValueChange={(v: 'fivb-standard' | 'simple' | 'win-loss') => setScoringSystemType(v)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="fivb-standard" className="text-xs">
                        FIVB / CBV Oficial (3 / 2 / 1 / 0 pts)
                      </SelectItem>
                      <SelectItem value="simple" className="text-xs">
                        Tradicional Simples (2 / 1 / 0 pts)
                      </SelectItem>
                      <SelectItem value="win-loss" className="text-xs">
                        Vitória / Derrota Direto (1 / 0 pt)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <div className="space-y-0.5">
                  <Label htmlFor="phase-override" className="text-xs font-medium text-foreground cursor-pointer">
                    Semifinais e Final em melhor de 5 sets
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Aplica sobrescrita canônica por fase (phaseOverrides: semis = 3, final = 3).
                  </p>
                </div>
                <Switch
                  id="phase-override"
                  checked={hasFinalPhaseOverride}
                  onCheckedChange={setHasFinalPhaseOverride}
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Regras de Fechamento de Set
                </Label>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-400">Pontos Set Regular</Label>
                    <Input
                      type="number"
                      min={15}
                      max={35}
                      value={regularSetPoints}
                      onChange={(e) => setRegularSetPoints(Number(e.target.value))}
                      className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-400">Pontos Tiebreak</Label>
                    <Input
                      type="number"
                      min={7}
                      max={25}
                      value={tiebreakPoints}
                      onChange={(e) => setTiebreakPoints(Number(e.target.value))}
                      className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-400">Vantagem Mínima</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={minAdvantage}
                      onChange={(e) => setMinAdvantage(Number(e.target.value))}
                      className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA 4 — REGRAS DE INSCRIÇÃO */}
            <TabsContent value="inscricao" className="space-y-3.5 mt-0">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Limites de Elenco por Equipe (RegistrationRulesConfig)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-400">Mínimo de Atletas</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={minAthletes}
                      onChange={(e) => setMinAthletes(Number(e.target.value))}
                      className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-400">Máximo de Atletas</Label>
                    <Input
                      type="number"
                      min={minAthletes}
                      max={25}
                      value={maxAthletes}
                      onChange={(e) => setMaxAthletes(Number(e.target.value))}
                      className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">Máximo de Líberos</Label>
                  <Input
                    type="number"
                    min={0}
                    max={2}
                    value={maxLiberos}
                    onChange={(e) => setMaxLiberos(Number(e.target.value))}
                    className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">Máximo de Capitães</Label>
                  <Input
                    type="number"
                    min={1}
                    max={2}
                    value={maxCaptains}
                    onChange={(e) => setMaxCaptains(Number(e.target.value))}
                    className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Capacidade Oficial da Competição
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-zinc-400">Vagas Máximas de Equipes (maxTeams)</Label>
                    <Input
                      type="number"
                      min={2}
                      max={64}
                      value={maxTeams}
                      onChange={(e) => setMaxTeams(Math.max(2, Number(e.target.value)))}
                      className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Limite determinístico de agremiações confirmadas na competição.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 mt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="require-jersey" className="text-xs font-medium text-foreground cursor-pointer flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    Exigir número de camisa na inscrição online
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Se desativado, atletas podem se inscrever sem camisa definida e confirmar no dia do jogo.
                  </p>
                </div>
                <Switch
                  id="require-jersey"
                  checked={requireJerseyNumber}
                  onCheckedChange={setRequireJerseyNumber}
                />
              </div>
            </TabsContent>

            {/* ════ ABA 5: IDENTIDADE E APOIADORES ════ */}
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

        <DialogFooter className="gap-2 pt-3 border-t border-zinc-800 mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs rounded-md border-zinc-800 hover:bg-zinc-800/60"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="h-8 text-xs rounded-md font-medium shadow-none"
          >
            {submitting ? 'Criando Competição...' : 'Criar Competição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
