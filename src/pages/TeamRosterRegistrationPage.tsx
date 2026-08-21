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
import { generateBlankServeOrderSheet } from '@/document-engine/generators/ordemSaque.generator';
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
  const limits = ROSTER_LIMITS[playerFormat] ?? ROSTER_LIMITS['6x6'];
  const locked = team ? isRegistrationLocked(team, new Date(now)) : true;
  const countdown = useMemo(() => (team ? countdownText(team.registrationDeadline, now) : null), [team, now]);
  const genderCategory = competition?.genderCategory || 'mixed';
  const genderForForm: 'male' | 'female' = genderCategory === 'male' ? 'male' : 'female';

  const handleToggleNotifications = async () => {
    const granted = await notificationService.requestPermission();
    setHasNotifPerm(granted);
  };

  const handleAdd = async (input: CompetitionAthleteInput): Promise<{ ok: boolean; errors: string[] }> => {
    if (!team) return { ok: false, errors: ['Equipe não encontrada.'] };
    const result = await addAthlete(team.id, input, playerFormat);
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
    const result = await updateAthlete(editingAthlete.id, input, playerFormat);
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
    const result = await removeAthlete(athlete.id);
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

  const handleExportPositionSheets = async () => {
    try {
      const bytes = await generateBlankServeOrderSheet();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fichas_ordem_de_saque.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Fichas de posição (ordem de saque) geradas!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar fichas de ordem de saque.');
    }
  };

  // Cálculo da Classificação
  const standingsGroups = useMemo(() => {
    if (!competition) return [];
    const compTeams = allTeams.map(t => ({ team: t, groupName: competition.groupName || 'Geral' }));
    return computeStandingsByGroup(compTeams, matches, { criteria: competition.tiebreakCriteriaOrder });
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
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        {/* Barra Superior do Gestor */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border shadow-sm">
          <div className="flex items-center gap-3.5 min-w-0">
            {teamRecord?.logoUrl ? (
              <img
                src={teamRecord.logoUrl}
                alt=""
                className="w-12 h-12 rounded-xl object-contain bg-background p-1 border shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-base shadow-xs">
                {team.teamShortName.slice(0, 3)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground truncate">{team.teamName}</h1>
                <Badge variant="outline" className="font-mono text-xs uppercase font-bold">{team.teamShortName}</Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Volleyball className="w-3.5 h-3.5 text-primary" />
                {competition?.name || 'Competição Oficial'} · Portal do Gestor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Button
              variant={hasNotifPerm ? 'outline' : 'default'}
              size="sm"
              onClick={handleToggleNotifications}
              className="text-xs gap-1.5 flex-1 sm:flex-initial"
            >
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              {hasNotifPerm ? 'Notificações Ativas' : 'Ativar Avisos em Tempo Real'}
            </Button>
            <PwaInstallButton variant="outline" size="sm" className="text-xs flex-1 sm:flex-initial" />
          </div>
        </div>

        {/* Prazos e Alertas */}
        {locked ? (
          <Alert variant="destructive" className="rounded-xl">
            <Lock className="w-4 h-4" />
            <AlertTitle>Inscrições de Atletas Encerradas</AlertTitle>
            <AlertDescription className="text-xs">
              {team.isLocked
                ? 'O organizador bloqueou edições no elenco.'
                : 'O prazo limite para entrega da lista de atletas expirou.'}{' '}
              Você ainda pode consultar os jogos, classificação e baixar súmulas oficiais.
            </AlertDescription>
          </Alert>
        ) : countdown ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Prazo de Inscrição de Elenco: {formatDeadline(team.registrationDeadline)}
            </span>
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-800 border-emerald-500/30 text-[11px]">
              {countdown.label}
            </Badge>
          </div>
        ) : null}

        {/* Abas do Módulo do Gestor */}
        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as typeof activeTab)} className="space-y-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-muted/60 rounded-xl gap-1">
            <TabsTrigger value="elenco" className="gap-1.5 py-2.5 text-xs font-semibold">
              <Users className="w-4 h-4" />
              Elenco ({athletes.length})
            </TabsTrigger>
            <TabsTrigger value="jogos" className="gap-1.5 py-2.5 text-xs font-semibold">
              <Calendar className="w-4 h-4" />
              Jogos ({matches.length})
            </TabsTrigger>
            <TabsTrigger value="classificacao" className="gap-1.5 py-2.5 text-xs font-semibold">
              <Trophy className="w-4 h-4" />
              Classificação
            </TabsTrigger>
            <TabsTrigger value="boletins" className="gap-1.5 py-2.5 text-xs font-semibold">
              <FileText className="w-4 h-4" />
              Boletins & Docs
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: ELENCO */}
          <TabsContent value="elenco" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Relação Nominal de Atletas
                </h2>
                <p className="text-xs text-muted-foreground">
                  Mínimo {limits.min} e máximo {limits.max} atletas. (1 Capitão e até {MAX_LIBEROS} Líberos).
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={handleExportRoster} className="text-xs gap-1.5 flex-1 sm:flex-initial">
                  <FileDown className="w-3.5 h-3.5" />
                  Relação em PDF
                </Button>
                {!locked && (
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => { setEditingAthlete(undefined); setModalOpen(true); }}
                    disabled={athletes.length >= limits.max}
                    className="text-xs gap-1.5 flex-1 sm:flex-initial"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Atleta
                  </Button>
                )}
              </div>
            </div>

            {/* Tabela / Cards de Atletas */}
            <Card className="border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                      <tr>
                        <th className="p-3 text-center w-12">Nº</th>
                        <th className="p-3">Nome do Atleta</th>
                        <th className="p-3">Posição</th>
                        <th className="p-3">Documento (RG/CPF)</th>
                        <th className="p-3 text-center">Função</th>
                        {!locked && <th className="p-3 text-right">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {athletes.length === 0 ? (
                        <tr>
                          <td colSpan={locked ? 5 : 6} className="p-8 text-center text-muted-foreground">
                            Nenhum atleta cadastrado ainda.{' '}
                            {!locked && 'Clique em "Adicionar Atleta" para compor seu elenco.'}
                          </td>
                        </tr>
                      ) : (
                        athletes.map((a) => (
                          <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 text-center font-mono font-bold text-foreground">
                              {a.jerseyNumber !== undefined ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-muted text-foreground border font-bold text-xs">
                                  {a.jerseyNumber}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-[10px] italic">S/N</span>
                              )}
                            </td>
                            <td className="p-3 font-semibold text-foreground">
                              {a.name}
                            </td>
                            <td className="p-3 text-muted-foreground">{a.position}</td>
                            <td className="p-3 font-mono text-muted-foreground">{a.documentNumber || '—'}</td>
                            <td className="p-3 text-center">
                              {a.isCaptain && (
                                <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white text-[10px]">
                                  Capitão (C)
                                </Badge>
                              )}
                              {a.isLibero && (
                                <Badge variant="secondary" className="bg-sky-500/10 text-sky-600 text-[10px]">
                                  Líbero (L)
                                </Badge>
                              )}
                            </td>
                            {!locked && (
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => { setEditingAthlete(a); setModalOpen(true); }}
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleRemove(a)}
                                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
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
                  variant="default"
                  onClick={handleSubmitRoster}
                  disabled={submitting}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Finalizando...' : 'Finalizar e Confirmar Elenco'}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ABA 2: JOGOS DA COMPETIÇÃO */}
          <TabsContent value="jogos" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Partidas e Resultados
                </h2>
                <p className="text-xs text-muted-foreground">Acompanhe as parciais e visualize a Súmula Oficial CBV de cada partida.</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportBoletim} className="text-xs gap-1.5">
                <FileDown className="w-3.5 h-3.5" />
                Baixar Boletim
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.length === 0 ? (
                <Card className="col-span-2 text-center p-8 text-muted-foreground text-xs">
                  Nenhuma partida agendada para esta competição até o momento.
                </Card>
              ) : (
                matches.map((m) => {
                  const isCompleted = m.status === 'completed' || m.status === 'homologated';
                  const setsA = m.sets.filter(s => s.scoreA > s.scoreB).length;
                  const setsB = m.sets.filter(s => s.scoreB > s.scoreA).length;
                  const isMyTeam = m.teamAId === team.teamId || m.teamBId === team.teamId;

                  return (
                    <Card key={m.id} className={`border transition-all ${isMyTeam ? 'border-primary/40 bg-primary/5 shadow-xs' : 'border-border'}`}>
                      <CardHeader className="p-3.5 pb-2 border-b bg-muted/20">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-muted-foreground">
                            Jogo #{m.matchNumber} · {m.phase || 'Classificatória'}
                          </span>
                          <Badge variant={isCompleted ? 'default' : 'secondary'} className="text-[10px]">
                            {isCompleted ? 'Finalizado' : 'Agendado'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className={`font-bold truncate ${m.teamAId === team.teamId ? 'text-primary' : 'text-foreground'}`}>
                              {m.teamAName}
                            </span>
                            <span className="font-mono font-bold text-lg">{isCompleted ? setsA : '—'}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className={`font-bold truncate ${m.teamBId === team.teamId ? 'text-primary' : 'text-foreground'}`}>
                              {m.teamBName}
                            </span>
                            <span className="font-mono font-bold text-lg">{isCompleted ? setsB : '—'}</span>
                          </div>
                        </div>

                        {/* Parciais de sets */}
                        {m.sets.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t text-[11px] text-muted-foreground">
                            <span className="font-medium">Sets:</span>
                            {m.sets.map((s, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-muted font-mono font-semibold">
                                {s.scoreA}x{s.scoreB}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                          <span className="truncate">{m.venue || 'Ginásio Principal'} · {m.court || 'Quadra 1'}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedMatch(m)}
                            className="h-7 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <Eye className="w-3.5 h-3.5" />
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
          <TabsContent value="classificacao" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Classificação Oficial
                </h2>
                <p className="text-xs text-muted-foreground">Pontuação com critérios FIVB/CBV, sets ratio e confronto direto.</p>
              </div>
            </div>

            {standingsGroups.map((group, idx) => (
              <Card key={idx} className="border-border">
                <CardHeader className="p-3.5 border-b bg-muted/30">
                  <CardTitle className="text-sm font-bold">{group.groupName}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                        <tr>
                          <th className="p-2.5 text-center w-10">Pos</th>
                          <th className="p-2.5">Equipe</th>
                          <th className="p-2.5 text-center font-bold text-foreground">PTS</th>
                          <th className="p-2.5 text-center">J</th>
                          <th className="p-2.5 text-center">V</th>
                          <th className="p-2.5 text-center">D</th>
                          <th className="p-2.5 text-center">Sets P/C</th>
                          <th className="p-2.5 text-center">Sets Ratio</th>
                          <th className="p-2.5 text-center">Pts Ratio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {group.standings.map((s) => (
                          <tr
                            key={s.teamId}
                            className={`hover:bg-muted/30 transition-colors ${s.teamId === team.teamId ? 'bg-primary/10 font-semibold' : ''}`}
                          >
                            <td className="p-2.5 text-center font-bold">{s.position}º</td>
                            <td className="p-2.5 font-bold text-foreground flex items-center gap-1.5">
                              {s.teamName}
                              {s.teamId === team.teamId && <Badge variant="default" className="text-[9px] h-4 px-1">Sua Equipe</Badge>}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-primary">{s.competitionPoints}</td>
                            <td className="p-2.5 text-center font-mono">{s.matchesPlayed}</td>
                            <td className="p-2.5 text-center font-mono text-emerald-600">{s.matchesWon}</td>
                            <td className="p-2.5 text-center font-mono text-destructive">{s.matchesLost}</td>
                            <td className="p-2.5 text-center font-mono">{s.setsWon}/{s.setsLost}</td>
                            <td className="p-2.5 text-center font-mono">{s.setsRatio === 999 ? 'MAX' : s.setsRatio.toFixed(3)}</td>
                            <td className="p-2.5 text-center font-mono">{s.pointsRatio.toFixed(3)}</td>
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
          <TabsContent value="boletins" className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Documentos e Boletins Oficiais
              </h2>
              <p className="text-xs text-muted-foreground">Baixe tabelas, fichas de ordem de saque e relatórios padronizados.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4 space-y-3 border hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Boletim Geral de Jogos</h3>
                  <p className="text-xs text-muted-foreground mt-1">Confrontos, horários, ginásios e resultados atualizados.</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleExportBoletim} className="w-full text-xs gap-1.5">
                  <FileDown className="w-3.5 h-3.5" /> Baixar Boletim PDF
                </Button>
              </Card>

              <Card className="p-4 space-y-3 border hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Relação Nominal da Equipe</h3>
                  <p className="text-xs text-muted-foreground mt-1">Documento com atletas, capitão, líberos e comissão técnica.</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleExportRoster} className="w-full text-xs gap-1.5">
                  <FileDown className="w-3.5 h-3.5" /> Baixar Elenco PDF
                </Button>
              </Card>

              <Card className="p-4 space-y-3 border hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <Volleyball className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Fichas de Posição / Saque</h3>
                  <p className="text-xs text-muted-foreground mt-1">8 filipetas A4 com quadrículas de rotação I a VI para jogos.</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleExportPositionSheets} className="w-full text-xs gap-1.5">
                  <FileDown className="w-3.5 h-3.5" /> Baixar Fichas PDF
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