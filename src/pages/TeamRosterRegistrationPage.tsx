// Portal Online da Equipe (Módulo Web do Gestor da Equipe).
// Acesso via link exclusivo com token: /equipe/inscricao/:token
// Inclui: Elenco, Jogos da Competição, Tabela de Classificação, Boletins e PWA.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Volleyball,
  Users,
  Lock,
  Clock,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Send,
  FileDown,
  Calendar,
  Trophy,
  FileText,
  Bell,
  Smartphone,
  ChevronRight,
  ClipboardList,
  Eye,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PublicShell } from '@/components/registration/PublicShell';
import { AthleteFormModal } from '@/components/registration/AthleteFormModal';
import { MatchSheetEmitDialog } from '@/components/match/MatchSheetEmitDialog';
import { PwaInstallButton } from '@/components/pwa/PwaInstallButton';
import {
  addAthlete,
  formatDeadline,
  getCompetitionTeamByToken,
  isRegistrationLocked,
  listRoster,
  markRosterSubmitted,
  removeAthlete,
  updateAthlete,
  validateRosterMinimum,
} from '@/services/registrationService';
import { CompetitionRulesService } from '@/services/competitionRulesService';
import { dataAccess } from '@/services/dataAccess';
import { notificationService } from '@/services/notificationService';
import { computeStandingsByGroup } from '@/services/standingsService';
import { GENDER_CATEGORY_LABELS, ROSTER_LIMITS, MAX_LIBEROS } from '@/types/registration';
import {
  generateMatchesBoletimPdf,
  generateStandingsReportPdf,
  generateTeamRosterReportPdf,
  downloadReportsPdf,
} from '@/lib/pdf/reportsPdf';
import type { CompetitionAthlete, CompetitionAthleteInput, CompetitionTeam } from '@/types/registration';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';

