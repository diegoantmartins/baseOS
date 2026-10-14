import { useState, useEffect } from 'react';
import {
  Shield,
  Upload,
  Link as LinkIcon,
  X,
  Save,
  Loader2,
  Trash2,
  Building,
  User,
  MapPin,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { compressImageToDataUrl } from '@/lib/imageUtils';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { dataAccess } from '@/services/dataAccess';
import { TeamService } from '@/services/teamService';
import { useAuth } from '@/components/auth/useAuth';
import { useTeamPortal } from './useTeamPortal';
import type { CompetitionTeam } from '@/types/registration';
import type { TeamRecord } from '@/types/entities';

interface EditTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: CompetitionTeam;
  teamRecord?: TeamRecord | null;
  onSaved: () => Promise<void> | void;
}

export function EditTeamModal({
  open,
  onOpenChange,
  team,
  teamRecord,
  onSaved,
}: EditTeamModalProps) {
  const { session } = useAuth();
  let portalContext: ReturnType<typeof useTeamPortal> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    portalContext = useTeamPortal();
  } catch {
    // Se usado fora do contexto do TeamPortalGuard
    portalContext = null;
  }

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [coachName, setCoachName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName(teamRecord?.name || team.teamName || '');
      setShortName(teamRecord?.shortName || team.teamShortName || '');
      setCoachName(teamRecord?.coachName || '');
      setCity(teamRecord?.city || '');
      setState(teamRecord?.state || '');
      setLogoUrl(teamRecord?.logoUrl || undefined);
      setCustomUrlInput('');
      setShowUrlInput(false);
    }
  }, [open, team, teamRecord]);

  const effectiveTeamId = team.teamId || teamRecord?.id || team.id;

  const handleLogoUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await compressImageToDataUrl(file);
      setLogoUrl(res.dataUrl);
      toast.success('Escudo processado com sucesso!');
    } catch {
      toast.error('Não foi possível processar a imagem do escudo.', {
        description: 'Envie um arquivo PNG, JPG ou WebP válido.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleApplyUrl = () => {
    if (!customUrlInput.trim()) return;
    setLogoUrl(customUrlInput.trim());
    setShowUrlInput(false);
    setCustomUrlInput('');
    toast.success('Link do escudo aplicado!');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanShort = shortName.trim().toUpperCase();

    if (!cleanName || cleanName.length < 2) {
      toast.error('Informe um nome de equipe válido (mínimo 2 caracteres).');
      return;
    }

    if (!cleanShort || cleanShort.length < 2 || cleanShort.length > 4) {
      toast.error('A sigla da equipe deve conter entre 2 e 4 caracteres (ex: UFF).');
      return;
    }

    setSaving(true);
    try {
      const res = await dataAccess.updateTeamProfile({
        teamId: effectiveTeamId,
        competitionTeamId: team.id,
        token: team.accessToken,
        name: cleanName,
        shortName: cleanShort,
        logoUrl: logoUrl || undefined,
        coachName: coachName.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
      });

      if (!res.ok) {
        throw new Error(res.error || 'Falha ao salvar as alterações da equipe.');
      }

      toast.success('Dados e escudo da equipe atualizados com sucesso!');
      await onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar dados da equipe.';
      toast.error(msg);
      // Mantém os dados preenchidos no formulário sem fechar a modal
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!session?.user) {
      toast.error('Operação exige usuário autenticado.');
      return;
    }

    setDuplicating(true);
    try {
      const result = await TeamService.duplicateTeam(
        session.user,
        effectiveTeamId,
        team.competitionId
      );

      if (!result.ok) {
        throw new Error(result.errors?.[0] || 'Falha ao duplicar equipe.');
      }

      toast.success(`Equipe "${result.team?.name}" duplicada com sucesso!`);
      await onSaved();

      // Alterna automaticamente para o contexto da nova equipe duplicada
      if (result.competitionTeam?.id && portalContext?.switchTeam) {
        await portalContext.switchTeam(result.competitionTeam.id);
      }

      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao duplicar equipe.';
      toast.error(msg);
    } finally {
      setDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (!session?.user) {
      toast.error('Operação exige usuário autenticado.');
      return;
    }

    setDeleting(true);
    try {
      const result = await TeamService.deleteTeam(
        session.user,
        effectiveTeamId,
        team.id
      );

      if (!result.ok) {
        throw new Error(result.errors?.[0] || 'Falha ao excluir equipe.');
      }

      toast.success('Equipe excluída com sucesso.');
      setConfirmDeleteOpen(false);
      onOpenChange(false);

      await onSaved();

      // Se houver outras equipes no portal, seleciona a primeira restante
      if (portalContext?.availableTeams && portalContext.switchTeam) {
        const remaining = portalContext.availableTeams.filter(
          (t) => t.competitionTeamId !== team.id && t.teamId !== effectiveTeamId
        );
        if (remaining.length > 0) {
          await portalContext.switchTeam(remaining[0].competitionTeamId);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir equipe.';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[540px] bg-zinc-950 border-zinc-800 text-zinc-100 p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Shield className="w-5 h-5 text-amber-500" />
              Editar Dados da Equipe & Escudo
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Altere o nome oficial, sigla, treinador e o escudo da equipe para visualização no portal e nas súmulas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-1">
            {/* Seção Escudo / Logo */}
            <div className="space-y-2 p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/50">
              <Label className="text-xs uppercase font-semibold text-muted-foreground tracking-wider flex items-center justify-between">
                <span>Logo / Escudo da Equipe</span>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl(undefined)}
                    className="text-[11px] text-red-400 hover:text-red-300 inline-flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remover
                  </button>
                )}
              </Label>

              <div className="flex items-center gap-4">
                <div className="relative group shrink-0">
                  <TeamCrest
                    logoUrl={logoUrl}
                    name={name}
                    shortName={shortName}
                    size="lg"
                    className="w-16 h-16 rounded-xl border border-zinc-700/80 shadow-md"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label
                      htmlFor="team-logo-input"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 text-xs font-medium cursor-pointer text-zinc-200 transition-colors shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>{uploading ? 'Processando...' : 'Enviar Foto / Arquivo'}</span>
                    </label>
                    <input
                      id="team-logo-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="text-xs h-8 text-zinc-400 hover:text-zinc-200"
                    >
                      <LinkIcon className="w-3 h-3 mr-1" />
                      Colar Link URL
                    </Button>
                  </div>

                  {showUrlInput && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <Input
                        type="url"
                        placeholder="https://exemplo.com/escudo.png"
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        className="h-8 text-xs bg-zinc-900 border-zinc-700"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleApplyUrl}
                        disabled={!customUrlInput.trim()}
                        className="h-8 text-xs bg-zinc-800 hover:bg-zinc-700"
                      >
                        Aplicar
                      </Button>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground">
                    Formatos recomendados: PNG transparente ou JPG (quadrado).
                  </p>
                </div>
              </div>
            </div>

            {/* Nome e Sigla */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="team-name" className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-amber-500" />
                  Nome Completo da Equipe *
                </Label>
                <Input
                  id="team-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: UFFS Realeza"
                  required
                  className="bg-zinc-900 border-zinc-800 text-sm h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="team-short" className="text-xs font-semibold text-zinc-200">
                  Sigla *
                </Label>
                <Input
                  id="team-short"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value.toUpperCase())}
                  placeholder="UFF"
                  maxLength={4}
                  required
                  className="bg-zinc-900 border-zinc-800 font-mono text-sm h-10 uppercase text-center font-bold tracking-wider"
                />
              </div>
            </div>

            {/* Treinador e Localização */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="coach-name" className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-500" />
                  Treinador(a) / Técnico(a)
                </Label>
                <Input
                  id="coach-name"
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  placeholder="Nome do treinador responsável"
                  className="bg-zinc-900 border-zinc-800 text-sm h-10"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="city-name" className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    Cidade
                  </Label>
                  <Input
                    id="city-name"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Realeza"
                    className="bg-zinc-900 border-zinc-800 text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="state-name" className="text-xs font-semibold text-zinc-200">
                    UF
                  </Label>
                  <Input
                    id="state-name"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    placeholder="PR"
                    maxLength={2}
                    className="bg-zinc-900 border-zinc-800 text-xs h-9 font-mono uppercase text-center"
                  />
                </div>
              </div>
            </div>

            {/* Gestão do Ciclo de Vida: Duplicar e Excluir (apenas para dirigentes autenticados) */}
            {session?.user && (
              <div className="pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDuplicate}
                    disabled={duplicating || saving || deleting}
                    className="h-8 text-xs font-medium gap-1.5 border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:text-white hover:bg-zinc-800"
                    title="Duplica os dados da equipe para um novo identificador independente"
                  >
                    {duplicating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-blue-400" />
                    )}
                    <span>Duplicar Equipe</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={duplicating || saving || deleting}
                    className="h-8 text-xs font-medium gap-1.5 border-red-900/50 bg-red-950/20 text-red-400 hover:bg-red-950/60 hover:text-red-300"
                    title="Exclui a equipe se não houver partidas ou dependências bloqueantes"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Equipe</span>
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-zinc-800/60">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving || duplicating || deleting}
                className="text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão Segura */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400 text-base">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Excluir Equipe Permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-400 space-y-2">
              <p>
                Deseja realmente excluir a equipe <strong>&quot;{team.teamName}&quot;</strong>?
              </p>
              <p className="text-[11px] text-amber-400/90 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                Atenção: Equipes que já possuam partidas registradas ou atletas no elenco não podem ser excluídas por regras de integridade do histórico esportivo.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={deleting}
              className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-xs"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Excluindo...
                </>
              ) : (
                'Confirmar Exclusão'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
