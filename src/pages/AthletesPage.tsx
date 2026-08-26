import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Plus,
  Search,
  MoreVertical,
  Calendar,
  FileDown,
  ArrowRightLeft,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { dataAccess } from '@/services/dataAccess';
import { generateTeamRosterReportPdf, downloadReportsPdf } from '@/lib/pdf/reportsPdf';
import type { CompetitionRecord, TeamRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';
import { cn } from '@/lib/utils';

interface AthleteView extends CompetitionAthlete {
  teamName: string;
  teamShortName: string;
  modality: 'indoor' | 'beach';
  competitionName: string;
  age?: number;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function ageFromBirthDate(birthDate?: string): number | undefined {
  if (!birthDate) return undefined;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return undefined;
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

const AthletesPage = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<AthleteView[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [availableTeams, setAvailableTeams] = useState<(CompetitionTeam & { teamName: string, competitionName: string })[]>([]);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [transferAthlete, setTransferAthlete] = useState<AthleteView | null>(null);

  const refresh = useCallback(async () => {
    const [rows, competitionTeams, teams, competitions] = await Promise.all([
      dataAccess.listCompetitionAthletes(),
      dataAccess.listCompetitionTeams(),
      dataAccess.listTeams(),
      dataAccess.listCompetitions(),
    ]);
    const ctById = new Map(competitionTeams.map(ct => [ct.id, ct]));
    const teamById = new Map(teams.map(t => [t.id, t]));
    const compById = new Map(competitions.map(c => [c.id, c]));
    const view: AthleteView[] = rows.map(a => {
      const ct = ctById.get(a.competitionTeamId);
      const team = ct ? teamById.get(ct.teamId) : undefined;
      const comp = ct ? compById.get(ct.competitionId) : undefined;
      return {
        ...a,
        teamName: team?.name ?? 'Equipe não encontrada',
        teamShortName: team?.shortName ?? '—',
        modality: team?.modality ?? comp?.modality ?? 'indoor',
        competitionName: comp?.name ?? 'Competição',
        age: ageFromBirthDate(a.birthDate),
      };
    });
    
    setAvailableTeams(competitionTeams.map(ct => ({
      ...ct,
      teamName: teamById.get(ct.teamId)?.name ?? 'Equipe Desconhecida',
      competitionName: compById.get(ct.competitionId)?.name ?? 'Competição',
    })));
    setAthletes(view);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredAthletes = athletes.filter(athlete => {
    if (genderFilter !== 'all' && athlete.gender !== genderFilter) return false;
    if (search && !`${athlete.name} ${athlete.teamName} ${athlete.position}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const femaleCount = athletes.filter(a => a.gender === 'female').length;
  const maleCount = athletes.filter(a => a.gender === 'male').length;

  const openTeamRegistration = async (athlete: AthleteView) => {
    const ct = await dataAccess.getCompetitionTeamById(athlete.competitionTeamId);
    if (ct?.accessToken) navigate(`/equipe/inscricao/${ct.accessToken}`);
  };

  const handleRegister = async (data: Omit<CompetitionAthlete, 'id' | 'createdAt' | 'updatedAt'>) => {
    await dataAccess.createCompetitionAthlete(data);
    toast.success('Atleta cadastrado com sucesso!');
    setRegistrationOpen(false);
    refresh();
  };

  const handleTransfer = async (athleteId: string, newCompetitionTeamId: string) => {
    await dataAccess.updateCompetitionAthlete(athleteId, { competitionTeamId: newCompetitionTeamId });
    toast.success('Atleta transferido com sucesso!');
    setTransferAthlete(null);
    refresh();
  };

  const handleExportRoster = async () => {
    const [rows, competitionTeams, teams] = await Promise.all([
      dataAccess.listCompetitionAthletes(),
      dataAccess.listCompetitionTeams(),
      dataAccess.listTeams(),
    ]);
    const grouped = new Map<string, AthleteView[]>();
    for (const row of rows) {
      const ct = competitionTeams.find(c => c.id === row.competitionTeamId);
      const team = ct ? teams.find(t => t.id === ct.teamId) : undefined;
      const view: AthleteView = {
        ...row,
        teamName: team?.name ?? 'Equipe não encontrada',
        teamShortName: team?.shortName ?? '—',
        modality: team?.modality ?? 'indoor',
        competitionName: ct?.competitionId ?? 'Competição',
        age: ageFromBirthDate(row.birthDate),
      };
      const key = row.competitionTeamId;
      grouped.set(key, [...(grouped.get(key) ?? []), view]);
    }
    const doc = generateTeamRosterReportPdf(
      [...grouped.entries()].map(([ctId, list]) => {
        const ct = competitionTeams.find(c => c.id === ctId);
        const team = ct ? teams.find(t => t.id === ct.teamId) : undefined;
        return {
          name: list[0]?.teamName ?? 'Equipe',
          shortName: list[0]?.teamShortName ?? '—',
          coach: team?.coachName,
          logoUrl: team?.logoUrl,
          athletes: list.map(a => ({
            jerseyNumber: a.jerseyNumber,
            name: a.name,
            position: a.position,
            documentNumber: a.documentNumber,
            isCaptain: a.isCaptain,
            isLibero: a.isLibero,
          })),
        };
      }),
      'Relatório Geral de Atletas',
    );
    downloadReportsPdf(doc, 'relacao_nominal_atletas.pdf');
    toast.success('Relação nominal gerada com sucesso!');
  };

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Atletas</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Atletas inscritos nas competições</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 rounded-md border-border hover:bg-zinc-800/60" onClick={handleExportRoster} disabled={athletes.length === 0}>
              <FileDown className="w-3.5 h-3.5" />
              Relação Nominal (PDF)
            </Button>
            <Button size="sm" className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none" onClick={() => setRegistrationOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              Novo Atleta
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="card-elevated shadow-none">
            <CardContent className="p-3.5">
              <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Total de Atletas</span>
              <p className="text-xl font-semibold tabular-nums text-foreground mt-1">{athletes.length}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated shadow-none">
            <CardContent className="p-3.5">
              <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Feminino</span>
              <p className="text-xl font-semibold tabular-nums text-foreground mt-1">{femaleCount}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated shadow-none">
            <CardContent className="p-3.5">
              <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Masculino</span>
              <p className="text-xl font-semibold tabular-nums text-foreground mt-1">{maleCount}</p>
            </CardContent>
          </Card>
          <Card className="card-elevated shadow-none">
            <CardContent className="p-3.5">
              <span className="block text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">Equipes Inscritas</span>
              <p className="text-xl font-semibold tabular-nums text-foreground mt-1">
                {new Set(athletes.map(a => a.competitionTeamId)).size}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div variants={item} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar atletas, equipes, posições..."
              className="pl-8 text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={genderFilter} onValueChange={(v: typeof genderFilter) => setGenderFilter(v)}>
            <SelectTrigger className="w-full sm:w-[150px] text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md">
              <SelectValue placeholder="Gênero" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all" className="text-xs">Todos</SelectItem>
              <SelectItem value="female" className="text-xs">Feminino</SelectItem>
              <SelectItem value="male" className="text-xs">Masculino</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-0.5 bg-zinc-900 p-0.5 rounded-md border border-zinc-800">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn('text-xs h-7 px-2.5 rounded-sm font-medium transition-colors', viewMode === 'grid' ? 'bg-zinc-800 text-foreground' : 'text-muted-foreground')}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn('text-xs h-7 px-2.5 rounded-sm font-medium transition-colors', viewMode === 'table' ? 'bg-zinc-800 text-foreground' : 'text-muted-foreground')}
              onClick={() => setViewMode('table')}
            >
              Tabela
            </Button>
          </div>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-44 rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {filteredAthletes.map(athlete => (
                  <Card key={athlete.id} className="card-elevated hover-raise shadow-none border border-border bg-card group overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-200 flex items-center justify-center font-mono font-bold text-sm shrink-0">
                          {athlete.jerseyNumber ?? '—'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">{athlete.name}</h3>
                          <p className="text-[11px] text-muted-foreground truncate">{athlete.position || 'Geral'}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {athlete.isCaptain && (
                              <Badge variant="default" className="text-[9px] py-0 px-1 bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                CAP
                              </Badge>
                            )}
                            {athlete.isLibero && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                                LÍBERO
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-border text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">Equipe</span>
                          <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400">{athlete.teamShortName}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">Competição</span>
                          <span className="text-[11px] font-medium text-foreground truncate max-w-[130px]">{athlete.competitionName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">Idade</span>
                          <span className="text-[11px] font-medium tabular-nums text-foreground">{athlete.age !== undefined ? `${athlete.age} anos` : '—'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-border">
                        <Button variant="ghost" size="sm" className="h-7 text-xs flex-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-zinc-800" onClick={() => openTeamRegistration(athlete)}>
                          Inscrição
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs flex-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-zinc-800" onClick={() => setTransferAthlete(athlete)}>
                          Transferir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            ) : (
              <motion.div variants={item}>
                <Card className="card-elevated shadow-none overflow-hidden border border-border">
                  <Table className="text-xs">
                    <TableHeader className="bg-zinc-900/60">
                      <TableRow className="border-b border-border">
                        <TableHead className="font-semibold text-muted-foreground py-2.5">Atleta</TableHead>
                        <TableHead className="font-semibold text-muted-foreground py-2.5">Posição</TableHead>
                        <TableHead className="font-semibold text-muted-foreground py-2.5">Equipe</TableHead>
                        <TableHead className="font-semibold text-muted-foreground py-2.5 text-center">Camisa</TableHead>
                        <TableHead className="font-semibold text-muted-foreground py-2.5">Função</TableHead>
                        <TableHead className="py-2.5"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAthletes.map(athlete => (
                        <TableRow key={athlete.id} className="border-b border-border/40 hover:bg-zinc-800/30 transition-colors">
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700/60 text-zinc-300 font-mono font-bold text-xs flex items-center justify-center">
                                {athlete.jerseyNumber ?? '—'}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{athlete.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {athlete.age !== undefined ? `${athlete.age} anos · ` : ''}{athlete.competitionName}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 text-muted-foreground">{athlete.position}</TableCell>
                          <TableCell className="py-2.5">
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400">{athlete.teamShortName}</Badge>
                          </TableCell>
                          <TableCell className="py-2.5 text-center font-mono font-semibold">{athlete.jerseyNumber ?? '—'}</TableCell>
                          <TableCell className="py-2.5">
                            {athlete.isCaptain ? (
                              <Badge variant="default" className="text-[9px] py-0 px-1 bg-amber-500/20 text-amber-400 border border-amber-500/30">CAP</Badge>
                            ) : athlete.isLibero ? (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-500/40 text-emerald-400 bg-emerald-500/10">LÍBERO</Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-zinc-800 rounded-md">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-xs">
                                <DropdownMenuItem className="gap-2 text-xs" onClick={() => openTeamRegistration(athlete)}>
                                  <User className="w-3.5 h-3.5" /> Ver inscrição
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-xs" onClick={() => setTransferAthlete(athlete)}>
                                  <ArrowRightLeft className="w-3.5 h-3.5" /> Transferir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </motion.div>
            )}
            {filteredAthletes.length === 0 && (
              <Card className="card-elevated shadow-none">
                <CardContent className="p-10 text-center text-xs text-muted-foreground">Nenhum atleta encontrado.</CardContent>
              </Card>
            )}
          </>
        )}
      </motion.div>

      {/* Modal de Cadastro */}
      <AthleteRegistrationDialog
        open={registrationOpen}
        onOpenChange={setRegistrationOpen}
        teams={availableTeams}
        onSave={handleRegister}
      />

      {/* Modal de Transferência */}
      <AthleteTransferDialog
        open={!!transferAthlete}
        onOpenChange={(op) => !op && setTransferAthlete(null)}
        athlete={transferAthlete}
        teams={availableTeams}
        onTransfer={handleTransfer}
      />
    </MainLayout>
  );
};

interface AthleteRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: (CompetitionTeam & { teamName: string, competitionName: string })[];
  onSave: (data: Omit<CompetitionAthlete, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

function AthleteRegistrationDialog({ open, onOpenChange, teams, onSave }: AthleteRegistrationDialogProps) {
  const [name, setName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [competitionTeamId, setCompetitionTeamId] = useState('');
  const [position, setPosition] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!competitionTeamId) return;
    onSave({
      competitionTeamId,
      name,
      documentNumber,
      gender,
      position,
      jerseyNumber: jerseyNumber ? parseInt(jerseyNumber, 10) : undefined,
      isCaptain: false,
      isLibero: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">Cadastrar Novo Atleta</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Insira os dados do atleta e escolha a equipe de destino.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Equipe Destino</Label>
            <Select value={competitionTeamId} onValueChange={setCompetitionTeamId} required>
              <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                <SelectValue placeholder="Selecione a equipe inscrita" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {teams.map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">{t.teamName} - {t.competitionName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Nome Completo</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Documento (RG/CPF)</Label>
              <Input value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} required className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Gênero</Label>
              <Select value={gender} onValueChange={(v: 'male' | 'female') => setGender(v)}>
                <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="female" className="text-xs">Feminino</SelectItem>
                  <SelectItem value="male" className="text-xs">Masculino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Posição Principal</Label>
              <Input value={position} onChange={e => setPosition(e.target.value)} placeholder="Ex: Ponteiro" className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Nº da Camisa</Label>
              <Input value={jerseyNumber} onChange={e => setJerseyNumber(e.target.value)} type="number" min={1} max={99} className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md" />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">Cancelar</Button>
            <Button type="submit" size="sm" className="h-8 text-xs rounded-md font-medium shadow-none">Cadastrar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface AthleteTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athlete: AthleteView | null;
  teams: (CompetitionTeam & { teamName: string, competitionName: string })[];
  onTransfer: (athleteId: string, newCompetitionTeamId: string) => Promise<void>;
}

function AthleteTransferDialog({ open, onOpenChange, athlete, teams, onTransfer }: AthleteTransferDialogProps) {
  const [newTeamId, setNewTeamId] = useState('');

  useEffect(() => {
    if (open) setNewTeamId('');
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!athlete || !newTeamId) return;
    onTransfer(athlete.id, newTeamId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-border p-5 rounded-xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-foreground">Transferir Atleta</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Mover o atleta <strong>{athlete?.name}</strong> para outra equipe inscrita.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          <div className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-lg text-xs">
            <p className="text-muted-foreground text-[10px] uppercase font-semibold">Equipe atual:</p>
            <p className="font-medium text-foreground mt-0.5">{athlete?.teamName} - {athlete?.competitionName}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Nova Equipe</Label>
            <Select value={newTeamId} onValueChange={setNewTeamId} required>
              <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md">
                <SelectValue placeholder="Selecione a nova equipe" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {teams.filter(t => t.id !== athlete?.competitionTeamId).map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">{t.teamName} - {t.competitionName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs rounded-md border-border hover:bg-zinc-800/60">Cancelar</Button>
            <Button type="submit" size="sm" className="h-8 text-xs rounded-md font-medium shadow-none">Confirmar Transferência</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AthletesPage;