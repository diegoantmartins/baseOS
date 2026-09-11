import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, AlertTriangle, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { validateMatchResult, validateMatchHighlight, DEFAULT_INDOOR_CONFIG, DEFAULT_BEACH_CONFIG } from '@/services/matchValidationService';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { formatSetsToWinLabel } from '@/types/competitionConfig';
import type { CompetitionRecord, MatchRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';
import { getMatchRosters } from '@/services/registrationService';

export interface ResultValidationDialogProps {
  match: MatchRecord;
  competition: CompetitionRecord | null;
  onClose: () => void;
  onSaved: (sets: MatchRecord['sets'], winnerId: string, highlightAthleteId?: string) => Promise<void>;
}

export function ResultValidationDialog({ match, competition, onClose, onSaved }: ResultValidationDialogProps) {
  const isBeach = competition?.modality === 'beach';
  const formatConfig = useMemo(() => {
    if (competition) {
      return CompetitionRulesService.resolveMatchFormat(competition, match.phase, match.customSetFormat);
    }
    return {
      setsToWin: 2 as const,
      maxSets: 3,
      regularSetPoints: isBeach ? 21 : 25,
      tiebreakPoints: 15,
      minAdvantage: 2,
    };
  }, [competition, match.phase, match.customSetFormat, isBeach]);

  const maxSets = formatConfig.maxSets;

  const [setScores, setSetScores] = useState<{ a: string; b: string }[]>(() => {
    const existing = match.sets.map((s) => ({ a: String(s.scoreA), b: String(s.scoreB) }));
    return [...existing, ...Array.from({ length: maxSets - existing.length }, () => ({ a: '', b: '' }))].slice(
      0,
      maxSets,
    );
  });
  const [saving, setSaving] = useState(false);
  const [teamARoster, setTeamARoster] = useState<CompetitionAthlete[]>([]);
  const [teamBRoster, setTeamBRoster] = useState<CompetitionAthlete[]>([]);
  const [highlightAthleteId, setHighlightAthleteId] = useState<string>(match.highlightAthleteId || '');

  useEffect(() => {
    let active = true;
    getMatchRosters(match.id).then((rosters) => {
      if (active) {
        setTeamARoster(rosters.teamA);
        setTeamBRoster(rosters.teamB);
      }
    });
    return () => {
      active = false;
    };
  }, [match.id]);

  const eligibleTeamA = useMemo(() => {
    if (match.checkedInAthleteIds && match.checkedInAthleteIds.length > 0) {
      return teamARoster.filter((a) => match.checkedInAthleteIds!.includes(a.id));
    }
    return teamARoster;
  }, [teamARoster, match.checkedInAthleteIds]);

  const eligibleTeamB = useMemo(() => {
    if (match.checkedInAthleteIds && match.checkedInAthleteIds.length > 0) {
      return teamBRoster.filter((a) => match.checkedInAthleteIds!.includes(a.id));
    }
    return teamBRoster;
  }, [teamBRoster, match.checkedInAthleteIds]);

  const filledSets = setScores
    .filter((s) => s.a !== '' && s.b !== '')
    .map((s, idx) => ({
      setNumber: idx + 1,
      scoreA: Number(s.a),
      scoreB: Number(s.b),
    }));

  const validation = useMemo(() => {
    if (competition) {
      return CompetitionRulesService.validateMatchScore(
        competition,
        filledSets,
        match.phase,
        match.isWo,
        match.customSetFormat,
      );
    }
    const config = isBeach ? DEFAULT_BEACH_CONFIG : DEFAULT_INDOOR_CONFIG;
    return validateMatchResult(filledSets, { ...config, setFormat: '3-sets' }, match.isWo);
  }, [filledSets, competition, match.phase, match.isWo, match.customSetFormat, isBeach]);

  const handleSave = async () => {
    if (!validation.valid || !validation.winner) {
      toast.error(validation.errors[0] || 'Resultado incompleto ou matematicamente inválido.');
      return;
    }
    const highlightVal = validateMatchHighlight(match, highlightAthleteId, teamARoster, teamBRoster);
    if (!highlightVal.valid) {
      toast.error(highlightVal.error || 'Destaque da partida inválido.');
      return;
    }
    const winnerId = validation.winner === 'A' ? match.teamAId : match.teamBId;
    setSaving(true);
    try {
      await onSaved(filledSets, winnerId, highlightAthleteId || undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">Lançar Placar da Partida</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {match.teamAName} vs {match.teamBName} ({formatSetsToWinLabel(formatConfig.setsToWin)})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="flex items-center gap-3 px-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span className="flex-1 truncate">{match.teamAShortName || match.teamAName}</span>
            <span className="w-14 text-center">SET</span>
            <span className="flex-1 text-right truncate">{match.teamBShortName || match.teamBName}</span>
          </div>

          {setScores.map((set, idx) => (
            <div key={idx} className="flex items-center gap-2.5">
              <Input
                type="number"
                min={0}
                max={50}
                placeholder="--"
                className="flex-1 text-center font-semibold font-mono text-sm h-8 rounded-md bg-zinc-900 border-zinc-800"
                value={set.a}
                onChange={(e) =>
                  setSetScores((prev) => prev.map((s, i) => (i === idx ? { ...s, a: e.target.value } : s)))
                }
              />
              <span className="w-14 text-center text-[10px] font-semibold uppercase tracking-wider bg-zinc-800/80 text-zinc-300 py-1.5 rounded border border-zinc-700/50">
                Set {idx + 1}
              </span>
              <Input
                type="number"
                min={0}
                max={50}
                placeholder="--"
                className="flex-1 text-center font-semibold font-mono text-sm h-8 rounded-md bg-zinc-900 border-zinc-800"
                value={set.b}
                onChange={(e) =>
                  setSetScores((prev) => prev.map((s, i) => (i === idx ? { ...s, b: e.target.value } : s)))
                }
              />
            </div>
          ))}

          {validation.valid ? (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 space-y-0.5">
              <p className="font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Resultado válido: {validation.scoreA} x {validation.scoreB}
              </p>
              <p className="text-[11px]">
                Vencedor confirmado:{' '}
                <strong className="text-emerald-300">
                  {validation.winner === 'A' ? match.teamAName : match.teamBName}
                </strong>
              </p>
            </div>
          ) : filledSets.length > 0 ? (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Validação de Placar:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Seleção do Destaque da Partida (MVP) — Opcional */}
          <div className="pt-2 border-t border-border/80 space-y-1.5" data-testid="highlight-athlete-section">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Destaque da Partida (MVP)
                <span className="text-[10px] font-normal text-muted-foreground">(opcional)</span>
              </label>
            </div>
            {match.isWo ? (
              <p className="text-[11px] text-muted-foreground italic">
                Partidas finalizadas por W.O. não permitem indicação de Destaque da Partida.
              </p>
            ) : (
              <Select
                value={highlightAthleteId || 'none'}
                onValueChange={(val) => setHighlightAthleteId(val === 'none' ? '' : val)}
              >
                <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Selecione o atleta destaque..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-border max-h-56">
                  <SelectItem value="none" className="text-xs text-muted-foreground">
                    Nenhum destaque indicado
                  </SelectItem>
                  {eligibleTeamA.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-[10px] font-bold uppercase text-primary tracking-wider">
                        {match.teamAName}
                      </SelectLabel>
                      {eligibleTeamA.map((ath) => (
                        <SelectItem key={ath.id} value={ath.id} className="text-xs">
                          {ath.jerseyNumber != null ? `#${ath.jerseyNumber} ` : ''}{ath.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {eligibleTeamB.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-[10px] font-bold uppercase text-primary tracking-wider">
                        {match.teamBName}
                      </SelectLabel>
                      {eligibleTeamB.map((ath) => (
                        <SelectItem key={ath.id} value={ath.id} className="text-xs">
                          {ath.jerseyNumber != null ? `#${ath.jerseyNumber} ` : ''}{ath.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={saving || !validation.valid}
            onClick={handleSave}
            className="h-8 text-xs rounded-md font-medium shadow-none"
          >
            {saving ? 'Salvando...' : 'Finalizar Partida'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
