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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Plus, Trash2, AlertTriangle, CheckCircle, Volleyball } from 'lucide-react';
import { toast } from 'sonner';
import { dataAccess } from '@/services/dataAccess';
import { AuditService } from '@/lib/security';
import { useAuth } from '@/components/auth/AuthContext';
import {
  RefereeAssignmentService,
  STANDARD_REFEREE_ROLES,
} from '@/services/refereeAssignmentService';
import type { MatchRecord, MatchRefereeRecord } from '@/types/entities';

interface RefereeAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchRecord | null;
  allMatches: MatchRecord[];
  onAssignmentSaved?: () => void;
}

export const RefereeAssignmentModal: React.FC<RefereeAssignmentModalProps> = ({
  open,
  onOpenChange,
  match,
  allMatches,
  onAssignmentSaved,
}) => {
  const { session } = useAuth();
  const [referees, setReferees] = useState<MatchRefereeRecord[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (match && open) {
      if (match.referees && match.referees.length > 0) {
        setReferees(match.referees);
      } else {
        // Escala básica padrão sugerida
        setReferees([
          { role: '1º Árbitro', name: '' },
          { role: '2º Árbitro', name: '' },
          { role: 'Apontador', name: '' },
        ]);
      }
    }
  }, [match, open]);

  const handleAddReferee = () => {
    setReferees(prev => [...prev, { role: 'Juiz de Linha 1', name: '' }]);
  };

  const handleRemoveReferee = (index: number) => {
    setReferees(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateReferee = (index: number, field: 'role' | 'name', value: string) => {
    setReferees(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const conflicts = useMemo(() => {
    if (!match) return [];
    return RefereeAssignmentService.detectRefereeConflicts(match, referees, allMatches);
  }, [match, referees, allMatches]);

  const handleSave = async () => {
    if (!match) return;
    setSaving(true);
    try {
      const validReferees = referees.filter(r => r.name.trim().length > 0);
      await dataAccess.updateMatch(match.id, {
        referees: validReferees,
      });

      AuditService.logEvent(
        'Escalação de Arbitragem Atualizada',
        session?.user?.email || 'coordenador',
        'info',
        `Equipe de arbitragem do Jogo #${match.matchNumber} atualizada com ${validReferees.length} oficiais.`
      );

      toast.success('Escala de arbitragem salva com sucesso!');
      onAssignmentSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error('Erro ao salvar escala de arbitragem.');
    } finally {
      setSaving(false);
    }
  };

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <DialogTitle className="text-base sm:text-lg font-bold">
                Escalação de Arbitragem · Jogo #{match.matchNumber}
              </DialogTitle>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {match.teamAShortName} vs {match.teamBShortName}
            </Badge>
          </div>
          <DialogDescription>
            Defina os juízes e apontadores oficiais para a partida e verifique sobreposições de agenda.
          </DialogDescription>
        </DialogHeader>

        {/* Alertas de Conflito de Horário */}
        {conflicts.length > 0 && (
          <div className="space-y-2 py-2">
            {conflicts.map((c, i) => (
              <div key={i} className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{c.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Lista de Árbitros */}
        <div className="space-y-3 py-3">
          {referees.map((ref, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20">
              <div className="w-1/3">
                <Label className="text-[10px] text-muted-foreground font-semibold">Função / Cargo</Label>
                <Select value={ref.role} onValueChange={v => handleUpdateReferee(idx, 'role', v)}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_REFEREE_ROLES.map(role => (
                      <SelectItem key={role} value={role} className="text-xs">
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground font-semibold">Nome Completo do Oficial</Label>
                <Input
                  value={ref.name}
                  onChange={e => handleUpdateReferee(idx, 'name', e.target.value)}
                  placeholder="Nome do árbitro / apontador"
                  className="text-xs h-8"
                />
              </div>

              <div className="pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveReferee(idx)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-xs font-semibold gap-1.5 border-dashed"
            onClick={handleAddReferee}
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Oficial de Arbitragem
          </Button>
        </div>

        <DialogFooter className="border-t pt-3 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="accent" onClick={handleSave} disabled={saving} className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Salvar Escalação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
