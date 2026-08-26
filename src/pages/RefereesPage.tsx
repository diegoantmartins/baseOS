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
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Árbitros</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Gestão do quadro de árbitros e escalas oficiais</p>
          </div>
          <Button size="sm" className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Novo Árbitro
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="card-elevated shadow-none">
            <CardContent className="p-3.5">
              <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Total de Árbitros</span>
              <p className="text-xl font-semibold tabular-nums text-foreground mt-1">{referees.length}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated shadow-none">
            <CardContent className="p-3.5">
              <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Disponíveis</span>
              <p className="text-xl font-semibold tabular-nums text-foreground mt-1">
                {referees.filter(r => r.status === 'available').length}
              </p>
            </CardContent>
          </Card>
          <Card className="card-elevated shadow-none">
            <CardContent className="p-3.5">
              <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Internacionais</span>
              <p className="text-xl font-semibold tabular-nums text-foreground mt-1">
                {referees.filter(r => r.level === 'international').length}
              </p>
            </CardContent>
          </Card>
          <Card className="card-elevated shadow-none">
            <CardContent className="p-3.5">
              <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Jogos Apitados</span>
              <p className="text-xl font-semibold tabular-nums text-foreground mt-1">
                {referees.reduce((acc, r) => acc + r.matchesRefereed, 0)}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Referees List */}
          <motion.div variants={item} className="lg:col-span-2 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar árbitros..."
                className="pl-8 text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2.5">
              {loading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  {filteredReferees.map(referee => (
                    <Card key={referee.id} className="card-elevated hover-raise shadow-none border border-border bg-card group">
                      <CardContent className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700/60 font-semibold flex items-center justify-center text-xs shrink-0">
                            {referee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">{referee.name}</h3>
                              <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-300">
                                {referee.level === 'international' ? 'Internacional' : referee.level === 'national' ? 'Nacional' : 'Regional'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 text-[11px]">
                                <Award className="w-3 h-3 text-zinc-500" />
                                {referee.matchesRefereed} jogos
                              </span>
                              <span className="text-[11px]">{referee.activeCompetitions.length} competições</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant={referee.status === 'available' ? 'outline' : 'secondary'} className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-300">
                              {statusLabels[referee.status]}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-800 rounded-md">
                                  <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-xs">
                                <DropdownMenuItem className="gap-2 text-xs" onClick={() => setViewing(referee)}>
                                  <Eye className="w-3.5 h-3.5" /> Ver Perfil
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-xs" onClick={() => navigate('/jogos/novo')}>
                                  <Calendar className="w-3.5 h-3.5" /> Escalar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-xs" onClick={() => setEditing(referee)}>
                                  <Edit className="w-3.5 h-3.5" /> Editar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {referee.nextMatch && (
                          <div className="mt-2.5 pt-2 border-t border-border flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            <span className="text-[11px]">Próximo:</span>
                            <span className="font-medium text-foreground text-[11px] truncate">{referee.nextMatch.teams}</span>
                            <span className="text-zinc-600">·</span>
                            <span className="text-[11px]">
                              {new Date(referee.nextMatch.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {filteredReferees.length === 0 && (
                    <Card className="card-elevated shadow-none">
                      <CardContent className="p-8 text-center text-xs text-muted-foreground">
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
            <Card className="card-elevated shadow-none border border-border bg-card h-full">
              <CardHeader className="p-3.5 pb-2 border-b border-border bg-zinc-900/60">
                <CardTitle className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  Escala de Arbitragem
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2.5">
                {schedule.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Nenhum jogo futuro com árbitros escalados.</p>
                )}
                {schedule.slice(0, 4).map(match => (
                  <div key={match.id} className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {new Date(match.scheduledTime).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} ·{' '}
                        {new Date(match.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <p className="font-semibold text-xs text-foreground truncate">{match.teamAName} vs {match.teamBName}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Building2 className="w-3 h-3 text-zinc-500" />
                      <span className="truncate">{match.referees.map(ref => ref.name).join(', ') || 'A definir'}</span>
                    </div>
                  </div>
                ))}
                {schedule.length > 0 && (
                  <Button variant="outline" size="sm" className="w-full text-xs h-8 rounded-md border-border hover:bg-zinc-800/60" onClick={() => setScheduleOpen(true)}>
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
      <DialogContent className="sm:max-w-md bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">{isEdit ? 'Editar Árbitro' : 'Novo Árbitro'}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Cadastre ou atualize os dados do árbitro.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label htmlFor="referee-name" className="text-[10px] uppercase font-semibold text-muted-foreground">Nome Completo</Label>
            <Input id="referee-name" value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Nível de Certificação</Label>
            <Select value={level} onValueChange={(v: Level) => setLevel(v)}>
              <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="regional" className="text-xs">Regional</SelectItem>
                <SelectItem value="national" className="text-xs">Nacional</SelectItem>
                <SelectItem value="international" className="text-xs">Internacional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">Cancelar</Button>
          <Button size="sm" disabled={!canSubmit || submitting} onClick={handleSubmit} className="h-8 text-xs rounded-md font-medium shadow-none">
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
      <DialogContent className="sm:max-w-md bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">Perfil do Árbitro</DialogTitle>
        </DialogHeader>
        {referee && (
          <div className="space-y-2.5 py-1 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/60 font-semibold flex items-center justify-center text-xs text-zinc-200">
                {referee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{referee.name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{referee.level}</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
              <span className="text-muted-foreground">Jogos apitados</span>
              <span className="font-medium text-foreground">{referee.matchesRefereed}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
              <span className="text-muted-foreground">Competições</span>
              <span className="font-medium text-foreground">{referee.activeCompetitions.length}</span>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1.5">Próximos jogos</p>
              {schedule.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum jogo futuro escalado.</p>
              ) : (
                <div className="space-y-1.5">
                  {schedule.slice(0, 3).map(m => (
                    <div key={m.id} className="text-xs p-2 rounded-md bg-zinc-900/60 border border-zinc-800">
                      {m.teamAShortName} vs {m.teamBShortName} · {compName(m.competitionId)} ·{' '}
                      {new Date(m.scheduledTime).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">Fechar</Button>
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
      <DialogContent className="sm:max-w-lg bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">Escala de Arbitragem</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto space-y-2 py-1 text-xs">
          {schedule.map(match => (
            <div key={match.id} className="p-2.5 rounded-md bg-zinc-900/60 border border-zinc-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  {new Date(match.scheduledTime).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} ·{' '}
                  {new Date(match.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>{compName(match.competitionId)}</span>
              </div>
              <p className="font-semibold text-foreground">{match.teamAName} vs {match.teamBName}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Building2 className="w-3 h-3 text-zinc-500" />
                <span>{match.referees.map(ref => ref.name).join(', ') || 'A definir'}</span>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RefereesPage;