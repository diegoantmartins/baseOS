// Portal Online da Equipe (Área do Responsável/Técnico).
// Acesso via link exclusivo com token: /equipe/inscricao/:token
// Sem cadastro burocrático — o próprio link identifica a equipe.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Volleyball,
  Users,
  Lock,
  Unlock,
  Clock,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { PublicShell } from '@/components/registration/PublicShell';
import { AthleteFormModal } from '@/components/registration/AthleteFormModal';
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
import { GENDER_CATEGORY_LABELS, ROSTER_LIMITS } from '@/types/registration';
import type { CompetitionAthlete, CompetitionAthleteInput, CompetitionTeam } from '@/types/registration';

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
  const [athletes, setAthletes] = useState<CompetitionAthlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<CompetitionAthlete | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [genderCategory, setGenderCategory] = useState<'male' | 'female' | 'mixed'>('mixed');
  const [competitionName, setCompetitionName] = useState<string>('');
  const [playerFormat, setPlayerFormat] = useState('6x6');

  const refresh = useCallback(async () => {
    if (!token) return;
    const ct = await getCompetitionTeamByToken(token);
    if (!ct) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const latest = await dataAccess.getCompetitionTeamById(ct.id);
    setTeam(latest);
    setAthletes(await listRoster(ct.id));
    const competition = await dataAccess.getCompetition(ct.competitionId);
    if (competition) {
      setGenderCategory(competition.genderCategory);
      setCompetitionName(competition.name);
      setPlayerFormat(competition.playerFormat);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const limits = ROSTER_LIMITS[playerFormat] ?? ROSTER_LIMITS['6x6'];
  const locked = team ? isRegistrationLocked(team, new Date(now)) : true;
  const countdown = useMemo(() => (team ? countdownText(team.registrationDeadline, now) : null), [team, now]);
  const genderForForm: 'male' | 'female' = genderCategory === 'male' ? 'male' : 'female';

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

  if (loading) {
    return (
      <PublicShell>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PublicShell>
    );
  }

  if (notFound || !team) {
    return (
      <PublicShell>
        <Card className="max-w-lg mx-auto text-center">
          <CardContent className="p-10 space-y-3">
            <AlertTriangle className="w-12 h-12 text-warning mx-auto" />
            <h2 className="text-xl font-display font-bold">Convite inválido</h2>
            <p className="text-muted-foreground">
              O link de inscrição não foi encontrado. Verifique o endereço com o organizador da competição.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </CardContent>
        </Card>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indoor/10 text-indoor border border-indoor/20 text-sm font-medium">
            <Volleyball className="w-4 h-4" />
            Vôlei de Quadra · {GENDER_CATEGORY_LABELS[genderCategory]}
          </div>
          <h1 className="text-3xl font-display font-bold">{competitionName || 'Competição'}</h1>
          <p className="text-lg text-muted-foreground">
            Inscrição de atletas · <span className="font-semibold text-foreground">{team.teamName}</span>
          </p>
          {countdown && (
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                countdown.expired ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
              }`}
            >
              {countdown.expired ? <Lock className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              {countdown.expired ? 'Prazo encerrado em ' : 'Prazo limite: '}
              {formatDeadline(team.registrationDeadline)} ({countdown.label})
            </div>
          )}
        </div>

        {/* Bloqueio */}
        {locked ? (
          <Alert variant="destructive">
            <Lock className="w-4 h-4" />
            <AlertTitle>Inscrições bloqueadas</AlertTitle>
            <AlertDescription>
              {team.isLocked
                ? 'O organizador bloqueou as edições deste elenco.'
                : 'A data limite para entrega da lista de atletas expirou.'}{' '}
              Para alterações, entre em contato com o organizador da competição.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-accent/5 border-accent/20">
            <Unlock className="w-4 h-4 text-accent" />
            <AlertTitle>Inscrições abertas</AlertTitle>
            <AlertDescription>
              Você pode adicionar, editar ou remover atletas até {formatDeadline(team.registrationDeadline)}. Mínimo de{' '}
              {limits.min} e máximo de {limits.max} atletas.
            </AlertDescription>
          </Alert>
        )}

        <RosterCard
          team={team}
          athletes={athletes}
          limits={limits}
          locked={locked}
          submitting={submitting}
          onAdd={() => {
            setEditingAthlete(undefined);
            setModalOpen(true);
          }}
          onEdit={athlete => {
            setEditingAthlete(athlete);
            setModalOpen(true);
          }}
          onRemove={handleRemove}
          onSubmitRoster={handleSubmitRoster}
        />

        {/* Resumo de validação */}
        <Card className="card-elevated">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <ShieldCheck className="w-5 h-5 text-success shrink-0" />
              <span>
                {athletes.length >= limits.min ? (
                  <>
                    Elenco completo. Mínimo de {limits.min} atletas atingido.
                    {locked && ' Lista congelada para a competição.'}
                  </>
                ) : (
                  <span className="text-warning">
                    Faltam {limits.min - athletes.length} atleta(s) para o mínimo de {limits.min}.
                  </span>
                )}
              </span>
            </div>
            {!locked && athletes.length >= limits.min && team.status !== 'submitted' && (
              <Button variant="accent" size="sm" className="gap-2" onClick={handleSubmitRoster} disabled={submitting}>
                <CheckCircle2 className="w-4 h-4" />
                {submitting ? 'Enviando...' : 'Entregar Lista de Atletas'}
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <AthleteFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        athlete={editingAthlete}
        gender={genderForForm}
        onSubmit={editingAthlete ? handleUpdate : handleAdd}
      />
    </PublicShell>
  );
}

interface RosterCardProps {
  team: CompetitionTeam;
  athletes: CompetitionAthlete[];
  limits: { min: number; max: number };
  locked: boolean;
  submitting: boolean;
  onAdd: () => void;
  onEdit: (athlete: CompetitionAthlete) => void;
  onRemove: (athlete: CompetitionAthlete) => void;
  onSubmitRoster: () => void;
}

function RosterCard({ team, athletes, limits, locked, submitting, onAdd, onEdit, onRemove, onSubmitRoster }: RosterCardProps) {
  const captainCount = athletes.filter(a => a.isCaptain).length;
  const liberoCount = athletes.filter(a => a.isLibero).length;

  return (
    <Card className="card-elevated">
      <CardHeader className="border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/10">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-lg font-display">Elenco Inscrito</CardTitle>
              <CardDescription>
                {athletes.length} de {limits.max} atletas
                {team.status === 'submitted' ? ' · Finalizado' : ' · ' + captainCount + ' capitão · ' + liberoCount + ' líbero'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!locked && athletes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={onSubmitRoster}
                disabled={submitting || team.status === 'submitted'}
              >
                <Send className="w-4 h-4" />
                {team.status === 'submitted' ? 'Elenco Finalizado' : 'Finalizar Elenco'}
              </Button>
            )}
            {!locked && (
              <Button variant="accent" size="sm" className="gap-2" onClick={onAdd}>
                <Plus className="w-4 h-4" />
                Adicionar Atleta
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {athletes.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Users className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              Nenhum atleta cadastrado ainda.{locked ? '' : ' Use o botão "Adicionar Atleta" para começar.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground w-16">Camisa</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Atleta</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Posição</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Funções</th>
                  {!locked && (
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground w-24">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {athletes.map(athlete => (
                  <tr key={athlete.id} className="border-b border-border/50 hover:bg-muted/40">
                    <td className="py-3 px-4">
                      <span className="inline-flex w-9 h-9 items-center justify-center rounded-lg bg-muted font-display font-bold">
                        {athlete.jerseyNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{athlete.name}</span>
                      {athlete.documentNumber && (
                        <span className="text-xs text-muted-foreground block">{athlete.documentNumber}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{athlete.position}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        {athlete.isCaptain && (
                          <Badge className="bg-accent/15 text-accent border-accent/30">Capitão</Badge>
                        )}
                        {athlete.isLibero && <Badge variant="outline">Líbero</Badge>}
                      </div>
                    </td>
                    {!locked && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(athlete)} aria-label="Editar atleta">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => onRemove(athlete)}
                            aria-label="Remover atleta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}