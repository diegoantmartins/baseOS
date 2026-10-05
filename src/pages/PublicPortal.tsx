import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Volleyball,
  Calendar,
  MapPin,
  Clock,
  Activity,
  ArrowRight,
  LogIn,
  Search,
  CheckCircle2,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth/useAuth';
import { dataAccess } from '@/services/dataAccess';
import type { CompetitionRecord, MatchRecord, TeamRecord, VenueRecord } from '@/types/entities';

type MatchFilter = 'today' | 'live' | 'upcoming' | 'finished' | 'all';

export default function PublicPortal() {
  const { session } = useAuth();
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [venues, setVenues] = useState<VenueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MatchFilter>('today');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadPublicData() {
      try {
        const [cList, mList, tList, vList] = await Promise.all([
          dataAccess.listCompetitions(),
          dataAccess.listMatches(),
          dataAccess.listTeams(),
          dataAccess.listVenues(),
        ]);

        if (isMounted) {
          setCompetitions(cList || []);
          setMatches(mList || []);
          setTeams(tList || []);
          setVenues(vList || []);
        }
      } catch (err) {
        console.error('[PublicPortal] Erro ao carregar dados públicos:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadPublicData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Formatação de data de hoje em português
  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  }, []);

  const todayIsoPrefix = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Mapas para resolução rápida de nomes e detalhes
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const compMap = useMemo(() => new Map(competitions.map((c) => [c.id, c])), [competitions]);

  // Partidas do dia de hoje
  const todayMatches = useMemo(() => {
    return matches.filter((m) => {
      if (!m.scheduledTime) return false;
      return m.scheduledTime.startsWith(todayIsoPrefix);
    });
  }, [matches, todayIsoPrefix]);

  // Contagem de status hoje
  const liveCount = useMemo(() => {
    return matches.filter(
      (m) =>
        m.status === 'in-progress' ||
        m.status === 'warmup' ||
        m.status === 'timeout' ||
        m.status === 'set-break'
    ).length;
  }, [matches]);

  // Filtragem dinâmica de partidas
  const filteredMatches = useMemo(() => {
    let list = matches;

    if (filter === 'today') {
      // Se houver jogos hoje, mostra hoje; se não houver, mostra os mais próximos para nunca ficar vazio
      list = todayMatches.length > 0 ? todayMatches : matches.slice(0, 10);
    } else if (filter === 'live') {
      list = matches.filter(
        (m) =>
          m.status === 'in-progress' ||
          m.status === 'warmup' ||
          m.status === 'timeout' ||
          m.status === 'set-break'
      );
    } else if (filter === 'upcoming') {
      list = matches.filter(
        (m) =>
          m.status === 'scheduled' ||
          m.status === 'awaiting_schedule' ||
          m.status === 'sheet_available'
      );
    } else if (filter === 'finished') {
      list = matches.filter(
        (m) => m.status === 'completed' || m.status === 'homologated'
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (m) =>
          m.teamAName?.toLowerCase().includes(term) ||
          m.teamBName?.toLowerCase().includes(term) ||
          m.teamAShortName?.toLowerCase().includes(term) ||
          m.teamBShortName?.toLowerCase().includes(term) ||
          m.venue?.toLowerCase().includes(term) ||
          compMap.get(m.competitionId)?.name?.toLowerCase().includes(term)
      );
    }

    return list;
  }, [matches, filter, todayMatches, searchTerm, compMap]);

  // Auxiliar para placar de sets
  const getSetsWon = (sets: MatchRecord['sets'] = []) => {
    let a = 0;
    let b = 0;
    for (const s of sets) {
      if (s.scoreA > s.scoreB) a++;
      else if (s.scoreB > s.scoreA) b++;
    }
    return { a, b };
  };

  // Status visual do jogo
  const renderStatusBadge = (status: MatchRecord['status']) => {
    switch (status) {
      case 'in-progress':
      case 'warmup':
      case 'timeout':
      case 'set-break':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            AO VIVO
          </span>
        );
      case 'completed':
      case 'homologated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
            <CheckCircle2 className="w-3 h-3 text-zinc-400" />
            FINALIZADO
          </span>
        );
      case 'cancelled':
      case 'wo':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950/60 text-red-400 border border-red-800/40">
            CANCELADO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 text-amber-400" />
            AGENDADO
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* 1. Header / Navbar de Alto Padrão */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-white/20">
              <Volleyball className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  Base<span className="text-amber-400">OS</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Portal Público
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-none">
                Gestão Oficial de Voleibol
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/classificacao"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-800/60 transition-colors"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              Classificação
            </Link>
            <Link
              to="/competicoes-ativas"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-800/60 transition-colors"
            >
              <Layers className="w-4 h-4 text-zinc-400" />
              Competições
            </Link>

            {session ? (
              <Button
                asChild
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-md shadow-amber-500/20"
              >
                <Link to="/dashboard">
                  Meu Painel
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-100 hover:text-white"
              >
                <Link to="/login">
                  <LogIn className="w-4 h-4 mr-1.5 text-amber-400" />
                  Acessar Sistema
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section: "Competições Hoje" */}
      <section className="relative overflow-hidden border-b border-zinc-800/80 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-slate-950 py-10 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.15),rgba(255,255,255,0))]" />

        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Central de Resultados & Vitrine Esportiva
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white capitalize">
                Competições Hoje
              </h1>
              <p className="mt-2 text-sm sm:text-base text-zinc-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="capitalize">{todayFormatted}</span>
                {liveCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold ml-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    {liveCount} partida(s) em andamento
                  </span>
                )}
              </p>
            </div>

            {/* Métricas do Dia */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-white">
                  {todayMatches.length > 0 ? todayMatches.length : matches.length}
                </div>
                <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mt-0.5">
                  Partidas
                </div>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-amber-400">
                  {competitions.length}
                </div>
                <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mt-0.5">
                  Torneios
                </div>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-emerald-400">
                  {liveCount}
                </div>
                <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mt-0.5">
                  Ao Vivo
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-900/80 border border-zinc-800 rounded-xl">
              <button
                onClick={() => setFilter('today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'today'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Hoje ({todayMatches.length})
              </button>
              <button
                onClick={() => setFilter('live')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'live'
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Ao Vivo ({liveCount})
              </button>
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'upcoming'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Próximos
              </button>
              <button
                onClick={() => setFilter('finished')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'finished'
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Encerrados
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                Todas ({matches.length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                type="text"
                placeholder="Buscar equipe, torneio ou ginásio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 bg-zinc-900/80 border-zinc-800 text-xs rounded-xl focus-visible:ring-amber-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Grid de Partidas em Tempo Real */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-sm text-zinc-400">Carregando jogos e competições...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="py-16 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
            <Volleyball className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">Nenhuma partida encontrada</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
              Não há partidas correspondentes ao filtro selecionado. Tente alterar o filtro para ver todos os confrontos.
            </p>
            <Button
              onClick={() => {
                setFilter('all');
                setSearchTerm('');
              }}
              variant="outline"
              size="sm"
              className="mt-4 border-zinc-700 text-xs"
            >
              Ver Todas as Partidas
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {todayMatches.length === 0 && filter === 'today' && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
                <span>
                  Nenhum jogo cadastrado exatamente para hoje. Exibindo os próximos confrontos programados no BaseOS:
                </span>
                <span className="font-semibold text-amber-400">Próximos Confrontos</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredMatches.map((match) => {
                const comp = compMap.get(match.competitionId);
                const teamA = teamMap.get(match.teamAId);
                const teamB = teamMap.get(match.teamBId);
                const setsWon = getSetsWon(match.sets);
                const matchDate = new Date(match.scheduledTime);
                const timeString = isNaN(matchDate.getTime())
                  ? 'Horário a definir'
                  : matchDate.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                return (
                  <Card
                    key={match.id}
                    className="relative overflow-hidden bg-zinc-900/70 border-zinc-800/80 backdrop-blur-md rounded-2xl p-5 hover:border-amber-500/30 transition-all shadow-lg"
                  >
                    {/* Header do Card: Competição, Fase, Horário e Status */}
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 mb-4 text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="font-bold text-amber-400 truncate">
                          {comp?.name || 'Competição BaseOS'}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-400 truncate">
                          {match.phase || 'Fase Regular'}
                          {match.groupName ? ` • ${match.groupName}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {renderStatusBadge(match.status)}
                      </div>
                    </div>

                    {/* Localização & Ginásio */}
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mb-4">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate font-medium text-zinc-300">
                        {match.venue || 'Ginásio Principal'}
                        {match.court ? ` (${match.court})` : ''}
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-400 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {timeString}
                      </span>
                    </div>

                    {/* Duelo de Equipes com Placares */}
                    <div className="space-y-3 bg-zinc-950/60 rounded-xl p-3.5 border border-zinc-800/40">
                      {/* Equipe A */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 truncate">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-amber-400 overflow-hidden shrink-0">
                            {teamA?.logoUrl ? (
                              <img
                                src={teamA.logoUrl}
                                alt={match.teamAName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              match.teamAShortName?.slice(0, 3) || 'A'
                            )}
                          </div>
                          <span
                            className={`font-semibold text-sm truncate ${
                              match.winnerId === match.teamAId ? 'text-amber-400 font-bold' : 'text-zinc-200'
                            }`}
                          >
                            {match.teamAName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xl font-black w-7 text-right ${
                              match.winnerId === match.teamAId ? 'text-amber-400' : 'text-white'
                            }`}
                          >
                            {setsWon.a}
                          </span>
                        </div>
                      </div>

                      {/* Equipe B */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 truncate">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-amber-400 overflow-hidden shrink-0">
                            {teamB?.logoUrl ? (
                              <img
                                src={teamB.logoUrl}
                                alt={match.teamBName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              match.teamBShortName?.slice(0, 3) || 'B'
                            )}
                          </div>
                          <span
                            className={`font-semibold text-sm truncate ${
                              match.winnerId === match.teamBId ? 'text-amber-400 font-bold' : 'text-zinc-200'
                            }`}
                          >
                            {match.teamBName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xl font-black w-7 text-right ${
                              match.winnerId === match.teamBId ? 'text-amber-400' : 'text-white'
                            }`}
                          >
                            {setsWon.b}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Evolução de Sets (se houver parciais) */}
                    {match.sets && match.sets.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-800/40 flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="font-medium text-zinc-500">Parciais dos Sets:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {match.sets.map((s, idx) => (
                            <span
                              key={idx}
                              className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                                s.scoreA > s.scoreB
                                  ? 'bg-zinc-800 text-zinc-300'
                                  : 'bg-zinc-800/60 text-zinc-400'
                              }`}
                            >
                              {s.scoreA}x{s.scoreB}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rodapé do Card com Ação */}
                    <div className="mt-4 flex items-center justify-between pt-2">
                      <span className="text-[11px] text-zinc-500">
                        Jogo #{match.matchNumber || match.id.replace('match-', '')}
                      </span>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 px-2.5 h-8"
                      >
                        <Link to={`/sumulas/${match.id}`}>
                          Ver Súmula
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Vitrine de Competições Ativas */}
        <section className="mt-14 pt-8 border-t border-zinc-800/80">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Torneios e Ligas em Andamento
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Acompanhe o calendário, equipes inscritas e regulamento de cada competição.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200"
            >
              <Link to="/competicoes-ativas">
                Ver Todas
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitions.map((comp) => (
              <Card
                key={comp.id}
                className="bg-zinc-900/50 border-zinc-800/70 p-5 rounded-2xl hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">
                      {comp.modality === 'beach' ? 'Vôlei de Praia' : 'Voleibol de Quadra'}
                    </Badge>
                    <span className="text-zinc-500 capitalize">{comp.genderCategory || 'Misto'}</span>
                  </div>
                  <h3 className="font-bold text-base text-white hover:text-amber-400 transition-colors">
                    {comp.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2">
                    {comp.description || 'Competição oficial homologada pelo sistema BaseOS.'}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">
                    Formato: <strong className="text-zinc-200">{comp.playerFormat || '6x6'}</strong>
                  </span>
                  <Button
                    asChild
                    variant="link"
                    size="sm"
                    className="text-xs text-amber-400 hover:text-amber-300 p-0 h-auto font-semibold"
                  >
                    <Link to={`/classificacao?comp=${comp.id}`}>
                      Tabela & Classificação
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* 5. Footer Institucional BaseOS */}
      <footer className="mt-16 border-t border-zinc-800/80 bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <span>BaseOS — Plataforma Canônica de Gestão e Arbitragem Esportiva</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <Link to="/classificacao" className="hover:text-white transition-colors">
              Classificação
            </Link>
            <Link to="/ajuda" className="hover:text-white transition-colors">
              Central de Ajuda
            </Link>
            <Link to="/login" className="hover:text-white transition-colors">
              Área Restrita
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
