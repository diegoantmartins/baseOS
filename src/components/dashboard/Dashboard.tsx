import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy,
  Users,
  Calendar,
  Volleyball,
  Waves,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Plus,
  Dices,
  FileSpreadsheet,
  Building2,
  ListOrdered,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
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
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Equipes Cadastradas',
      value: teams.length.toString(),
      subtext: `${competitionTeams.length} inscrições em torneios`,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Atletas no Sistema',
      value: totalAthletesCount.toString(),
      subtext: 'Elencos confirmados',
      icon: Volleyball,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Partidas Realizadas',
      value: completedMatchesCount.toString(),
      subtext: `${scheduledMatchesCount} agendadas / ${matches.length} total`,
      icon: CheckCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Top Banner */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2.5">
            <Trophy className="w-8 h-8 text-primary" />
            Painel Geral VolleyPro
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão unificada das competições, confrontos, classificação e alertas operacionais.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" className="gap-2" onClick={() => navigate('/jogos')}>
            <Calendar className="w-4 h-4" />
            Central de Jogos
          </Button>
          <Button variant="accent" className="gap-2" onClick={() => navigate('/competicoes?new=1')}>
            <Plus className="w-4 h-4" />
            Nova Competição
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="card-elevated hover:border-primary/40 transition-all">
              <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">{stat.label}</p>
                  <h3 className="text-2xl font-display font-bold text-foreground mt-0.5">{stat.value}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{stat.subtext}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Operational Alerts Center (Seção 32) */}
      {alerts.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-display font-bold text-foreground">Central de Alertas Operacionais</h2>
            <Badge variant="secondary" className="text-xs">{alerts.length}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map(alert => (
              <Card key={alert.id} className="border-amber-500/30 bg-amber-500/5 shadow-xs">
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      {alert.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs gap-1 border-amber-500/40 hover:bg-amber-500/10"
                    onClick={() => navigate(alert.linkTo)}
                  >
                    <span>{alert.linkText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main Grid: Competições Ativas & Próximas Partidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Competições em Andamento (2 colunas) */}
        <motion.div variants={item} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Competições em Andamento
            </h2>
            <Link to="/competicoes" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              Ver todas ({competitions.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {competitions.slice(0, 3).map(comp => {
              const compMatches = matches.filter(m => m.competitionId === comp.id);
              const compTeams = competitionTeams.filter(ct => ct.competitionId === comp.id);
              const finished = compMatches.filter(m => m.status === 'completed' || m.status === 'homologated').length;
              const progress = compMatches.length > 0 ? Math.round((finished / compMatches.length) * 100) : 0;

              return (
                <Card key={comp.id} className="card-elevated hover:border-primary/40 transition-all cursor-pointer" onClick={() => navigate('/competicoes')}>
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-base text-foreground">{comp.name}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {comp.modality === 'beach' ? 'Praia' : 'Quadra'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {comp.venue || 'Local a definir'} · {compTeams.length} equipes inscritas
                      </p>
                      <div className="flex items-center gap-4 text-xs pt-1">
                        <span><strong>{compMatches.length}</strong> jogos ({finished} realizados)</span>
                        <span className="text-muted-foreground">Progresso: <strong>{progress}%</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/jogos'); }}>
                        Jogos
                      </Button>
                      <Button variant="accent" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/competicoes'); }}>
                        Gerenciar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>

        {/* Próximas Partidas (1 coluna) */}
        <motion.div variants={item} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Próximos Confrontos
            </h2>
            <Link to="/jogos" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              Ver agenda
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card className="card-elevated">
            <CardContent className="p-4 space-y-3">
              {matches.slice(0, 4).length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-6">Nenhum confronto agendado no momento.</p>
              ) : (
                matches.slice(0, 4).map(m => (
                  <div key={m.id} className="p-3 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                      <span className="font-semibold text-foreground">Jogo #{m.matchNumber}</span>
                      <span>{m.court || m.venue || 'Quadra a definir'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span className="truncate max-w-[100px]">{m.teamAName}</span>
                      <span className="text-[10px] text-muted-foreground px-2">VS</span>
                      <span className="truncate max-w-[100px] text-right">{m.teamBName}</span>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(m.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Badge variant={m.status === 'completed' ? 'success' : 'outline'} className="text-[9px] py-0">
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
