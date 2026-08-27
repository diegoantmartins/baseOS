/**
 * CompetitionRegistrationsPage — Gestão de Inscrições da Competição (Painel do Organizador)
 * Rota: /competicoes/:id/inscricoes
 *
 * Responsabilidades:
 * - Listagem tabular de equipes convidadas e inscritas na competição
 * - Convite de novas agremiações com prazo regulamentar
 * - Prorrogação de prazos de inscrição e bloqueio/reabertura de elencos
 * - Cópia e distribuição de links seguros de auto-inscrição
 * - Emissão em lote de súmulas oficiais das partidas em PDF
 * - Integração completa com os componentes universais (MainLayout, BreadcrumbNav, PageHeader, SectionCard, StatusBadge, DataTable, StateContainer)
 *
 * Design System:
 * - Enterprise Dark SaaS (Zinc-950/900, Âmbar-500)
 * - Tipografia mono para prazos e métricas
 * - Tratamento de 4 estados (Loading, Normal, Empty, Error com Retry)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CalendarClock,
  ClipboardCopy,
  ExternalLink,
  FileDown,
  Lock,
  RefreshCw,
  Search,
  Unlock,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MainLayout } from '@/components/layout/MainLayout';
import { BreadcrumbNav } from '@/components/navigation/BreadcrumbNav';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionCard } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { StateContainer } from '@/components/ui/StateContainer';
import { InviteTeamDialog } from '@/components/registration/InviteTeamDialog';
import { defaultDeadlineFromNow } from '@/components/registration/registrationHelpers';
import { downloadMatchSheetsBatchPdf } from '@/lib/pdf/matchSheetPdf';
import { buildMatchSheetData } from '@/lib/pdf/matchSheetDataBuilder';
import { dataAccess } from '@/services/dataAccess';
import { getMatchRosters, isRegistrationLocked } from '@/services/registrationService';
import { GENDER_CATEGORY_LABELS } from '@/types/registration';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';
import { cn } from '@/lib/utils';

export function CompetitionRegistrationsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Estados de dados
  const [competition, setCompetition] = useState<CompetitionRecord | null>(null);
  const [registrations, setRegistrations] = useState<CompetitionTeam[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);

  // Estados de controle e carregamento
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<CompetitionTeam | null>(null);
  const [exporting, setExporting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'submitted' | 'approved' | 'locked'>('all');

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setIsError(false);
      const comp = await dataAccess.getCompetition(id);
      if (!comp) {
        setNotFound(true);
        return;
      }
      setCompetition(comp);
      const [regs, tms] = await Promise.all([
        dataAccess.listCompetitionTeams(id),
        dataAccess.listTeams(),
      ]);
      setRegistrations(regs);
      setTeams(tms);
    } catch (err: unknown) {
      setIsError(true);
      setErrorMessage(
        err instanceof Error ? err.message : 'Falha ao carregar as inscrições da competição.',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const invitedTeamIds = useMemo(() => new Set(registrations.map((r) => r.teamId)), [registrations]);
  const availableTeams = useMemo(() => teams.filter((t) => !invitedTeamIds.has(t.id)), [teams, invitedTeamIds]);

  // Filtragem de inscrições
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      const matchesSearch =
        reg.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.teamShortName.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'pending') return reg.status === 'invited' || reg.status === 'in_progress';
      if (statusFilter === 'submitted') return reg.status === 'submitted';
      if (statusFilter === 'approved') return reg.status === 'approved';
      if (statusFilter === 'locked') return reg.isLocked || new Date(reg.registrationDeadline).getTime() < now;

      return true;
    });
  }, [registrations, searchTerm, statusFilter, now]);

  const copyInviteLink = async (registration: CompetitionTeam) => {
    const url = `${window.location.origin}/equipe/inscricao/${registration.accessToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado com sucesso!', { description: url });
    } catch {
      window.prompt('Copie o link abaixo:', url);
    }
  };

  const handleInvite = async (deadlineIso: string, teamId?: string) => {
    if (!competition || !teamId) return { ok: false, errors: ['Selecione a equipe.'] };
    const team = teams.find((t) => t.id === teamId);
    await dataAccess.createCompetitionTeam({
      competitionId: competition.id,
      teamId,
      teamName: team?.name ?? '',
      teamShortName: team?.shortName ?? '',
      registrationDeadline: deadlineIso,
      isLocked: false,
      status: 'invited',
    });
    toast.success('Equipe convidada com sucesso!', { description: 'Link de inscrição gerado.' });
    setInviteOpen(false);
    await refresh();
    return { ok: true, errors: [] };
  };

  const handleSaveDeadline = async (deadlineIso: string) => {
    if (!editingRegistration) return { ok: false, errors: ['Inscrição não encontrada.'] };
    await dataAccess.updateCompetitionTeam(editingRegistration.id, {
      registrationDeadline: deadlineIso,
      isLocked: false,
    });
    toast.success('Prazo atualizado.', { description: 'Edição de elenco reaberta para a equipe.' });
    setEditingRegistration(null);
    await refresh();
    return { ok: true, errors: [] };
  };

  const handleToggleLock = async (registration: CompetitionTeam) => {
    await dataAccess.updateCompetitionTeam(registration.id, { isLocked: !registration.isLocked });
    toast.success(registration.isLocked ? 'Edição de elenco reaberta.' : 'Edição de elenco bloqueada.');
    await refresh();
  };

  const handleExportAll = async () => {
    if (!competition) return;
    setExporting(true);
    try {
      const matches = await dataAccess.listMatches(competition.id);
      const withRosters = await Promise.all(
        matches.map(async (match) => {
          const rosters = await getMatchRosters(match.id);
          return buildMatchSheetData(match, competition, rosters.teamA, rosters.teamB);
        }),
      );
      if (withRosters.length === 0) {
        toast.error('Nenhuma partida cadastrada nesta competição.');
        return;
      }
      downloadMatchSheetsBatchPdf(withRosters, competition.name);
      toast.success(`Súmulas de ${withRosters.length} partida(s) geradas com sucesso!`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar súmulas em lote.');
    } finally {
      setExporting(false);
    }
  };

  // Colunas da DataTable de Inscrições
  const columns: DataTableColumn<CompetitionTeam>[] = [
    {
      id: 'team',
      header: 'Equipe / Agremiação',
      cell: ({ row }) => (
        <button
          type="button"
          className="text-left group flex items-center gap-2"
          onClick={() => navigate(`/equipe/inscricao/${row.accessToken}`)}
        >
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {row.teamName}
          </span>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-zinc-800 bg-zinc-900 text-zinc-400 font-mono">
            {row.teamShortName}
          </Badge>
          <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ),
    },
    {
      id: 'status',
      header: 'Situação',
      cell: ({ row }) => {
        const expired = new Date(row.registrationDeadline).getTime() < now;
        const locked = isRegistrationLocked(row, new Date(now));
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusBadge status={row.status} className="text-[10px] h-5" />
            {locked && (
              <Badge variant="destructive" className="gap-1 text-[10px] py-0 px-1.5 h-5 font-semibold">
                <Lock className="w-2.5 h-2.5" />
                {expired ? 'Prazo Expirado' : 'Bloqueado'}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'deadline',
      header: 'Prazo Limite',
      cell: ({ row }) => {
        const expired = new Date(row.registrationDeadline).getTime() < now;
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 font-mono tabular-nums text-xs text-muted-foreground',
              expired && 'text-red-400 font-semibold',
            )}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            {new Date(row.registrationDeadline).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Ações',
      align: 'right',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 gap-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-zinc-800"
            onClick={(e) => {
              e.stopPropagation();
              copyInviteLink(row);
            }}
            title="Copiar link de auto-inscrição"
          >
            <ClipboardCopy className="w-3 h-3 text-zinc-400" />
            Link
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 gap-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-zinc-800"
            onClick={(e) => {
              e.stopPropagation();
              setEditingRegistration(row);
            }}
            title="Prorrogar prazo de envio do elenco"
          >
            <RefreshCw className="w-3 h-3 text-zinc-400" />
            Prorrogar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 text-xs px-2 gap-1 rounded-md hover:bg-zinc-800',
              row.isLocked ? 'text-zinc-400 hover:text-foreground' : 'text-amber-500 hover:text-amber-400',
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleLock(row);
            }}
            title={row.isLocked ? 'Reabrir edição de elenco' : 'Bloquear edição de elenco'}
          >
            {row.isLocked ? (
              <>
                <Unlock className="w-3 h-3" />
                Reabrir
              </>
            ) : (
              <>
                <Lock className="w-3 h-3" />
                Bloquear
              </>
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* ── BreadcrumbNav Hierárquico ── */}
        <BreadcrumbNav
          items={[
            { label: 'Competições', href: '/competicoes' },
            { label: competition?.name || 'Competição', href: '/competicoes' },
            { label: 'Inscrições' },
          ]}
        />

        {/* ── PageHeader Oficial ── */}
        <PageHeader
          title="Gestão de Inscrições"
          description={
            competition
              ? `${competition.name} · ${GENDER_CATEGORY_LABELS[competition.genderCategory]} · ${competition.playerFormat}`
              : 'Gerenciamento de equipes, prazos regulamentares e controle de acesso.'
          }
          primaryAction={
            <Button
              size="sm"
              className="gap-1.5 text-xs font-semibold shadow-none"
              onClick={() => setInviteOpen(true)}
              disabled={loading || availableTeams.length === 0}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Convidar Equipe
            </Button>
          }
          secondaryActions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleExportAll}
              disabled={loading || exporting || registrations.length === 0}
            >
              <FileDown className="w-3.5 h-3.5" />
              {exporting ? 'Gerando...' : 'Súmulas em Lote (PDF)'}
            </Button>
          }
        />

        {/* ── Gestão de Estados Universais ── */}
        <StateContainer
          isLoading={loading}
          isError={isError || notFound || !competition}
          errorTitle={notFound ? 'Competição não encontrada' : 'Não foi possível carregar as inscrições'}
          errorDescription={notFound ? 'O campeonato solicitado não existe ou foi removido.' : errorMessage}
          onRetry={notFound ? undefined : refresh}
          isEmpty={registrations.length === 0}
          emptyTitle="Nenhuma equipe convidada"
          emptyDescription="Convide as equipes cadastradas no sistema para participar desta competição e enviar seus elencos."
          emptyAction={
            availableTeams.length > 0 ? (
              <Button
                size="sm"
                className="gap-1.5 text-xs font-semibold shadow-none"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Convidar Primeira Equipe
              </Button>
            ) : undefined
          }
        >
          {competition && (
            <div className="space-y-6">
              {/* ── Resumo Operacional ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <SectionCard density="dense">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Equipes Convidadas</span>
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-foreground">{registrations.length}</p>
                </SectionCard>

                <SectionCard density="dense">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Pendentes / Em Andamento</span>
                    <RefreshCw className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
                    {registrations.filter((r) => r.status === 'invited' || r.status === 'in_progress').length}
                  </p>
                </SectionCard>

                <SectionCard density="dense">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Finalizadas / Aprovadas</span>
                    <Users className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
                    {registrations.filter((r) => r.status === 'submitted' || r.status === 'approved').length}
                  </p>
                </SectionCard>

                <SectionCard density="dense">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Bloqueadas / Expiradas</span>
                    <Lock className="w-4 h-4 text-rose-500" />
                  </div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
                    {
                      registrations.filter(
                        (r) => r.isLocked || new Date(r.registrationDeadline).getTime() < now,
                      ).length
                    }
                  </p>
                </SectionCard>
              </div>

              {/* ── Controles & Tabela de Inscrições ── */}
              <SectionCard
                title="Relação de Inscrições"
                description="Controle de prazos, envio de elencos e links de auto-inscrição para capitães e técnicos."
                divided
              >
                {/* Barra de Filtros */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                    <Input
                      placeholder="Buscar equipe ou sigla..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8 text-xs pl-8 bg-zinc-900 border-zinc-800"
                    />
                  </div>

                  <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
                    <Button
                      variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-xs px-2.5"
                      onClick={() => setStatusFilter('all')}
                    >
                      Todas ({registrations.length})
                    </Button>
                    <Button
                      variant={statusFilter === 'pending' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-xs px-2.5"
                      onClick={() => setStatusFilter('pending')}
                    >
                      Pendentes
                    </Button>
                    <Button
                      variant={statusFilter === 'submitted' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-xs px-2.5"
                      onClick={() => setStatusFilter('submitted')}
                    >
                      Submetidas
                    </Button>
                    <Button
                      variant={statusFilter === 'approved' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-xs px-2.5"
                      onClick={() => setStatusFilter('approved')}
                    >
                      Aprovadas
                    </Button>
                    <Button
                      variant={statusFilter === 'locked' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-xs px-2.5"
                      onClick={() => setStatusFilter('locked')}
                    >
                      Bloqueadas
                    </Button>
                  </div>
                </div>

                {/* DataTable Oficial */}
                <DataTable
                  data={filteredRegistrations}
                  columns={columns}
                  emptyTitle="Nenhuma inscrição corresponde aos filtros"
                  emptyDescription="Tente ajustar o termo de busca ou o filtro de situação para visualizar as equipes."
                  onRowClick={(row) => navigate(`/equipe/inscricao/${row.accessToken}`)}
                />
              </SectionCard>

              {/* Informação Operacional */}
              <p className="text-xs text-muted-foreground">
                <Link to="/jogos" className="text-primary hover:underline font-medium">
                  Ir para a Central de Jogos
                </Link>{' '}
                · O link de auto-inscrição permite que a agremiação cadastre atletas e comissão técnica sem necessidade de login.
              </p>
            </div>
          )}
        </StateContainer>
      </div>

      {/* ── Diálogos de Convite e Prorrogação ── */}
      {competition && (
        <InviteTeamDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          availableTeams={availableTeams}
          initialDeadline={competition.defaultDeadline ?? defaultDeadlineFromNow(7)}
          onConfirm={handleInvite}
        />
      )}

      <InviteTeamDialog
        open={Boolean(editingRegistration)}
        onOpenChange={(open) => {
          if (!open) setEditingRegistration(null);
        }}
        availableTeams={[]}
        initialDeadline={editingRegistration?.registrationDeadline}
        editingTeamName={editingRegistration?.teamName}
        onConfirm={handleSaveDeadline}
      />
    </MainLayout>
  );
}