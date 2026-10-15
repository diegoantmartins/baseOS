import React, { useEffect, useMemo, useState } from 'react';
import {
  Trophy,
  Award,
  CheckCircle2,
  Search,
  ShieldCheck,
  X,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { Badge } from '@/components/ui/badge';
import { getMatchRosters } from '@/services/registrationService';
import { validateMatchHighlight } from '@/services/matchValidationService';
import type { CompetitionRecord, MatchRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';

export interface HomologateMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchRecord | null;
  competition?: CompetitionRecord | null;
  onHomologate: (matchId: string, highlightAthleteId?: string) => Promise<void>;
}

export function HomologateMatchDialog({
  open,
  onOpenChange,
  match,
  competition,
  onHomologate,
}: HomologateMatchDialogProps) {
  const [teamARoster, setTeamARoster] = useState<CompetitionAthlete[]>([]);
  const [teamBRoster, setTeamBRoster] = useState<CompetitionAthlete[]>([]);
  const [loadingRosters, setLoadingRosters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializa a seleção com o highlightAthleteId já gravado previamente na partida (se houver)
  useEffect(() => {
    if (match) {
      setSelectedAthleteId(match.highlightAthleteId || '');
      setSearchQuery('');
    }
  }, [match]);

  // Carrega elencos da partida
  useEffect(() => {
    if (!match?.id || !open) return;
    let active = true;
    setLoadingRosters(true);

    getMatchRosters(match.id)
      .then((rosters) => {
        if (active) {
          setTeamARoster(rosters.teamA);
          setTeamBRoster(rosters.teamB);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar elencos para homologação:', err);
      })
      .finally(() => {
        if (active) setLoadingRosters(false);
      });

    return () => {
      active = false;
    };
  }, [match?.id, open]);

  // Filtragem por check-in se aplicável
  const eligibleAthletes = useMemo(() => {
    if (!match) return [];
    let listA = teamARoster;
    let listB = teamBRoster;

    if (match.checkedInAthleteIds && match.checkedInAthleteIds.length > 0) {
      listA = listA.filter((a) => match.checkedInAthleteIds!.includes(a.id));
      listB = listB.filter((a) => match.checkedInAthleteIds!.includes(a.id));
    }

    return [
      ...listA.map((a) => ({
        ...a,
        teamId: match.teamAId,
        teamName: match.teamAName,
        teamShort: match.teamAShortName || match.teamAName,
        side: 'A' as const,
      })),
      ...listB.map((a) => ({
        ...a,
        teamId: match.teamBId,
        teamName: match.teamBName,
        teamShort: match.teamBShortName || match.teamBName,
        side: 'B' as const,
      })),
    ];
  }, [match, teamARoster, teamBRoster]);

  // Atletas filtrados por busca rápida (nome ou número de camisa)
  const filteredAthletes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return eligibleAthletes;

    return eligibleAthletes.filter((a) => {
      const matchName = a.name.toLowerCase().includes(q);
      const matchNumber = a.jerseyNumber != null && String(a.jerseyNumber).includes(q);
      const matchTeam = a.teamName.toLowerCase().includes(q) || a.teamShort.toLowerCase().includes(q);
      return matchName || matchNumber || matchTeam;
    });
  }, [eligibleAthletes, searchQuery]);

  // Atleta selecionado como MVP
  const selectedAthlete = useMemo(() => {
    return eligibleAthletes.find((a) => a.id === selectedAthleteId);
  }, [eligibleAthletes, selectedAthleteId]);

  if (!match) return null;

  const handleConfirm = async () => {
    if (selectedAthleteId && !match.isWo) {
      const val = validateMatchHighlight(match, selectedAthleteId, teamARoster, teamBRoster);
      if (!val.valid) {
        toast.error(val.error || 'Atleta MVP inválido para este confronto.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onHomologate(match.id, selectedAthleteId || undefined);
      toast.success(
        selectedAthlete
          ? `Partida homologada! MVP: ${selectedAthlete.jerseyNumber != null ? `#${selectedAthlete.jerseyNumber} ` : ''}${selectedAthlete.name} (${selectedAthlete.teamShort})`
          : 'Partida homologada oficialmente com sucesso!'
      );
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Falha ao homologar partida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-zinc-950 border-border p-5 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                Homologar Súmula Oficial
                <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                  Jogo #{match.matchNumber}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {match.teamAName} vs {match.teamBName} {competition?.name ? `• ${competition.name}` : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Resumo do Placar Final */}
          <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Resultado da Partida</span>
              <div className="flex items-center gap-2 font-mono font-bold text-sm text-foreground">
                <span className={match.winnerId === match.teamAId ? 'text-amber-400' : 'text-zinc-300'}>
                  {match.teamAShortName || match.teamAName}
                </span>
                <span className="text-zinc-500">
                  {match.sets.filter((s) => s.scoreA > s.scoreB).length} x {match.sets.filter((s) => s.scoreB > s.scoreA).length}
                </span>
                <span className={match.winnerId === match.teamBId ? 'text-amber-400' : 'text-zinc-300'}>
                  {match.teamBShortName || match.teamBName}
                </span>
              </div>
            </div>

            {match.sets && match.sets.length > 0 && (
              <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-400">
                {match.sets.map((s, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/60">
                    {s.scoreA}-{s.scoreB}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Seção de Seleção do MVP */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Melhor da Partida (MVP)</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  (obrigatório para destaque público)
                </span>
              </label>

              {selectedAthlete && (
                <button
                  type="button"
                  onClick={() => setSelectedAthleteId('')}
                  className="text-[11px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Limpar seleção</span>
                </button>
              )}
            </div>

            {match.isWo ? (
              <p className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-muted-foreground italic">
                Partidas encerradas por W.O. não possuem eleição de Destaque da Partida.
              </p>
            ) : (
              <>
                {/* Destaque Ativo Selecionado */}
                {selectedAthlete && (
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between gap-3 text-xs text-amber-300 shadow-sm animate-in fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white flex items-center gap-1.5 truncate">
                          {selectedAthlete.jerseyNumber != null && (
                            <span className="font-mono text-amber-400">[{`#${selectedAthlete.jerseyNumber}`}]</span>
                          )}
                          <span>{selectedAthlete.name}</span>
                          <span className="text-zinc-400 font-normal">({selectedAthlete.teamName})</span>
                        </div>
                        <span className="text-[10px] text-amber-300/80 font-medium">
                          Eleito o Melhor em Quadra pela arbitragem
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-amber-400 bg-amber-400 text-zinc-950 font-bold text-[9px] uppercase px-2 py-0.5 shrink-0">
                      Selecionado
                    </Badge>
                  </div>
                )}

                {/* Campo de Busca Rápida */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar atleta por nome ou número da camisa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs bg-zinc-900 border-zinc-800 rounded-lg placeholder:text-zinc-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Lista de Atletas das Duas Equipes */}
                <div className="max-h-52 overflow-y-auto rounded-xl border border-border/80 bg-zinc-900/40 divide-y divide-border/60">
                  {loadingRosters ? (
                    <p className="p-4 text-center text-xs text-muted-foreground">Carregando atletas dos elencos...</p>
                  ) : filteredAthletes.length === 0 ? (
                    <p className="p-4 text-center text-xs text-muted-foreground">Nenhum atleta encontrado.</p>
                  ) : (
                    filteredAthletes.map((ath) => {
                      const isSelected = selectedAthleteId === ath.id;
                      return (
                        <div
                          key={ath.id}
                          onClick={() => setSelectedAthleteId(ath.id)}
                          className={`p-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-500/15 text-amber-200'
                              : 'hover:bg-zinc-800/50 text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono font-bold text-xs w-7 shrink-0 text-center py-0.5 rounded bg-zinc-800 text-zinc-300">
                              {ath.jerseyNumber != null ? `#${ath.jerseyNumber}` : '—'}
                            </span>
                            <div className="min-w-0">
                              <span className="font-semibold truncate block">
                                {ath.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground truncate block">
                                {ath.teamName} {ath.position ? `• ${ath.position}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {ath.isCaptain && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-500/40 text-amber-400">
                                CAP
                              </Badge>
                            )}
                            {ath.isLibero && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 border-blue-500/40 text-blue-400">
                                LÍB
                              </Badge>
                            )}
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-amber-400" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-9 text-xs rounded-xl border-border hover:bg-zinc-800/60"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="h-9 px-5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Homologando...' : 'Confirmar Homologação'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
