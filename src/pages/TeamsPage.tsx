import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Volleyball,
  Waves,
  Edit,
  Trash2,
  Eye,
  Upload,
  Share2,
  MessageCircle,
  Dices,
  KeyRound,
  User,
  Phone,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { dataAccess, generateToken } from '@/services/dataAccess';
import { compressImageToDataUrl } from '@/lib/imageUtils';
import { TeamCreatedShareDialog } from '@/components/registration/TeamCreatedShareDialog';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete } from '@/types/registration';
import { cn } from '@/lib/utils';

interface TeamView extends TeamRecord {
  athletes: number;
  matchesPlayed: number;
  wins: number;
  competitions: string[];
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const TeamsPage = () => {
  const [teams, setTeams] = useState<TeamView[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalityFilter, setModalityFilter] = useState<'all' | 'indoor' | 'beach'>('all');

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TeamView | null>(null);
  const [viewing, setViewing] = useState<TeamView | null>(null);
  const [deleting, setDeleting] = useState<TeamView | null>(null);
  const [shareTeam, setShareTeam] = useState<TeamRecord | null>(null);

  const refresh = useCallback(async () => {
    const [teams, matches, competitionTeams, athletes, competitions] = await Promise.all([
      dataAccess.listTeams(),
      dataAccess.listMatches(),
      dataAccess.listCompetitionTeams(),
      dataAccess.listCompetitionAthletes(),
      dataAccess.listCompetitions(),
    ]);
    const teamById = new Map(teams.map(t => [t.id, t]));
    const compById = new Map(competitions.map(c => [c.id, c]));
    const ctForTeam = (teamId: string) => competitionTeams.filter(ct => ct.teamId === teamId);
    const athletesForTeam = (teamId: string) => athletes.filter(a => ctForTeam(teamId).some(ct => ct.id === a.competitionTeamId));
    const winsForTeam = (teamId: string) => matches.filter(m => m.winnerId === teamId).length;
    const playedForTeam = (teamId: string) => matches.filter(m => m.teamAId === teamId || m.teamBId === teamId).length;
    setTeams(
      teams.map(t => ({
        ...t,
        athletes: athletesForTeam(t.id).length,
        matchesPlayed: playedForTeam(t.id),
        wins: winsForTeam(t.id),
        competitions: ctForTeam(t.id)
          .map(ct => compById.get(ct.competitionId)?.name ?? ct.competitionId)
          .filter((v, i, arr) => arr.indexOf(v) === i),
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredTeams = teams.filter(team => {
    if (modalityFilter !== 'all' && team.modality !== modalityFilter) return false;
    if (search && !team.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalAthletes = teams.reduce((acc, t) => acc + t.athletes, 0);

  const handleCreate = async (input: Omit<TeamRecord, 'id'>) => {
    const token = input.registrationToken || generateToken();
    const created = await dataAccess.createTeam({ ...input, registrationToken: token });

    if (input.managerName?.trim()) {
      try {
        await dataAccess.createPerson({
          fullName: input.managerName.trim(),
          roles: ['manager'],
          teamIds: [created.id],
          email: input.managerEmail?.trim(),
          phone: input.managerPhone?.trim(),
        });
      } catch (err) {
        console.warn('Sync manager note:', err);
      }
    }

    toast.success(`Equipe "${input.name}" criada com sucesso!`);
    setCreateOpen(false);
    await refresh();
    setShareTeam(created);
  };

  const handleUpdate = async (id: string, updates: Partial<TeamRecord>) => {
    await dataAccess.updateTeam(id, updates);
    toast.success('Equipe atualizada!');
    setEditing(null);
    await refresh();
  };

  const handleDelete = async (id: string) => {
    await dataAccess.deleteTeam(id);
    toast.success('Equipe excluída.');
    setDeleting(null);
    await refresh();
  };

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Equipes</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Gerencie equipes e seus atletas</p>
          </div>
          <div className="flex items-center gap-2">
            <ContextualHelpButton
              articles={[
                { articleId: 'cadastrar-equipe', label: 'Como cadastrar uma equipe' },
                { articleId: 'cadastrar-atleta', label: 'Como gerenciar o elenco' },
                { articleId: 'definir-capitao-libero', label: 'Definir Capitão e Líberos' },
                { articleId: 'portal-equipes-auto-inscricao', label: 'Link de auto-inscrição para a equipe' },
              ]}
              label="Ajuda em equipes"
            />
            <Button size="sm" className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none" onClick={() => setCreateOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              Nova Equipe
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="card-elevated shadow-none">
            <CardContent className="p-3.5">
              <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Total de Equipes</span>
              <p className="text-xl font-semibold tabular-nums text-foreground mt-1">{teams.length}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated shadow-none">
            <CardContent className="p-3.5">
              <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Vôlei de Quadra</span>
              <p className="text-xl font-semibold tabular-nums text-foreground mt-1">{teams.filter(t => t.modality === 'indoor').length}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated shadow-none">
            <CardContent className="p-3.5">
              <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Vôlei de Praia</span>
              <p className="text-xl font-semibold tabular-nums text-foreground mt-1">{teams.filter(t => t.modality === 'beach').length}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated shadow-none">
            <CardContent className="p-3.5">
              <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Total de Atletas</span>
              <p className="text-xl font-semibold tabular-nums text-foreground mt-1">{totalAthletes}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div variants={item} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome da equipe..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md"
            />
          </div>
          <Select value={modalityFilter} onValueChange={(v: 'all' | 'indoor' | 'beach') => setModalityFilter(v)}>
            <SelectTrigger className="w-full sm:w-[170px] text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all" className="text-xs">Todas Modalidades</SelectItem>
              <SelectItem value="indoor" className="text-xs">Vôlei de Quadra</SelectItem>
              <SelectItem value="beach" className="text-xs">Vôlei de Praia</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Teams Grid */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="card-elevated shadow-none animate-pulse">
                <CardContent className="p-4">
                  <div className="w-10 h-10 bg-zinc-800 rounded-lg mb-3" />
                  <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2 mb-3" />
                  <div className="space-y-1.5">
                    <div className="h-2.5 bg-zinc-800 rounded" />
                    <div className="h-2.5 bg-zinc-800 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              {filteredTeams.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  onView={() => setViewing(team)}
                  onEdit={() => setEditing(team)}
                  onShare={() => setShareTeam(team)}
                  onDelete={() => setDeleting(team)}
                />
              ))}
              {filteredTeams.length === 0 && (
                <Card className="card-elevated shadow-none md:col-span-2 lg:col-span-3">
                  <CardContent className="p-10 text-center text-xs text-muted-foreground">
                    Nenhuma equipe encontrada.
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </motion.div>
      </motion.div>

      <TeamFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
      <TeamFormDialog
        open={editing !== null}
        onOpenChange={v => { if (!v) setEditing(null); }}
        initial={editing ?? undefined}
        onSubmit={(updates) => editing && handleUpdate(editing.id, updates)}
        isEdit
      />
      <TeamDetailsDialog team={viewing} onClose={() => setViewing(null)} />
      <TeamCreatedShareDialog
        team={shareTeam}
        open={shareTeam !== null}
        onOpenChange={v => { if (!v) setShareTeam(null); }}
      />
      <AlertDialog open={deleting !== null} onOpenChange={v => { if (!v) setDeleting(null); }}>
        <AlertDialogContent className="bg-zinc-950 border-border p-5 rounded-xl shadow-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-foreground">Excluir equipe?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              A equipe <strong>{deleting?.name}</strong> será removida permanentemente. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => setDeleting(null)} className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="h-8 text-xs rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium" onClick={() => deleting && handleDelete(deleting.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

function TeamCard({
  team,
  onView,
  onEdit,
  onShare,
  onDelete,
}: {
  team: TeamView;
  onView: () => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const winRate = team.matchesPlayed > 0 ? Math.round((team.wins / team.matchesPlayed) * 100) : 0;

  return (
    <Card className="card-elevated hover-raise group shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={`Escudo ${team.name}`}
                className="w-10 h-10 rounded-lg object-contain bg-zinc-950 p-1 border border-zinc-800 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-300 flex items-center justify-center font-semibold text-xs shrink-0">
                {team.shortName}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">{team.name}</h3>
              <p className="text-[11px] text-muted-foreground truncate">
                {team.city ? `${team.city} · ` : ''}{team.modality === 'indoor' ? 'Vôlei de Quadra' : 'Vôlei de Praia'}
              </p>
              {team.managerName && (
                <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                  <User className="w-3 h-3 text-zinc-500" />
                  {team.managerName}
                </p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-800 rounded-md">
                <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-xs">
              <DropdownMenuItem className="gap-2 text-xs" onClick={onShare}>
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs" onClick={onView}>
                <Eye className="w-3.5 h-3.5" /> Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs" onClick={onEdit}>
                <Edit className="w-3.5 h-3.5" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs text-red-400 hover:text-red-300" onClick={onDelete}>
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[11px]">Técnico</span>
            <span className="font-medium text-foreground truncate max-w-[150px]">{team.coachName ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[11px]">Atletas</span>
            <span className="font-medium tabular-nums text-foreground">{team.athletes}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[11px]">Vitórias</span>
            <span className="font-medium tabular-nums text-foreground">{team.wins}/{team.matchesPlayed}</span>
          </div>

          {/* Win Rate — indicador linear fino (2px), neutro */}
          <div className="pt-1.5">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-muted-foreground uppercase font-semibold">Taxa de Vitória</span>
              <span className="font-medium tabular-nums text-foreground">{winRate}%</span>
            </div>
            <div className="h-0.5 bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-150"
                style={{ width: `${winRate}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TeamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: Omit<TeamRecord, 'id'>) => Promise<void>;
  initial?: TeamRecord;
  isEdit?: boolean;
}

function generateRandomPassword(): string {
  const words = ['Volei', 'Ace', 'Bloqueio', 'Saque', 'Ponto', 'Quadra'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}@${num}`;
}

function TeamFormDialog({ open, onOpenChange, onSubmit, initial, isEdit }: TeamFormDialogProps) {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [modality, setModality] = useState<'indoor' | 'beach'>('indoor');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [coachName, setCoachName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setShortName(initial?.shortName ?? '');
      setModality(initial?.modality ?? 'indoor');
      setCity(initial?.city ?? '');
      setState(initial?.state ?? '');
      setCoachName(initial?.coachName ?? '');
      setManagerName(initial?.managerName ?? '');
      setManagerPhone(initial?.managerPhone ?? '');
      setManagerEmail(initial?.managerEmail ?? '');
      setManagerPassword(initial?.managerPassword || (isEdit ? '' : generateRandomPassword()));
      setLogoUrl(initial?.logoUrl);
    }
  }, [open, initial, isEdit]);

  const canSubmit = name.trim().length >= 2 && shortName.trim().length === 3;

  const handleLogoFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImageToDataUrl(file);
      setLogoUrl(compressed.dataUrl);
    } catch {
      toast.error('Não foi possível processar a imagem.', {
        description: 'Envie um arquivo PNG, JPG ou SVG válido.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleGeneratePassword = () => {
    const pwd = generateRandomPassword();
    setManagerPassword(pwd);
    toast.success('Nova senha gerada!');
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        shortName: shortName.trim().toUpperCase(),
        modality,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        coachName: coachName.trim() || undefined,
        managerName: managerName.trim() || undefined,
        managerPhone: managerPhone.trim() || undefined,
        managerEmail: managerEmail.trim() || undefined,
        managerPassword: managerPassword.trim() || generateRandomPassword(),
        registrationToken: initial?.registrationToken || generateToken(),
        logoUrl,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-5 bg-zinc-950 border-border rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">{isEdit ? 'Editar Equipe' : 'Cadastrar Nova Equipe'}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEdit
              ? 'Atualize os dados e credenciais da equipe.'
              : 'Cadastre a equipe, o responsável e gere o link de acesso para envio no WhatsApp.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5 py-1">
          {/* Logo/Escudo */}
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Logo / Escudo da Equipe</Label>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Pré-visualização do escudo"
                  className="w-12 h-12 rounded-lg object-contain bg-zinc-900 p-1 border border-zinc-800"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Users className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor="team-logo"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-xs font-medium cursor-pointer hover:bg-zinc-800 transition-colors text-zinc-300"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? 'Processando...' : 'Enviar imagem'}
                </Label>
                <input
                  id="team-logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  disabled={uploading}
                  onChange={e => handleLogoFile(e.target.files?.[0])}
                />
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl(undefined)}
                    className="block text-[11px] text-red-400 hover:underline"
                  >
                    Remover escudo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Dados Principais */}
          <div className="space-y-2.5 p-3 rounded-lg border border-zinc-800 bg-zinc-900/60">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">1. Informações da Equipe</p>

            <div className="space-y-1">
              <Label htmlFor="team-name" className="text-[10px] uppercase font-semibold text-muted-foreground">Nome da Equipe *</Label>
              <Input
                id="team-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex.: Sada Cruzeiro Vôlei"
                className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="team-short" className="flex items-center justify-between text-[10px] uppercase font-semibold text-muted-foreground">
                  <span>Sigla (3 Letras) *</span>
                  <span className={`text-[10px] ${shortName.trim().length === 3 ? 'text-emerald-400 font-bold' : 'text-amber-400'}`}>
                    {shortName.trim().length}/3
                  </span>
                </Label>
                <Input
                  id="team-short"
                  value={shortName}
                  onChange={e => setShortName(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3))}
                  placeholder="Ex.: CRU"
                  maxLength={3}
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md font-mono font-bold tracking-widest text-center uppercase"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Modalidade</Label>
                <Select value={modality} onValueChange={(v: 'indoor' | 'beach') => setModality(v)}>
                  <SelectTrigger className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="indoor" className="text-xs">Vôlei de Quadra</SelectItem>
                    <SelectItem value="beach" className="text-xs">Vôlei de Praia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="team-city" className="text-[10px] uppercase font-semibold text-muted-foreground">Cidade</Label>
                <Input
                  id="team-city"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Ex.: Belo Horizonte"
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="team-coach" className="text-[10px] uppercase font-semibold text-muted-foreground">Técnico / Treinador</Label>
                <Input
                  id="team-coach"
                  value={coachName}
                  onChange={e => setCoachName(e.target.value)}
                  placeholder="Nome do técnico"
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Gestor e Acesso */}
          <div className="space-y-2.5 p-3 rounded-lg border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3 h-3 text-zinc-400" />
                2. Gestor / Responsável e Acesso
              </p>
              <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400">WhatsApp e Senha</Badge>
            </div>

            <div className="space-y-1">
              <Label htmlFor="manager-name" className="text-[10px] uppercase font-semibold text-muted-foreground">Nome do Gestor</Label>
              <Input
                id="manager-name"
                value={managerName}
                onChange={e => setManagerName(e.target.value)}
                placeholder="Ex.: Carlos Alberto Silva"
                className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="manager-phone" className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  WhatsApp
                </Label>
                <Input
                  id="manager-phone"
                  value={managerPhone}
                  onChange={e => setManagerPhone(e.target.value)}
                  placeholder="(31) 98765-4321"
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="manager-email" className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3 text-zinc-400" />
                  E-mail
                </Label>
                <Input
                  id="manager-email"
                  type="email"
                  value={managerEmail}
                  onChange={e => setManagerEmail(e.target.value)}
                  placeholder="gestor@equipe.com"
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
                />
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="manager-pwd" className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-zinc-400" />
                  Senha do Gestor
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGeneratePassword}
                  className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground px-1.5"
                >
                  <Dices className="w-3 h-3" />
                  Gerar Senha
                </Button>
              </div>
              <Input
                id="manager-pwd"
                value={managerPassword}
                onChange={e => setManagerPassword(e.target.value)}
                placeholder="Defina uma senha"
                className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md font-mono"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">Cancelar</Button>
          <Button
            size="sm"
            disabled={!canSubmit || submitting || uploading}
            onClick={handleSubmit}
            className="h-8 text-xs rounded-md font-medium shadow-none"
          >
            {submitting ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Equipe e Gerar Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TeamDetailsDialog({ team, onClose }: { team: TeamView | null; onClose: () => void }) {
  const details: Array<{ label: string; value: string }> = team
    ? [
        { label: 'Nome', value: team.name },
        { label: 'Sigla', value: team.shortName },
        { label: 'Modalidade', value: team.modality === 'indoor' ? 'Quadra' : 'Praia' },
        { label: 'Cidade / Estado', value: team.city ? `${team.city}${team.state ? ` - ${team.state}` : ''}` : '—' },
        { label: 'Técnico', value: team.coachName ?? '—' },
        { label: 'Gestor / Responsável', value: team.managerName ?? '—' },
        { label: 'WhatsApp / Telefone', value: team.managerPhone ?? '—' },
        { label: 'E-mail / Usuário', value: team.managerEmail ?? '—' },
        { label: 'Senha de Acesso', value: team.managerPassword ?? '—' },
        { label: 'Atletas inscritos', value: String(team.athletes) },
        { label: 'Partidas', value: String(team.matchesPlayed) },
        { label: 'Vitórias', value: String(team.wins) },
      ]
    : [];

  return (
    <Dialog open={team !== null} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Detalhes da Equipe
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-1 text-xs">
          {details.map(d => (
            <div key={d.label} className="flex items-center justify-between border-b border-border/40 pb-1.5">
              <span className="text-muted-foreground">{d.label}</span>
              <span className="font-medium text-right max-w-[200px] truncate text-foreground">{d.value}</span>
            </div>
          ))}
          {team && team.competitions.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Competições:</span>
              <div className="flex flex-wrap gap-1">
                {team.competitions.map((c, idx) => (
                  <Badge key={idx} variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400">{c}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TeamsPage;