/**
 * RegisterTeamInCompetitionDialog — BaseOS
 *
 * Diálogo unificado de cadastro e inscrição de equipe diretamente dentro da competição (Fase 2).
 *
 * Elimina o fluxo fragmentado anterior:
 * 1. Permite reutilizar agremiação existente ou cadastrar nova agremiação.
 * 2. Herda e respeita obrigatoriamente o prazo canônico da competição (defaultDeadline).
 * 3. Valida campos da equipe e do responsável.
 * 4. Protege contra double-click e repetição.
 * 5. Orquestra a criação atômica via registerTeamInCompetition e dispara o modal de sucesso.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  User,
  Phone,
  Mail,
  Upload,
  CalendarClock,
  AlertCircle,
  CheckCircle2,
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { compressImageToDataUrl } from '@/lib/imageUtils';
import {
  registerTeamInCompetition,
  type RegisterTeamInCompetitionResult,
} from '@/services/registrationService';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition: CompetitionRecord;
  availableTeams: TeamRecord[];
  operatorName?: string;
  onSuccess: (result: RegisterTeamInCompetitionResult) => void;
}

export function RegisterTeamInCompetitionDialog({
  open,
  onOpenChange,
  competition,
  availableTeams,
  operatorName,
  onSuccess,
}: Props) {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Campos da Equipe
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [coachName, setCoachName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  // Campos do Responsável
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [managerEmail, setManagerEmail] = useState('');

  // Controle de submissão
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const hasValidDeadline = Boolean(competition.defaultDeadline?.trim());

  useEffect(() => {
    if (open) {
      setMode('new');
      setSelectedTeamId('');
      setName('');
      setShortName('');
      setCity('');
      setState('');
      setCoachName('');
      setLogoUrl(undefined);
      setManagerName('');
      setManagerPhone('');
      setManagerEmail('');
      setFormError(null);
      setSubmitting(false);
    }
  }, [open]);

  // Se o usuário selecionar uma equipe existente para reutilização
  const handleSelectExistingTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    const existing = availableTeams.find((t) => t.id === teamId);
    if (existing) {
      setName(existing.name);
      setShortName(existing.shortName);
      setCity(existing.city || '');
      setState(existing.state || '');
      setCoachName(existing.coachName || '');
      setLogoUrl(existing.logoUrl);
      setManagerName(existing.managerName || '');
      setManagerPhone(existing.managerPhone || '');
      setManagerEmail(existing.managerEmail || '');
    }
  };

  const handleLogoFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImageToDataUrl(file);
      setLogoUrl(compressed.dataUrl);
    } catch {
      toast.error('Não foi possível processar a imagem do escudo.', {
        description: 'Envie um arquivo PNG, JPG, WebP ou SVG válido.',
      });
    } finally {
      setUploading(false);
    }
  };

  const deadlineFormatted = useMemo(() => {
    if (!competition.defaultDeadline) return null;
    return new Date(competition.defaultDeadline).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [competition.defaultDeadline]);

  const canSubmit =
    hasValidDeadline &&
    name.trim().length >= 2 &&
    shortName.trim().length === 3 &&
    managerName.trim().length > 0 &&
    !submitting &&
    !uploading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const result = await registerTeamInCompetition({
        competitionId: competition.id,
        teamId: mode === 'existing' && selectedTeamId ? selectedTeamId : undefined,
        name: name.trim(),
        shortName: shortName.trim().toUpperCase(),
        modality: competition.modality,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        coachName: coachName.trim() || undefined,
        logoUrl,
        managerName: managerName.trim(),
        managerPhone: managerPhone.trim() || undefined,
        managerEmail: managerEmail.trim() || undefined,
        operator: operatorName,
      });

      if (!result.ok) {
        const msg = result.errors[0] || 'Falha ao cadastrar a equipe na competição.';
        setFormError(msg);
        toast.error(msg);
        return;
      }

      toast.success(
        result.isExistingTeamReused
          ? `Equipe "${result.team?.name}" vinculada à competição com sucesso!`
          : `Equipe "${result.team?.name}" cadastrada e inscrita com sucesso!`,
      );
      onOpenChange(false);
      onSuccess(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado durante o cadastro.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Cadastrar Equipe na Competição
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] uppercase font-mono border-zinc-800 bg-zinc-900">
              {competition.modality === 'beach' ? 'Vôlei de Praia' : 'Vôlei de Quadra'}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            A equipe será cadastrada e vinculada imediatamente a <strong>{competition.name}</strong>, com geração de link de acesso.
          </DialogDescription>
        </DialogHeader>

        {/* Alerta de Prazo Obrigatório Ausente (Seção 5) */}
        {!hasValidDeadline && (
          <Alert variant="destructive" className="bg-rose-950/40 border-rose-900 text-xs py-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <AlertTitle className="text-xs font-semibold">Prazo da competição não configurado</AlertTitle>
            <AlertDescription className="text-[11px] text-rose-300">
              Esta competição precisa ter um prazo regulamentar de inscrição definido para aceitar equipes. Configure o prazo nas configurações da competição.
            </AlertDescription>
          </Alert>
        )}

        {formError && (
          <Alert variant="destructive" className="bg-rose-950/40 border-rose-900 text-xs py-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <AlertDescription className="text-[11px] text-rose-300">{formError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          {/* Seletor de Modo: Nova Equipe vs Reutilizar Existente */}
          {availableTeams.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs">
              <Button
                type="button"
                variant={mode === 'new' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs flex-1 rounded-md"
                onClick={() => {
                  setMode('new');
                  setSelectedTeamId('');
                }}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-primary" />
                Cadastrar Nova Equipe
              </Button>
              <Button
                type="button"
                variant={mode === 'existing' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs flex-1 rounded-md"
                onClick={() => {
                  setMode('existing');
                  if (availableTeams[0]) handleSelectExistingTeam(availableTeams[0].id);
                }}
              >
                <Users className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                Reutilizar Equipe Existente ({availableTeams.length})
              </Button>
            </div>
          )}

          {/* Seleção de Equipe Existente */}
          {mode === 'existing' && availableTeams.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                Selecione a Agremiação *
              </Label>
              <Select value={selectedTeamId} onValueChange={handleSelectExistingTeam}>
                <SelectTrigger className="h-8 text-xs bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="Escolha a equipe cadastrada no sistema" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-xs">
                  {availableTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name} ({t.shortName}) {t.city ? `· ${t.city}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 1. Informações da Equipe */}
          <div className="space-y-2.5 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3 h-3 text-primary" />
                1. Dados da Equipe
              </p>
              {deadlineFormatted && (
                <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1 tabular-nums">
                  <CalendarClock className="w-3 h-3" />
                  Prazo: {deadlineFormatted}
                </span>
              )}
            </div>

            {/* Escudo e Nome */}
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Escudo"
                  className="w-11 h-11 rounded-lg object-contain bg-zinc-950 p-0.5 border border-zinc-800 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <Label htmlFor="team-reg-name" className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Nome Oficial da Equipe *
                </Label>
                <Input
                  id="team-reg-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Sada Cruzeiro Vôlei"
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
                  required
                />
              </div>
            </div>

            {/* Sigla, Treinador e Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="space-y-1">
                <Label
                  htmlFor="team-reg-short"
                  className="flex items-center justify-between text-[10px] uppercase font-semibold text-muted-foreground"
                >
                  <span>Sigla (3 Letras) *</span>
                  <span
                    className={`text-[10px] font-mono ${
                      shortName.trim().length === 3 ? 'text-emerald-400 font-bold' : 'text-amber-400'
                    }`}
                  >
                    {shortName.trim().length}/3
                  </span>
                </Label>
                <Input
                  id="team-reg-short"
                  value={shortName}
                  onChange={(e) =>
                    setShortName(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, '')
                        .slice(0, 3),
                    )
                  }
                  placeholder="CRU"
                  maxLength={3}
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md font-mono font-bold tracking-widest text-center uppercase"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="team-reg-coach" className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Técnico / Treinador
                </Label>
                <Input
                  id="team-reg-coach"
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  placeholder="Nome do técnico"
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Escudo da Equipe</Label>
                <Label
                  htmlFor="team-reg-logo"
                  className="flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-md border border-zinc-800 bg-zinc-950 text-xs font-medium cursor-pointer hover:bg-zinc-900 transition-colors text-zinc-300"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? 'Processando...' : logoUrl ? 'Alterar foto' : 'Enviar imagem'}
                </Label>
                <input
                  id="team-reg-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => handleLogoFile(e.target.files?.[0])}
                />
              </div>
            </div>

            {/* Cidade e Estado */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="team-reg-city" className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Cidade
                </Label>
                <Input
                  id="team-reg-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex.: Belo Horizonte"
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="team-reg-state" className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Estado (UF)
                </Label>
                <Input
                  id="team-reg-state"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="MG"
                  maxLength={2}
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md uppercase"
                />
              </div>
            </div>
          </div>

          {/* 2. Responsável e Acesso */}
          <div className="space-y-2.5 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3 h-3 text-primary" />
                2. Responsável da Equipe & Acesso ao Portal
              </p>
              <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400">
                Acesso via Link Único
              </Badge>
            </div>

            <div className="space-y-1">
              <Label htmlFor="team-reg-manager" className="text-[10px] uppercase font-semibold text-muted-foreground">
                Nome do Responsável / Capitão *
              </Label>
              <Input
                id="team-reg-manager"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Ex.: Carlos Alberto"
                className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label
                  htmlFor="team-reg-phone"
                  className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1"
                >
                  <Phone className="w-3 h-3 text-emerald-400" />
                  WhatsApp para Envio do Acesso
                </Label>
                <Input
                  id="team-reg-phone"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  placeholder="(31) 98765-4321"
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
                />
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="team-reg-email"
                  className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1"
                >
                  <Mail className="w-3 h-3 text-zinc-400" />
                  E-mail de Contato
                </Label>
                <Input
                  id="team-reg-email"
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="gestor@equipe.com"
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
                />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5 leading-tight">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              Ao salvar, a inscrição será confirmada e você receberá o link exclusivo para enviar diretamente pelo WhatsApp.
            </p>
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
            <Button
              type="submit"
              size="sm"
              disabled={!canSubmit}
              className="h-8 text-xs rounded-md font-medium shadow-none gap-1.5"
            >
              {submitting ? (
                'Salvando Inscrição...'
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Salvar Equipe e Gerar Acesso
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
