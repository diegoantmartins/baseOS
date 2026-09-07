/**
 * TeamsPage — Gestão Profissional de Equipes e Agremiações do BaseOS
 * Rota: /equipes
 *
 * Responsabilidades:
 * - Listagem tabular de agremiações cadastradas com métricas consolidadas
 * - Cadastro de novas equipes com escudo, credenciais de gestor e geração de senha
 * - Edição de dados cadastrais, comissão técnica e gestão de acesso
 * - Compartilhamento de credenciais e link de auto-inscrição via WhatsApp
 * - Visualização detalhada de elenco, histórico de partidas e competições vinculadas
 * - Exclusão com confirmação segura e tratamento dos 4 estados universais (Loading, Normal, Empty, Error com Retry)
 *
 * Design System:
 * - Enterprise Dark SaaS (Zinc-950/900, Âmbar-500)
 * - Tipografia tabular mono para estatísticas e contagem de atletas
 * - Componentes universais: MainLayout, PageHeader, SectionCard, StatusBadge, DataTable, StateContainer
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Upload,
  MessageCircle,
  Dices,
  KeyRound,
  User,
  Phone,
  Mail,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { StateContainer } from '@/components/ui/StateContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { dataAccess, generateToken } from '@/services/dataAccess';
import { CompetitionRegistrationService } from '@/services/competitionRegistrationService';
import { compressImageToDataUrl } from '@/lib/imageUtils';
import { TeamCreatedShareDialog } from '@/components/registration/TeamCreatedShareDialog';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import { useCapability } from '@/hooks/useCapability';
import type { TeamRecord } from '@/types/entities';

export interface TeamView extends TeamRecord {
  athletes: number;
  matchesPlayed: number;
  wins: number;
  competitions: string[];
}

function generateRandomPassword(): string {
  const words = ['Volei', 'Ace', 'Bloqueio', 'Saque', 'Ponto', 'Quadra'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}@${num}`;
}

export function TeamsPage() {
  const { can } = useCapability();

  // Estados de dados
  const [teams, setTeams] = useState<TeamView[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Estados de filtros
  const [search, setSearch] = useState('');
  const [modalityFilter, setModalityFilter] = useState<'all' | 'indoor' | 'beach'>('all');

  // Estados de modais
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TeamView | null>(null);
  const [viewing, setViewing] = useState<TeamView | null>(null);
  const [deleting, setDeleting] = useState<TeamView | null>(null);
  const [shareTeam, setShareTeam] = useState<TeamRecord | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setIsError(false);
      const [allTeams, matches, competitionTeams, athletes, competitions] = await Promise.all([
        dataAccess.listTeams(),
        dataAccess.listMatches(),
        dataAccess.listCompetitionTeams(),
        dataAccess.listCompetitionAthletes(),
        dataAccess.listCompetitions(),
      ]);

      const compById = new Map(competitions.map((c) => [c.id, c]));
      const ctForTeam = (teamId: string) => competitionTeams.filter((ct) => ct.teamId === teamId);
      const athletesForTeam = (teamId: string) =>
        athletes.filter((a) => ctForTeam(teamId).some((ct) => ct.id === a.competitionTeamId));
      const winsForTeam = (teamId: string) => matches.filter((m) => m.winnerId === teamId).length;
      const playedForTeam = (teamId: string) =>
        matches.filter((m) => m.teamAId === teamId || m.teamBId === teamId).length;

      setTeams(
        allTeams.map((t) => ({
          ...t,
          athletes: athletesForTeam(t.id).length,
          matchesPlayed: playedForTeam(t.id),
          wins: winsForTeam(t.id),
          competitions: ctForTeam(t.id)
            .map((ct) => compById.get(ct.competitionId)?.name ?? ct.competitionId)
            .filter((v, i, arr) => arr.indexOf(v) === i),
        })),
      );
    } catch (err: unknown) {
      setIsError(true);
      setErrorMessage(
        err instanceof Error ? err.message : 'Falha ao carregar as equipes.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Filtragem de equipes
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      if (modalityFilter !== 'all' && team.modality !== modalityFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        const matchesName = team.name.toLowerCase().includes(term);
        const matchesShort = team.shortName.toLowerCase().includes(term);
        const matchesCity = team.city ? team.city.toLowerCase().includes(term) : false;
        const matchesManager = team.managerName ? team.managerName.toLowerCase().includes(term) : false;
        if (!matchesName && !matchesShort && !matchesCity && !matchesManager) return false;
      }
      return true;
    });
  }, [teams, modalityFilter, search]);

  const totalAthletes = useMemo(() => teams.reduce((acc, t) => acc + t.athletes, 0), [teams]);

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
    toast.success('Equipe atualizada com sucesso!');
    setEditing(null);
    await refresh();
  };

  const handleDelete = async (id: string) => {
    const [allMatches, allCt] = await Promise.all([
      dataAccess.listMatches(),
      dataAccess.listCompetitionTeams(),
    ]);
    const check = CompetitionRegistrationService.canDeleteTeam(id, allMatches, allCt);
    if (!check.ok) {
      check.errors.forEach((err) => toast.error(err));
      setDeleting(null);
      return;
    }

    await dataAccess.deleteTeam(id);
    toast.success('Equipe excluída permanentemente.');
    setDeleting(null);
    await refresh();
  };

  // Colunas da DataTable Oficial de Equipes
  const columns: DataTableColumn<TeamView>[] = [
    {
      id: 'team',
      header: 'Equipe / Agremiação',
      cell: ({ row }) => (
        <div className="flex items-center gap-3 min-w-0">
          {row.logoUrl ? (
            <img
              src={row.logoUrl}
              alt={`Escudo ${row.name}`}
              className="w-9 h-9 rounded-lg object-contain bg-zinc-900 p-0.5 border border-zinc-800 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
              {row.shortName}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground truncate">{row.name}</span>
              <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400 font-mono">
                {row.shortName}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {row.city ? `${row.city} · ` : ''}
              {row.coachName ? `Técnico: ${row.coachName}` : 'Sem técnico definido'}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'modality',
      header: 'Modalidade',
      cell: ({ row }) => (
        <StatusBadge
          status={row.modality === 'indoor' ? 'in-progress' : 'registration-open'}
          customLabel={row.modality === 'indoor' ? 'Vôlei de Quadra' : 'Vôlei de Praia'}
          className="text-[10px] h-5"
        />
      ),
    },
    {
      id: 'manager',
      header: 'Responsável / Gestor',
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="font-medium text-foreground truncate">{row.managerName || '—'}</p>
          {row.managerPhone && (
            <p className="text-[11px] text-muted-foreground font-mono tabular-nums flex items-center gap-1">
              <Phone className="w-3 h-3 text-emerald-500" />
              {row.managerPhone}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'athletes',
      header: 'Atletas',
      isNumeric: true,
      cell: ({ row }) => (
        <span className="font-semibold font-mono tabular-nums text-foreground">{row.athletes}</span>
      ),
    },
    {
      id: 'stats',
      header: 'Desempenho',
      isNumeric: true,
      cell: ({ row }) => {
        const winRate = row.matchesPlayed > 0 ? Math.round((row.wins / row.matchesPlayed) * 100) : 0;
        return (
          <div className="text-right">
            <span className="font-semibold font-mono tabular-nums text-foreground">
              {row.wins}V / {row.matchesPlayed}J
            </span>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="text-[10px] text-muted-foreground font-mono tabular-nums">{winRate}%</span>
              <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${winRate}%` }} />
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Ações',
      align: 'right',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-zinc-800 rounded-md"
              aria-label={`Ações para a equipe ${row.name}`}
            >
              <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-xs">
            <DropdownMenuItem
              className="gap-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setShareTeam(row);
              }}
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp / Link
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setViewing(row);
              }}
            >
              <Eye className="w-3.5 h-3.5 text-zinc-400" /> Ver Detalhes
            </DropdownMenuItem>
            {can('team:edit') && (
              <DropdownMenuItem
                className="gap-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(row);
                }}
              >
                <Edit className="w-3.5 h-3.5 text-zinc-400" /> Editar
              </DropdownMenuItem>
            )}
            {can('team:delete') && (
              <DropdownMenuItem
                className="gap-2 text-xs text-rose-400 hover:text-rose-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleting(row);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-3.5">
        {/* ── PageHeader Oficial ── */}
        <PageHeader
          title="Gestão de Equipes"
          description="Controle de agremiações, comissões técnicas, credenciais de acesso e distribuição de links de inscrição."
          primaryAction={
            can('team:create') && (
              <Button
                size="sm"
                className="gap-1.5 text-xs font-semibold shadow-none"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Equipe
              </Button>
            )
          }
          secondaryActions={
            <ContextualHelpButton
              articles={[
                { articleId: 'cadastrar-equipe', label: 'Como cadastrar uma equipe' },
                { articleId: 'cadastrar-atleta', label: 'Como gerenciar o elenco' },
                { articleId: 'definir-capitao-libero', label: 'Definir Capitão e Líberos' },
                { articleId: 'portal-equipes-auto-inscricao', label: 'Link de auto-inscrição para a equipe' },
              ]}
              label="Ajuda em equipes"
            />
          }
        />

        {/* ── Gestão de Estados Universais ── */}
        <StateContainer
          isLoading={loading}
          isError={isError}
          errorTitle="Não foi possível carregar as equipes"
          errorDescription={errorMessage}
          onRetry={refresh}
          isEmpty={teams.length === 0}
          emptyTitle="Nenhuma equipe cadastrada"
          emptyDescription="Cadastre a primeira agremiação esportiva para habilitar a montagem de elencos e inscrições nos torneios."
          emptyAction={
            can('team:create') ? (
              <Button
                size="sm"
                className="gap-1.5 text-xs font-semibold shadow-none"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Primeira Equipe
              </Button>
            ) : undefined
          }
        >
          <div className="space-y-3.5">
            {/* ── Resumo Operacional ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Total de Equipes</span>
                  <Users className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">{teams.length}</p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Vôlei de Quadra</span>
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {teams.filter((t) => t.modality === 'indoor').length}
                </p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Vôlei de Praia</span>
                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                  {teams.filter((t) => t.modality === 'beach').length}
                </p>
              </SectionCard>

              <SectionCard density="dense" className="bg-card/70 border-border/80">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-0.5">
                  <span>Total de Atletas</span>
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <p className="text-xl font-bold font-mono tabular-nums text-foreground">{totalAthletes}</p>
              </SectionCard>
            </div>

            {/* ── Controles & Tabela de Equipes ── */}
            <SectionCard
              title="Agremiações Registradas"
              description="Relação completa de equipes participantes, contatos dos gestores e taxa de vitórias."
              divided
            >
              {/* Barra de Filtros */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2">
                <div className="relative w-full sm:w-80">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                  <Input
                    placeholder="Buscar por nome, sigla, cidade ou gestor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 text-xs pl-8 bg-zinc-900 border-zinc-800"
                  />
                </div>

                <div className="flex items-center gap-1 w-full sm:w-auto">
                  <Button
                    variant={modalityFilter === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs px-2.5 flex-1 sm:flex-initial"
                    onClick={() => setModalityFilter('all')}
                  >
                    Todas ({teams.length})
                  </Button>
                  <Button
                    variant={modalityFilter === 'indoor' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs px-2.5 flex-1 sm:flex-initial"
                    onClick={() => setModalityFilter('indoor')}
                  >
                    Quadra
                  </Button>
                  <Button
                    variant={modalityFilter === 'beach' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs px-2.5 flex-1 sm:flex-initial"
                    onClick={() => setModalityFilter('beach')}
                  >
                    Praia
                  </Button>
                </div>
              </div>

              {/* DataTable Oficial */}
              <DataTable
                data={filteredTeams}
                columns={columns}
                emptyTitle="Nenhuma equipe corresponde aos filtros"
                emptyDescription="Tente alterar o termo de busca ou selecionar outra modalidade."
                onRowClick={(row) => setViewing(row)}
              />
            </SectionCard>
          </div>
        </StateContainer>
      </div>

      {/* ── Modais Auxiliares ── */}
      <TeamFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      <TeamFormDialog
        open={editing !== null}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
        initial={editing ?? undefined}
        onSubmit={(updates) => editing && handleUpdate(editing.id, updates)}
        isEdit
      />

      <TeamDetailsDialog team={viewing} onClose={() => setViewing(null)} />

      <TeamCreatedShareDialog
        team={shareTeam}
        open={shareTeam !== null}
        onOpenChange={(v) => {
          if (!v) setShareTeam(null);
        }}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(v) => {
          if (!v) setDeleting(null);
        }}
      >
        <AlertDialogContent className="bg-zinc-950 border-border p-5 rounded-xl shadow-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold text-foreground">Excluir equipe?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              A equipe <strong>{deleting?.name}</strong> será removida permanentemente do sistema. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              onClick={() => setDeleting(null)}
              className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-8 text-xs rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium"
              onClick={() => deleting && handleDelete(deleting.id)}
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal de Criação / Edição de Equipe
// ─────────────────────────────────────────────────────────────────────────────

interface TeamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: Omit<TeamRecord, 'id'>) => Promise<void>;
  initial?: TeamRecord;
  isEdit?: boolean;
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
          <DialogTitle className="text-sm font-semibold text-foreground">
            {isEdit ? 'Editar Equipe' : 'Cadastrar Nova Equipe'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEdit
              ? 'Atualize os dados cadastrais e credenciais da equipe.'
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
                  onChange={(e) => handleLogoFile(e.target.files?.[0])}
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
              <Label htmlFor="team-name" className="text-[10px] uppercase font-semibold text-muted-foreground">
                Nome da Equipe *
              </Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Sada Cruzeiro Vôlei"
                className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label
                  htmlFor="team-short"
                  className="flex items-center justify-between text-[10px] uppercase font-semibold text-muted-foreground"
                >
                  <span>Sigla (3 Letras) *</span>
                  <span
                    className={`text-[10px] ${shortName.trim().length === 3 ? 'text-emerald-400 font-bold' : 'text-amber-400'}`}
                  >
                    {shortName.trim().length}/3
                  </span>
                </Label>
                <Input
                  id="team-short"
                  value={shortName}
                  onChange={(e) =>
                    setShortName(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, '')
                        .slice(0, 3),
                    )
                  }
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
                <Label htmlFor="team-city" className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Cidade
                </Label>
                <Input
                  id="team-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex.: Belo Horizonte"
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="team-coach" className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Técnico / Treinador
                </Label>
                <Input
                  id="team-coach"
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
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
              <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400">
                WhatsApp e Senha
              </Badge>
            </div>

            <div className="space-y-1">
              <Label htmlFor="manager-name" className="text-[10px] uppercase font-semibold text-muted-foreground">
                Nome do Gestor
              </Label>
              <Input
                id="manager-name"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Ex.: Carlos Alberto Silva"
                className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label
                  htmlFor="manager-phone"
                  className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1"
                >
                  <Phone className="w-3 h-3 text-emerald-400" />
                  WhatsApp
                </Label>
                <Input
                  id="manager-phone"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  placeholder="(31) 98765-4321"
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
                />
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="manager-email"
                  className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1"
                >
                  <Mail className="w-3 h-3 text-zinc-400" />
                  E-mail
                </Label>
                <Input
                  id="manager-email"
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="gestor@equipe.com"
                  className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md"
                />
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="manager-pwd"
                  className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1"
                >
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
                onChange={(e) => setManagerPassword(e.target.value)}
                placeholder="Defina uma senha"
                className="h-8 text-xs bg-zinc-950 border-zinc-800 rounded-md font-mono"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
          >
            Cancelar
          </Button>
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

// ─────────────────────────────────────────────────────────────────────────────
// Modal de Visualização de Detalhes da Equipe
// ─────────────────────────────────────────────────────────────────────────────

function TeamDetailsDialog({ team, onClose }: { team: TeamView | null; onClose: () => void }) {
  const details: Array<{ label: string; value: string }> = team
    ? [
        { label: 'Nome da Equipe', value: team.name },
        { label: 'Sigla Oficial', value: team.shortName },
        { label: 'Modalidade', value: team.modality === 'indoor' ? 'Vôlei de Quadra' : 'Vôlei de Praia' },
        { label: 'Cidade / Estado', value: team.city ? `${team.city}${team.state ? ` - ${team.state}` : ''}` : '—' },
        { label: 'Técnico / Treinador', value: team.coachName ?? '—' },
        { label: 'Gestor / Responsável', value: team.managerName ?? '—' },
        { label: 'WhatsApp / Telefone', value: team.managerPhone ?? '—' },
        { label: 'E-mail / Usuário', value: team.managerEmail ?? '—' },
        { label: 'Senha de Acesso', value: team.managerPassword ?? '—' },
        { label: 'Atletas no Elenco', value: String(team.athletes) },
        { label: 'Partidas Disputadas', value: String(team.matchesPlayed) },
        { label: 'Vitórias', value: String(team.wins) },
      ]
    : [];

  return (
    <Dialog open={team !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Detalhes da Equipe
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-1 text-xs">
          {details.map((d) => (
            <div key={d.label} className="flex items-center justify-between border-b border-border/40 pb-1.5">
              <span className="text-muted-foreground">{d.label}</span>
              <span className="font-medium text-right max-w-[200px] truncate text-foreground">{d.value}</span>
            </div>
          ))}
          {team && team.competitions.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Competições Vinculadas:</span>
              <div className="flex flex-wrap gap-1">
                {team.competitions.map((c, idx) => (
                  <Badge key={idx} variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TeamsPage;