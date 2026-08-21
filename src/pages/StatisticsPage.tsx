import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Trophy,
  Target,
  Zap,
  Users,
  Calendar,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';

type RankingRow = {
  name: string;
  team: string;
  value: number;
};

const CHART_COLORS = ['hsl(var(--accent))', 'hsl(var(--primary))', 'hsl(var(--beach))', 'hsl(var(--success))', 'hsl(var(--destructive))', 'hsl(var(--warning))'];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const StatisticsPage = () => {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [season, setSeason] = useState('');

  useEffect(() => {
    Promise.all([dataAccess.listMatches(), dataAccess.listCompetitions(), dataAccess.listTeams()]).then(([ms, comps, ts]) => {
      setMatches(ms);
      setCompetitions(comps);
      setTeams(ts);
      const years = ms.map(m => new Date(m.scheduledTime).getFullYear()).filter(y => !Number.isNaN(y));
      const latest = years.length > 0 ? String(Math.max(...years)) : '';
      setSeason(prev => prev || latest);
    });
  }, []);

  const seasons = useMemo(() => [...new Set(matches.map(m => new Date(m.scheduledTime).getFullYear()).filter(y => !Number.isNaN(y)))].sort((a, b) => b - a), [matches]);

  const seasonMatches = useMemo(() => (season ? matches.filter(m => new Date(m.scheduledTime).getFullYear() === Number(season)) : matches), [matches, season]);

  const completedMatches = seasonMatches.filter(m => m.status === 'completed');
  const totalPoints = seasonMatches.reduce((acc, m) => acc + m.sets.reduce((sum, s) => sum + s.scoreA + s.scoreB, 0), 0);

  const matchesPerMonth = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const m of seasonMatches) {
      const key = new Date(m.scheduledTime).toLocaleDateString('pt-BR', { month: 'short' });
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
    return [...byMonth.entries()].map(([month, jogos]) => ({ month, jogos }));
  }, [seasonMatches]);

  const competitionDistribution = useMemo(() => {
    const byComp = new Map<string, number>();
    for (const m of seasonMatches) {
      const name = competitions.find(c => c.id === m.competitionId)?.name ?? m.competitionId;
      byComp.set(name, (byComp.get(name) ?? 0) + 1);
    }
    const total = seasonMatches.length || 1;
    return [...byComp.entries()].map(([name, value], idx) => ({
      name,
      value: Math.round((value / total) * 100),
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));
  }, [seasonMatches, competitions]);

  const teamRankings = useMemo(() => {
    const stats = new Map<string, { wins: number; points: number; played: number }>();
    const add = (teamId: string, key: 'wins' | 'points' | 'played') => {
      const current = stats.get(teamId) ?? { wins: 0, points: 0, played: 0 };
      current[key] = current[key] + 1;
      stats.set(teamId, current);
    };
    for (const m of completedMatches) {
      add(m.teamAId, 'played');
      add(m.teamBId, 'played');
      const setPointsA = m.sets.reduce((sum, s) => sum + s.scoreA, 0);
      const setPointsB = m.sets.reduce((sum, s) => sum + s.scoreB, 0);
      const curA = stats.get(m.teamAId)!;
      const curB = stats.get(m.teamBId)!;
      curA.points += setPointsA;
      curB.points += setPointsB;
      stats.set(m.teamAId, curA);
      stats.set(m.teamBId, curB);
      if (m.winnerId === m.teamAId) add(m.teamAId, 'wins');
      else if (m.winnerId === m.teamBId) add(m.teamBId, 'wins');
    }
    const nameOf = (id: string) => teams.find(t => t.id === id)?.shortName ?? id;
    const wins: RankingRow[] = [...stats.entries()]
      .map(([id, s]) => ({ id, name: nameOf(id), team: nameOf(id), value: s.wins }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const points: RankingRow[] = [...stats.entries()]
      .map(([id, s]) => ({ id, name: nameOf(id), team: nameOf(id), value: s.points }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    return { wins, points };
  }, [completedMatches, teams]);

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Estatísticas</h1>
            <p className="text-muted-foreground mt-1">Análise de desempenho e rankings</p>
          </div>
          <Select value={season} onValueChange={setSeason} disabled={seasons.length === 0}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Temporada" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
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
                <p className="text-2xl font-display font-bold">{completedMatches.length}</p>
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
                <p className="text-2xl font-display font-bold">{totalPoints.toLocaleString('pt-BR')}</p>
                <p className="text-sm text-muted-foreground">Pontos Marcados</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Users className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{teams.length}</p>
                <p className="text-sm text-muted-foreground">Equipes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-beach/10">
                <Calendar className="w-6 h-6 text-beach" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{seasonMatches.length}</p>
                <p className="text-sm text-muted-foreground">Jogos na Temporada</p>
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
                {matchesPerMonth.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-20">Sem jogos nesta temporada.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={matchesPerMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="jogos" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
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
                {competitionDistribution.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-20">Sem dados.</p>
                ) : (
                  <>
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
                      {competitionDistribution.map((entry, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span>{entry.name}</span>
                          </div>
                          <span className="font-semibold">{entry.value}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Rankings */}
        <motion.div variants={item}>
          <Tabs defaultValue="wins" className="space-y-4">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="wins" className="gap-2">
                <Trophy className="w-4 h-4" />
                Equipes por Vitórias
              </TabsTrigger>
              <TabsTrigger value="points" className="gap-2">
                <Zap className="w-4 h-4" />
                Equipes por Pontos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="wins">
              <RankingTable data={teamRankings.wins} statLabel="Vitórias" />
            </TabsContent>
            <TabsContent value="points">
              <RankingTable data={teamRankings.points} statLabel="Pontos" />
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </MainLayout>
  );
};

function RankingTable({ data, statLabel }: { data: RankingRow[]; statLabel: string }) {
  if (data.length === 0) {
    return (
      <Card className="card-elevated">
        <CardContent className="p-10 text-center text-muted-foreground">Sem dados para exibir.</CardContent>
      </Card>
    );
  }
  return (
    <Card className="card-elevated">
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {data.map((team, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-display font-bold">
                {idx + 1}
              </div>
              <div className="flex-1 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-display font-bold text-primary">
                  {team.team}
                </div>
                <p className="font-semibold text-foreground">{team.name}</p>
                <Badge variant="secondary" className="text-xs">{statLabel}</Badge>
              </div>
              <div className="text-right">
                <p className="text-2xl font-display font-bold text-accent">{team.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default StatisticsPage;