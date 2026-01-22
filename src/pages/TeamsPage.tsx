import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search, 
  MoreVertical,
  Trophy,
  TrendingUp,
  Volleyball,
  Waves,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Team {
  id: string;
  name: string;
  shortName: string;
  modality: 'indoor' | 'beach';
  category: string;
  athletes: number;
  coach: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  competitions: string[];
}

const mockTeams: Team[] = [
  { id: '1', name: 'Osasco Voleibol Clube', shortName: 'OSA', modality: 'indoor', category: 'Feminino Adulto', athletes: 14, coach: 'Luizomar de Moura', matchesPlayed: 18, wins: 16, losses: 2, competitions: ['Superliga Feminina', 'Copa Brasil'] },
  { id: '2', name: 'Minas Tênis Clube', shortName: 'MIN', modality: 'indoor', category: 'Feminino Adulto', athletes: 14, coach: 'Nicola Negro', matchesPlayed: 18, wins: 15, losses: 3, competitions: ['Superliga Feminina'] },
  { id: '3', name: 'Sada Cruzeiro', shortName: 'SAD', modality: 'indoor', category: 'Masculino Adulto', athletes: 14, coach: 'Filipe Ferraz', matchesPlayed: 20, wins: 18, losses: 2, competitions: ['Superliga Masculina', 'Sul-Americano'] },
  { id: '4', name: 'Sesi-SP', shortName: 'SES', modality: 'indoor', category: 'Masculino Adulto', athletes: 14, coach: 'Rubinho Guimarães', matchesPlayed: 20, wins: 14, losses: 6, competitions: ['Superliga Masculina'] },
  { id: '5', name: 'Duda/Ana Patrícia', shortName: 'DUD', modality: 'beach', category: 'Feminino', athletes: 2, coach: 'Hélio Soares', matchesPlayed: 24, wins: 20, losses: 4, competitions: ['Circuito Brasileiro', 'World Tour'] },
  { id: '6', name: 'Evandro/Bruno Schmidt', shortName: 'EVA', modality: 'beach', category: 'Masculino', athletes: 2, coach: 'Lucão', matchesPlayed: 22, wins: 16, losses: 6, competitions: ['Circuito Brasileiro'] },
  { id: '7', name: 'Praia Clube', shortName: 'PRA', modality: 'indoor', category: 'Feminino Adulto', athletes: 14, coach: 'Paulo Coco', matchesPlayed: 18, wins: 14, losses: 4, competitions: ['Superliga Feminina'] },
  { id: '8', name: 'Flamengo', shortName: 'FLA', modality: 'indoor', category: 'Feminino Adulto', athletes: 14, coach: 'Bernardinho', matchesPlayed: 18, wins: 13, losses: 5, competitions: ['Superliga Feminina'] },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const TeamsPage = () => {
  const [search, setSearch] = useState('');
  const [modalityFilter, setModalityFilter] = useState<'all' | 'indoor' | 'beach'>('all');

  const filteredTeams = mockTeams.filter(team => {
    if (modalityFilter !== 'all' && team.modality !== modalityFilter) return false;
    if (search && !team.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Equipes</h1>
            <p className="text-muted-foreground mt-1">Gerencie equipes e seus atletas</p>
          </div>
          <Button variant="accent" className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Equipe
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-foreground">{mockTeams.length}</p>
              <p className="text-sm text-muted-foreground">Total de Equipes</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-indoor">{mockTeams.filter(t => t.modality === 'indoor').length}</p>
              <p className="text-sm text-muted-foreground">Vôlei de Quadra</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-beach">{mockTeams.filter(t => t.modality === 'beach').length}</p>
              <p className="text-sm text-muted-foreground">Vôlei de Praia</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-accent">{mockTeams.reduce((acc, t) => acc + t.athletes, 0)}</p>
              <p className="text-sm text-muted-foreground">Total de Atletas</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div variants={item} className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar equipes..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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

        {/* Teams Grid */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </motion.div>
      </motion.div>
    </MainLayout>
  );
};

function TeamCard({ team }: { team: Team }) {
  const winRate = Math.round((team.wins / team.matchesPlayed) * 100);

  return (
    <Card className="card-elevated hover:shadow-lg transition-all group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center font-display font-bold text-lg',
              team.modality === 'indoor' ? 'bg-indoor text-indoor-foreground' : 'bg-beach text-beach-foreground'
            )}>
              {team.shortName}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{team.name}</h3>
              <p className="text-sm text-muted-foreground">{team.category}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2">
                <Eye className="w-4 h-4" /> Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Edit className="w-4 h-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-destructive">
                <Trash2 className="w-4 h-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Técnico</span>
            <span className="font-medium">{team.coach}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Atletas</span>
            <span className="font-medium">{team.athletes}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Vitórias</span>
            <span className="font-medium text-success">{team.wins}/{team.matchesPlayed}</span>
          </div>
          
          {/* Win Rate Bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Taxa de Vitória</span>
              <span className="font-bold text-accent">{winRate}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${winRate}%` }}
              />
            </div>
          </div>

          {/* Competitions */}
          <div className="pt-2 flex flex-wrap gap-1.5">
            {team.competitions.map((comp, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {comp}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TeamsPage;
