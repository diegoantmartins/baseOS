/**
 * Dashboard — Painel Geral e Visão Operacional do BaseOS
 *
 * Responsabilidades:
 * - Visão geral de métricas esportivas reais calculadas via dataAccess
 * - Alertas operacionais automáticos (sorteios pendentes, jogos sem quadra, súmulas pendentes de homologação)
 * - Tabela de partidas recentes/do dia usando DataTable e StatusBadge
 * - Lista de competições ativas com progresso de partidas
 * - Integração completa com os componentes universais (PageHeader, Section, SectionCard, DataTable, StatusBadge, StateContainer)
 *
 * Design System:
 * - Enterprise Dark SaaS (Zinc-950/900, Âmbar-500)
 * - Números tabulares esportivos (tabular-nums font-mono)
 * - Cobertura de 4 estados (Loading via Skeleton, Normal, Empty, Error com Retry)
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Trophy,
  Users,
  Calendar,
  Volleyball,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Plus,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section, SectionCard } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { StateContainer } from '@/components/ui/StateContainer';
import { Skeleton } from '@/components/ui/skeleton';
import { dataAccess } from '@/services/dataAccess';
import { buildCompetitionUrl, buildMatchesUrl } from '@/services/competitionNavigationHelper';
import type { CompetitionRecord, MatchRecord, TeamRecord, VenueRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';
import type { DrawRecord } from '@/types/draw';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de Alerta Operacional
// ─────────────────────────────────────────────────────────────────────────────

interface AlertItem {
  id: string;
  type: 'warning' | 'info' | 'danger';
  title: string;
  description: string;
  linkText: string;
  linkTo: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton dedicado do Dashboard para evitar CLS
// ─────────────────────────────────────────────────────────────────────────────

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Carregando painel geral...">
      {/* Skeleton de KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-6 w-12 rounded" />
              <Skeleton className="h-2.5 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Skeleton das Seções Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-6 w-48 rounded" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal do Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Dados reais carregados do dataAccess
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([]);
  const [competitionAthletes, setCompetitionAthletes] = useState<CompetitionAthlete[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [, setVenues] = useState<VenueRecord[]>([]);
  const [draws, setDraws] = useState<DrawRecord[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setIsError(false);
      const [comps, tms, cts, aths, ms, vns, drws] = await Promise.all([
        dataAccess.listCompetitions(),
        dataAccess.listTeams(),
        dataAccess.listCompetitionTeams(),
        dataAccess.listCompetitionAthletes(),
        dataAccess.listMatches(),
        dataAccess.listVenues(),
        dataAccess.listDraws(),
      ]);
      setCompetitions(comps);
      setTeams(tms);
      setCompetitionTeams(cts);
      setCompetitionAthletes(aths);
      setMatches(ms);
      setVenues(vns);
      setDraws(drws);
    } catch (err: unknown) {
      setIsError(true);
      setErrorMessage(
        err instanceof Error ? err.message : 'Falha ao conectar com o banco de dados local/remoto.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ───────────────────────────────────────────────────────────────────────────
  // Cálculo de Alertas Operacionais Reais
  // ───────────────────────────────────────────────────────────────────────────
  const alerts: AlertItem[] = [];

  // 1. Sorteio pendente
  for (const comp of competitions) {
    if (comp.status !== 'completed' && comp.status !== 'cancelled') {
      const compDraw = draws.find((d) => d.competitionId === comp.id);
      const registered = competitionTeams.filter(
        (ct) => ct.competitionId === comp.id && ct.status !== 'rejected',
      );
      if (!compDraw && registered.length >= 2) {
        alerts.push({
          id: `draw-${comp.id}`,
          type: 'warning',
          title: `Sorteio pendente: ${comp.name}`,
          description: `Há ${registered.length} equipes confirmadas prontas para o sorteio de grupos e chaves.`,
          linkText: 'Realizar Sorteio',
          linkTo: `/sorteio/${comp.id}`,
        });
      }
    }
  }

  // 2. Jogos sem horário / sem quadra
  const matchesWithoutSchedule = matches.filter(
    (m) => m.status === 'awaiting_schedule' || (!m.court && m.status === 'scheduled'),
  );
  if (matchesWithoutSchedule.length > 0) {
    alerts.push({
      id: 'matches-unscheduled',
      type: 'warning',
      title: `${matchesWithoutSchedule.length} confronto(s) aguardando agendamento`,
      description: 'Defina data, horário e quadra para liberar a emissão das súmulas oficiais.',
      linkText: 'Ir para Jogos',
      linkTo: '/jogos',
    });
  }

  // 3. Resultados pendentes de homologação
  const pendingHomologation = matches.filter((m) => m.status === 'completed' && !m.homologatedAt);
  if (pendingHomologation.length > 0) {
    alerts.push({
      id: 'pending-homologation',
      type: 'info',
      title: `${pendingHomologation.length} resultado(s) pendente(s) de homologação`,
      description: 'Revise os placares lançados pelos apontadores para oficializar a classificação geral.',
      linkText: 'Homologar Resultados',
      linkTo: '/jogos',
    });
  }

  // 4. Equipes sem atletas cadastrados
  const teamsWithoutAthletes = competitionTeams.filter((ct) => {
    const athCount = competitionAthletes.filter((a) => a.competitionTeamId === ct.id).length;
    return athCount === 0 && ct.status !== 'rejected';
  });
  if (teamsWithoutAthletes.length > 0) {
    const targetCompId = teamsWithoutAthletes[0].competitionId;
    alerts.push({
      id: 'teams-no-athletes',
      type: 'warning',
      title: `${teamsWithoutAthletes.length} equipe(s) sem elenco enviado`,
      description: 'Verifique os prazos de envio de elenco para validação das inscrições.',
      linkText: 'Ver Inscrições',
      linkTo: targetCompId ? buildCompetitionUrl(targetCompId, 'teams') : '/competicoes',
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Estatísticas e KPIs Operacionais Reais
  // ───────────────────────────────────────────────────────────────────────────
  const activeCompsCount = competitions.filter(
    (c) => c.status !== 'completed' && c.status !== 'cancelled',
  ).length;
  const completedMatchesCount = matches.filter(
    (m) => m.status === 'completed' || m.status === 'homologated',
  ).length;
  const scheduledMatchesCount = matches.filter((m) => m.status === 'scheduled').length;
  const totalAthletesCount = competitionAthletes.length;

  const stats = [
    {
      label: 'Competições Ativas',
      value: activeCompsCount.toString(),
      subtext: `${competitions.length} cadastradas no total`,
      icon: Trophy,
    },
    {
      label: 'Equipes Cadastradas',
      value: teams.length.toString(),
      subtext: `${competitionTeams.length} inscrições em torneios`,
      icon: Users,
    },
    {
      label: 'Atletas no Sistema',
      value: totalAthletesCount.toString(),
      subtext: 'Elencos confirmados',
      icon: Volleyball,
    },
    {
      label: 'Partidas Realizadas',
      value: completedMatchesCount.toString(),
      subtext: `${scheduledMatchesCount} agendadas / ${matches.length} total`,
      icon: CheckCircle,
    },
  ];

  // ───────────────────────────────────────────────────────────────────────────
  // Colunas da DataTable de Partidas Recentes / do Dia
  // ───────────────────────────────────────────────────────────────────────────
  const matchColumns: DataTableColumn<MatchRecord>[] = [
    {
      id: 'time',
      header: 'Horário',
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums font-mono">
          <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
          {new Date(row.scheduledTime).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      id: 'match',
      header: 'Confronto',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-foreground truncate max-w-[130px] sm:max-w-[160px]">
            {row.teamAName}
          </span>
          <span className="text-[10px] text-muted-foreground font-normal px-1">vs</span>
          <span className="font-semibold text-foreground truncate max-w-[130px] sm:max-w-[160px]">
            {row.teamBName}
          </span>
        </div>
      ),
    },
    {
      id: 'competition',
      header: 'Competição',
      cell: ({ row }) => {
        const comp = competitions.find((c) => c.id === row.competitionId);
        return (
          <span className="text-xs text-muted-foreground truncate max-w-[140px] block">
            {comp?.name || 'Competição'}
          </span>
        );
      },
    },
    {
      id: 'court',
      header: 'Local / Quadra',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
          {row.court || row.venue || 'A definir'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.status} className="text-[10px] h-5" />,
    },
    {
      id: 'actions',
      header: 'Ação',
      align: 'right',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground hover:bg-zinc-800"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/sumulas/${row.id}`);
            }}
            title="Abrir Súmula Oficial"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Súmula</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3.5">
      {/* ── PageHeader Oficial ── */}
      <PageHeader
        title="Painel Geral"
        description="Visão operacional unificada de competições, confrontos do dia, classificações e alertas."
        primaryAction={
          <Button
            size="sm"
            className="gap-1.5 text-xs font-semibold shadow-none"
            onClick={() => navigate('/competicoes?new=1')}
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Competição
          </Button>
        }
        secondaryActions={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-medium border-border hover:bg-zinc-800/60"
            onClick={() => navigate('/relatorios')}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
            Relatórios
          </Button>
        }
      />

      {/* ── Tratamento de Estados Universais (Loading / Error / Normal) ── */}
      <StateContainer
        isLoading={loading}
        isError={isError}
        errorTitle="Não foi possível carregar os dados do painel"
        errorDescription={errorMessage}
        onRetry={loadData}
        loadingSkeleton={<DashboardLoadingSkeleton />}
      >
        {/* ── 1. KPIs Densos com Dados Reais ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="hover-raise border-border bg-card/70 shadow-none">
                <CardContent className="px-3.5 py-2.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-zinc-300" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                      {stat.label}
                    </p>
                    <h3 className="text-lg font-bold tabular-nums font-mono text-foreground mt-0.5 leading-none">
                      {stat.value}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {stat.subtext}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── 2. Alertas Operacionais Críticos ── */}
        {alerts.length > 0 && (
          <Section
            title={
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                <span>Alertas Operacionais</span>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 bg-zinc-800 text-zinc-300 border-zinc-700 font-mono tabular-nums"
                >
                  {alerts.length}
                </Badge>
              </div>
            }
            description="Itens que necessitam de intervenção ou agendamento para viabilizar as rodadas."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3 hover-raise shadow-none"
                >
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="truncate">{alert.title}</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs font-medium gap-1 text-zinc-300 hover:text-foreground hover:bg-zinc-800"
                    onClick={() => navigate(alert.linkTo)}
                  >
                    <span>{alert.linkText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── 3. Grid Principal: Competições em Andamento & Próximos Confrontos ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 & 2: Competições em Andamento */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Competições em Andamento
                </h2>
                <p className="text-xs text-muted-foreground">
                  Campeonatos ativos monitorados pelo sistema.
                </p>
              </div>
              <Link
                to="/competicoes"
                className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-colors"
              >
                Ver todas ({competitions.length})
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {competitions.length === 0 ? (
              <SectionCard
                title="Nenhuma competição cadastrada"
                description="Cadastre seu primeiro campeonato para gerenciar chaves e súmulas."
                footer={
                  <Button
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => navigate('/competicoes?new=1')}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Cadastrar Competição
                  </Button>
                }
              >
                <p className="text-xs text-muted-foreground">
                  O sistema está pronto para receber os registros de equipes, ginásios e tabelas de jogos.
                </p>
              </SectionCard>
            ) : (
              <div className="space-y-2.5">
                {competitions.slice(0, 4).map((comp) => {
                  const compMatches = matches.filter((m) => m.competitionId === comp.id);
                  const compTeams = competitionTeams.filter((ct) => ct.competitionId === comp.id);
                  const finished = compMatches.filter(
                    (m) => m.status === 'completed' || m.status === 'homologated',
                  ).length;
                  const progress =
                    compMatches.length > 0 ? Math.round((finished / compMatches.length) * 100) : 0;

                  return (
                    <div
                      key={comp.id}
                      className="group relative rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover-raise"
                      onClick={() => navigate(buildCompetitionUrl(comp.id))}
                    >
                      <div className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {comp.name}
                            </span>
                            <Badge
                              variant="muted"
                              className="text-[10px] py-0 px-1.5 bg-zinc-800 text-zinc-300 border-zinc-700/60 capitalize"
                            >
                              {comp.modality === 'beach' ? 'Praia' : 'Quadra'}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {comp.venue || 'Local a definir'} · {compTeams.length} equipes ·{' '}
                            <span className="tabular-nums font-mono">
                              {finished}/{compMatches.length}
                            </span>{' '}
                            jogos realizados ({progress}%)
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-8 text-muted-foreground hover:text-foreground hover:bg-zinc-800"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(buildMatchesUrl(comp.id));
                            }}
                          >
                            Jogos
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs h-8 font-medium bg-zinc-800 hover:bg-zinc-700 text-foreground border border-zinc-700/50"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(buildCompetitionUrl(comp.id));
                            }}
                          >
                            Gerenciar
                          </Button>
                        </div>
                      </div>

                      {/* Barra sutil de progresso (2px) na base do card */}
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800/80">
                        <div
                          className="h-full bg-primary transition-[width] duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coluna 3: Ações Rápidas & Links Operacionais */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Acesso Rápido
              </h2>
              <p className="text-xs text-muted-foreground">
                Módulos operacionais frequentes.
              </p>
            </div>

            <SectionCard density="dense" divided>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-between h-9 text-xs font-medium text-foreground hover:bg-zinc-800/60 px-2.5 rounded-lg"
                  onClick={() => navigate('/jogos')}
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    Central de Confrontos
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-between h-9 text-xs font-medium text-foreground hover:bg-zinc-800/60 px-2.5 rounded-lg"
                  onClick={() => navigate('/sumulas')}
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    Súmulas Eletrônicas
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-between h-9 text-xs font-medium text-foreground hover:bg-zinc-800/60 px-2.5 rounded-lg"
                  onClick={() => navigate('/sorteio')}
                >
                  <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-zinc-400" />
                    Chaveamento & Sorteio
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-between h-9 text-xs font-medium text-foreground hover:bg-zinc-800/60 px-2.5 rounded-lg"
                  onClick={() => navigate('/relatorios')}
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
                    Exportação de Relatórios
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            </SectionCard>
          </div>
        </div>

        {/* ── 4. Tabela de Confrontos Recentes / do Dia ── */}
        <Section
          title="Confrontos Recentes e Programados"
          description="Acompanhamento em tempo real dos status de partida e lançamento de súmulas."
          actions={
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5 border-border"
              onClick={() => navigate('/jogos')}
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              Ver Grade Completa
            </Button>
          }
        >
          <DataTable
            data={matches.slice(0, 6)}
            columns={matchColumns}
            emptyTitle="Nenhuma partida programada no momento"
            emptyDescription="Crie partidas ou faça o sorteio de grupos para gerar a tabela de jogos."
            emptyAction={
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5"
                onClick={() => navigate('/jogos/novo')}
              >
                <Plus className="w-3.5 h-3.5" />
                Agendar Partida
              </Button>
            }
            onRowClick={(row) => navigate(`/sumulas/${row.id}`)}
          />
        </Section>
      </StateContainer>
    </div>
  );
}
