import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  MoreVertical,
  Award,
  Calendar,
  Clock,
  Edit,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, MatchRecord, RefereeRecord } from '@/types/entities';
import { cn } from '@/lib/utils';

type Level = 'regional' | 'national' | 'international';

interface RefereeView extends RefereeRecord {
  level: Level;
  matchesRefereed: number;
  activeCompetitions: string[];
  status: 'available' | 'busy' | 'unavailable';
  nextMatch?: { date: string; teams: string };
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const LEVELS: Level[] = ['regional', 'national', 'international'];

const RefereesPage = () => {
  const navigate = useNavigate();
  const [referees, setReferees] = useState<RefereeView[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [schedule, setSchedule] = useState<MatchRecord[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<RefereeView | null>(null);
  const [viewing, setViewing] = useState<RefereeView | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [refereeRows, matches, comps] = await Promise.all([dataAccess.listReferees(), dataAccess.listMatches(), dataAccess.listCompetitions()]);
    setMatchesData(matches, comps);
    const now = Date.now();
    const view: RefereeView[] = refereeRows.map(r => {
      const mine = matches.filter(m => m.referees.some(ref => ref.name === r.name));
      const isBusy = mine.some(m => m.status === 'in-progress' || m.status === 'warmup' || m.status === 'timeout' || m.status === 'set-break');
      const next = mine
        .filter(m => m.status !== 'completed' && new Date(m.scheduledTime).getTime() > now)
        .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))[0];
      return {
        ...r,
        level: LEVELS.includes(r.level as Level) ? (r.level as Level) : 'regional',
        matchesRefereed: mine.filter(m => m.status === 'completed').length,
        activeCompetitions: mine.map(m => comps.find(c => c.id === m.competitionId)?.name ?? m.competitionId).filter((v, i, arr) => arr.indexOf(v) === i),
        status: isBusy ? 'busy' : 'available',
        nextMatch: next ? { date: next.scheduledTime, teams: `${next.teamAShortName} vs ${next.teamBShortName}` } : undefined,
      };
    });
    setReferees(view);
    setLoading(false);
  }, []);

  function setMatchesData(matches: MatchRecord[], comps: CompetitionRecord[]): void {
    const upcoming = matches.filter(m => new Date(m.scheduledTime).getTime() > Date.now()).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    setSchedule(upcoming.slice(0, 8));
    setCompetitions(comps);
  }

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredReferees = referees.filter(referee => {
    if (search && !referee.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const certificationColors = {
    regional: 'bg-muted text-muted-foreground',
    national: 'bg-primary text-primary-foreground',
    international: 'bg-accent text-accent-foreground',
  };

  const statusColors = {
    available: 'bg-success text-success-foreground',
    busy: 'bg-warning text-warning-foreground',
    unavailable: 'bg-muted text-muted-foreground',
  };

  const statusLabels = {
    available: 'Disponível',
    busy: 'Em Jogo',
    unavailable: 'Indisponível',
  };

  const handleCreate = async (input: Omit<RefereeRecord, 'id'>) => {
    await dataAccess.createReferee(input);
    toast.success(`Árbitro "${input.name}" cadastrado!`);
    setCreateOpen(false);
    await refresh();
  };

  const handleUpdate = async (id: string, updates: Partial<RefereeRecord>) => {
    await dataAccess.updateReferee(id, updates);
    toast.success('Árbitro atualizado!');
    setEditing(null);
    await refresh();
  };

  const compName = (id: string) => competitions.find(c => c.id === id)?.name ?? id;
  const scheduleByReferee = (name: string) => schedule.filter(m => m.referees.some(ref => ref.name === name));

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Árbitros</h1>
            <p className="text-muted-foreground mt-1">Gestão de árbitros e escala de jogos</p>
          </div>
          <Button variant="accent" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            Novo Árbitro
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-foreground">{referees.length}</p>
              <p className="text-sm text-muted-foreground">Total de Árbitros</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-success">
                {referees.filter(r => r.status === 'available').length}
              </p>
              <p className="text-sm text-muted-foreground">Disponíveis</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-accent">
                {referees.filter(r => r.level === 'international').length}
              </p>
              <p className="text-sm text-muted-foreground">Internacionais</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-foreground">
                {referees.reduce((acc, r) => acc + r.matchesRefereed, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Jogos Apitados</p>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Referees List */}
          <motion.div variants={item} className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar árbitros..."
                className="pl-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              {loading ? (
                <Card className="card-elevated">
                  <CardContent className="p-10 text-center text-muted-foreground">Carregando árbitros...</CardContent>
                </Card>
              ) : (
                <>
                  {filteredReferees.map(referee => (
                    <Card key={referee.id} className="card-elevated hover:shadow-lg transition-all group">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-14 h-14">
                            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                              {referee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">{referee.name}</h3>
                              <Badge className={cn('text-xs', certificationColors[referee.level])}>
                                {referee.level === 'international' ? 'Internacional' : referee.level === 'national' ? 'Nacional' : 'Regional'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Award className="w-3.5 h-3.5" />
                                {referee.matchesRefereed} jogos
                              </span>
                              <span>{referee.activeCompetitions.length} competições</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Badge className={cn(statusColors[referee.status])}>
                              {statusLabels[referee.status]}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2" onClick={() => setViewing(referee)}>
                                  <Eye className="w-4 h-4" /> Ver Perfil
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2" onClick={() => navigate('/jogos/novo')}>
                                  <Calendar className="w-4 h-4" /> Escalar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2" onClick={() => setEditing(referee)}>
                                  <Edit className="w-4 h-4" /> Editar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {referee.nextMatch && (
                          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-accent" />
                            <span className="text-muted-foreground">Próximo jogo:</span>
                            <span className="font-medium">{referee.nextMatch.teams}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground">
                              {new Date(referee.nextMatch.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {filteredReferees.length === 0 && (
                    <Card className="card-elevated">
                      <CardContent className="p-10 text-center text-muted-foreground">
                        Nenhum árbitro encontrado.
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* Schedule */}
          <motion.div variants={item}>
            <Card className="card-elevated h-full">
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" />
                  Escala de Arbitragem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {schedule.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum jogo futuro com árbitros escalados.</p>
                )}
                {schedule.slice(0, 4).map(match => (
                  <div key={match.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {new Date(match.scheduledTime).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} ·{' '}
                        {new Date(match.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <CheckCircle className="w-4 h-4 text-success" />
                    </div>
                    <p className="font-semibold text-foreground">{match.teamAName} vs {match.teamBName}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{match.referees.map(ref => ref.name).join(', ') || 'A definir'}</span>
                    </div>
                  </div>
                ))}
                {schedule.length > 0 && (
                  <Button variant="outline" className="w-full" onClick={() => setScheduleOpen(true)}>
                    Ver Escala Completa
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      <RefereeFormDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={handleCreate} />
      <RefereeFormDialog
        open={editing !== null}
        onOpenChange={v => { if (!v) setEditing(null); }}
        initial={editing ?? undefined}
        onSubmit={updates => editing && handleUpdate(editing.id, updates)}
        isEdit
      />
      <RefereeProfileDialog
        referee={viewing}
        schedule={viewing ? scheduleByReferee(viewing.name) : []}
        compName={compName}
        onClose={() => setViewing(null)}
      />
      <ScheduleDialog open={scheduleOpen} onOpenChange={setScheduleOpen} schedule={schedule} compName={compName} />
    </MainLayout>
  );
};

interface RefereeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: Omit<RefereeRecord, 'id'>) => Promise<void>;
  initial?: RefereeRecord;
  isEdit?: boolean;
}

function RefereeFormDialog({ open, onOpenChange, onSubmit, initial, isEdit }: RefereeFormDialogProps) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState<Level>('regional');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setLevel((initial?.level as Level | undefined) ?? 'regional');
    }
  }, [open, initial]);

  const canSubmit = name.trim().length >= 2;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), level });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Árbitro' : 'Novo Árbitro'}</DialogTitle>
          <DialogDescription>Cadastre ou atualize os dados do árbitro.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="referee-name">Nome</Label>
            <Input id="referee-name" value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="space-y-2">
            <Label>Nível de Certificação</Label>
            <Select value={level} onValueChange={(v: Level) => setLevel(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regional">Regional</SelectItem>
                <SelectItem value="national">Nacional</SelectItem>
                <SelectItem value="international">Internacional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="accent" disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Árbitro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RefereeProfileDialog({ referee, schedule, compName, onClose }: {
  referee: RefereeView | null;
  schedule: MatchRecord[];
  compName: (id: string) => string;
  onClose: () => void;
}) {
  return (
    <Dialog open={referee !== null} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Perfil do Árbitro</DialogTitle>
        </DialogHeader>
        {referee && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {referee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{referee.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{referee.level}</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-border/60 pb-2 text-sm">
              <span className="text-muted-foreground">Jogos apitados</span>
              <span className="font-medium">{referee.matchesRefereed}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/60 pb-2 text-sm">
              <span className="text-muted-foreground">Competições</span>
              <span className="font-medium">{referee.activeCompetitions.length}</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Próximos jogos</p>
              {schedule.length === 0 ? (
                <p className="text-sm text-muted-foreground/70">Nenhum jogo futuro escalado.</p>
              ) : (
                <div className="space-y-2">
                  {schedule.slice(0, 3).map(m => (
                    <div key={m.id} className="text-sm p-2 rounded-lg bg-muted/50">
                      {m.teamAShortName} vs {m.teamBShortName} · {compName(m.competitionId)} ·{' '}
                      {new Date(m.scheduledTime).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleDialog({ open, onOpenChange, schedule, compName }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: MatchRecord[];
  compName: (id: string) => string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Escala de Arbitragem</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto space-y-3 py-2">
          {schedule.map(match => (
            <div key={match.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {new Date(match.scheduledTime).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} ·{' '}
                  {new Date(match.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>{compName(match.competitionId)}</span>
              </div>
              <p className="font-semibold">{match.teamAName} vs {match.teamBName}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="w-3.5 h-3.5" />
                <span>{match.referees.map(ref => ref.name).join(', ') || 'A definir'}</span>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RefereesPage;