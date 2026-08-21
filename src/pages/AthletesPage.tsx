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
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
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
  const [infoOpen, setInfoOpen] = useState(false);

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
    toast.success('Relação nominal gerada!');
  };

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Atletas</h1>
            <p className="text-muted-foreground mt-1">Atletas inscritos nas competições</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExportRoster} disabled={athletes.length === 0}>
              <FileDown className="w-4 h-4" />
              Relação Nominal (PDF)
            </Button>
            <Button variant="accent" className="gap-2" onClick={() => setInfoOpen(true)}>
              <Plus className="w-4 h-4" />
              Novo Atleta
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-foreground">{athletes.length}</p>
              <p className="text-sm text-muted-foreground">Total de Atletas</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-foreground">{femaleCount}</p>
              <p className="text-sm text-muted-foreground">Feminino</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-foreground">{maleCount}</p>
              <p className="text-sm text-muted-foreground">Masculino</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-accent">
                {new Set(athletes.map(a => a.competitionTeamId)).size}
              </p>
              <p className="text-sm text-muted-foreground">Equipes Inscritas</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div variants={item} className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar atletas, equipes, posições..."
              className="pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={genderFilter} onValueChange={(v: typeof genderFilter) => setGenderFilter(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Gênero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="female">Feminino</SelectItem>
              <SelectItem value="male">Masculino</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')}>
              Grid
            </Button>
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')}>
              Tabela
            </Button>
          </div>
        </motion.div>

        {loading ? (
          <Card className="card-elevated">
            <CardContent className="p-12 text-center text-muted-foreground">Carregando atletas...</CardContent>
          </Card>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredAthletes.map(athlete => (
                  <Card key={athlete.id} className="card-elevated hover:shadow-lg transition-all group overflow-hidden">
                    <CardContent className="p-0">
                      <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-center">
                        <Avatar className="w-20 h-20 mx-auto border-4 border-primary-foreground/20">
                          <AvatarFallback className="bg-primary-foreground text-primary text-2xl font-display font-bold">
                            {athlete.jerseyNumber ?? '—'}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-display font-bold text-primary-foreground text-lg mt-3">{athlete.name}</h3>
                        <p className="text-primary-foreground/70 text-sm">{athlete.position}</p>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Equipe</span>
                          <Badge variant="secondary">{athlete.teamShortName}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Competição</span>
                          <span className="text-sm font-medium text-right">{athlete.competitionName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Idade</span>
                          <span className="font-medium">{athlete.age !== undefined ? `${athlete.age} anos` : '—'}</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-2">
                          {athlete.isCaptain && <Badge className="bg-warning text-warning-foreground">Capitã(o)</Badge>}
                          {athlete.isLibero && <Badge className="bg-accent text-accent-foreground">Líbero</Badge>}
                        </div>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => openTeamRegistration(athlete)}>
                          Ver inscrição da equipe
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            ) : (
              <motion.div variants={item}>
                <Card className="card-elevated overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Atleta</TableHead>
                        <TableHead>Posição</TableHead>
                        <TableHead>Equipe</TableHead>
                        <TableHead className="text-center">Camisa</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAthletes.map(athlete => (
                        <TableRow key={athlete.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                                  {athlete.jerseyNumber ?? '—'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{athlete.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {athlete.age !== undefined ? `${athlete.age} anos · ` : ''}{athlete.competitionName}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{athlete.position}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{athlete.teamShortName}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{athlete.jerseyNumber ?? '—'}</TableCell>
                          <TableCell>
                            {athlete.isCaptain ? 'Capitã(o)' : athlete.isLibero ? 'Líbero' : '—'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2" onClick={() => openTeamRegistration(athlete)}>
                                  <User className="w-4 h-4" /> Ver inscrição da equipe
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
              <Card className="card-elevated">
                <CardContent className="p-12 text-center text-muted-foreground">Nenhum atleta encontrado.</CardContent>
              </Card>
            )}
          </>
        )}
      </motion.div>

      <AlertDialog open={infoOpen} onOpenChange={setInfoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Cadastro de atletas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Os atletas são cadastrados pela <strong>inscrição online de cada equipe</strong>, acessível pelo link de convite
              (painel de inscrições → convidar equipe). Depois de inscritos, aparecem aqui automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setInfoOpen(false)}>Fechar</Button>
            <AlertDialogAction onClick={() => { setInfoOpen(false); navigate('/competicoes'); }}>
              Ir para Competições
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default AthletesPage;