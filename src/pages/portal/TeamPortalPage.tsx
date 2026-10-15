/**
 * TeamPortalPage — Módulo Principal do Portal da Equipe (BaseOS Fase 10)
 *
 * Gerencia as views especializadas da equipe dentro de um único contexto consistente:
 * - Início (Dashboard Resumo com Status, Próximo Jogo, Elenco e Classificação)
 * - Meu Elenco (Gestão completa de atletas, validações de posição, líbero e capitão)
 * - Jogos (Confrontos da equipe com parciais e súmulas)
 * - Classificação (Tabela oficial do grupo destacando a equipe)
 * - Avisos (Regras, boletins e avisos operacionais)
 *
 * Segurança e Isolamento:
 * - O contexto é estritamente derivado da sessão autenticada (competitionTeamId).
 * - Todas as mutações e consultas são filtradas e validadas por RLS no PostgreSQL.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users,
  Calendar,
  Trophy,
  Bell,
  Clock,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Send,
  FileDown,
  ArrowRight,
  Shield,
  Volleyball,
  ChevronRight,
  FileText,
  Lock,
  MapPin,
  ExternalLink,
  Building2,
} from 'lucide-react';
import { useTeamPortal } from '@/components/portal/useTeamPortal';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AthleteFormModal } from '@/components/registration/AthleteFormModal';
import { EditTeamModal } from '@/components/portal/EditTeamModal';
import { MatchSheetEmitDialog } from '@/components/match/MatchSheetEmitDialog';
import {
  addAthlete,
  isRegistrationLocked,
  listRoster,
  markRosterSubmitted,
  removeAthlete,
  sortRosterAthletes,
  updateAthlete,
  validateRosterMinimum,
} from '@/services/registrationService';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { dataAccess } from '@/services/dataAccess';
import { computeStandingsByGroup } from '@/services/standingsService';
import { sortScheduleMatches } from '@/services/scheduleService';
import {
  REGISTRATION_STATUS_LABELS,
  ROSTER_LIMITS,
  type CompetitionAthlete,
  type CompetitionAthleteInput,
  type RegistrationStatus,
} from '@/types/registration';
import {
  generateMatchesBoletimPdf,
  generateTeamRosterReportPdf,
  downloadReportsPdf,
  type MatchBoletimRow,
  type RosterReportAthlete,
} from '@/lib/pdf/reportsPdf';
import type { MatchRecord, TeamRecord, VenueRecord } from '@/types/entities';

function countdownText(deadlineIso: string, nowMs: number): { label: string; expired: boolean } {
  const diff = new Date(deadlineIso).getTime() - nowMs;
  if (diff <= 0) return { label: 'Prazo encerrado', expired: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return { label: `${days}d ${hours}h ${minutes}min restantes`, expired: false };
  return { label: `${hours}h ${minutes}min restantes`, expired: false };
}

export function TeamPortalPage() {
  const { team, teamRecord, competition, refresh: refreshPortalContext } = useTeamPortal();
  const location = useLocation();
  const navigate = useNavigate();

  const [athletes, setAthletes] = useState<CompetitionAthlete[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [allCompMatches, setAllCompMatches] = useState<MatchRecord[]>([]);
  const [allCompAthletes, setAllCompAthletes] = useState<CompetitionAthlete[]>([]);
  const [allTeams, setAllTeams] = useState<TeamRecord[]>([]);
  const [venues, setVenues] = useState<VenueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  // Partidas ordenadas cronologicamente pelo Schedule Engine Canônico
  const sortedMatches = useMemo(() => sortScheduleMatches(matches), [matches]);

  // Contagem de MVPs por atleta da equipe no campeonato
  const mvpCountsByAthleteId = useMemo(() => {
    const counts = new Map<string, number>();
    allCompMatches.forEach((m) => {
      if ((m.status === 'homologated' || m.status === 'completed') && m.highlightAthleteId) {
        counts.set(m.highlightAthleteId, (counts.get(m.highlightAthleteId) || 0) + 1);
      }
    });
    return counts;
  }, [allCompMatches]);

  // Dicionário para resolver dados de atletas da competição (incluindo adversários)
  const athleteById = useMemo(() => {
    const map = new Map<string, CompetitionAthlete>();
    allCompAthletes.forEach((a) => map.set(a.id, a));
    athletes.forEach((a) => map.set(a.id, a));
    return map;
  }, [allCompAthletes, athletes]);

  // Modais de atletas, edição de equipe e súmula
  const [modalOpen, setModalOpen] = useState(false);
  const [editTeamModalOpen, setEditTeamModalOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<CompetitionAthlete | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);

  // Determina a view atual com base na URL
  const currentView = useMemo(() => {
    const path = location.pathname.replace(/\/$/, '');
    if (path.endsWith('/elenco')) return 'elenco';
    if (path.endsWith('/jogos')) return 'jogos';
    if (path.endsWith('/classificacao')) return 'classificacao';
    if (path.endsWith('/avisos')) return 'avisos';
    return 'inicio';
  }, [location.pathname]);

  const refreshData = useCallback(async () => {
    if (!team) return;
    setLoading(true);
    try {
      const [roster, allM, allT, allV, allAthletesInComp] = await Promise.all([
        listRoster(team.id),
        dataAccess.listMatches(team.competitionId),
        dataAccess.listTeams(),
        dataAccess.listVenues(),
        dataAccess.listCompetitionAthletesByCompetition(team.competitionId),
      ]);
      setAthletes(roster);
      setAllTeams(allT);
      setVenues(allV);
      setAllCompAthletes(allAthletesInComp);
      setAllCompMatches(allM);
      // Filtra partidas da competição ou da equipe
      setMatches(
        allM.filter(
          (m) =>
            m.competitionId === team.competitionId &&
            (m.teamAId === team.teamId || m.teamBId === team.teamId)
        )
      );
    } catch (err) {
      console.error('Erro ao carregar dados do portal da equipe:', err);
    } finally {
      setLoading(false);
    }
  }, [team]);

  // Busca dados completos do ginásio/local pelo ID ou pelo nome
  const getVenueInfo = useCallback(
    (venueNameOrId?: string): VenueRecord | undefined => {
      if (!venueNameOrId) return undefined;
      const term = venueNameOrId.trim().toLowerCase();
      return venues.find(
        (v) =>
          v.id.toLowerCase() === term ||
          v.name.trim().toLowerCase() === term
      );
    },
    [venues]
  );

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const playerFormat = competition?.playerFormat || '6x6';
  const limits = (competition
    ? CompetitionRulesService.getRosterLimits(competition)
    : (ROSTER_LIMITS[playerFormat] ?? ROSTER_LIMITS['6x6'])) ?? { min: 6, max: 14 };

  const locked = team ? isRegistrationLocked(team, competition, new Date(now)) : true;
  const countdown = useMemo(() => (team ? countdownText(team.registrationDeadline, now) : null), [team, now]);

  const refreshRoster = useCallback(async () => {
    if (!team) return;
    try {
      const roster = await listRoster(team.id);
      setAthletes(roster);
    } catch (err) {
      console.error('Erro ao atualizar elenco da equipe:', err);
    }
  }, [team]);

  // Manipuladores de elenco com atualização seletiva (sem recarregar partidas, ginásios e outras equipes)
  const handleAddAthlete = async (input: CompetitionAthleteInput): Promise<{ ok: boolean; errors: string[] }> => {
    if (!team) return { ok: false, errors: ['Equipe não encontrada.'] };
    const result = await addAthlete(team.id, input, playerFormat, competition ?? undefined);
    if (result.ok) {
      toast.success('Atleta adicionado com sucesso!');
      if (result.athlete) {
        setAthletes((prev) => {
          const filtered = prev.filter((a) => a.id !== result.athlete!.id);
          return sortRosterAthletes([...filtered, result.athlete!]);
        });
      } else {
        await refreshRoster();
      }
    } else {
      result.errors.forEach((e) => toast.error(e));
    }
    return result;
  };

  const handleUpdateAthlete = async (input: CompetitionAthleteInput): Promise<{ ok: boolean; errors: string[] }> => {
    if (!editingAthlete) return { ok: false, errors: ['Atleta não selecionado.'] };
    const result = await updateAthlete(editingAthlete.id, input, playerFormat, competition ?? undefined);
    if (result.ok) {
      toast.success('Atleta atualizado com sucesso!');
      if (result.athlete) {
        setAthletes((prev) => {
          const filtered = prev.filter((a) => a.id !== result.athlete!.id);
          return sortRosterAthletes([...filtered, result.athlete!]);
        });
      } else {
        await refreshRoster();
      }
    } else {
      result.errors.forEach((e) => toast.error(e));
    }
    return result;
  };

  const handleRemoveAthlete = async (athlete: CompetitionAthlete) => {
    if (!window.confirm(`Remover o atleta ${athlete.name} do elenco da equipe?`)) return;
    const result = await removeAthlete(athlete.id, competition ?? undefined);
    if (result.ok) {
      toast.success('Atleta removido com sucesso.');
      setAthletes((prev) => prev.filter((a) => a.id !== athlete.id));
    } else {
      result.errors.forEach((e) => toast.error(e));
    }
  };

  const handleSubmitRoster = async () => {
    if (!team) return;
    const check = validateRosterMinimum(athletes, playerFormat);
    if (!check.valid) {
      check.errors.forEach((e) => toast.error(e));
      return;
    }
    setSubmitting(true);
    try {
      await markRosterSubmitted(team.id);
      toast.success('Inscrição enviada com sucesso para homologação!');
      await refreshPortalContext();
      await refreshData();
    } catch (err: unknown) {
      toast.error('Erro ao enviar inscrição. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportRoster = () => {
    if (!team) return;
    const doc = generateTeamRosterReportPdf(
      [
        {
          name: team.teamName,
          shortName: team.teamShortName,
          coach: teamRecord?.coachName,
          logoUrl: teamRecord?.logoUrl,
          athletes: athletes.map((a): RosterReportAthlete => ({
            jerseyNumber: a.jerseyNumber,
            name: a.name,
            position: a.position,
            documentNumber: a.documentNumber,
            isCaptain: a.isCaptain,
            isLibero: a.isLibero,
          })),
        },
      ],
      competition?.name || 'Competição Oficial'
    );
    const safeName = team.teamName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    downloadReportsPdf(doc, `elenco_${safeName}.pdf`);
    toast.success('Relação nominal gerada em PDF!');
  };

  const handleExportBoletim = () => {
    if (!competition) return;
    const rows: MatchBoletimRow[] = sortScheduleMatches(matches)
      .map((m) => {
        const teamA = allTeams.find((t) => t.id === m.teamAId);
        const teamB = allTeams.find((t) => t.id === m.teamBId);
        const setsA = m.sets.filter((s) => s.scoreA > s.scoreB).length;
        const setsB = m.sets.filter((s) => s.scoreB > s.scoreA).length;
        return {
          matchNumber: m.matchNumber,
          round: m.round,
          phase: m.phase,
          groupName: m.groupName,
          date: m.scheduledTime,
          time: new Date(m.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          venue: m.venue,
          court: m.court,
          teamAName: teamA?.name ?? m.teamAName,
          teamBName: teamB?.name ?? m.teamBName,
          scoreA: m.status === 'completed' || m.status === 'homologated' ? setsA : undefined,
          scoreB: m.status === 'completed' || m.status === 'homologated' ? setsB : undefined,
          statusLabel: m.status === 'completed' || m.status === 'homologated' ? 'Finalizado' : 'Agendado',
        };
      });

    const doc = generateMatchesBoletimPdf(rows, competition.name);
    downloadReportsPdf(doc, `boletim_${competition.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}.pdf`);
    toast.success('Boletim de jogos gerado em PDF!');
  };

  // Cálculo da classificação do grupo
  const standingsGroups = useMemo(() => {
    if (!competition) return [];
    const compTeams = allTeams.map((t) => ({ team: t, groupName: competition.groupName || 'Geral' }));
    return computeStandingsByGroup(compTeams, matches, { competition });
  }, [competition, allTeams, matches]);

  // Próximo jogo
  const nextMatch = useMemo(() => {
    const upcoming = sortScheduleMatches(
      matches.filter((m) => m.status === 'scheduled' || m.status === 'in-progress')
    );
    return upcoming[0] || null;
  }, [matches]);

  // Posição na classificação
  const teamStanding = useMemo(() => {
    for (const group of standingsGroups) {
      const idx = group.standings.findIndex((r) => r.teamId === team.teamId);
      if (idx !== -1) {
        const row = group.standings[idx];
        return {
          position: row.position || idx + 1,
          points: row.competitionPoints,
          wins: row.matchesWon,
          losses: row.matchesLost,
          played: row.matchesPlayed,
          groupName: group.groupName,
        };
      }
    }
    return null;
  }, [standingsGroups, team.teamId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: INÍCIO (DASHBOARD DA EQUIPE)
  // =========================================================================
  if (currentView === 'inicio') {
    const statusLabels: Record<RegistrationStatus, { label: string; variant: 'default' | 'outline' | 'secondary' | 'destructive' }> = {
      invited: { label: 'Convite Pendente', variant: 'outline' },
      in_progress: { label: 'Inscrição em Andamento', variant: 'secondary' },
      submitted: { label: 'Inscrição Enviada (Análise)', variant: 'default' },
      approved: { label: 'Equipe Confirmada', variant: 'default' },
      rejected: { label: 'Correção Necessária', variant: 'destructive' },
    };
    const currentStatusInfo = statusLabels[team.status] || { label: team.status, variant: 'outline' };

    return (
      <div className="space-y-6">
        {/* Banner de Boas-Vindas e Status */}
        <div className="p-5 sm:p-6 rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TeamCrest
              team={teamRecord}
              name={team.teamName}
              shortName={team.teamShortName}
              size="lg"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-zinc-700 bg-zinc-950 shrink-0 shadow-md"
            />
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  {team.teamName}
                </h1>
                <Badge variant="outline" className="font-mono text-xs border-zinc-700 bg-zinc-800 text-zinc-300">
                  {team.teamShortName}
                </Badge>
                <Badge variant={currentStatusInfo.variant} className="text-xs font-medium">
                  {currentStatusInfo.label}
                </Badge>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>
                  Competição: <span className="text-foreground font-medium">{competition?.name || 'Voleibol BaseOS'}</span>
                </span>
                {teamRecord?.coachName && (
                  <>
                    <span>&bull;</span>
                    <span>Técnico: <strong className="text-zinc-200">{teamRecord.coachName}</strong></span>
                  </>
                )}
                {(teamRecord?.city || teamRecord?.state) && (
                  <>
                    <span>&bull;</span>
                    <span>{teamRecord.city}{teamRecord.state ? `/${teamRecord.state}` : ''}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditTeamModalOpen(true)}
              className="h-9 text-xs font-semibold gap-1.5 border-zinc-700 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-800 hover:text-white"
              title="Editar nome, sigla, técnico e escudo da equipe"
            >
              <Pencil className="w-3.5 h-3.5 text-amber-400" />
              <span>Editar Equipe & Escudo</span>
            </Button>
            <Button asChild size="sm" className="h-9 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/portal/equipe/elenco">
                <span>Gerenciar Elenco</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Alerta de Prazo / Inscrição */}
        {countdown && !locked && (
          <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-300">
            <Clock className="w-4 h-4 text-amber-400" />
            <AlertTitle className="text-xs font-semibold text-amber-200">Prazo de Inscrição em Aberto</AlertTitle>
            <AlertDescription className="text-xs text-amber-300/90 mt-0.5">
              Cadastre e finalize o elenco dentro do prazo limite: <strong>{countdown.label}</strong> (até {new Date(team.registrationDeadline).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}).
            </AlertDescription>
          </Alert>
        )}

        {locked && (
          <Alert className="border-zinc-800 bg-zinc-900/60 text-zinc-400">
            <Lock className="w-4 h-4 text-zinc-400" />
            <AlertTitle className="text-xs font-semibold text-zinc-300">Inscrições Finalizadas</AlertTitle>
            <AlertDescription className="text-xs text-zinc-400 mt-0.5">
              O período de inscrição e alterações do elenco está encerrado para esta equipe.
            </AlertDescription>
          </Alert>
        )}

        {/* Grid de 3 Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Meu Elenco */}
          <Card className="border border-border bg-card shadow-none hover:border-zinc-700 transition-colors">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  Meu Elenco
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {athletes.length} / {limits.max}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              <div>
                <div className="text-2xl font-bold font-mono text-foreground">{athletes.length}</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {athletes.length < limits.min
                    ? `Faltam ${limits.min - athletes.length} atletas para o mínimo (${limits.min})`
                    : `Mínimo (${limits.min}) atingido`}
                </p>
              </div>
              <Button asChild variant="secondary" size="sm" className="w-full text-xs h-7">
                <Link to="/portal/equipe/elenco">Visualizar Atletas</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Próximo Jogo */}
          <Card className="border border-border bg-card shadow-none hover:border-zinc-700 transition-colors">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  Próximo Jogo
                </CardTitle>
                {nextMatch && (
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Jogo #{nextMatch.matchNumber}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              {nextMatch ? (() => {
                const vInfo = getVenueInfo(nextMatch.venue);
                const googleMapsUrl = vInfo?.address
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${vInfo.name}, ${vInfo.address}`)}`
                  : nextMatch.venue
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextMatch.venue)}`
                  : null;

                return (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground truncate">
                      vs {nextMatch.teamAId === team.teamId ? nextMatch.teamBName : nextMatch.teamAName}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>
                          {new Date(nextMatch.scheduledTime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{' '}
                          às {new Date(nextMatch.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {nextMatch.court ? ` • ${nextMatch.court}` : ''}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-foreground">
                            {vInfo?.name || nextMatch.venue || 'Local a definir'}
                          </span>
                          {vInfo?.address ? (
                            <div className="text-[11px] text-zinc-300 flex items-center gap-1 mt-0.5">
                              <span className="truncate">{vInfo.address}</span>
                              {googleMapsUrl && (
                                <a
                                  href={googleMapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-0.5 shrink-0 font-medium"
                                  title="Ver rota no Google Maps"
                                >
                                  <span>(Mapa)</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                              Endereço físico não cadastrado
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div>
                  <div className="text-2xl font-bold font-mono text-muted-foreground">—</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Nenhum confronto agendado</p>
                </div>
              )}
              <Button asChild variant="secondary" size="sm" className="w-full text-xs h-7">
                <Link to="/portal/equipe/jogos">Tabela de Jogos</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Card 3: Classificação */}
          <Card className="border border-border bg-card shadow-none hover:border-zinc-700 transition-colors">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Classificação
                </CardTitle>
                {teamStanding && (
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {teamStanding.groupName}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              {teamStanding ? (
                <div>
                  <div className="text-2xl font-bold font-mono text-foreground">
                    {teamStanding.position}º <span className="text-xs font-normal text-muted-foreground">lugar ({teamStanding.points} pts)</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {teamStanding.played} jogos &bull; {teamStanding.wins}V - {teamStanding.losses}D
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-bold font-mono text-muted-foreground">—</div>
                  <p className="text-xs text-muted-foreground mt-0.5">Aguardando início das partidas</p>
                </div>
              )}
              <Button asChild variant="secondary" size="sm" className="w-full text-xs h-7">
                <Link to="/portal/equipe/classificacao">Ver Classificação</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Atalhos Rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/portal/equipe/elenco"
            className="p-3.5 rounded-lg border border-border bg-card hover:bg-zinc-800/40 transition-colors flex items-center justify-between text-xs font-medium text-foreground"
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Meu Elenco
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
          <Link
            to="/portal/equipe/jogos"
            className="p-3.5 rounded-lg border border-border bg-card hover:bg-zinc-800/40 transition-colors flex items-center justify-between text-xs font-medium text-foreground"
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              Tabela de Jogos
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
          <Link
            to="/portal/equipe/classificacao"
            className="p-3.5 rounded-lg border border-border bg-card hover:bg-zinc-800/40 transition-colors flex items-center justify-between text-xs font-medium text-foreground"
          >
            <span className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Classificação
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
          <Link
            to="/portal/equipe/avisos"
            className="p-3.5 rounded-lg border border-border bg-card hover:bg-zinc-800/40 transition-colors flex items-center justify-between text-xs font-medium text-foreground"
          >
            <span className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-400" />
              Avisos & Regras
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
        </div>

        {/* Modal de Edição de Dados da Equipe & Escudo */}
        <EditTeamModal
          open={editTeamModalOpen}
          onOpenChange={setEditTeamModalOpen}
          team={team}
          teamRecord={teamRecord}
          onSaved={async () => {
            await refreshPortalContext();
            await refreshData();
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: MEU ELENCO
  // =========================================================================
  if (currentView === 'elenco') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Elenco Oficial da Equipe
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Formato {playerFormat} &bull; Mínimo de {limits.min} e máximo de {limits.max} atletas.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportRoster}
              className="text-xs h-8 gap-1.5"
              disabled={athletes.length === 0}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Exportar PDF</span>
            </Button>
            {!locked && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingAthlete(undefined);
                  setModalOpen(true);
                }}
                disabled={athletes.length >= limits.max}
                className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Atleta</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tabela de Atletas */}
        <Card className="border border-border bg-card shadow-none">
          <CardContent className="p-0">
            {athletes.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <Users className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground">Nenhum atleta cadastrado no elenco até o momento.</p>
                {!locked && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingAthlete(undefined);
                      setModalOpen(true);
                    }}
                    className="text-xs h-8"
                  >
                    Cadastrar Primeiro Atleta
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5 w-16 text-center">Nº</th>
                      <th className="px-4 py-2.5">Nome do Atleta</th>
                      <th className="px-4 py-2.5">Posição</th>
                      <th className="px-4 py-2.5">Documento</th>
                      <th className="px-4 py-2.5 text-center">Função</th>
                      {!locked && <th className="px-4 py-2.5 text-right w-24">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {athletes.map((ath) => {
                      const mvpCount = mvpCountsByAthleteId.get(ath.id) || 0;
                      return (
                        <tr key={ath.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-4 py-3 text-center font-mono font-bold text-foreground">
                            {ath.jerseyNumber ? (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200">
                                #{ath.jerseyNumber}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{ath.name}</span>
                              {ath.isCaptain && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-500/40 text-amber-400 bg-amber-500/10">
                                  CAPITÃO
                                </Badge>
                              )}
                              {ath.isLibero && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 border-blue-500/40 text-blue-400 bg-blue-500/10">
                                  LÍBERO
                                </Badge>
                              )}
                              {mvpCount > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] py-0 px-1.5 border-amber-500/50 text-amber-300 bg-amber-500/15 font-bold flex items-center gap-1 shadow-sm"
                                  data-testid={`roster-athlete-mvp-${ath.id}`}
                                >
                                  <Trophy className="w-2.5 h-2.5 text-amber-400" />
                                  ⭐ {mvpCount}x MVP
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{ath.position}</td>
                          <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                            {ath.documentNumber || '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              {ath.isCaptain ? (
                                <span className="text-amber-400 font-semibold text-[10px]">Capitão</span>
                              ) : ath.isLibero ? (
                                <span className="text-blue-400 font-semibold text-[10px]">Líbero</span>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">Atleta</span>
                              )}
                              {mvpCount > 0 && (
                                <span className="text-[9px] text-amber-400/90 font-mono font-bold">
                                  {mvpCount}x MVP
                                </span>
                              )}
                            </div>
                          </td>
                          {!locked && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingAthlete(ath);
                                    setModalOpen(true);
                                  }}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  title="Editar atleta"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                onClick={() => handleRemoveAthlete(ath)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                title="Remover atleta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Finalização de Inscrição */}
        {!locked && team.status !== 'submitted' && team.status !== 'approved' && (
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-semibold text-foreground">Finalizar e Enviar Inscrição</h3>
              <p className="text-[11px] text-muted-foreground">
                Após cadastrar pelo menos {limits.min} atletas, envie a inscrição para conferência e homologação da organização.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleSubmitRoster}
              disabled={submitting || athletes.length < limits.min}
              className="text-xs h-8 gap-1.5 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Enviando...' : 'Finalizar Inscrição'}</span>
            </Button>
          </div>
        )}

        {/* Modal de Cadastro / Edição de Atleta */}
        <AthleteFormModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          athlete={editingAthlete}
          onSubmit={editingAthlete ? handleUpdateAthlete : handleAddAthlete}
          gender={competition?.genderCategory === 'male' ? 'male' : 'female'}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: JOGOS DA EQUIPE
  // =========================================================================
  if (currentView === 'jogos') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              Confrontos da Equipe
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Partidas agendadas e encerradas na competição oficial.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportBoletim}
            className="text-xs h-8 gap-1.5"
            disabled={matches.length === 0}
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Boletim de Jogos (PDF)</span>
          </Button>
        </div>

        {matches.length === 0 ? (
          <Card className="border border-border bg-card shadow-none">
            <CardContent className="p-8 text-center space-y-2">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">Nenhuma partida programada ou realizada até o momento.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedMatches.map((m) => {
              const isTeamA = m.teamAId === team.teamId;
              const opponentName = isTeamA ? m.teamBName : m.teamAName;
              const opponentShort = isTeamA ? m.teamBShortName : m.teamAShortName;
              const setsA = m.sets.filter((s) => s.scoreA > s.scoreB).length;
              const setsB = m.sets.filter((s) => s.scoreB > s.scoreA).length;
              const mySets = isTeamA ? setsA : setsB;
              const oppSets = isTeamA ? setsB : setsA;
              const isFinished = m.status === 'completed' || m.status === 'homologated';
              const mvpAthlete = m.highlightAthleteId ? athleteById.get(m.highlightAthleteId) : undefined;
              const isOurMvp = m.highlightAthleteId ? athletes.some((a) => a.id === m.highlightAthleteId) : false;

              return (
                <Card key={m.id} className="border border-border bg-card shadow-none">
                  <CardHeader className="p-4 pb-2 border-b border-border/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground">
                        Jogo #{m.matchNumber} &bull; Rodada {m.round}
                      </span>
                      <Badge
                        variant={isFinished ? 'default' : 'outline'}
                        className="text-[10px] font-mono"
                      >
                        {isFinished ? 'Finalizado' : m.status === 'in-progress' ? 'Ao Vivo' : 'Agendado'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      {/* Equipe do Usuário */}
                      <div className="space-y-0.5 max-w-[40%] truncate">
                        <div className="font-semibold text-foreground text-xs sm:text-sm truncate">
                          {team.teamName}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">{team.teamShortName}</div>
                      </div>

                      {/* Placar */}
                      <div className="text-center font-mono font-bold text-base sm:text-lg px-3 py-1 rounded bg-zinc-900 border border-zinc-800">
                        {isFinished ? `${mySets} x ${oppSets}` : 'vs'}
                      </div>

                      {/* Adversário */}
                      <div className="space-y-0.5 text-right max-w-[40%] truncate">
                        <div className="font-semibold text-foreground text-xs sm:text-sm truncate">
                          {opponentName}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">{opponentShort}</div>
                      </div>
                    </div>

                    {/* Data, Horário e Localização do Ginásio */}
                    {(() => {
                      const vInfo = getVenueInfo(m.venue);
                      const gMapsUrl = vInfo?.address
                        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${vInfo.name}, ${vInfo.address}`)}`
                        : m.venue
                        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.venue)}`
                        : null;

                      return (
                        <div className="space-y-1.5 pt-2 border-t border-border/40 text-[11px]">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              {new Date(m.scheduledTime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{' '}
                              às {new Date(m.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="font-medium text-foreground">
                              {m.venue || 'Local a definir'} {m.court ? `• ${m.court}` : ''}
                            </span>
                          </div>

                          {/* Endereço físico do Ginásio quando cadastrado */}
                          {vInfo?.address ? (
                            <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-zinc-900/60 border border-zinc-800 text-[10px] text-zinc-300">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                                <span className="truncate">{vInfo.address}</span>
                              </div>
                              {gMapsUrl && (
                                <a
                                  href={gMapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline font-semibold flex items-center gap-0.5 shrink-0"
                                  title="Abrir no Google Maps"
                                >
                                  <span>Como Chegar</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          ) : m.venue ? (
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-zinc-500" />
                              <span>Endereço físico não cadastrado</span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}

                    {/* Parciais dos Sets se finalizado */}
                    {isFinished && m.sets.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase">Sets:</span>
                        {m.sets.map((s, idx) => (
                          <Badge key={idx} variant="outline" className="text-[10px] font-mono py-0 px-1 border-zinc-800">
                            {isTeamA ? `${s.scoreA}-${s.scoreB}` : `${s.scoreB}-${s.scoreA}`}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Destaque / MVP da Partida */}
                    {isFinished && m.highlightAthleteId && (
                      <div className="pt-2 border-t border-border/40" data-testid={`team-match-highlight-${m.id}`}>
                        {isOurMvp ? (
                          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-transparent border border-amber-500/40 text-xs text-amber-200 shadow-sm">
                            <div className="h-6 w-6 rounded-full bg-amber-500/30 border border-amber-500/50 flex items-center justify-center shrink-0">
                              <Trophy className="w-3.5 h-3.5 text-amber-300" />
                            </div>
                            <div className="truncate flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px]">
                                🏆 MVP do Jogo:
                              </span>
                              <span className="font-semibold text-white">
                                Seu atleta {mvpAthlete ? `${mvpAthlete.jerseyNumber != null ? `[#${mvpAthlete.jerseyNumber}] ` : ''}${mvpAthlete.name}` : 'da equipe'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300">
                            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="font-medium text-amber-400/90 text-[10px] uppercase tracking-wider">
                              ⭐ MVP da Partida:
                            </span>
                            <span className="font-medium text-zinc-200 truncate">
                              {mvpAthlete ? `${mvpAthlete.jerseyNumber != null ? `[#${mvpAthlete.jerseyNumber}] ` : ''}${mvpAthlete.name}` : 'Atleta indicado'}{' '}
                              <span className="text-zinc-400">({opponentName})</span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-2 border-t border-border/40 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs gap-1.5 font-medium border-border hover:bg-zinc-800/60"
                        onClick={() => setSelectedMatch(m)}
                        title="Visualizar e emitir Súmula Oficial BaseOS"
                      >
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        <span>Súmula Oficial</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Locais de Disputa & Ginásios Cadastrados */}
        {venues.length > 0 && (
          <Card className="border border-border bg-card shadow-none">
            <CardHeader className="p-4 pb-2 border-b border-border/50">
              <CardTitle className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" />
                Locais de Disputa & Ginásios Oficiais
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Consulte o endereço completo e rotas dos ginásios utilizados na competição.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {venues.map((v) => (
                <div key={v.id} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground truncate">{v.name}</span>
                    {v.courts?.length > 0 && (
                      <Badge variant="outline" className="text-[9px] font-mono border-zinc-700">
                        {v.courts.length} {v.courts.length === 1 ? 'quadra' : 'quadras'}
                      </Badge>
                    )}
                  </div>
                  {v.address ? (
                    <div className="text-[11px] text-zinc-300 space-y-1">
                      <div className="flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{v.address}</span>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name}, ${v.address}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                      >
                        <span>Abrir no Google Maps</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">Endereço não informado.</p>
                  )}
                  {v.notes && (
                    <p className="text-[10px] text-muted-foreground/80 italic line-clamp-2 pt-1 border-t border-zinc-800/60">
                      {v.notes}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {selectedMatch && (
          <MatchSheetEmitDialog
            match={selectedMatch}
            competition={competition}
            open={selectedMatch !== null}
            onOpenChange={(v) => { if (!v) setSelectedMatch(null); }}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 4: CLASSIFICAÇÃO
  // =========================================================================
  if (currentView === 'classificacao') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Classificação do Torneio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Critérios oficiais FIVB/CBV com cálculo de pontos, set average e pontos average.
          </p>
        </div>

        {standingsGroups.length === 0 ? (
          <Card className="border border-border bg-card shadow-none">
            <CardContent className="p-8 text-center space-y-2">
              <Trophy className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">Tabela de classificação ainda não iniciada.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {standingsGroups.map((group) => (
              <Card key={group.groupName} className="border border-border bg-card shadow-none">
                <CardHeader className="p-4 pb-2 border-b border-border/50">
                  <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                    Grupo / Chave: {group.groupName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900 border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2.5 text-center w-10">Pos</th>
                        <th className="px-4 py-2.5">Equipe</th>
                        <th className="px-3 py-2.5 text-center font-bold text-foreground">Pts</th>
                        <th className="px-3 py-2.5 text-center">J</th>
                        <th className="px-3 py-2.5 text-center">V</th>
                        <th className="px-3 py-2.5 text-center">D</th>
                        <th className="px-3 py-2.5 text-center hidden sm:table-cell">SP</th>
                        <th className="px-3 py-2.5 text-center hidden sm:table-cell">SC</th>
                        <th className="px-3 py-2.5 text-center font-mono">Set Avg</th>
                        <th className="px-3 py-2.5 text-center font-mono hidden md:table-cell">Pts Avg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {group.standings.map((r, idx) => {
                        const isMyTeam = r.teamId === team.teamId;
                        return (
                          <tr
                            key={r.teamId}
                            className={
                              isMyTeam
                                ? 'bg-primary/10 font-medium text-foreground'
                                : 'hover:bg-zinc-800/30 transition-colors'
                            }
                          >
                            <td className="px-3 py-2.5 text-center font-mono font-bold">
                              {r.position || idx + 1}º
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate">{r.teamName}</span>
                                {isMyTeam && (
                                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/40 text-primary bg-primary/10">
                                    MINHA EQUIPE
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-foreground">
                              {r.competitionPoints}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono">{r.matchesPlayed}</td>
                            <td className="px-3 py-2.5 text-center font-mono text-emerald-400">{r.matchesWon}</td>
                            <td className="px-3 py-2.5 text-center font-mono text-rose-400">{r.matchesLost}</td>
                            <td className="px-3 py-2.5 text-center font-mono hidden sm:table-cell">{r.setsWon}</td>
                            <td className="px-3 py-2.5 text-center font-mono hidden sm:table-cell">{r.setsLost}</td>
                            <td className="px-3 py-2.5 text-center font-mono">
                              {r.setsRatio === Infinity ? 'MAX' : r.setsRatio.toFixed(3)}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono hidden md:table-cell">
                              {r.pointsRatio.toFixed(3)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 5: AVISOS E INFORMAÇÕES
  // =========================================================================
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-400" />
          Avisos e Regulamento
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Comunicações oficiais, prazos e regras do campeonato.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card: Prazos e Status */}
        <Card className="border border-border bg-card shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              Prazos de Inscrição
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2 text-xs">
            <p className="text-muted-foreground">
              Limite para alteração de elenco:{' '}
              <span className="text-foreground font-medium">
                {new Date(team.registrationDeadline).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </p>
            <p className="text-muted-foreground">
              Status Atual:{' '}
              <span className="text-foreground font-medium">
                {REGISTRATION_STATUS_LABELS[team.status] || team.status}
              </span>
            </p>
            {team.customNotes && (
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
                <strong>Observações da Organização:</strong> {team.customNotes}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card: Regras do Formato */}
        <Card className="border border-border bg-card shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
              <Volleyball className="w-4 h-4 text-primary" />
              Regras do Formato {playerFormat}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1.5 text-xs text-muted-foreground">
            <p>&bull; Limite de elenco: mínimo de {limits.min} e máximo de {limits.max} atletas.</p>
            <p>&bull; Máximo de 1 Capitão titular por equipe.</p>
            <p>&bull; Máximo de 2 Líberos uniformizados por equipe.</p>
            <p>&bull; Número da camisa de 1 a 99 (único dentro do elenco).</p>
          </CardContent>
        </Card>
      </div>

      {/* Locais de Competição e Ginásios Cadastrados */}
      {venues.length > 0 && (
        <Card className="border border-border bg-card shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-primary" />
              Ginásios e Locais Oficiais de Jogo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {venues.map((v) => (
              <div key={v.id} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{v.name}</span>
                  {v.courts?.length > 0 && (
                    <Badge variant="outline" className="text-[10px] font-mono border-zinc-700">
                      {v.courts.length} {v.courts.length === 1 ? 'quadra' : 'quadras'}
                    </Badge>
                  )}
                </div>
                {v.address ? (
                  <div className="space-y-1 text-zinc-300 text-[11px]">
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span>{v.address}</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name}, ${v.address}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                    >
                      <span>Abrir no Google Maps</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Endereço não cadastrado.</p>
                )}
                {v.notes && (
                  <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-zinc-800">
                    {v.notes}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Relatórios e Documentos Oficiais */}
      <Card className="border border-border bg-card shadow-none">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-400" />
            Documentos para Download
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExportRoster} className="text-xs h-8 gap-1.5">
            <FileDown className="w-3.5 h-3.5" />
            <span>Baixar Relação Nominal da Equipe (PDF)</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportBoletim} className="text-xs h-8 gap-1.5">
            <FileDown className="w-3.5 h-3.5" />
            <span>Baixar Boletim de Jogos (PDF)</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default TeamPortalPage;
