import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreVertical,
  Award,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Eye,
  CheckCircle
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Referee {
  id: string;
  name: string;
  certificationLevel: 'regional' | 'national' | 'international';
  matchesRefereed: number;
  activeCompetitions: string[];
  status: 'available' | 'busy' | 'unavailable';
  nextMatch?: { date: string; teams: string };
}

const mockReferees: Referee[] = [
  { id: '1', name: 'Carlos Alberto Silva', certificationLevel: 'international', matchesRefereed: 342, activeCompetitions: ['Superliga Feminina', 'Superliga Masculina'], status: 'busy', nextMatch: { date: '2025-01-22', teams: 'Osasco vs Minas' } },
  { id: '2', name: 'Maria Fernanda Costa', certificationLevel: 'international', matchesRefereed: 287, activeCompetitions: ['Superliga Feminina', 'Copa Brasil'], status: 'available' },
  { id: '3', name: 'Roberto Almeida', certificationLevel: 'national', matchesRefereed: 156, activeCompetitions: ['Superliga Masculina'], status: 'available' },
  { id: '4', name: 'Ana Paula Santos', certificationLevel: 'national', matchesRefereed: 189, activeCompetitions: ['Circuito Brasileiro Praia'], status: 'busy', nextMatch: { date: '2025-01-23', teams: 'Duda/Ana vs Carol/Bárbara' } },
  { id: '5', name: 'Paulo Henrique Oliveira', certificationLevel: 'regional', matchesRefereed: 78, activeCompetitions: ['Copa São Paulo Sub-21'], status: 'available' },
  { id: '6', name: 'Juliana Martins', certificationLevel: 'national', matchesRefereed: 134, activeCompetitions: ['Superliga Feminina'], status: 'unavailable' },
];

const upcomingSchedule = [
  { date: '2025-01-22', time: '19:00', match: 'Osasco vs Minas', referee: 'Carlos Alberto Silva', venue: 'Ginásio José Liberatti' },
  { date: '2025-01-22', time: '20:30', match: 'Sesi vs Cruzeiro', referee: 'Roberto Almeida', venue: 'Ginásio Ibirapuera' },
  { date: '2025-01-23', time: '10:00', match: 'Duda/Ana vs Carol/Bárbara', referee: 'Ana Paula Santos', venue: 'Arena Praia Salvador' },
  { date: '2025-01-23', time: '19:00', match: 'Praia Clube vs Flamengo', referee: 'Maria Fernanda Costa', venue: 'Ginásio UFU' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const RefereesPage = () => {
  const [search, setSearch] = useState('');

  const filteredReferees = mockReferees.filter(referee => {
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

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Árbitros</h1>
            <p className="text-muted-foreground mt-1">Gestão de árbitros e escala de jogos</p>
          </div>
          <Button variant="accent" className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Árbitro
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-foreground">{mockReferees.length}</p>
              <p className="text-sm text-muted-foreground">Total de Árbitros</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-success">
                {mockReferees.filter(r => r.status === 'available').length}
              </p>
              <p className="text-sm text-muted-foreground">Disponíveis</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-accent">
                {mockReferees.filter(r => r.certificationLevel === 'international').length}
              </p>
              <p className="text-sm text-muted-foreground">Internacionais</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-foreground">
                {mockReferees.reduce((acc, r) => acc + r.matchesRefereed, 0)}
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
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              {filteredReferees.map((referee) => (
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
                          <Badge className={cn('text-xs', certificationColors[referee.certificationLevel])}>
                            {referee.certificationLevel === 'international' ? 'Internacional' : 
                             referee.certificationLevel === 'national' ? 'Nacional' : 'Regional'}
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
                            <DropdownMenuItem className="gap-2">
                              <Eye className="w-4 h-4" /> Ver Perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Calendar className="w-4 h-4" /> Escalar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
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
                {upcomingSchedule.map((schedule, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {new Date(schedule.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} · {schedule.time}
                      </span>
                      <CheckCircle className="w-4 h-4 text-success" />
                    </div>
                    <p className="font-semibold text-foreground">{schedule.match}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{schedule.referee}</span>
                    </div>
                  </div>
                ))}

                <Button variant="outline" className="w-full">
                  Ver Escala Completa
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </MainLayout>
  );
};

export default RefereesPage;
