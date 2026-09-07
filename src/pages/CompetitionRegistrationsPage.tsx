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
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Shield,
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
import { RegisterTeamInCompetitionDialog } from '@/components/competition/dialogs/RegisterTeamInCompetitionDialog';
import { TeamRegistrationSuccessModal } from '@/components/registration/TeamRegistrationSuccessModal';
import { defaultDeadlineFromNow } from '@/components/registration/registrationHelpers';
import { downloadMatchSheetsBatchPdf } from '@/lib/pdf/matchSheetPdf';
import { buildMatchSheetData } from '@/lib/pdf/matchSheetDataBuilder';
import { dataAccess } from '@/services/dataAccess';
import { CompetitionRegistrationService } from '@/services/competitionRegistrationService';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { CompetitionDrawEligibilityService, type TeamDrawEligibility } from '@/services/competitionDrawEligibilityService';
import { getMatchRosters, isRegistrationLocked } from '@/services/registrationService';
import { useAuth } from '@/components/auth/useAuth';
import { GENDER_CATEGORY_LABELS } from '@/types/registration';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';
import { cn } from '@/lib/utils';

export function CompetitionRegistrationsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  // Estados de dados
  const [competition, setCompetition] = useState<CompetitionRecord | null>(null);
  const [registrations, setRegistrations] = useState<CompetitionTeam[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [competitionAthletes, setCompetitionAthletes] = useState<CompetitionAthlete[]>([]);

  // Estados de controle e carregamento
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [closingRegistrations, setClosingRegistrations] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<CompetitionTeam | null>(null);
  const [successModalData, setSuccessModalData] = useState<{
    competition: CompetitionRecord;
    team: TeamRecord;
    competitionTeam: CompetitionTeam;
  } | null>(null);
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
      const [regs, tms, athletes] = await Promise.all([
        dataAccess.listCompetitionTeams(id),
        dataAccess.listTeams(),
        typeof dataAccess.listCompetitionAthletes === 'function'
          ? dataAccess.listCompetitionAthletes()
          : Promise.resolve([]),
      ]);
      setRegistrations(regs);
      setTeams(tms);
      setCompetitionAthletes(athletes);
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

  // Avaliação Canônica de Elegibilidade Oficial para Sorteio (Fase 3)
  const eligibilityReport = useMemo(() => {
    if (!competition) return null;
    return CompetitionDrawEligibilityService.evaluateCompetitionDrawEligibility({
      competition,
      competitionTeams: registrations,
      athletes: competitionAthletes,
    });
  }, [competition, registrations, competitionAthletes]);

  const eligibilityMap = useMemo(() => {
    const map = new Map<string, TeamDrawEligibility>();
    if (!eligibilityReport) return map;
    for (const item of eligibilityReport.allEvaluations) {
      map.set(item.competitionTeamId, item);
    }
    return map;
  }, [eligibilityReport]);

  const handleConfirmCloseRegistrations = async () => {
    if (!competition) return;
    setClosingRegistrations(true);
    try {
      const operator = session?.user?.name || session?.user?.email || 'Organizador';
      const result = await CompetitionLifecycleService.closeRegistrations(competition.id, operator);
      if (result.ok) {
        toast.success(`Inscrições da competição "${competition.name}" encerradas com sucesso!`);
        setConfirmCloseOpen(false);
        await refresh();
      } else {
        toast.error('Não foi possível encerrar as inscrições:', {
          description: result.errors.join(' • '),
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao encerrar as inscrições.');
    } finally {
      setClosingRegistrations(false);
    }
  };

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
    const check = CompetitionRegistrationService.canRegisterTeam(competition, teamId, registrations);
    if (!check.ok) {
      check.errors.forEach((e) => toast.error(e));
      return { ok: false, errors: check.errors };
    }
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
        const locked = isRegistrationLocked(row, competition, new Date(now));
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
      id: 'eligibility',
      header: 'Sorteio Oficial',
      cell: ({ row }) => {
        const item = eligibilityMap.get(row.id);
        if (!item) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              {item.eligible ? (
                <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-1.5 h-5 font-semibold">
                  Elegível
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5 h-5 font-semibold">
                  Bloqueada
                </Badge>
              )}
              <span className="text-[11px] font-mono text-muted-foreground">
                {item.athleteCount}/{item.minAthletes} atletas
              </span>
            </div>
            {item.blockers.length > 0 && (
              <span className="text-[10px] text-red-400 truncate max-w-[200px]" title={item.blockers.join(' | ')}>
                {item.blockers[0]}
              </span>
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
      cell: ({ row }) => {
        const matchingTeam = teams.find((t) => t.id === row.teamId);
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 gap-1 rounded-md text-emerald-500 hover:text-emerald-400 hover:bg-zinc-800"
              onClick={(e) => {
                e.stopPropagation();
                if (matchingTeam && competition) {
                  setSuccessModalData({
                    competition,
                    team: matchingTeam,
                    competitionTeam: row,
                  });
                } else {
                  copyInviteLink(row);
                }
              }}
              title="Compartilhar acesso via WhatsApp"
            >
              <MessageCircle className="w-3 h-3 text-emerald-500" />
              WhatsApp
            </Button>
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
        );
      },
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
            <div className="flex items-center gap-2">
              {(competition?.status === 'registration-open' || competition?.status === 'registration') && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold shadow-none"
                  onClick={() => setConfirmCloseOpen(true)}
                  disabled={loading}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Encerrar Inscrições
                </Button>
              )}
              <Button
                size="sm"
                className="gap-1.5 text-xs font-semibold shadow-none"
                onClick={() => setRegisterOpen(true)}
                disabled={loading || (competition ? isRegistrationLocked({} as CompetitionTeam, competition) : false)}
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Equipe
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold shadow-none"
                onClick={() => setInviteOpen(true)}
                disabled={loading || availableTeams.length === 0 || (competition ? isRegistrationLocked({} as CompetitionTeam, competition) : false)}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Convidar Equipe
              </Button>
            </div>
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
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-1.5 text-xs font-semibold shadow-none"
                onClick={() => setRegisterOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Equipe
              </Button>
              {availableTeams.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold shadow-none"
                  onClick={() => setInviteOpen(true)}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Convidar Primeira Equipe
                </Button>
              )}
            </div>
          }
        >
          {competition && (
            <div className="space-y-6">
              {/* ── Resumo Operacional ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <SectionCard density="dense">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Equipes Convidadas</span>
                    <Shield className="w-4 h-4 text-primary" />
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

              {/* ── Painel de Elegibilidade e Encerramento (Fase 3) ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SectionCard density="dense">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Aptas para Sorteio</span>
                    <Users className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
                    {eligibilityReport?.eligibleCount ?? 0}
                  </p>
                </SectionCard>

                <SectionCard density="dense">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Elenco Incompleto / Bloqueadas</span>
                    <Lock className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-amber-400">
                    {eligibilityReport?.blockedCount ?? 0}
                  </p>
                </SectionCard>

                <SectionCard density="dense">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Status das Inscrições</span>
                    <Lock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <Badge
                      variant={competition.status === 'registration-closed' ? 'destructive' : 'default'}
                      className="text-xs font-semibold"
                    >
                      {competition.status === 'registration-closed'
                        ? 'Encerradas'
                        : competition.status === 'registration-open' || competition.status === 'registration'
                        ? 'Abertas'
                        : competition.status}
                    </Badge>
                  </div>
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

      {/* ── Diálogos de Cadastro, Convite e Sucesso ── */}
      {competition && (
        <>
          <RegisterTeamInCompetitionDialog
            open={registerOpen}
            onOpenChange={setRegisterOpen}
            competition={competition}
            availableTeams={availableTeams}
            operatorName={session?.user?.name || 'Organizador'}
            onSuccess={(result) => {
              refresh();
              if (result.team && result.competitionTeam && competition) {
                setSuccessModalData({
                  competition,
                  team: result.team,
                  competitionTeam: result.competitionTeam,
                });
              }
            }}
          />

          <InviteTeamDialog
            open={inviteOpen}
            onOpenChange={setInviteOpen}
            availableTeams={availableTeams}
            initialDeadline={competition.defaultDeadline ?? defaultDeadlineFromNow(7)}
            onConfirm={handleInvite}
          />
        </>
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

      <TeamRegistrationSuccessModal
        open={Boolean(successModalData)}
        onOpenChange={(open) => {
          if (!open) setSuccessModalData(null);
        }}
        competition={successModalData?.competition || null}
        team={successModalData?.team || null}
        competitionTeam={successModalData?.competitionTeam || null}
      />

      {/* ── Diálogo de Confirmação de Encerramento das Inscrições (Fase 3) ── */}
      {confirmCloseOpen && competition && (
        <Dialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
          <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Lock className="w-4 h-4 text-amber-400" />
                Encerrar Inscrições da Competição
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Confirme o fechamento formal do período de inscrição para {competition.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de Equipes Inscritas:</span>
                  <span className="font-semibold font-mono">{eligibilityReport?.totalTeams ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-400">Equipes Elegíveis para Sorteio:</span>
                  <span className="font-semibold font-mono text-emerald-400">{eligibilityReport?.eligibleCount ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-400">Equipes com Elenco Incompleto / Bloqueadas:</span>
                  <span className="font-semibold font-mono text-amber-400">{eligibilityReport?.blockedCount ?? 0}</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Após o encerramento, o portal da equipe não permitirá mais alterações de elenco. As equipes com elenco incompleto continuarão registradas para histórico, porém não participarão do sorteio até eventual reabertura.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" size="sm" onClick={() => setConfirmCloseOpen(false)} disabled={closingRegistrations}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 font-semibold"
                onClick={handleConfirmCloseRegistrations}
                disabled={closingRegistrations}
              >
                <Lock className="w-3.5 h-3.5" />
                {closingRegistrations ? 'Encerrando...' : 'Confirmar Fechamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  );
}