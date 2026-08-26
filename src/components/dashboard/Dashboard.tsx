import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy,
  Users,
  Calendar,
  Volleyball,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, MatchRecord, TeamRecord, VenueRecord } from '@/types/entities';
import type { CompetitionAthlete, CompetitionTeam } from '@/types/registration';
import type { DrawRecord } from '@/types/draw';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.15 } },
};

type AlertItem = {
  id: string;
  type: 'warning' | 'info' | 'danger';
  title: string;
  description: string;
  linkText: string;
  linkTo: string;
};

export function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([]);
  const [competitionAthletes, setCompetitionAthletes] = useState<CompetitionAthlete[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [venues, setVenues] = useState<VenueRecord[]>([]);
  const [draws, setDraws] = useState<DrawRecord[]>([]);

  const loadData = useCallback(async () => {
    const [comps, tms, cts, aths, ms, vns, drws] = await Promise.all([
      dataAccess.listCompetitions(),
      dataAccess.listTeams(),
      dataAccess.listCompetitionTeams(),
      dataAccess.listCompetitionAthletes(),
      dataAccess.listMatches(),
      dataAccess.listVenues(),
      dataAccess.listDraws(),
    ]);
    setCompetitions(comps);
    setTeams(tms);
    setCompetitionTeams(cts);
    setCompetitionAthletes(aths);
    setMatches(ms);
    setVenues(vns);
    setDraws(drws);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Operational Alerts calculation (Seção 32)
  const alerts: AlertItem[] = [];

  // 1. Sorteio pendente
  for (const comp of competitions) {
    if (comp.status !== 'completed' && comp.status !== 'cancelled') {
      const compDraw = draws.find(d => d.competitionId === comp.id);
      const registered = competitionTeams.filter(ct => ct.competitionId === comp.id && ct.status !== 'rejected');
      if (!compDraw && registered.length >= 2) {
        alerts.push({
          id: `draw-${comp.id}`,
          type: 'warning',
          title: `Sorteio pendente: ${comp.name}`,
          description: `Há ${registered.length} equipes confirmadas prontas para o sorteio de grupos.`,
          linkText: 'Realizar Sorteio',
          linkTo: `/sorteio/${comp.id}`,
        });
      }
    }
  }

  // 2. Jogos sem horário / sem quadra
  const matchesWithoutSchedule = matches.filter(m => m.status === 'awaiting_schedule' || (!m.court && m.status === 'scheduled'));
  if (matchesWithoutSchedule.length > 0) {
    alerts.push({
      id: 'matches-unscheduled',
      type: 'warning',
      title: `${matchesWithoutSchedule.length} confronto(s) aguardando agendamento`,
      description: 'Defina data, horário e quadra para liberar a emissão das súmulas oficiais.',
      linkText: 'Ir para Jogos',
      linkTo: '/jogos',
    });
  }

  // 3. Resultados pendentes de homologação
  const pendingHomologation = matches.filter(m => m.status === 'completed' && !m.homologatedAt);
  if (pendingHomologation.length > 0) {
    alerts.push({
      id: 'pending-homologation',
      type: 'info',
      title: `${pendingHomologation.length} resultado(s) pendente(s) de homologação`,
      description: 'Revise os placares lançados para oficializar a classificação geral.',
      linkText: 'Homologar Resultados',
      linkTo: '/jogos',
    });
  }

  // 4. Equipes sem atletas
  const teamsWithoutAthletes = competitionTeams.filter(ct => {
    const athCount = competitionAthletes.filter(a => a.competitionTeamId === ct.id).length;
    return athCount === 0 && ct.status !== 'rejected';
  });
  if (teamsWithoutAthletes.length > 0) {
    alerts.push({
      id: 'teams-no-athletes',
      type: 'warning',
      title: `${teamsWithoutAthletes.length} equipe(s) inscrita(s) sem atletas cadastrados`,
      description: 'Verifique os prazos de envio de elenco das equipes.',
      linkText: 'Ver Inscrições',
      linkTo: '/competicoes',
    });
  }

  // Estatísticas calculadas reais
  const activeCompsCount = competitions.filter(c => c.status !== 'completed' && c.status !== 'cancelled').length;
  const completedMatchesCount = matches.filter(m => m.status === 'completed' || m.status === 'homologated').length;
  const scheduledMatchesCount = matches.filter(m => m.status === 'scheduled').length;
  const totalAthletesCount = competitionAthletes.length;

  const stats = [
    {
      label: 'Competições Ativas',
      value: activeCompsCount.toString(),
      subtext: `${competitions.length} total cadastradas`,
      icon: Trophy,
    },
    {
      label: 'Equipes Cadastradas',
      value: teams.length.toString(),
      subtext: `${competitionTeams.length} inscrições em torneios`,
      icon: Users,
    },
    {
      label: 'Atletas no Sistema',
      value: totalAthletesCount.toString(),
      subtext: 'Elencos confirmados',
      icon: Volleyball,
    },
    {
      label: 'Partidas Realizadas',
      value: completedMatchesCount.toString(),
      subtext: `${scheduledMatchesCount} agendadas / ${matches.length} total`,
      icon: CheckCircle,
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Cabeçalho: título + 1 ação primária */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Painel Geral
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Visão unificada das competições, confrontos, classificação e alertas operacionais.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => navigate('/jogos')}>
            <Calendar className="w-4 h-4" />
            Central de Jogos
          </Button>
          <Button size="sm" className="gap-2 text-xs" onClick={() => navigate('/competicoes?new=1')}>
            <Plus className="w-4 h-4" />
            Nova Competição
          </Button>
        </div>
      </motion.div>

      {/* KPIs densos e monocromáticos */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="hover-raise">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px] text-zinc-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">{stat.label}</p>
                  <h3 className="text-xl font-semibold tabular-nums text-foreground mt-0.5 leading-none">{stat.value}</h3>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">{stat.subtext}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Central de Alertas Operacionais */}
      {alerts.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-foreground">Alertas Operacionais</h2>
            <Badge variant="secondary">{alerts.length}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map(alert => (
              <div key={alert.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3 hover-raise">
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="truncate">{alert.title}</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {alert.description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs gap-1"
                  onClick={() => navigate(alert.linkTo)}
                >
                  <span>{alert.linkText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Grid principal: Competições ativas & Próximas partidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Competições em andamento (2 colunas) */}
        <motion.div variants={item} className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Competições em Andamento</h2>
            <Link to="/competicoes" className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1">
              Ver todas ({competitions.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {competitions.slice(0, 3).map(comp => {
              const compMatches = matches.filter(m => m.competitionId === comp.id);
              const compTeams = competitionTeams.filter(ct => ct.competitionId === comp.id);
              const finished = compMatches.filter(m => m.status === 'completed' || m.status === 'homologated').length;
              const progress = compMatches.length > 0 ? Math.round((finished / compMatches.length) * 100) : 0;

              return (
                <div
                  key={comp.id}
                  className="group relative rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover-raise"
                  onClick={() => navigate('/competicoes')}
                >
                  <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground truncate">{comp.name}</span>
                        <Badge variant="muted" className="capitalize">
                          {comp.modality === 'beach' ? 'Praia' : 'Quadra'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {comp.venue || 'Local a definir'} · {compTeams.length} equipes · {finished}/{compMatches.length} jogos realizados
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={(e) => { e.stopPropagation(); navigate('/jogos'); }}>
                        Jogos
                      </Button>
                      <Button variant="secondary" size="sm" className="text-xs" onClick={(e) => { e.stopPropagation(); navigate('/competicoes'); }}>
                        Gerenciar
                      </Button>
                    </div>
                  </div>
                  {/* Linha fina de progresso (2px) na base do card */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800">
                    <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Próximos confrontos (1 coluna) */}
        <motion.div variants={item} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Próximos Confrontos</h2>
            <Link to="/jogos" className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1">
              Ver agenda
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card>
            <CardContent className="p-3 space-y-1">
              {matches.slice(0, 4).length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-6">Nenhum confronto agendado no momento.</p>
              ) : (
                matches.slice(0, 4).map(m => (
                  <div key={m.id} className="px-3 py-2.5 rounded-lg hover-raise">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                      <span className="font-medium text-foreground">Jogo #{m.matchNumber}</span>
                      <span className="truncate ml-2">{m.court || m.venue || 'Quadra a definir'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium text-foreground">
                      <span className="truncate max-w-[110px]">{m.teamAName}</span>
                      <span className="text-[10px] text-muted-foreground px-2">vs</span>
                      <span className="truncate max-w-[110px] text-right">{m.teamBName}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(m.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Badge variant={m.status === 'completed' ? 'completed' : 'scheduled'} className="text-[10px] py-0 px-1.5">
                        {m.status === 'completed' ? 'Finalizado' : 'Agendado'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
