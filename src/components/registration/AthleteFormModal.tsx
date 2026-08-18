// Modal de cadastro/edição de atleta no elenco da equipe.

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CompetitionAthlete, CompetitionAthleteInput } from '@/types/registration';

export const ATHLETE_POSITIONS = [
  'Levantador(a)',
  'Ponteiro(a)',
  'Oposto(a)',
  'Central',
  'Líbero',
  'Universal',
] as const;

const athleteSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  jerseyNumber: z.coerce.number({ invalid_type_error: 'Informe o número' }).int('Número inteiro').min(1, 'Mínimo 1').max(99, 'Máximo 99'),
  position: z.string().min(1, 'Selecione a posição'),
  documentNumber: z.string().optional(),
  birthDate: z.string().optional(),
  isCaptain: z.boolean(),
  isLibero: z.boolean(),
});

type AthleteFormValues = z.infer<typeof athleteSchema>;

function toFormValues(athlete?: CompetitionAthlete): AthleteFormValues {
  return {
    name: athlete?.name ?? '',
    jerseyNumber: athlete?.jerseyNumber ?? 1,
    position: athlete?.position ?? '',
    documentNumber: athlete?.documentNumber ?? '',
    birthDate: athlete?.birthDate ?? '',
    isCaptain: athlete?.isCaptain ?? false,
    isLibero: athlete?.isLibero ?? false,
  };
}

function toInput(values: AthleteFormValues, gender: 'male' | 'female'): CompetitionAthleteInput {
  return {
    name: values.name.trim(),
    jerseyNumber: values.jerseyNumber,
    position: values.position,
    documentNumber: values.documentNumber?.trim() || undefined,
    birthDate: values.birthDate || undefined,
    isCaptain: values.isCaptain,
    isLibero: values.isLibero,
    gender,
  };
}

interface AthleteFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athlete?: CompetitionAthlete;
  gender?: 'male' | 'female';
  onSubmit: (input: CompetitionAthleteInput) => Promise<{ ok: boolean; errors: string[] }>;
}

export function AthleteFormModal({ open, onOpenChange, athlete, gender = 'female', onSubmit }: AthleteFormModalProps) {
  const form = useForm<AthleteFormValues>({
    resolver: zodResolver(athleteSchema),
    defaultValues: toFormValues(athlete),
  });

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(athlete));
    }
  }, [open, athlete, form]);

  const handleSubmit = async (values: AthleteFormValues) => {
    const result = await onSubmit(toInput(values, gender));
    if (result.ok) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {athlete ? 'Editar Atleta' : 'Adicionar Atleta'}
          </DialogTitle>
          <DialogDescription>
            {athlete
              ? 'Atualize os dados do atleta no elenco inscrito.'
              : 'Preencha os dados do atleta para incluir no elenco da competição.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ath-name">Nome completo *</Label>
            <Input id="ath-name" placeholder="Ex: Maria da Silva" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ath-number">Camisa *</Label>
              <Input id="ath-number" type="number" min={1} max={99} placeholder="Ex: 7" {...form.register('jerseyNumber')} />
              {form.formState.errors.jerseyNumber && (
                <p className="text-sm text-destructive">{form.formState.errors.jerseyNumber.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ath-position">Posição *</Label>
              <Select value={form.watch('position')} onValueChange={v => form.setValue('position', v, { shouldValidate: true })}>
                <SelectTrigger id="ath-position">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {ATHLETE_POSITIONS.map(pos => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.position && (
                <p className="text-sm text-destructive">{form.formState.errors.position.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ath-doc">CPF / Documento</Label>
              <Input id="ath-doc" placeholder="Opcional" {...form.register('documentNumber')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ath-birth">Data de Nascimento</Label>
              <Input id="ath-birth" type="date" {...form.register('birthDate')} />
            </div>
          </div>

          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={form.watch('isCaptain')} onCheckedChange={v => form.setValue('isCaptain', v === true)} />
              Capitão(ã)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={form.watch('isLibero')} onCheckedChange={v => form.setValue('isLibero', v === true)} />
              Líbero
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" variant="accent" className="gap-2">
              <Save className="w-4 h-4" />
              {athlete ? 'Salvar Alterações' : 'Adicionar Atleta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}