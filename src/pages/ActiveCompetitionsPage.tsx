import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy,
  Volleyball,
  Users,
  Calendar,
  ChevronRight,
  FileSpreadsheet,
  ArrowRight,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; color: string }> = {
  'in-progress': { label: 'Em Andamento', variant: 'default', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400' },
  'playoffs': { label: 'Fase Final / Playoffs', variant: 'default', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400' },
  'groups-defined': { label: 'Grupos Definidos', variant: 'secondary', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400' },
  'registration-open': { label: 'Inscrições Abertas', variant: 'outline', color: 'bg-primary/15 text-primary border-primary/30' },
  'registration-closed': { label: 'Inscrições Encerradas', variant: 'secondary', color: 'bg-purple-500/15 text-purple-600 border-purple-500/30 dark:text-purple-400' },
  'draw-pending': { label: 'Sorteio Pendente', variant: 'outline', color: 'bg-orange-500/15 text-orange-600 border-orange-500/30' },
};

export default function ActiveCompetitionsPage() {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<{ id: string; competitionId: string; teamId: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalityFilter, setModalityFilter] = useState<'all' | 'indoor' | 'beach'>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const [cList, mList, tList, ctList] = await Promise.all([
          dataAccess.listCompetitions(),
          dataAccess.listMatches(),
          dataAccess.listTeams(),
          dataAccess.listCompetitionTeams(),
        ]);
        setCompetitions(cList);
        setMatches(mList);
        setTeams(tList);
        setCompetitionTeams(ctList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activeCompetitions = useMemo(() => {
    return competitions.filter(c => {
      // Exclui apenas as canceladas ou arquivadas se houver
      const isNotCancelled = c.status !== 'cancelled';
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesModality = modalityFilter === 'all' || c.modality === modalityFilter;
      return isNotCancelled && matchesSearch && matchesModality;
    });
  }, [competitions, search, modalityFilter]);

  return (
    <MainLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2.5">
              <Trophy className="w-8 h-8 text-primary" />
              Competições Ativas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Acompanhe e gerencie as competições em andamento, jogos, classificações e súmulas oficiais.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="accent"
              className="gap-2 text-xs h-9 font-semibold"
              onClick={() => navigate('/competicoes?new=1')}
            >
              <Plus className="w-4 h-4" />
              Nova Competição
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar competição por nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 text-xs h-10"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg border border-border">
            <Button
              variant={modalityFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-8 px-3"
              onClick={() => setModalityFilter('all')}
            >
              Todas
            </Button>
            <Button
              variant={modalityFilter === 'indoor' ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-8 px-3"
              onClick={() => setModalityFilter('indoor')}
            >
              Vôlei de Quadra
            </Button>
            <Button
              variant={modalityFilter === 'beach' ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-8 px-3"
              onClick={() => setModalityFilter('beach')}
            >
              Vôlei de Praia
            </Button>
          </div>
        </motion.div>

        {/* List of Active Competitions */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : activeCompetitions.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="font-display font-semibold text-lg">Nenhuma competição ativa encontrada</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Crie uma nova competição ou ajuste os filtros para gerenciar os campeonatos de voleibol.
            </p>
            <Button
              variant="accent"
              className="mt-4 gap-2 text-xs"
              onClick={() => navigate('/competicoes?new=1')}
            >
              <Plus className="w-4 h-4" />
              Criar Primeira Competição
            </Button>
          </Card>
        ) : (
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {activeCompetitions.map(c => {
              const compMatches = matches.filter(m => m.competitionId === c.id);
              const completedMatches = compMatches.filter(m => m.status === 'completed' || m.status === 'homologated');
              const totalMatches = compMatches.length;
              const progressPercent = totalMatches > 0 ? Math.round((completedMatches.length / totalMatches) * 100) : 0;
              const regTeamsCount = competitionTeams.filter(ct => ct.competitionId === c.id).length;
              const statusInfo = STATUS_LABELS[c.status || 'registration-open'] || {
                label: 'Ativa',
                variant: 'outline' as const,
                color: 'bg-primary/15 text-primary border-primary/30',
              };

              return (
                <Card key={c.id} className="card-elevated hover:border-primary/40 transition-all flex flex-col justify-between overflow-hidden group">
                  <div className="p-5">
                    {/* Top Badges */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>

                      <Badge variant="outline" className="text-[11px] uppercase font-bold text-muted-foreground">
                        {c.modality === 'beach' ? 'Praia' : 'Quadra'} · {c.format === '5-sets' ? '5 Sets' : '3 Sets'}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-display font-bold text-foreground group-hover:text-primary transition-colors">
                      {c.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {c.startDate ? new Date(c.startDate).toLocaleDateString('pt-BR') : 'Data a definir'}
                      {c.venue ? ` · ${c.venue}` : ''}
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 my-4 p-3 bg-muted/40 rounded-xl border border-border/60">
                      <div className="text-center">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Equipes</span>
                        <p className="text-lg font-bold font-display text-foreground">{regTeamsCount}</p>
                      </div>
                      <div className="text-center border-x border-border/60">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Jogos Realizados</span>
                        <p className="text-lg font-bold font-display text-primary">{completedMatches.length} / {totalMatches}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground">Progresso</span>
                        <p className="text-lg font-bold font-display text-foreground">{progressPercent}%</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 mb-2">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Andamento da Competição</span>
                        <span>{completedMatches.length} de {totalMatches} jogos finalizados</span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <CardFooter className="bg-muted/30 px-5 py-3 border-t flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => navigate(`/jogos?competitionId=${c.id}`)}
                      >
                        <Volleyball className="w-3.5 h-3.5" />
                        Ver Jogos
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => navigate(`/relatorios`)}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                        Relatórios
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs h-8 text-muted-foreground hover:text-foreground"
                      onClick={() => navigate(`/competicoes/${c.id}/inscricoes`)}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Inscrições
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </MainLayout>
  );
}
