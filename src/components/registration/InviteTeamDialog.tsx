// Diálogo para convidar equipe à competição ou editar prazo de uma inscrição.

import { useEffect, useState } from 'react';
import { CalendarClock, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TeamRecord } from '@/types/entities';

const DAY_MS = 24 * 3600 * 1000;

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function defaultDeadlineFromNow(days = 7): string {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

interface InviteTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableTeams: TeamRecord[];
  initialDeadline?: string;
  editingTeamName?: string;
  onConfirm: (deadlineIso: string, teamId?: string) => Promise<{ ok: boolean; errors: string[] }>;
}

export function InviteTeamDialog({
  open,
  onOpenChange,
  availableTeams,
  initialDeadline,
  editingTeamName,
  onConfirm,
}: InviteTeamDialogProps) {
  const [teamId, setTeamId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTeamId(availableTeams[0]?.id ?? '');
      setDeadline(toLocalInputValue(initialDeadline ?? defaultDeadlineFromNow(7)));
    }
  }, [open, availableTeams, initialDeadline]);

  const isEditMode = Boolean(editingTeamName);

  const handleConfirm = async () => {
    if (!deadline) return;
    setSubmitting(true);
    try {
      const result = await onConfirm(new Date(deadline).toISOString(), isEditMode ? undefined : teamId || undefined);
      if (result.ok) onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5" />
            {isEditMode ? 'Editar Prazo de Inscrição' : 'Convidar Equipe'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Reabrir ou prorrogar o prazo de ${editingTeamName}.`
              : 'A equipe recebe um link exclusivo com token de acesso.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isEditMode && (
            <div className="space-y-2">
              <Label>Equipe</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a equipe" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.shortName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Data e Hora Limite *</Label>
            <Input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Após esta data, a equipe não poderá mais editar a lista de atletas.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button type="button" variant="accent" className="gap-2" onClick={handleConfirm} disabled={submitting}>
            <Send className="w-4 h-4" />
            {isEditMode ? 'Salvar Prazo' : 'Gerar Link de Convite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}