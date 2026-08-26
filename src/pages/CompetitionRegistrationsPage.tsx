// Gerenciador de Inscrições da Competição (Painel do Organizador).
// Rota: /competicoes/:id/inscricoes

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CalendarClock,
  ClipboardCopy,
  FileDown,
  Lock,
  RefreshCw,
  Unlock,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MainLayout } from '@/components/layout/MainLayout';
import { InviteTeamDialog, defaultDeadlineFromNow } from '@/components/registration/InviteTeamDialog';
import { downloadMatchSheetsBatchPdf } from '@/lib/pdf/matchSheetPdf';
import { buildMatchSheetData } from '@/lib/pdf/matchSheetDataBuilder';
import { dataAccess } from '@/services/dataAccess';
import { getMatchRosters, isRegistrationLocked } from '@/services/registrationService';
import { GENDER_CATEGORY_LABELS, REGISTRATION_STATUS_LABELS } from '@/types/registration';
import type { CompetitionRecord } from '@/types/entities';
import type { TeamRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';
import { cn } from '@/lib/utils';

function statusVariant(status: CompetitionTeam['status']): 'default' | 'secondary' | 'outline' | 'success' {
  if (status === 'approved') return 'default';
  if (status === 'submitted') return 'success';
  if (status === 'rejected') return 'outline';
  if (status === 'in_progress') return 'secondary';
  return 'outline';
}

export function CompetitionRegistrationsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<CompetitionRecord | null>(null);
  const [registrations, setRegistrations] = useState<CompetitionTeam[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<CompetitionTeam | null>(null);
  const [exporting, setExporting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    if (!id) return;
    const competition = await dataAccess.getCompetition(id);
    if (!competition) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setCompetition(competition);
    setRegistrations(await dataAccess.listCompetitionTeams(id));
    setTeams(await dataAccess.listTeams());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const invitedTeamIds = new Set(registrations.map(r => r.teamId));
  const availableTeams = teams.filter(t => !invitedTeamIds.has(t.id));

  const copyInviteLink = async (registration: CompetitionTeam) => {
    const url = `${window.location.origin}/equipe/inscricao/${registration.accessToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado!', { description: url });
    } catch {
      window.prompt('Copie o link abaixo:', url);
    }
  };

  const handleInvite = async (deadlineIso: string, teamId?: string) => {
    if (!competition || !teamId) return { ok: false, errors: ['Selecione a equipe.'] };
    const team = teams.find(t => t.id === teamId);
    await dataAccess.createCompetitionTeam({
      competitionId: competition.id,
      teamId,
      teamName: team?.name ?? '',
      teamShortName: team?.shortName ?? '',
      registrationDeadline: deadlineIso,
      isLocked: false,
      status: 'invited',
    });
    toast.success('Equipe convidada!', { description: 'Link de inscrição gerado.' });
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
    toast.success('Prazo atualizado.', { description: 'Edição reaberta para a equipe.' });
    setEditingRegistration(null);
    await refresh();
    return { ok: true, errors: [] };
  };

  const handleToggleLock = async (registration: CompetitionTeam) => {
    await dataAccess.updateCompetitionTeam(registration.id, { isLocked: !registration.isLocked });
    toast.success(registration.isLocked ? 'Edição reaberta.' : 'Edição bloqueada.');
    await refresh();
  };

  const handleExportAll = async () => {
    if (!competition) return;
    setExporting(true);
    try {
      const matches = await dataAccess.listMatches(competition.id);
      const withRosters = await Promise.all(
        matches.map(async match => {
          const rosters = await getMatchRosters(match.id);
          return buildMatchSheetData(match, competition, rosters.teamA, rosters.teamB);
        }),
      );
      if (withRosters.length === 0) {
        toast.error('Nenhuma partida nesta competição.');
        return;
      }
      downloadMatchSheetsBatchPdf(withRosters, competition.name);
      toast.success(`Súmulas de ${withRosters.length} partida(s) geradas!`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar súmulas em lote.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (notFound || !competition) {
    return (
      <MainLayout>
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-10 text-center space-y-3">
            <p className="text-muted-foreground">Competição não encontrada.</p>
            <Button variant="outline" onClick={() => navigate('/competicoes')}>
              Voltar para Competições
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Button variant="ghost" size="icon" onClick={() => navigate('/competicoes')} aria-label="Voltar" className="h-8 w-8 rounded-md hover:bg-zinc-800">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{competition.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inscrições por equipe · {GENDER_CATEGORY_LABELS[competition.genderCategory]} ·{' '}
                {competition.playerFormat}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60"
              onClick={handleExportAll}
              disabled={exporting}
            >
              <FileDown className="w-3.5 h-3.5" />
              {exporting ? 'Gerando...' : 'Súmulas de Todas as Partidas (PDF)'}
            </Button>
            <Button size="sm" className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none" onClick={() => setInviteOpen(true)} disabled={availableTeams.length === 0}>
              <UserPlus className="w-3.5 h-3.5" />
              Convidar Equipe
            </Button>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Equipes" value={registrations.length} />
          <SummaryCard
            label="Pendentes"
            value={registrations.filter(r => r.status === 'invited' || r.status === 'in_progress').length}
          />
          <SummaryCard
            label="Finalizadas"
            value={registrations.filter(r => r.status === 'submitted').length}
          />
          <SummaryCard
            label="Bloqueadas"
            value={registrations.filter(r => r.isLocked || new Date(r.registrationDeadline).getTime() < now).length}
          />
        </div>

        {/* Lista de inscrições */}
        <Card className="card-elevated shadow-none">
          <CardHeader className="p-3.5 border-b border-border">
            <CardTitle className="text-xs uppercase font-semibold tracking-wider text-muted-foreground flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              Equipes Convidadas ({registrations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {registrations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-muted-foreground">Nenhuma equipe convidada ainda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-zinc-900/50">
                      <th className="text-left py-2.5 px-3.5 font-semibold text-muted-foreground">Equipe</th>
                      <th className="text-left py-2.5 px-3.5 font-semibold text-muted-foreground">Status</th>
                      <th className="text-left py-2.5 px-3.5 font-semibold text-muted-foreground">Prazo Limite</th>
                      <th className="text-right py-2.5 px-3.5 font-semibold text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map(registration => {
                      const expired = new Date(registration.registrationDeadline).getTime() < now;
                      const locked = isRegistrationLocked(registration, new Date(now));
                      return (
                        <tr key={registration.id} className="border-b border-border/40 hover:bg-zinc-800/30 transition-colors">
                          <td className="py-2.5 px-3.5">
                            <button
                              type="button"
                              className="text-left"
                              onClick={() => navigate(`/equipe/inscricao/${registration.accessToken}`)}
                            >
                              <span className="font-medium text-foreground hover:underline inline-flex items-center gap-1.5">
                                {registration.teamName}
                                <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400">{registration.teamShortName}</Badge>
                              </span>
                            </button>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div className="flex items-center gap-1.5">
                              <Badge variant={statusVariant(registration.status)} className="text-[10px] py-0 px-1.5 h-4">
                                {REGISTRATION_STATUS_LABELS[registration.status]}
                              </Badge>
                              {locked && (
                                <Badge variant="destructive" className="gap-1 text-[10px] py-0 px-1.5 h-4">
                                  <Lock className="w-2.5 h-2.5" />
                                  {expired ? 'Expirado' : 'Bloqueado'}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className={cn('inline-flex items-center gap-1.5 tabular-nums text-muted-foreground', expired && 'text-red-400')}>
                              <CalendarClock className="w-3.5 h-3.5" />
                              {new Date(registration.registrationDeadline).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2 gap-1 rounded-md hover:bg-zinc-800"
                                onClick={() => copyInviteLink(registration)}
                              >
                                <ClipboardCopy className="w-3 h-3 text-zinc-400" />
                                Link
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2 gap-1 rounded-md hover:bg-zinc-800"
                                onClick={() => setEditingRegistration(registration)}
                              >
                                <RefreshCw className="w-3 h-3 text-zinc-400" />
                                Prorrogar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn('h-7 text-xs px-2 gap-1 rounded-md hover:bg-zinc-800', !registration.isLocked && 'text-red-400 hover:text-red-300')}
                                onClick={() => handleToggleLock(registration)}
                              >
                                {registration.isLocked ? (
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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          <Link to={`/jogos`} className="underline hover:text-foreground">
            Ir para Jogos
          </Link>{' '}
          · O link de convite dá acesso ao portal de inscrição sem necessidade de cadastro.
        </p>
      </motion.div>

      <InviteTeamDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        availableTeams={availableTeams}
        initialDeadline={competition.defaultDeadline ?? defaultDeadlineFromNow(7)}
        onConfirm={handleInvite}
      />
      <InviteTeamDialog
        open={Boolean(editingRegistration)}
        onOpenChange={open => {
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

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="card-elevated shadow-none">
      <CardContent className="p-3.5">
        <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}