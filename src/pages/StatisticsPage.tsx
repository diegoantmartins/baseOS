import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Trophy,
  Users,
  Target,
  Zap,
  Shield,
  Award
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const matchesPerMonth = [
  { month: 'Ago', jogos: 24 },
  { month: 'Set', jogos: 32 },
  { month: 'Out', jogos: 38 },
  { month: 'Nov', jogos: 45 },
  { month: 'Dez', jogos: 28 },
  { month: 'Jan', jogos: 52 },
];

type RankingRow = {
  name: string;
  team: string;
  avg: number;
  [stat: string]: string | number;
};

const topScorers: RankingRow[] = [
  { name: 'Gabi Guimarães', team: 'MIN', points: 892, avg: 19.8 },
  { name: 'Yoandy Leal', team: 'SAD', points: 945, avg: 19.7 },
  { name: 'Wallace de Souza', team: 'SES', points: 890, avg: 19.3 },
  { name: 'Rosamaria', team: 'OSA', points: 756, avg: 18.0 },
  { name: 'Ana Patrícia', team: 'DUD', points: 1245, avg: 23.9 },
];

const topBlockers: RankingRow[] = [
  { name: 'Thaísa Daher', team: 'OSA', blocks: 112, avg: 2.8 },
  { name: 'Ana Patrícia', team: 'DUD', blocks: 156, avg: 3.0 },
  { name: 'Bruno Schmidt', team: 'EVA', blocks: 145, avg: 3.0 },
  { name: 'Wallace de Souza', team: 'SES', blocks: 68, avg: 1.5 },
  { name: 'Gabi Guimarães', team: 'MIN', blocks: 45, avg: 1.0 },
];

const topAces: RankingRow[] = [
  { name: 'Duda Lisboa', team: 'DUD', aces: 112, avg: 2.2 },
  { name: 'Ana Patrícia', team: 'DUD', aces: 89, avg: 1.7 },
  { name: 'Yoandy Leal', team: 'SAD', aces: 82, avg: 1.7 },
  { name: 'Bruno Schmidt', team: 'EVA', aces: 76, avg: 1.6 },
  { name: 'Gabi Guimarães', team: 'MIN', aces: 67, avg: 1.5 },
];

const competitionDistribution = [
  { name: 'Superliga Fem', value: 35, color: 'hsl(var(--accent))' },
  { name: 'Superliga Masc', value: 30, color: 'hsl(var(--primary))' },
  { name: 'Circuito Praia', value: 20, color: 'hsl(var(--beach))' },
  { name: 'Copa Brasil', value: 15, color: 'hsl(var(--success))' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const StatisticsPage = () => {
  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Estatísticas</h1>
            <p className="text-muted-foreground mt-1">Análise de desempenho e rankings</p>
          </div>
          <Select defaultValue="2024-25">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Temporada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-25">2024/25</SelectItem>
              <SelectItem value="2023-24">2023/24</SelectItem>
              <SelectItem value="2022-23">2022/23</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Overview Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Trophy className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">219</p>
                <p className="text-sm text-muted-foreground">Jogos Realizados</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">48.2K</p>
                <p className="text-sm text-muted-foreground">Pontos Marcados</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Zap className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">2.4K</p>
                <p className="text-sm text-muted-foreground">Aces</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-beach/10">
                <Shield className="w-6 h-6 text-beach" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">3.1K</p>
                <p className="text-sm text-muted-foreground">Bloqueios</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Matches per Month */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="card-elevated h-full">
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-accent" />
                  Jogos por Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={matchesPerMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="jogos" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Competition Distribution */}
          <motion.div variants={item}>
            <Card className="card-elevated h-full">
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent" />
                  Por Competição
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={competitionDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {competitionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {competitionDistribution.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-semibold">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Rankings */}
        <motion.div variants={item}>
          <Tabs defaultValue="scorers" className="space-y-4">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="scorers" className="gap-2">
                <Target className="w-4 h-4" />
                Pontuadores
              </TabsTrigger>
              <TabsTrigger value="blockers" className="gap-2">
                <Shield className="w-4 h-4" />
                Bloqueadores
              </TabsTrigger>
              <TabsTrigger value="aces" className="gap-2">
                <Zap className="w-4 h-4" />
                Aces
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scorers">
              <RankingTable data={topScorers} statKey="points" statLabel="Pontos" />
            </TabsContent>
            <TabsContent value="blockers">
              <RankingTable data={topBlockers} statKey="blocks" statLabel="Bloqueios" />
            </TabsContent>
            <TabsContent value="aces">
              <RankingTable data={topAces} statKey="aces" statLabel="Aces" />
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </MainLayout>
  );
};

function RankingTable({ data, statKey, statLabel }: { data: RankingRow[]; statKey: string; statLabel: string }) {
  return (
    <Card className="card-elevated">
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {data.map((athlete, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-display font-bold">
                {idx + 1}
              </div>
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {athlete.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{athlete.name}</p>
                <Badge variant="secondary" className="text-xs">{athlete.team}</Badge>
              </div>
              <div className="text-right">
                <p className="text-2xl font-display font-bold text-accent">{athlete[statKey]}</p>
                <p className="text-xs text-muted-foreground">{athlete.avg}/jogo</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default StatisticsPage;
