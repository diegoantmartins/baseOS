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
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Estatísticas
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Análise de desempenho e rankings consolidados</p>
          </div>
          <Select value={season} onValueChange={setSeason} disabled={seasons.length === 0}>
            <SelectTrigger className="w-full sm:w-[150px] text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md">
              <SelectValue placeholder="Temporada" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {seasons.map(year => (
                <SelectItem key={year} value={String(year)} className="text-xs">{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Overview Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="card-elevated shadow-none border border-border bg-card">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-semibold tracking-wider text-muted-foreground block">Jogos Realizados</span>
                <p className="text-xl font-semibold tabular-nums text-foreground mt-0.5">{completedMatches.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated shadow-none border border-border bg-card">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-semibold tracking-wider text-muted-foreground block">Pontos Marcados</span>
                <p className="text-xl font-semibold tabular-nums text-foreground mt-0.5">{totalPoints.toLocaleString('pt-BR')}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated shadow-none border border-border bg-card">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-semibold tracking-wider text-muted-foreground block">Equipes</span>
                <p className="text-xl font-semibold tabular-nums text-foreground mt-0.5">{teams.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-elevated shadow-none border border-border bg-card">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-semibold tracking-wider text-muted-foreground block">Jogos da Temporada</span>
                <p className="text-xl font-semibold tabular-nums text-foreground mt-0.5">{seasonMatches.length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Matches per Month */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="card-elevated shadow-none border border-border bg-card h-full">
              <CardHeader className="p-3.5 pb-2 border-b border-border bg-zinc-900/60">
                <CardTitle className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Jogos por Mês
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {matchesPerMonth.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-16">Sem jogos nesta temporada.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={matchesPerMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" allowDecimals={false} fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          border: '1px solid #27272a',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="jogos" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Competition Distribution */}
          <motion.div variants={item}>
            <Card className="card-elevated shadow-none border border-border bg-card h-full">
              <CardHeader className="p-3.5 pb-2 border-b border-border bg-zinc-900/60">
                <CardTitle className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-primary" />
                  Por Competição
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {competitionDistribution.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-16">Sem dados.</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={competitionDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
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
                    <div className="mt-3 space-y-1.5 text-xs">
                      {competitionDistribution.map((entry, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                            <span className="truncate text-muted-foreground">{entry.name}</span>
                          </div>
                          <span className="font-semibold tabular-nums text-foreground">{entry.value}%</span>
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
        <motion.div variants={item} className="space-y-3">
          <Tabs defaultValue="wins" className="space-y-3">
            <TabsList className="bg-zinc-900 p-0.5 rounded-md border border-zinc-800 h-8 gap-0.5">
              <TabsTrigger value="wins" className="gap-1.5 text-xs h-7 rounded-sm data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground">
                <Trophy className="w-3.5 h-3.5" />
                Equipes por Vitórias
              </TabsTrigger>
              <TabsTrigger value="points" className="gap-1.5 text-xs h-7 rounded-sm data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground">
                <Zap className="w-3.5 h-3.5" />
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
      <Card className="card-elevated shadow-none border border-border bg-card">
        <CardContent className="p-8 text-center text-xs text-muted-foreground">Sem dados para exibir.</CardContent>
      </Card>
    );
  }
  return (
    <Card className="card-elevated shadow-none border border-border bg-card overflow-hidden">
      <CardContent className="p-0">
        <div className="divide-y divide-border/40">
          {data.map((team, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 hover:bg-zinc-800/30 transition-colors text-xs">
              <div className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-bold text-xs text-zinc-200 shrink-0">
                  {team.team.slice(0, 3)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{team.name}</p>
                </div>
                <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-800 bg-zinc-900 text-zinc-400">{statLabel}</Badge>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold tabular-nums text-foreground">{team.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default StatisticsPage;