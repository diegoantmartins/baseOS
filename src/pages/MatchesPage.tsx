import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Filter, 
  Plus,
  Play,
  Pause,
  CheckCircle,
  Volleyball,
  Waves,
  Search,
  ChevronDown
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface Match {
  id: string;
  teamA: { name: string; shortName: string; score?: number };
  teamB: { name: string; shortName: string; score?: number };
  date: string;
  time: string;
  venue: string;
  court: string;
  modality: 'indoor' | 'beach';
  status: 'scheduled' | 'live' | 'completed' | 'postponed';
  competition: string;
  sets?: { a: number; b: number }[];
}

const mockMatches: Match[] = [
  { id: '1', teamA: { name: 'Osasco Voleibol', shortName: 'OSA', score: 3 }, teamB: { name: 'Minas TC', shortName: 'MIN', score: 1 }, date: '2025-01-22', time: '19:00', venue: 'Ginásio José Liberatti', court: 'Principal', modality: 'indoor', status: 'completed', competition: 'Superliga Feminina', sets: [{ a: 25, b: 20 }, { a: 23, b: 25 }, { a: 25, b: 18 }, { a: 25, b: 22 }] },
  { id: '2', teamA: { name: 'Sesi-SP', shortName: 'SES', score: 2 }, teamB: { name: 'Sada Cruzeiro', shortName: 'SAD', score: 2 }, date: '2025-01-22', time: '20:30', venue: 'Ginásio do Ibirapuera', court: 'Quadra 1', modality: 'indoor', status: 'live', competition: 'Superliga Masculina', sets: [{ a: 25, b: 23 }, { a: 20, b: 25 }, { a: 25, b: 21 }, { a: 22, b: 25 }] },
  { id: '3', teamA: { name: 'Duda/Ana Patrícia', shortName: 'DUD' }, teamB: { name: 'Carol/Bárbara', shortName: 'CAR' }, date: '2025-01-23', time: '10:00', venue: 'Arena Praia Salvador', court: 'Arena Central', modality: 'beach', status: 'scheduled', competition: 'Circuito Brasileiro' },
  { id: '4', teamA: { name: 'Praia Clube', shortName: 'PRA' }, teamB: { name: 'Flamengo', shortName: 'FLA' }, date: '2025-01-23', time: '19:00', venue: 'Ginásio UFU', court: 'Principal', modality: 'indoor', status: 'scheduled', competition: 'Superliga Feminina' },
  { id: '5', teamA: { name: 'Evandro/Bruno', shortName: 'EVA' }, teamB: { name: 'Alison/Guto', shortName: 'ALI' }, date: '2025-01-23', time: '11:00', venue: 'Arena Praia Salvador', court: 'Quadra 2', modality: 'beach', status: 'scheduled', competition: 'Circuito Brasileiro' },
  { id: '6', teamA: { name: 'Curitiba', shortName: 'CUR', score: 0 }, teamB: { name: 'Barueri', shortName: 'BAR', score: 3 }, date: '2025-01-21', time: '20:00', venue: 'Ginásio Tarumã', court: 'Principal', modality: 'indoor', status: 'completed', competition: 'Superliga Feminina', sets: [{ a: 20, b: 25 }, { a: 18, b: 25 }, { a: 22, b: 25 }] },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const MatchesPage = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'live' | 'scheduled' | 'completed'>('all');
  const [modalityFilter, setModalityFilter] = useState<'all' | 'indoor' | 'beach'>('all');

  const filteredMatches = mockMatches.filter(match => {
    if (filter !== 'all' && match.status !== filter) return false;
    if (modalityFilter !== 'all' && match.modality !== modalityFilter) return false;
    return true;
  });

  const liveCount = mockMatches.filter(m => m.status === 'live').length;
  const todayCount = mockMatches.filter(m => m.date === '2025-01-22').length;
  const scheduledCount = mockMatches.filter(m => m.status === 'scheduled').length;

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Jogos</h1>
            <p className="text-muted-foreground mt-1">Gerencie partidas e acompanhe resultados em tempo real</p>
          </div>
          <Button variant="accent" className="gap-2" onClick={() => navigate('/jogos/novo')}>
            <Plus className="w-4 h-4" />
            Agendar Jogo
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-elevated">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10">
                <Play className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{liveCount}</p>
                <p className="text-sm text-muted-foreground">Ao Vivo</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Calendar className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{todayCount}</p>
                <p className="text-sm text-muted-foreground">Hoje</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{scheduledCount}</p>
                <p className="text-sm text-muted-foreground">Agendados</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div variants={item} className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar jogos, equipes..." className="pl-10" />
          </div>
          <Select value={filter} onValueChange={(v: typeof filter) => setFilter(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="live">Ao Vivo</SelectItem>
              <SelectItem value="scheduled">Agendados</SelectItem>
              <SelectItem value="completed">Finalizados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={modalityFilter} onValueChange={(v: typeof modalityFilter) => setModalityFilter(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Modalidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="indoor">Quadra</SelectItem>
              <SelectItem value="beach">Praia</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Matches List */}
        <motion.div variants={item} className="space-y-4">
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
          {filteredMatches.length === 0 && (
            <Card className="card-elevated">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Nenhum jogo encontrado com os filtros selecionados.</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </motion.div>
    </MainLayout>
  );
};

function MatchCard({ match }: { match: Match }) {
  const statusConfig = {
    live: { label: 'AO VIVO', variant: 'destructive' as const, icon: Play },
    scheduled: { label: 'AGENDADO', variant: 'secondary' as const, icon: Clock },
    completed: { label: 'FINALIZADO', variant: 'outline' as const, icon: CheckCircle },
    postponed: { label: 'ADIADO', variant: 'secondary' as const, icon: Pause },
  };

  const status = statusConfig[match.status];

  return (
    <Card className="card-elevated hover:shadow-lg transition-all cursor-pointer">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Left: Match Info */}
          <div className="flex-1 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'p-2 rounded-lg',
                match.modality === 'indoor' ? 'bg-indoor text-indoor-foreground' : 'bg-beach text-beach-foreground'
              )}>
                {match.modality === 'indoor' ? <Volleyball className="w-4 h-4" /> : <Waves className="w-4 h-4" />}
              </div>
              <span className="text-sm font-medium text-muted-foreground">{match.competition}</span>
              {match.status === 'live' && (
                <Badge variant="destructive" className="gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                  </span>
                  AO VIVO
                </Badge>
              )}
            </div>

            {/* Teams */}
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center font-bold text-foreground">
                      {match.teamA.shortName}
                    </div>
                    <span className="font-semibold text-lg">{match.teamA.name}</span>
                  </div>
                  {match.teamA.score !== undefined && (
                    <span className={cn(
                      'text-3xl font-display font-bold',
                      match.status === 'completed' && match.teamA.score > (match.teamB.score || 0) ? 'text-success' : 'text-foreground'
                    )}>
                      {match.teamA.score}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center font-bold text-foreground">
                      {match.teamB.shortName}
                    </div>
                    <span className="font-semibold text-lg">{match.teamB.name}</span>
                  </div>
                  {match.teamB.score !== undefined && (
                    <span className={cn(
                      'text-3xl font-display font-bold',
                      match.status === 'completed' && match.teamB.score > (match.teamA.score || 0) ? 'text-success' : 'text-foreground'
                    )}>
                      {match.teamB.score}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sets */}
            {match.sets && (
              <div className="mt-4 flex gap-2">
                {match.sets.map((set, idx) => (
                  <div key={idx} className="px-3 py-1.5 rounded-lg bg-muted text-sm">
                    <span className={cn(set.a > set.b ? 'font-bold text-success' : 'text-muted-foreground')}>{set.a}</span>
                    <span className="text-muted-foreground mx-1">-</span>
                    <span className={cn(set.b > set.a ? 'font-bold text-success' : 'text-muted-foreground')}>{set.b}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Date/Venue */}
          <div className="w-full md:w-64 p-6 bg-muted/30 border-t md:border-t-0 md:border-l border-border flex flex-col justify-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{new Date(match.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{match.time}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{match.venue}</span>
            </div>
            <Button variant={match.status === 'live' ? 'accent' : 'outline'} size="sm" className="mt-2">
              {match.status === 'live' ? 'Acompanhar' : match.status === 'scheduled' ? 'Iniciar' : 'Ver Súmula'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MatchesPage;
