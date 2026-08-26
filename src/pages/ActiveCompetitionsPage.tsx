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
import { cn } from '@/lib/utils';
import { dataAccess } from '@/services/dataAccess';
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';
import { evaluateCompetitionReadiness } from '@/services/competitionReadinessService';
import type { CompetitionRecord, MatchRecord, TeamRecord, ModalityRecord, VenueRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';

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
  const [modalities, setModalities] = useState<ModalityRecord[]>([]);
  const [venues, setVenues] = useState<VenueRecord[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([]);
  const [athletes, setAthletes] = useState<CompetitionAthlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalityFilter, setModalityFilter] = useState<'all' | 'indoor' | 'beach'>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const [cList, mList, tList, ctList, modList, vList, aList] = await Promise.all([
          dataAccess.listCompetitions(),
          dataAccess.listMatches(),
          dataAccess.listTeams(),
          dataAccess.listCompetitionTeams(),
          dataAccess.listModalities(),
          dataAccess.listVenues(),
          dataAccess.listCompetitionAthletes(),
        ]);
        setCompetitions(cList);
        setMatches(mList);
        setTeams(tList);
        setCompetitionTeams(ctList);
        setModalities(modList);
        setVenues(vList);
        setAthletes(aList);
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
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Competições Ativas
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Acompanhe e gerencie as competições em andamento, jogos, classificações e súmulas oficiais.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ContextualHelpButton
              articleId="fluxo-completo-competicao"
              label="Como funciona o sistema"
            />
            <Button
              size="sm"
              className="gap-1.5 text-xs h-8 rounded-md font-medium shadow-none"
              onClick={() => navigate('/competicoes?new=1')}
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Competição
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={item} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar competição por nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 text-xs h-8 bg-zinc-900 border-zinc-800 rounded-md focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-zinc-900 rounded-md border border-zinc-800">
            <Button
              variant={modalityFilter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'text-xs h-7 px-3 rounded-sm font-medium transition-colors',
                modalityFilter === 'all' ? 'bg-zinc-800 text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setModalityFilter('all')}
            >
              Todas
            </Button>
            <Button
              variant={modalityFilter === 'indoor' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'text-xs h-7 px-3 rounded-sm font-medium transition-colors',
                modalityFilter === 'indoor' ? 'bg-zinc-800 text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setModalityFilter('indoor')}
            >
              Vôlei de Quadra
            </Button>
            <Button
              variant={modalityFilter === 'beach' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'text-xs h-7 px-3 rounded-sm font-medium transition-colors',
                modalityFilter === 'beach' ? 'bg-zinc-800 text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setModalityFilter('beach')}
            >
              Vôlei de Praia
            </Button>
          </div>
        </motion.div>

        {/* List of Active Competitions */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="h-48 rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse" />
            ))}
          </div>
        ) : activeCompetitions.length === 0 ? (
          <Card className="p-12 text-center border-border bg-card shadow-none">
            <div className="mx-auto w-10 h-10 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center mb-3">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Nenhuma competição ativa encontrada</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Crie uma nova competição ou ajuste os filtros para gerenciar os campeonatos de voleibol.
            </p>
            <Button
              className="mt-4 gap-1.5 text-xs h-8 rounded-md font-medium"
              size="sm"
              onClick={() => navigate('/competicoes?new=1')}
            >
              <Plus className="w-3.5 h-3.5" />
              Criar Primeira Competição
            </Button>
          </Card>
        ) : (
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeCompetitions.map(c => {
              const readiness = evaluateCompetitionReadiness({
                competition: c,
                modalities,
                venues,
                teams,
                competitionTeams,
                athletes,
                matches,
              });

              const compMatches = matches.filter(m => m.competitionId === c.id);
              const completedMatches = compMatches.filter(m => m.status === 'completed' || m.status === 'homologated');
              const totalMatches = compMatches.length;
              const regTeamsCount = competitionTeams.filter(ct => ct.competitionId === c.id).length;
              const statusInfo = STATUS_LABELS[c.status || 'registration-open'] || {
                label: 'Ativa',
                dot: 'bg-zinc-400',
              };

              return (
                <Card key={c.id} className="card-elevated hover-raise relative flex flex-col justify-between overflow-hidden shadow-none border-border bg-card">
                  <div className="p-4 sm:p-5 pb-3.5 space-y-3">
                    {/* Top Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/50 text-[10px] font-medium text-zinc-300">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                        {statusInfo.label}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-zinc-800 text-zinc-300 border-zinc-700 font-mono font-semibold">
                          {readiness.percentage}% Prontidão
                        </Badge>
                        <Badge variant="muted" className="text-[10px] py-0 px-1.5 h-4 bg-zinc-800 text-zinc-400 border-zinc-700/60 uppercase">
                          {c.modality === 'beach' ? 'Praia' : 'Quadra'} · {c.format === '5-sets' ? '5 Sets' : '3 Sets'}
                        </Badge>
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-foreground">
                        {c.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {c.startDate ? new Date(c.startDate).toLocaleDateString('pt-BR') : 'Data a definir'}
                        {c.venue ? ` · ${c.venue}` : ''}
                      </p>
                    </div>

                    {/* Stats densos em linha */}
                    <div className="flex items-center gap-4 text-xs pt-1">
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider font-medium text-muted-foreground">Equipes</span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">{regTeamsCount}</span>
                      </div>
                      <div className="h-5 w-px bg-border" />
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider font-medium text-muted-foreground">Jogos</span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">{completedMatches.length} <span className="text-muted-foreground font-normal">/ {totalMatches}</span></span>
                      </div>
                      <div className="h-5 w-px bg-border" />
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider font-medium text-muted-foreground">Etapas</span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">{readiness.completedStepsCount} / 13</span>
                      </div>
                    </div>

                    {/* Next Action Box (se houver) */}
                    {readiness.nextAction && (
                      <div className="p-2.5 rounded-md bg-zinc-900/60 border border-zinc-800 text-[11px] flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] uppercase font-bold text-primary block">Próxima Ação</span>
                          <span className="text-zinc-300 font-medium truncate block">{readiness.nextAction.title}</span>
                        </div>
                        {readiness.nextAction.route && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] gap-1 text-primary hover:text-primary hover:bg-zinc-800"
                            onClick={() => navigate(readiness.nextAction!.route!)}
                          >
                            <span>{readiness.nextAction.actionLabel || 'Avançar'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ações: 1 secundária principal + fantasmas */}
                  <div className="px-4 sm:px-5 py-2.5 border-t border-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5 text-xs h-7 px-2.5 rounded-md font-medium bg-zinc-800 hover:bg-zinc-700 text-foreground border border-zinc-700/60"
                        onClick={() => navigate(`/jogos?competitionId=${c.id}`)}
                      >
                        <Volleyball className="w-3 h-3 text-zinc-400" />
                        Ver Jogos
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-zinc-800/60 rounded-md"
                        onClick={() => navigate(`/relatorios`)}
                      >
                        <FileSpreadsheet className="w-3 h-3 text-zinc-400" />
                        Relatórios
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-zinc-800/60 rounded-md"
                      onClick={() => navigate(`/competicoes/${c.id}/inscricoes`)}
                    >
                      <Users className="w-3 h-3 text-zinc-400" />
                      Inscrições
                      <ChevronRight className="w-3 h-3 ml-0.5" />
                    </Button>
                  </div>

                  {/* Linha fina de progresso (2px) na base do card */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800">
                    <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${readiness.percentage}%` }} />
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