function countdownText(deadlineIso: string, nowMs: number): { label: string; expired: boolean } {
  const diff = new Date(deadlineIso).getTime() - nowMs;
  if (diff <= 0) return { label: 'Prazo encerrado', expired: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return { label: `${days}d ${hours}h ${minutes}min restantes`, expired: false };
  return { label: `${hours}h ${minutes}min restantes`, expired: false };
}

export function TeamRosterRegistrationPage() {
  const { token } = useParams<{ token: string }>();
  const [team, setTeam] = useState<CompetitionTeam | null>(null);
  const [teamRecord, setTeamRecord] = useState<TeamRecord | null>(null);
  const [competition, setCompetition] = useState<CompetitionRecord | null>(null);
  const [athletes, setAthletes] = useState<CompetitionAthlete[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [allTeams, setAllTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<'elenco' | 'jogos' | 'classificacao' | 'boletins'>('elenco');

  // Modais
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<CompetitionAthlete | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  const [hasNotifPerm, setHasNotifPerm] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    const ct = await getCompetitionTeamByToken(token);
    if (!ct) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const [latestCt, allT, allM] = await Promise.all([
      dataAccess.getCompetitionTeamById(ct.id),
      dataAccess.listTeams(),
      dataAccess.listMatches(),
    ]);

    setTeam(latestCt || ct);
    const tr = allT.find(t => t.id === ct.teamId);
    setTeamRecord(tr || null);
    setAllTeams(allT);

    const comp = await dataAccess.getCompetition(ct.competitionId);
    setCompetition(comp);

    setAthletes(await listRoster(ct.id));
    setMatches(allM.filter(m => m.competitionId === ct.competitionId || m.teamAId === ct.teamId || m.teamBId === ct.teamId));
    setHasNotifPerm(notificationService.getPermission() === 'granted');
    setLoading(false);
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const playerFormat = competition?.playerFormat || '6x6';
  const limits = competition
    ? CompetitionRulesService.getRosterLimits(competition)
    : (ROSTER_LIMITS[playerFormat] ?? ROSTER_LIMITS['6x6']);
  const locked = team ? isRegistrationLocked(team, competition, new Date(now)) : true;
  const countdown = useMemo(() => (team ? countdownText(team.registrationDeadline, now) : null), [team, now]);
  const genderCategory = competition?.genderCategory || 'mixed';
  const genderForForm: 'male' | 'female' = genderCategory === 'male' ? 'male' : 'female';

  const handleToggleNotifications = async () => {
    const granted = await notificationService.requestPermission();
    setHasNotifPerm(granted);
  };

  const handleAdd = async (input: CompetitionAthleteInput): Promise<{ ok: boolean; errors: string[] }> => {
    if (!team) return { ok: false, errors: ['Equipe não encontrada.'] };
    const result = await addAthlete(team.id, input, playerFormat, competition ?? undefined);
    if (result.ok) {
      toast.success('Atleta adicionado!');
      await refresh();
    } else {
      result.errors.forEach(e => toast.error(e));
    }
    return result;
  };

  const handleUpdate = async (input: CompetitionAthleteInput): Promise<{ ok: boolean; errors: string[] }> => {
    if (!editingAthlete) return { ok: false, errors: ['Atleta não selecionado.'] };
    const result = await updateAthlete(editingAthlete.id, input, playerFormat, competition ?? undefined);
    if (result.ok) {
      toast.success('Atleta atualizado!');
      await refresh();
    } else {
      result.errors.forEach(e => toast.error(e));
    }
    return result;
  };

  const handleRemove = async (athlete: CompetitionAthlete) => {
    if (!window.confirm(`Remover ${athlete.name} do elenco?`)) return;
    const result = await removeAthlete(athlete.id, competition ?? undefined);
    if (result.ok) {
      toast.success('Atleta removido.');
      await refresh();
    } else {
      result.errors.forEach(e => toast.error(e));
    }
  };

  const handleSubmitRoster = async () => {
    if (!team) return;
    const check = validateRosterMinimum(athletes, playerFormat);
    if (!check.valid) {
      check.errors.forEach(e => toast.error(e));
      return;
    }
    setSubmitting(true);
    try {
      await markRosterSubmitted(team.id);
      toast.success('Elenco finalizado com sucesso!');
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportRoster = async () => {
    if (!team) return;
    const doc = generateTeamRosterReportPdf(
      [
        {
          name: team.teamName,
          shortName: team.teamShortName,
          coach: teamRecord?.coachName,
          logoUrl: teamRecord?.logoUrl,
          athletes: athletes.map(a => ({
            jerseyNumber: a.jerseyNumber,
            name: a.name,
            position: a.position,
            documentNumber: a.documentNumber,
            isCaptain: a.isCaptain,
            isLibero: a.isLibero,
          })),
        },
      ],
      competition?.name || 'Competição Oficial',
    );
    const safeName = team.teamName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    downloadReportsPdf(doc, `relacao_nominal_${safeName}.pdf`);
    toast.success('Relação nominal gerada em PDF oficial!');
  };

  const handleExportBoletim = () => {
    if (!competition) return;
    const rows = matches
      .filter(m => m.competitionId === competition.id)
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
      .map(m => {
        const teamA = allTeams.find(t => t.id === m.teamAId);
        const teamB = allTeams.find(t => t.id === m.teamBId);
        const setsA = m.sets.filter(s => s.scoreA > s.scoreB).length;
        const setsB = m.sets.filter(s => s.scoreB > s.scoreA).length;
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


  // Cálculo da Classificação
  const standingsGroups = useMemo(() => {
    if (!competition) return [];
    const compTeams = allTeams.map(t => ({ team: t, groupName: competition.groupName || 'Geral' }));
    return computeStandingsByGroup(compTeams, matches, {
      competition,
    });
  }, [competition, allTeams, matches]);

  if (loading) {
    return (
      <PublicShell>
        <div className="space-y-6 max-w-5xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-72 mx-auto" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </PublicShell>
    );
  }

  if (notFound || !team) {
    return (
      <PublicShell>
        <Card className="max-w-lg mx-auto text-center my-12 border-border shadow-lg">
          <CardContent className="p-10 space-y-4">
            <AlertTriangle className="w-14 h-14 text-warning mx-auto" />
            <h2 className="text-2xl font-display font-bold text-foreground">Acesso Não Encontrado</h2>
            <p className="text-sm text-muted-foreground">
              O link de acesso ou token desta equipe não foi localizado. Solicite o link atualizado ao organizador da competição.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/">Ir para o Início</Link>
            </Button>
          </CardContent>
        </Card>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-5">
        {/* Barra Superior do Gestor */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-card border border-border shadow-none">
          <div className="flex items-center gap-3 min-w-0">
            {teamRecord?.logoUrl ? (
              <img
                src={teamRecord.logoUrl}
                alt=""
                className="w-10 h-10 rounded-lg object-contain bg-zinc-950 p-1 border border-zinc-800"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-200 flex items-center justify-center font-semibold text-xs">
                {team.teamShortName.slice(0, 3)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground truncate">{team.teamName}</h1>
                <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 h-4 uppercase border-zinc-800 bg-zinc-900 text-zinc-400">{team.teamShortName}</Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Volleyball className="w-3.5 h-3.5 text-zinc-400" />
                {competition?.name || 'Competição Oficial'} · Portal do Gestor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Button
              variant={hasNotifPerm ? 'outline' : 'default'}
              size="sm"
              onClick={handleToggleNotifications}
              className="text-xs h-8 rounded-md font-medium gap-1.5 flex-1 sm:flex-initial border-border hover:bg-zinc-800/60"
            >
              <Bell className="w-3.5 h-3.5 text-zinc-400" />
              {hasNotifPerm ? 'Notificações Ativas' : 'Ativar Avisos'}
            </Button>
            <PwaInstallButton variant="outline" size="sm" className="text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 flex-1 sm:flex-initial" />
          </div>
        </div>

        {/* ── Identidade Oficial da Competição e Apoiadores do Evento ── */}
        {competition && (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 px-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              {competition.logoUrl ? (
                <img
                  src={competition.logoUrl}
                  alt={competition.name}
                  className="w-8 h-8 rounded-lg object-contain bg-zinc-950 p-1 border border-zinc-800 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 text-amber-400 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
              )}
              <div className="truncate">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Competição Oficial</span>
                <span className="font-semibold text-foreground truncate">{competition.name}</span>
              </div>
            </div>

            {/* Apoiadores do Evento (Somente Leitura) */}
            {competition.supporters && competition.supporters.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold">Apoiadores do Torneio:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {competition.supporters.map((sup) => (
                    <span
                      key={sup.id}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300"
                    >
                      {sup.logoUrl && (
                        <img src={sup.logoUrl} alt="" className="w-3.5 h-3.5 rounded object-contain" />
                      )}
                      <span>{sup.name}</span>
                      {sup.tier && <span className="text-amber-400/80 text-[9px]">({sup.tier})</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prazos e Alertas */}
        {locked ? (
          <Alert variant="destructive" className="rounded-xl bg-destructive/10 border-destructive/25 text-red-400 p-3.5">
            <Lock className="w-4 h-4 text-red-400" />
            <AlertTitle className="text-xs font-semibold text-red-300">Inscrições de Atletas Encerradas</AlertTitle>
            <AlertDescription className="text-xs text-red-400/90 mt-0.5">
              {competition && competition.status !== 'registration-open' && competition.status !== 'registration'
                ? 'As inscrições da competição foram formalmente encerradas pela organização.'
                : team.isLocked
                ? 'O organizador bloqueou edições no elenco.'
                : 'O prazo limite para entrega da lista de atletas expirou.'}{' '}
              Você ainda pode consultar os jogos, classificação e baixar súmulas oficiais.
            </AlertDescription>
          </Alert>
        ) : countdown ? (
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              Prazo de Inscrição: {formatDeadline(team.registrationDeadline)}
            </span>
            <Badge variant="outline" className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px] py-0 px-2 h-4">
              {countdown.label}
            </Badge>
          </div>
        ) : null}

        {/* Abas do Módulo do Gestor */}
        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as typeof activeTab)} className="space-y-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-0.5 bg-zinc-900 rounded-md border border-zinc-800 gap-0.5">
            <TabsTrigger value="elenco" className="gap-1.5 py-1.5 text-xs font-medium rounded-sm data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              Elenco ({athletes.length})
            </TabsTrigger>
            <TabsTrigger value="jogos" className="gap-1.5 py-1.5 text-xs font-medium rounded-sm data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              Jogos ({matches.length})
            </TabsTrigger>
            <TabsTrigger value="classificacao" className="gap-1.5 py-1.5 text-xs font-medium rounded-sm data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground">
              <Trophy className="w-3.5 h-3.5" />
              Classificação
            </TabsTrigger>
            <TabsTrigger value="boletins" className="gap-1.5 py-1.5 text-xs font-medium rounded-sm data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground">
              <FileText className="w-3.5 h-3.5" />
              Boletins e Documentos
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: ELENCO */}
          <TabsContent value="elenco" className="space-y-3.5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Relação Nominal de Atletas
                </h2>
                <p className="text-xs text-muted-foreground">
                  Mínimo {limits.min} e máximo {limits.max} atletas. (1 Capitão e até {MAX_LIBEROS} Líberos).
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={handleExportRoster} className="text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 gap-1.5 flex-1 sm:flex-initial">
                  <FileDown className="w-3.5 h-3.5 text-zinc-400" />
                  Relação em PDF
                </Button>
                {!locked && (
                  <Button
                    size="sm"
                    onClick={() => { setEditingAthlete(undefined); setModalOpen(true); }}
                    disabled={athletes.length >= limits.max}
                    className="text-xs h-8 rounded-md font-medium gap-1.5 flex-1 sm:flex-initial shadow-none"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Atleta
                  </Button>
                )}
              </div>
            </div>

            {/* Tabela / Cards de Atletas */}
            <Card className="border-border bg-card shadow-none">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-900/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                      <tr>
                        <th className="p-2.5 text-center w-12">Nº</th>
                        <th className="p-2.5">Nome do Atleta</th>
                        <th className="p-2.5">Posição</th>
                        <th className="p-2.5">Documento (RG/CPF)</th>
                        <th className="p-2.5 text-center">Função</th>
                        {!locked && <th className="p-2.5 text-right">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {athletes.length === 0 ? (
                        <tr>
                          <td colSpan={locked ? 5 : 6} className="p-8 text-center text-muted-foreground">
                            Nenhum atleta cadastrado ainda.{' '}
                            {!locked && 'Clique em "Adicionar Atleta" para compor seu elenco.'}
                          </td>
                        </tr>
                      ) : (
                        athletes.map((a) => (
                          <tr key={a.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="p-2.5 text-center font-mono font-semibold text-foreground">
                              {a.jerseyNumber !== undefined ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono font-bold text-xs">
                                  {a.jerseyNumber}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-[10px] italic">S/N</span>
                              )}
                            </td>
                            <td className="p-2.5 font-medium text-foreground">
                              {a.name}
                            </td>
                            <td className="p-2.5 text-muted-foreground">{a.position}</td>
                            <td className="p-2.5 font-mono text-muted-foreground">{a.documentNumber || '—'}</td>
                            <td className="p-2.5 text-center">
                              {a.isCaptain && (
                                <Badge variant="default" className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] py-0 px-1.5 h-4">
                                  CAP
                                </Badge>
                              )}
                              {a.isLibero && (
                                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[9px] py-0 px-1.5 h-4">
                                  LÍBERO
                                </Badge>
                              )}
                            </td>
                            {!locked && (
                              <td className="p-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setEditingAthlete(a); setModalOpen(true); }}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-zinc-800 rounded-md"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemove(a)}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 hover:bg-zinc-800 rounded-md"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Botão Finalizar Elenco */}
            {!locked && athletes.length >= limits.min && team.status !== 'submitted' && (
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={handleSubmitRoster}
                  disabled={submitting}
                  className="gap-1.5 h-8 text-xs rounded-md font-medium shadow-none"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? 'Finalizando...' : 'Finalizar e Confirmar Elenco'}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ABA 2: JOGOS DA COMPETIÇÃO */}
          <TabsContent value="jogos" className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Partidas e Resultados
                </h2>
                <p className="text-xs text-muted-foreground">Acompanhe as parciais e visualize a Súmula Oficial CBV de cada partida.</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportBoletim} className="text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 gap-1.5">
                <FileDown className="w-3.5 h-3.5 text-zinc-400" />
                Baixar Boletim
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {matches.length === 0 ? (
                <Card className="col-span-2 text-center p-8 text-muted-foreground text-xs border-border bg-card shadow-none">
                  Nenhuma partida agendada para esta competição até o momento.
                </Card>
              ) : (
                matches.map((m) => {
                  const isCompleted = m.status === 'completed' || m.status === 'homologated';
                  const setsA = m.sets.filter(s => s.scoreA > s.scoreB).length;
                  const setsB = m.sets.filter(s => s.scoreB > s.scoreA).length;
                  const isMyTeam = m.teamAId === team.teamId || m.teamBId === team.teamId;

                  return (
                    <Card key={m.id} className={`card-elevated hover-raise shadow-none border ${isMyTeam ? 'border-zinc-700 bg-zinc-900/90' : 'border-border bg-card'}`}>
                      <CardHeader className="p-3 pb-2 border-b border-border bg-zinc-950/40">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-muted-foreground text-[11px]">
                            Jogo #{m.matchNumber} · {m.phase || 'Classificatória'}
                          </span>
                          <Badge variant={isCompleted ? 'default' : 'secondary'} className="text-[9px] py-0 px-1.5 h-4">
                            {isCompleted ? 'Finalizado' : 'Agendado'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3.5 space-y-2.5">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className={`font-semibold truncate ${m.teamAId === team.teamId ? 'text-primary' : 'text-foreground'}`}>
                              {m.teamAName}
                            </span>
                            <span className="font-mono font-bold text-base tabular-nums">{isCompleted ? setsA : '—'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className={`font-semibold truncate ${m.teamBId === team.teamId ? 'text-primary' : 'text-foreground'}`}>
                              {m.teamBName}
                            </span>
                            <span className="font-mono font-bold text-base tabular-nums">{isCompleted ? setsB : '—'}</span>
                          </div>
                        </div>

                        {/* Parciais de sets */}
                        {m.sets.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-border text-[10px] text-muted-foreground">
                            <span className="font-medium uppercase">Sets:</span>
                            {m.sets.map((s, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono font-semibold">
                                {s.scoreA}x{s.scoreB}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Destaque da Partida (MVP) — visível em partidas homologadas */}
                        {m.status === 'homologated' && m.highlightAthleteId && (() => {
                          const myAthlete = athletes.find(a => a.id === m.highlightAthleteId);
                          return (
                            <div
                              className={`flex items-center gap-1.5 p-1.5 rounded-md text-[11px] font-semibold ${
                                myAthlete
                                  ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                                  : 'bg-zinc-800/60 border border-zinc-700/50 text-zinc-300'
                              }`}
                              data-testid="team-portal-highlight"
                            >
                              <Trophy className={`w-3.5 h-3.5 shrink-0 ${myAthlete ? 'text-amber-400' : 'text-zinc-400'}`} />
                              <span className="truncate">
                                Destaque do Jogo: {myAthlete ? `${myAthlete.jerseyNumber != null ? `#${myAthlete.jerseyNumber} ` : ''}${myAthlete.name} (Sua Equipe)` : 'Atleta Oficial'}
                              </span>
                            </div>
                          );
                        })()}

                        <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] text-muted-foreground">
                          <span className="truncate">{m.venue || 'Ginásio Principal'} · {m.court || 'Quadra 1'}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedMatch(m)}
                            className="h-6 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground hover:bg-zinc-800 rounded-md"
                          >
                            <Eye className="w-3 h-3 text-zinc-400" />
                            Súmula Oficial
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* ABA 3: CLASSIFICAÇÃO */}
          <TabsContent value="classificacao" className="space-y-3.5">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-zinc-400" />
                Classificação Oficial
              </h2>
              <p className="text-xs text-muted-foreground">Pontuação com critérios FIVB/CBV, sets ratio e confronto direto.</p>
            </div>

            {standingsGroups.map((group, idx) => (
              <Card key={idx} className="border-border bg-card shadow-none">
                <CardHeader className="p-3 border-b border-border bg-zinc-900/60">
                  <CardTitle className="text-xs font-semibold text-foreground">{group.groupName}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-zinc-900/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                        <tr>
                          <th className="p-2 text-center w-10">Pos</th>
                          <th className="p-2">Equipe</th>
                          <th className="p-2 text-center font-bold text-foreground">PTS</th>
                          <th className="p-2 text-center">J</th>
                          <th className="p-2 text-center">V</th>
                          <th className="p-2 text-center">D</th>
                          <th className="p-2 text-center">Sets P/C</th>
                          <th className="p-2 text-center">Sets Ratio</th>
                          <th className="p-2 text-center">Pts Ratio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {group.standings.map((s) => (
                          <tr
                            key={s.teamId}
                            className={`hover:bg-zinc-800/30 transition-colors ${s.teamId === team.teamId ? 'bg-zinc-800/60 font-semibold' : ''}`}
                          >
                            <td className="p-2 text-center font-bold">{s.position}º</td>
                            <td className="p-2 font-medium text-foreground flex items-center gap-1.5">
                              {s.teamName}
                              {s.teamId === team.teamId && <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-zinc-700 bg-zinc-800 text-zinc-300">Sua Equipe</Badge>}
                            </td>
                            <td className="p-2 text-center font-mono font-bold text-primary">{s.competitionPoints}</td>
                            <td className="p-2 text-center font-mono text-muted-foreground">{s.matchesPlayed}</td>
                            <td className="p-2 text-center font-mono text-emerald-400">{s.matchesWon}</td>
                            <td className="p-2 text-center font-mono text-red-400">{s.matchesLost}</td>
                            <td className="p-2 text-center font-mono text-muted-foreground">{s.setsWon}/{s.setsLost}</td>
                            <td className="p-2 text-center font-mono text-muted-foreground">{s.setsRatio === 999 ? 'MAX' : s.setsRatio.toFixed(3)}</td>
                            <td className="p-2 text-center font-mono text-muted-foreground">{s.pointsRatio.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ABA 4: BOLETINS & DOCUMENTOS */}
          <TabsContent value="boletins" className="space-y-3.5">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Documentos e Boletins Oficiais
              </h2>
              <p className="text-xs text-muted-foreground">Baixe tabelas e relatórios oficiais padronizados.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Card className="p-4 space-y-3 border border-border bg-card shadow-none hover-raise">
                <div className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs sm:text-sm text-foreground">Boletim Geral de Jogos</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Confrontos, horários, ginásios e resultados atualizados.</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleExportBoletim} className="w-full text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 gap-1.5">
                  <FileDown className="w-3.5 h-3.5 text-zinc-400" /> Baixar Boletim PDF
                </Button>
              </Card>

              <Card className="p-4 space-y-3 border border-border bg-card shadow-none hover-raise">
                <div className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs sm:text-sm text-foreground">Relação Nominal da Equipe</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Documento com atletas, capitão, líberos e comissão técnica.</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleExportRoster} className="w-full text-xs h-8 rounded-md border-border hover:bg-zinc-800/60 gap-1.5">
                  <FileDown className="w-3.5 h-3.5 text-zinc-400" /> Baixar Elenco PDF
                </Button>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Adicionar/Editar Atleta */}
      <AthleteFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        athlete={editingAthlete}
        gender={genderForForm}
        onSubmit={editingAthlete ? handleUpdate : handleAdd}
      />

      {/* Modal de Emissão de Súmula Oficial CBV */}
      <MatchSheetEmitDialog
        match={selectedMatch}
        competition={competition}
        open={selectedMatch !== null}
        onOpenChange={v => { if (!v) setSelectedMatch(null); }}
      />
    </PublicShell>
  );
}

export default TeamRosterRegistrationPage;