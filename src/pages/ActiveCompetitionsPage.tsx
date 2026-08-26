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
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

// Status: rótulo neutro + indicador pontual contido (sem bordas coloridas)
const STATUS_LABELS: Record<string, { label: string; dot: string }> = {
  'in-progress': { label: 'Em Andamento', dot: 'bg-amber-400' },
  'playoffs': { label: 'Fase Final / Playoffs', dot: 'bg-amber-400' },
  'groups-defined': { label: 'Grupos Definidos', dot: 'bg-zinc-400' },
  'registration-open': { label: 'Inscrições Abertas', dot: 'bg-emerald-400' },
  'registration-closed': { label: 'Inscrições Encerradas', dot: 'bg-zinc-500' },
  'draw-pending': { label: 'Sorteio Pendente', dot: 'bg-amber-400' },
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
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Competições Ativas
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Acompanhe e gerencie as competições em andamento, jogos, classificações e súmulas oficiais.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-2 text-xs"
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

          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border">
            <Button
              variant={modalityFilter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs h-7 px-3"
              onClick={() => setModalityFilter('all')}
            >
              Todas
            </Button>
            <Button
              variant={modalityFilter === 'indoor' ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs h-7 px-3"
              onClick={() => setModalityFilter('indoor')}
            >
              Vôlei de Quadra
            </Button>
            <Button
              variant={modalityFilter === 'beach' ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs h-7 px-3"
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
            <div className="mx-auto w-12 h-12 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center mb-3">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base">Nenhuma competição ativa encontrada</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Crie uma nova competição ou ajuste os filtros para gerenciar os campeonatos de voleibol.
            </p>
            <Button
              className="mt-4 gap-2 text-xs"
              size="sm"
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
                dot: 'bg-zinc-400',
              };

              return (
                <Card key={c.id} className="card-elevated hover-raise relative flex flex-col justify-between overflow-hidden">
                  <div className="p-5 pb-4">
                    {/* Top Badges */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-800/70 text-[11px] font-medium text-zinc-300">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.label}
                      </span>

                      <Badge variant="muted" className="uppercase">
                        {c.modality === 'beach' ? 'Praia' : 'Quadra'} · {c.format === '5-sets' ? '5 Sets' : '3 Sets'}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-semibold text-foreground">
                      {c.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {c.startDate ? new Date(c.startDate).toLocaleDateString('pt-BR') : 'Data a definir'}
                      {c.venue ? ` · ${c.venue}` : ''}
                    </p>

                    {/* Stats densos em linha */}
                    <div className="flex items-center gap-5 mt-4 text-xs">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Equipes</span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">{regTeamsCount}</span>
                      </div>
                      <div className="h-6 w-px bg-border" />
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Jogos realizados</span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">{completedMatches.length} <span className="text-muted-foreground font-normal">/ {totalMatches}</span></span>
                      </div>
                      <div className="h-6 w-px bg-border" />
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Progresso</span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">{progressPercent}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Ações: 1 secundária principal + fantasmas */}
                  <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => navigate(`/jogos?competitionId=${c.id}`)}
                      >
                        <Volleyball className="w-3.5 h-3.5" />
                        Ver Jogos
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => navigate(`/relatorios`)}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Relatórios
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs h-8"
                      onClick={() => navigate(`/competicoes/${c.id}/inscricoes`)}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Inscrições
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Button>
                  </div>

                  {/* Linha fina de progresso (2px) na base do card */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800">
                    <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
                  </div>
                </Card>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </MainLayout>
  );
}
