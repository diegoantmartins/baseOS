import React, { useMemo, useState } from 'react';
import { Pencil, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { detectScheduleConflicts } from '@/services/scheduleConflictService';
import type { CompetitionRecord, MatchRecord, TeamRecord, VenueRecord } from '@/types/entities';

export interface ScheduleMatchDialogProps {
  match: MatchRecord;
  competition: CompetitionRecord | null;
  teams: TeamRecord[];
  allMatches: MatchRecord[];
  venues: VenueRecord[];
  onClose: () => void;
  onSaved: (updates: Partial<MatchRecord>) => Promise<void>;
}

export function ScheduleMatchDialog({
  match,
  competition,
  teams,
  allMatches,
  venues,
  onClose,
  onSaved,
}: ScheduleMatchDialogProps) {
  const [teamAId, setTeamAId] = useState(match.teamAId || '');
  const [teamBId, setTeamBId] = useState(match.teamBId || '');
  const [date, setDate] = useState(match.scheduledTime ? match.scheduledTime.split('T')[0] : '');
  const [time, setTime] = useState(
    match.scheduledTime
      ? new Date(match.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '',
  );
  const [venue, setVenue] = useState(match.venue || venues[0]?.name || '');
  const [court, setCourt] = useState(match.court || '');
  const [phase, setPhase] = useState(match.phase || 'classificatória');
  const [matchNumber, setMatchNumber] = useState(String(match.matchNumber || 1));
  const [round, setRound] = useState(String(match.round || 1));
  const [groupName, setGroupName] = useState(match.groupName || '');
  const [saving, setSaving] = useState(false);

  const selectedVenueObj = venues.find((v) => v.name === venue);
  const availableCourts = selectedVenueObj?.courts || [];

  const conflicts = useMemo(() => {
    if (!date || !time || !venue || !court || !competition) return [];
    const isoDateTime = `${date}T${time}:00`;
    return detectScheduleConflicts({
      matchId: match.id,
      scheduledTime: isoDateTime,
      venueName: venue,
      courtName: court,
      teamAId: teamAId || match.teamAId,
      teamBId: teamBId || match.teamBId,
      competition,
      allMatches,
      venues,
    });
  }, [date, time, venue, court, match, teamAId, teamBId, competition, allMatches, venues]);

  const hasBlockingError = conflicts.some((c) => c.severity === 'error');
  const isSameTeam = Boolean(teamAId && teamBId && teamAId === teamBId);

  const handleSave = async () => {
    if (saving || isSameTeam) return;
    setSaving(true);
    try {
      const selectedTeamA = teams.find((t) => t.id === teamAId);
      const selectedTeamB = teams.find((t) => t.id === teamBId);
      const scheduledTime = date && time ? new Date(`${date}T${time}:00`).toISOString() : match.scheduledTime;

      await onSaved({
        teamAId: teamAId || match.teamAId,
        teamBId: teamBId || match.teamBId,
        teamAName: selectedTeamA?.name ?? match.teamAName,
        teamBName: selectedTeamB?.name ?? match.teamBName,
        teamAShortName: selectedTeamA?.shortName ?? match.teamAShortName,
        teamBShortName: selectedTeamB?.shortName ?? match.teamBShortName,
        scheduledTime,
        venue,
        court: court || undefined,
        phase: phase || undefined,
        matchNumber: Number(matchNumber) || match.matchNumber,
        round: Number(round) || match.round,
        groupName: groupName || undefined,
        status:
          court && date && time
            ? match.status === 'awaiting_schedule'
              ? 'scheduled'
              : match.status
            : match.status,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Pencil className="w-4 h-4 text-primary" />
            Editar Confronto e Horários
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Ajuste as equipes sorteadas, fase, data, horário e quadra do Jogo #{match.matchNumber}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800 space-y-2.5">
            <p className="text-[11px] font-semibold text-foreground">Equipes do Confronto (Sorteio / Chaveamento)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Equipe A (Mandante)</Label>
                <Select value={teamAId} onValueChange={setTeamAId}>
                  <SelectTrigger className="text-xs h-8 rounded-md bg-zinc-950 border-zinc-800">
                    <SelectValue placeholder="Selecione a Equipe A" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.name} ({t.shortName || 'TBD'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Equipe B (Visitante)</Label>
                <Select value={teamBId} onValueChange={setTeamBId}>
                  <SelectTrigger className="text-xs h-8 rounded-md bg-zinc-950 border-zinc-800">
                    <SelectValue placeholder="Selecione a Equipe B" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.name} ({t.shortName || 'TBD'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isSameTeam && (
              <p className="text-[11px] text-destructive font-medium">As equipes A e B não podem ser iguais.</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Fase do Torneio</Label>
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger className="text-xs h-8 rounded-md bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="group-stage" className="text-xs">Fase de Grupos</SelectItem>
                  <SelectItem value="oitavas" className="text-xs">Oitavas de Final</SelectItem>
                  <SelectItem value="quartas" className="text-xs">Quartas de Final</SelectItem>
                  <SelectItem value="semifinal" className="text-xs">Semifinais</SelectItem>
                  <SelectItem value="terceiro_lugar" className="text-xs">Disputa 3º Lugar</SelectItem>
                  <SelectItem value="final" className="text-xs">Grande Final</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Nº do Jogo</Label>
              <Input
                type="number"
                value={matchNumber}
                onChange={(e) => setMatchNumber(e.target.value)}
                className="text-xs h-8 rounded-md bg-zinc-900 border-zinc-800 font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Chave / Grupo</Label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: A, B"
                className="text-xs h-8 rounded-md bg-zinc-900 border-zinc-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label htmlFor="sched-date" className="text-[10px] uppercase font-semibold text-muted-foreground">
                Data da Partida
              </Label>
              <Input
                id="sched-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs h-8 rounded-md bg-zinc-900 border-zinc-800 font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sched-time" className="text-[10px] uppercase font-semibold text-muted-foreground">
                Horário de Início
              </Label>
              <Input
                id="sched-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="text-xs h-8 rounded-md bg-zinc-900 border-zinc-800 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Ginásio / Local</Label>
              <Select
                value={venue}
                onValueChange={(v) => {
                  setVenue(v);
                  setCourt('');
                }}
              >
                <SelectTrigger className="text-xs h-8 rounded-md bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {venues.map((v) => (
                    <SelectItem key={v.id} value={v.name} className="text-xs">
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Quadra</Label>
              <Select value={court} onValueChange={setCourt}>
                <SelectTrigger className="text-xs h-8 rounded-md bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Selecione a quadra" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {availableCourts.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                  {availableCourts.length === 0 && (
                    <SelectItem value="Quadra Principal" className="text-xs">
                      Quadra Principal
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {conflicts.map((c, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                    c.severity === 'error'
                      ? 'bg-destructive/10 border-destructive/25 text-red-400'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">
                      {c.severity === 'error' ? 'Conflito Crítico:' : 'Aviso Operacional:'}
                    </span>{' '}
                    {c.message}
                  </div>
                </div>
              ))}
            </div>
          )}
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
            disabled={saving || hasBlockingError || isSameTeam}
            onClick={handleSave}
            className="h-8 text-xs rounded-md font-medium shadow-none"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
