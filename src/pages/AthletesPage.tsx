import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Plus, 
  Search, 
  MoreVertical,
  Star,
  Trophy,
  Calendar,
  Edit,
  Trash2,
  Eye,
  Filter
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Athlete {
  id: string;
  name: string;
  jerseyNumber: number;
  position: string;
  team: string;
  teamShort: string;
  age: number;
  height: string;
  gender: 'male' | 'female';
  modality: 'indoor' | 'beach';
  stats: {
    matches: number;
    points: number;
    aces: number;
    blocks: number;
  };
}

const mockAthletes: Athlete[] = [
  { id: '1', name: 'Gabi Guimarães', jerseyNumber: 10, position: 'Ponteira', team: 'Minas TC', teamShort: 'MIN', age: 30, height: '1.79m', gender: 'female', modality: 'indoor', stats: { matches: 45, points: 892, aces: 67, blocks: 45 } },
  { id: '2', name: 'Rosamaria Montibeller', jerseyNumber: 7, position: 'Oposta', team: 'Osasco', teamShort: 'OSA', age: 28, height: '1.86m', gender: 'female', modality: 'indoor', stats: { matches: 42, points: 756, aces: 54, blocks: 38 } },
  { id: '3', name: 'Thaísa Daher', jerseyNumber: 6, position: 'Central', team: 'Osasco', teamShort: 'OSA', age: 37, height: '1.96m', gender: 'female', modality: 'indoor', stats: { matches: 40, points: 520, aces: 28, blocks: 112 } },
  { id: '4', name: 'Yoandy Leal', jerseyNumber: 9, position: 'Ponteiro', team: 'Sada Cruzeiro', teamShort: 'SAD', age: 35, height: '1.96m', gender: 'male', modality: 'indoor', stats: { matches: 48, points: 945, aces: 82, blocks: 35 } },
  { id: '5', name: 'Wallace de Souza', jerseyNumber: 4, position: 'Oposto', team: 'Sesi-SP', teamShort: 'SES', age: 36, height: '2.02m', gender: 'male', modality: 'indoor', stats: { matches: 46, points: 890, aces: 45, blocks: 68 } },
  { id: '6', name: 'Ana Patrícia', jerseyNumber: 1, position: 'Bloqueadora', team: 'Dupla Duda', teamShort: 'DUD', age: 26, height: '1.94m', gender: 'female', modality: 'beach', stats: { matches: 52, points: 1245, aces: 89, blocks: 156 } },
  { id: '7', name: 'Duda Lisboa', jerseyNumber: 2, position: 'Defensora', team: 'Dupla Duda', teamShort: 'DUD', age: 26, height: '1.78m', gender: 'female', modality: 'beach', stats: { matches: 52, points: 1180, aces: 112, blocks: 45 } },
  { id: '8', name: 'Bruno Schmidt', jerseyNumber: 1, position: 'Bloqueador', team: 'Dupla Evandro', teamShort: 'EVA', age: 38, height: '2.00m', gender: 'male', modality: 'beach', stats: { matches: 48, points: 980, aces: 76, blocks: 145 } },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const AthletesPage = () => {
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const filteredAthletes = mockAthletes.filter(athlete => {
    if (genderFilter !== 'all' && athlete.gender !== genderFilter) return false;
    if (search && !athlete.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Atletas</h1>
            <p className="text-muted-foreground mt-1">Cadastro e estatísticas de atletas</p>
          </div>
          <Button variant="accent" className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Atleta
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-foreground">{mockAthletes.length}</p>
              <p className="text-sm text-muted-foreground">Total de Atletas</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-foreground">
                {mockAthletes.filter(a => a.gender === 'female').length}
              </p>
              <p className="text-sm text-muted-foreground">Feminino</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-foreground">
                {mockAthletes.filter(a => a.gender === 'male').length}
              </p>
              <p className="text-sm text-muted-foreground">Masculino</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-display font-bold text-accent">
                {mockAthletes.reduce((acc, a) => acc + a.stats.points, 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Pontos Totais</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div variants={item} className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar atletas..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
            <Button 
              variant={viewMode === 'table' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Tabela
            </Button>
          </div>
        </motion.div>

        {/* Athletes View */}
        {viewMode === 'grid' ? (
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredAthletes.map((athlete) => (
              <AthleteCard key={athlete.id} athlete={athlete} />
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
                    <TableHead className="text-center">Jogos</TableHead>
                    <TableHead className="text-center">Pontos</TableHead>
                    <TableHead className="text-center">Aces</TableHead>
                    <TableHead className="text-center">Bloqueios</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAthletes.map((athlete) => (
                    <TableRow key={athlete.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                              {athlete.jerseyNumber}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{athlete.name}</p>
                            <p className="text-xs text-muted-foreground">{athlete.height} · {athlete.age} anos</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{athlete.position}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{athlete.teamShort}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{athlete.stats.matches}</TableCell>
                      <TableCell className="text-center font-bold text-accent">{athlete.stats.points}</TableCell>
                      <TableCell className="text-center">{athlete.stats.aces}</TableCell>
                      <TableCell className="text-center">{athlete.stats.blocks}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon-sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </MainLayout>
  );
};

function AthleteCard({ athlete }: { athlete: Athlete }) {
  return (
    <Card className="card-elevated hover:shadow-lg transition-all group overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-center">
          <Avatar className="w-20 h-20 mx-auto border-4 border-primary-foreground/20">
            <AvatarFallback className="bg-primary-foreground text-primary text-2xl font-display font-bold">
              {athlete.jerseyNumber}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-display font-bold text-primary-foreground text-lg mt-3">{athlete.name}</h3>
          <p className="text-primary-foreground/70 text-sm">{athlete.position}</p>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Equipe</span>
            <Badge variant="secondary">{athlete.team}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Idade</span>
            <span className="font-medium">{athlete.age} anos</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Altura</span>
            <span className="font-medium">{athlete.height}</span>
          </div>

          <div className="pt-3 border-t border-border">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-display font-bold text-accent">{athlete.stats.points}</p>
                <p className="text-xs text-muted-foreground">Pontos</p>
              </div>
              <div>
                <p className="text-lg font-display font-bold text-foreground">{athlete.stats.aces}</p>
                <p className="text-xs text-muted-foreground">Aces</p>
              </div>
              <div>
                <p className="text-lg font-display font-bold text-foreground">{athlete.stats.blocks}</p>
                <p className="text-xs text-muted-foreground">Bloqueios</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AthletesPage;
