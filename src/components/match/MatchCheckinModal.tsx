import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  UserCheck,
  Volleyball,
  AlertCircle,
  CheckCircle,
  Shield,
  Star,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { dataAccess } from '@/services/dataAccess';
import { getMatchRosters } from '@/services/registrationService';
import { MatchCheckinService } from '@/services/matchCheckinService';
import { AuditService } from '@/lib/security';
import { useAuth } from '@/components/auth/AuthContext';
import type { CompetitionAthlete } from '@/types/registration';
import type { CompetitionRecord, MatchRecord } from '@/types/entities';

interface MatchCheckinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchRecord | null;
  competition: CompetitionRecord | null;
  onCheckinSaved?: () => void;
}

export const MatchCheckinModal: React.FC<MatchCheckinModalProps> = ({
  open,
  onOpenChange,
  match,
  competition,
  onCheckinSaved,
}) => {
  const { session } = useAuth();
  const [teamAAthletes, setTeamAAthletes] = useState<CompetitionAthlete[]>([]);
  const [teamBAthletes, setTeamBAthletes] = useState<CompetitionAthlete[]>([]);
  const [checkedInIds, setCheckedInIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carregar elencos da partida
  useEffect(() => {
    if (match && open) {
      setLoading(true);
      getMatchRosters(match.id)
        .then(rosters => {
          setTeamAAthletes(rosters.teamA);
          setTeamBAthletes(rosters.teamB);

          if (match.checkedInAthleteIds && match.checkedInAthleteIds.length > 0) {
            setCheckedInIds(match.checkedInAthleteIds);
          } else {
            // Por padrão, marcar todos como presentes
            const allIds = [...rosters.teamA.map(a => a.id), ...rosters.teamB.map(a => a.id)];
            setCheckedInIds(allIds);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [match, open]);

  const toggleCheckin = (athleteId: string) => {
    setCheckedInIds(prev =>
      prev.includes(athleteId) ? prev.filter(id => id !== athleteId) : [...prev, athleteId]
    );
  };

  const checkAll = (athletes: CompetitionAthlete[]) => {
    const ids = athletes.map(a => a.id);
    setCheckedInIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const uncheckAll = (athletes: CompetitionAthlete[]) => {
    const ids = new Set(athletes.map(a => a.id));
    setCheckedInIds(prev => prev.filter(id => !ids.has(id)));
  };

  const validation = useMemo(() => {
    return MatchCheckinService.validateMatchCheckin(
      competition,
      teamAAthletes,
      teamBAthletes,
      checkedInIds
    );
  }, [competition, teamAAthletes, teamBAthletes, checkedInIds]);

  const handleSave = async () => {
    if (!match) return;
    setSaving(true);
    try {
      await dataAccess.updateMatch(match.id, {
        checkedInAthleteIds: checkedInIds,
      });

      AuditService.logEvent(
        'Check-in de Partida Realizado',
        session?.user?.email || 'operador',
        'info',
        `Check-in presencial concluído para o Jogo #${match.matchNumber}: ${validation.teamAPresent} atletas do ${match.teamAName} e ${validation.teamBPresent} atletas do ${match.teamBName}.`
      );

      toast.success('Check-in presencial registrado com sucesso!');
      onCheckinSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error('Erro ao salvar check-in da partida.');
    } finally {
      setSaving(false);
    }
  };

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              <DialogTitle className="text-base sm:text-lg font-bold">
                Check-in Presencial · Jogo #{match.matchNumber}
              </DialogTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              Mínimo exigido: {validation.minRequired} atletas por equipe
            </Badge>
          </div>
          <DialogDescription>
            Confirme os atletas presentes em quadra antes do início do aquecimento oficial.
          </DialogDescription>
        </DialogHeader>

        {/* Alertas de Validação */}
        {(!validation.valid || validation.warnings.length > 0) && (
          <div className="space-y-2 py-2">
            {validation.errors.map((err, i) => (
              <div key={i} className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{err}</span>
              </div>
            ))}
            {validation.warnings.map((warn, i) => (
              <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{warn}</span>
              </div>
            ))}
          </div>
        )}

        {/* Listas de Elencos das Duas Equipes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3">
          {/* EQUIPE A */}
          <Card className="border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="font-bold text-sm text-foreground">{match.teamAName}</h3>
                  <span className="text-[11px] text-muted-foreground">
                    Presentes: {validation.teamAPresent} de {teamAAthletes.length}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => checkAll(teamAAthletes)}>
                    Marcar Todos
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-1.5 text-muted-foreground" onClick={() => uncheckAll(teamAAthletes)}>
                    Limpar
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {teamAAthletes.map(athlete => {
                  const isChecked = checkedInIds.includes(athlete.id);
                  return (
                    <div
                      key={athlete.id}
                      onClick={() => toggleCheckin(athlete.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${isChecked ? 'bg-primary/5 border-primary/40' : 'bg-muted/30 border-border opacity-60'}`}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox checked={isChecked} onCheckedChange={() => toggleCheckin(athlete.id)} />
                        <span className="font-mono font-bold text-primary">
                          {athlete.jerseyNumber !== undefined ? `#${athlete.jerseyNumber}` : '#--'}
                        </span>
                        <span className="font-medium text-foreground">{athlete.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {athlete.isCaptain && (
                          <Badge variant="default" className="text-[9px] py-0 bg-amber-600">
                            <Star className="w-2.5 h-2.5 mr-0.5" /> CAP
                          </Badge>
                        )}
                        {athlete.isLibero && (
                          <Badge variant="outline" className="text-[9px] py-0 border-emerald-500 text-emerald-600">
                            LÍBERO
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
                {teamAAthletes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum atleta cadastrado no elenco.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* EQUIPE B */}
          <Card className="border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="font-bold text-sm text-foreground">{match.teamBName}</h3>
                  <span className="text-[11px] text-muted-foreground">
                    Presentes: {validation.teamBPresent} de {teamBAthletes.length}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={() => checkAll(teamBAthletes)}>
                    Marcar Todos
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-1.5 text-muted-foreground" onClick={() => uncheckAll(teamBAthletes)}>
                    Limpar
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {teamBAthletes.map(athlete => {
                  const isChecked = checkedInIds.includes(athlete.id);
                  return (
                    <div
                      key={athlete.id}
                      onClick={() => toggleCheckin(athlete.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${isChecked ? 'bg-primary/5 border-primary/40' : 'bg-muted/30 border-border opacity-60'}`}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox checked={isChecked} onCheckedChange={() => toggleCheckin(athlete.id)} />
                        <span className="font-mono font-bold text-primary">
                          {athlete.jerseyNumber !== undefined ? `#${athlete.jerseyNumber}` : '#--'}
                        </span>
                        <span className="font-medium text-foreground">{athlete.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {athlete.isCaptain && (
                          <Badge variant="default" className="text-[9px] py-0 bg-amber-600">
                            <Star className="w-2.5 h-2.5 mr-0.5" /> CAP
                          </Badge>
                        )}
                        {athlete.isLibero && (
                          <Badge variant="outline" className="text-[9px] py-0 border-emerald-500 text-emerald-600">
                            LÍBERO
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
                {teamBAthletes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum atleta cadastrado no elenco.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="border-t pt-3 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="accent" onClick={handleSave} disabled={saving} className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Salvar Check-in da Partida
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
