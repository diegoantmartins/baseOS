import { motion } from 'framer-motion';
import { 
  Trophy, 
  Users, 
  Calendar, 
  TrendingUp,
  Volleyball,
  Waves,
  Clock,
  CheckCircle,
  ArrowRight,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const stats = [
  { label: 'Campeonatos Ativos', value: '12', icon: Trophy, trend: '+3 este mês', color: 'text-accent' },
  { label: 'Equipes Cadastradas', value: '86', icon: Users, trend: '+12 esta semana', color: 'text-primary' },
  { label: 'Jogos Hoje', value: '8', icon: Calendar, trend: '3 em andamento', color: 'text-success' },
  { label: 'Súmulas Geradas', value: '342', icon: TrendingUp, trend: '+28 esta semana', color: 'text-beach' },
];

const upcomingMatches = [
  {
    id: '1',
    teamA: 'Vôlei Osasco',
    teamB: 'Minas TC',
    time: '14:00',
    court: 'Quadra 1',
    modality: 'indoor' as const,
    status: 'scheduled',
  },
  {
    id: '2',
    teamA: 'Duda/Ana Patrícia',
    teamB: 'Carol/Bárbara',
    time: '15:30',
    court: 'Arena Praia',
    modality: 'beach' as const,
    status: 'scheduled',
  },
  {
    id: '3',
    teamA: 'Sesi-SP',
    teamB: 'Sada Cruzeiro',
    time: '16:00',
    court: 'Quadra 2',
    modality: 'indoor' as const,
    status: 'live',
  },
];

const activeCompetitions = [
  {
    id: '1',
    name: 'Superliga Masculina 2024/25',
    modality: 'indoor' as const,
    teams: 12,
    matches: 66,
    progress: 45,
  },
  {
    id: '2',
    name: 'Circuito Brasileiro de Vôlei de Praia',
    modality: 'beach' as const,
    teams: 24,
    matches: 48,
    progress: 72,
  },
  {
    id: '3',
    name: 'Copa São Paulo Sub-21',
    modality: 'indoor' as const,
    teams: 16,
    matches: 32,
    progress: 25,
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function Dashboard() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Title */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão geral das suas competições de voleibol
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Volleyball className="w-4 h-4" />
            Nova Partida
          </Button>
          <Button variant="accent" className="gap-2">
            <Trophy className="w-4 h-4" />
            Novo Campeonato
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="card-elevated hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-display font-bold mt-2 text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.trend}
                  </p>
                </div>
                <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Matches */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="card-elevated h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-xl font-display">Jogos de Hoje</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1">
                Ver todos
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className={`p-2 rounded-lg ${match.modality === 'indoor' ? 'bg-indoor text-indoor-foreground' : 'bg-beach text-beach-foreground'}`}>
                    {match.modality === 'indoor' ? (
                      <Volleyball className="w-5 h-5" />
                    ) : (
                      <Waves className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">
                        {match.teamA}
                      </span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="font-semibold text-foreground truncate">
                        {match.teamB}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {match.time}
                      </span>
                      <span>{match.court}</span>
                    </div>
                  </div>

                  {match.status === 'live' ? (
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                      </span>
                      <span className="text-sm font-semibold text-destructive">AO VIVO</span>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="gap-1">
                      <Play className="w-3.5 h-3.5" />
                      Iniciar
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Competitions */}
        <motion.div variants={item}>
          <Card className="card-elevated h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-xl font-display">Campeonatos Ativos</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1">
                Ver todos
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeCompetitions.map((comp) => (
                <div
                  key={comp.id}
                  className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${comp.modality === 'indoor' ? 'bg-indoor text-indoor-foreground' : 'bg-beach text-beach-foreground'}`}>
                      {comp.modality === 'indoor' ? (
                        <Volleyball className="w-4 h-4" />
                      ) : (
                        <Waves className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {comp.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {comp.teams} equipes · {comp.matches} jogos
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold text-foreground">{comp.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${comp.progress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-accent rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <Card className="card-elevated bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-white/10">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold">
                    Pronto para iniciar uma nova partida?
                  </h3>
                  <p className="text-primary-foreground/80 mt-1">
                    Acesse a súmula digital para registrar jogos em tempo real
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="hero-outline" size="lg" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                  Ver Súmulas
                </Button>
                <Button variant="hero" size="lg" className="bg-white text-primary hover:bg-white/90">
                  Nova Súmula
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
