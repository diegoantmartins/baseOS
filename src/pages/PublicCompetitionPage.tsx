/**
 * BaseOS — Portal Público da Competição
 * 
 * Rota oficial: /c/:slug
 * 
 * Experiência móvel e desktop de visualização de tabelas, jogos, resultados,
 * grupos e classificação oficial da competição para atletas, torcedores e público geral.
 * 
 * Sem autenticação necessária, sem formulários de edição, sem motor esportivo paralelo.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  MapPin,
  RefreshCw,
  QrCode,
  Share2,
  Users,
  Swords,
  CheckCircle2,
  Clock,
  ChevronRight,
  Activity,
  ShieldAlert,
  Info,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import {
  publicCompetitionService,
  usePublicCompetition,
  type PublicCompetitionBundle,
  type PublicMatchDTO,
} from '@/services/publicCompetitionService';
import { StandingsTable } from '@/components/competition/StandingsTable';
import { CompetitionQRCodeModal } from '@/components/public/CompetitionQRCodeModal';
import { PublicMatchModal } from '@/components/public/PublicMatchModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function PublicCompetitionPage() {
  const { slug } = useParams<{ slug: string }>();

  // Hook reativo SWR / React Query com staleTime de 15s e Supabase Realtime
  const { bundle, isLoading, isFetching, refetch } = usePublicCompetition(slug);
  const [isQrOpen, setIsQrOpen] = useState<boolean>(false);
  const [selectedMatch, setSelectedMatch] = useState<PublicMatchDTO | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Filtros de jogos
  const [matchFilter, setMatchFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');

  const loadData = useCallback(async (isRefresh = false) => {
    if (!slug) return;
    try {
      await refetch();
      if (isRefresh) {
        toast.success('Dados atualizados com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao carregar dados do portal público:', err);
      toast.error('Não foi possível carregar a competição.');
    }
  }, [refetch, slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mapa de logos de equipes para alimentar tabelas e cards
  const logoUrlById = useMemo(() => {
    if (!bundle) return {};
    const map: Record<string, string> = {};
    for (const t of bundle.teams) {
      if (t.logoUrl) map[t.teamId] = t.logoUrl;
    }
    return map;
  }, [bundle]);

  // Partidas filtradas
  const filteredMatches = useMemo(() => {
    if (!bundle) return [];
    return bundle.matches.filter((m) => {
      // Filtro de status
      if (matchFilter === 'upcoming' && m.isCompleted) return false;
      if (matchFilter === 'completed' && !m.isCompleted) return false;

      // Filtro de grupo
      if (selectedGroupFilter !== 'all' && m.groupName !== selectedGroupFilter) {
        return false;
      }
      return true;
    });
  }, [bundle, matchFilter, selectedGroupFilter]);

  // Próximas partidas para o resumo
  const upcomingMatches = useMemo(() => {
    if (!bundle) return [];
    return bundle.matches.filter((m) => !m.isCompleted).slice(0, 3);
  }, [bundle]);

  // Últimos resultados para o resumo
  const recentResults = useMemo(() => {
    if (!bundle) return [];
    return bundle.matches.filter((m) => m.isCompleted).slice(-3).reverse();
  }, [bundle]);

  const handleShare = async () => {
    if (!bundle) return;
    const url = window.location.href;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: bundle.competition.name,
          text: `Acompanhe ${bundle.competition.name} no BaseOS!`,
          url,
        });
      } catch {
        // Ignora cancelamento
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link público copiado para a área de transferência!');
      } catch {
        toast.error('Erro ao copiar link.');
      }
    }
  };

  // Estado de Carregamento
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
              <Trophy className="h-8 w-8 text-amber-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-amber-500 rounded-full border-2 border-zinc-950 animate-ping" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-white tracking-tight">Carregando Portal Público</h2>
            <p className="text-xs text-zinc-400 mt-1">Obtendo dados oficiais da competição...</p>
          </div>
        </div>
      </div>
    );
  }

  // Estado de Não Encontrado (404 seguro)
  if (!bundle) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="h-16 w-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Competição não encontrada</h1>
          <p className="text-sm text-zinc-400">
            O endereço informado não corresponde a nenhuma competição pública ativa do BaseOS.
          </p>
          <div className="pt-2">
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:text-white">
              <Link to="/competicoes-ativas">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Ver Competições Ativas
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { competition, teams, groups, matches, standings } = bundle;
  const completedCount = matches.filter((m) => m.isCompleted).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-amber-500 selection:text-zinc-950">
      {/* ── BARRA SUPERIOR INSTITUCIONAL ── */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-500 flex items-center justify-center text-zinc-950 font-black text-sm">
              B
            </div>
            <span className="font-bold tracking-tight text-white text-sm">
              Base<span className="text-amber-500">OS</span>
            </span>
            <span className="hidden sm:inline-block text-zinc-600">|</span>
            <span className="hidden sm:inline-block text-xs font-medium text-zinc-400">
              Portal Oficial do Espectador
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadData(true)}
              disabled={isFetching}
              className="text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs h-8 px-2.5"
              title="Atualizar dados da persistência"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin text-amber-500' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQrOpen(true)}
              className="border-zinc-700 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs h-8 px-2.5"
            >
              <QrCode className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
              <span>QR Code</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleShare}
              className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold text-xs h-8 px-2.5"
            >
              <Share2 className="h-3.5 w-3.5 mr-1.5" />
              <span>Compartilhar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO BANNER DA COMPETIÇÃO ── */}
      <section className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-900/50 to-zinc-950 px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              {competition.logoUrl && (
                <img
                  src={competition.logoUrl}
                  alt={competition.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-contain bg-zinc-950/80 p-1.5 border border-zinc-700/60 shrink-0 shadow-md"
                />
              )}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs font-semibold px-2.5 py-0.5">
                    {competition.statusLabel}
                  </Badge>
                  <Badge variant="outline" className="border-zinc-700 bg-zinc-800/60 text-zinc-300 text-xs">
                    {competition.modality === 'indoor' ? 'Vôlei de Quadra' : 'Vôlei de Praia'}
                  </Badge>
                  <Badge variant="outline" className="border-zinc-700 bg-zinc-800/60 text-zinc-300 text-xs">
                    {competition.genderCategory === 'male' ? 'Masculino' : competition.genderCategory === 'female' ? 'Feminino' : 'Misto'}
                  </Badge>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  {competition.name}
                </h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-400">
                  {competition.venue && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                      <span>{competition.venue}</span>
                    </div>
                  )}
                  {competition.startDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                      <span>
                        {new Date(competition.startDate).toLocaleDateString('pt-BR')}
                        {competition.endDate && ` até ${new Date(competition.endDate).toLocaleDateString('pt-BR')}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Resumo Rápido em Cards no Topo */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-zinc-900/70 border border-zinc-800 rounded-xl p-2.5 sm:p-3 self-start md:self-auto min-w-[260px]">
              <div className="text-center">
                <span className="block text-xs text-zinc-500 font-medium">Equipes</span>
                <span className="text-base sm:text-lg font-bold text-white font-mono">{teams.length}</span>
              </div>
              <div className="text-center border-x border-zinc-800 px-2">
                <span className="block text-xs text-zinc-500 font-medium">Jogos</span>
                <span className="text-base sm:text-lg font-bold text-white font-mono">{matches.length}</span>
              </div>
              <div className="text-center">
                <span className="block text-xs text-zinc-500 font-medium">Realizados</span>
                <span className="text-base sm:text-lg font-bold text-amber-400 font-mono">{completedCount}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTEÚDO PRINCIPAL EM ABAS ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="border-b border-zinc-800 pb-1 overflow-x-auto no-scrollbar">
            <TabsList className="bg-zinc-900/80 p-1 border border-zinc-800 rounded-xl h-auto inline-flex">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-zinc-950 data-[state=active]:font-semibold text-zinc-400 text-xs sm:text-sm px-3.5 py-1.5 rounded-lg transition-all"
              >
                <Activity className="h-4 w-4 mr-1.5" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger
                value="standings"
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-zinc-950 data-[state=active]:font-semibold text-zinc-400 text-xs sm:text-sm px-3.5 py-1.5 rounded-lg transition-all"
              >
                <Trophy className="h-4 w-4 mr-1.5" />
                Classificação
              </TabsTrigger>
              <TabsTrigger
                value="matches"
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-zinc-950 data-[state=active]:font-semibold text-zinc-400 text-xs sm:text-sm px-3.5 py-1.5 rounded-lg transition-all"
              >
                <Swords className="h-4 w-4 mr-1.5" />
                Jogos e Resultados
              </TabsTrigger>
              <TabsTrigger
                value="teams"
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-zinc-950 data-[state=active]:font-semibold text-zinc-400 text-xs sm:text-sm px-3.5 py-1.5 rounded-lg transition-all"
              >
                <Users className="h-4 w-4 mr-1.5" />
                Grupos e Equipes
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ════ ABA 1: VISÃO GERAL ════ */}
          <TabsContent value="overview" className="space-y-6 m-0 focus-visible:outline-none">
            {competition.description && (
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-zinc-300 leading-relaxed">
                {competition.description}
              </div>
            )}

            {/* Destaques: Próximos Jogos & Últimos Resultados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Próximas Partidas */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Próximas Partidas
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMatchFilter('upcoming');
                      setActiveTab('matches');
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 h-7 px-2"
                  >
                    Ver todos <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>

                {upcomingMatches.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-4 text-center">
                    Nenhuma partida agendada pendente.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {upcomingMatches.map((m) => (
                      <MatchCardItem key={m.id} match={m} onSelect={() => setSelectedMatch(m)} />
                    ))}
                  </div>
                )}
              </div>

              {/* ⭐ Destaques & Últimos Resultados */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    ⭐ Destaques & Últimos Resultados
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMatchFilter('completed');
                      setActiveTab('matches');
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 h-7 px-2"
                  >
                    Ver todos <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>

                {recentResults.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-4 text-center">
                    Nenhum resultado registrado ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentResults.map((m) => (
                      <MatchCardItem key={m.id} match={m} onSelect={() => setSelectedMatch(m)} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Regulamento Esportivo Sintético Oficial */}
            <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-xl p-4 sm:p-5 space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-500" />
                Regulamento Esportivo Oficial
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg">
                  <span className="text-zinc-500 block mb-1">Formato de Sets</span>
                  <span className="text-zinc-200 font-semibold">
                    {competition.setFormat === '3-sets' ? 'Melhor de 3 Sets' : 'Melhor de 5 Sets'}
                  </span>
                  <span className="text-zinc-400 block text-[11px] mt-0.5">
                    {competition.publicRules.setsToWin} sets para vitória
                  </span>
                </div>

                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg">
                  <span className="text-zinc-500 block mb-1">Pontuação de Set</span>
                  <span className="text-zinc-200 font-semibold font-mono">
                    {competition.publicRules.regularSetPoints} pts
                  </span>
                  <span className="text-zinc-400 block text-[11px] mt-0.5">
                    Tiebreak: {competition.publicRules.tiebreakPoints} pts
                  </span>
                </div>

                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg">
                  <span className="text-zinc-500 block mb-1">Vitória Plena</span>
                  <span className="text-emerald-400 font-semibold font-mono">
                    +{competition.publicRules.pointsWinClear} pontos
                  </span>
                  <span className="text-zinc-400 block text-[11px] mt-0.5">
                    Vitória tiebreak: +{competition.publicRules.pointsWinNarrow} pts
                  </span>
                </div>

                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg">
                  <span className="text-zinc-500 block mb-1">Derrota no Tiebreak</span>
                  <span className="text-amber-400 font-semibold font-mono">
                    +{competition.publicRules.pointsLossNarrow} ponto
                  </span>
                  <span className="text-zinc-400 block text-[11px] mt-0.5">
                    Derrota plena: {competition.publicRules.pointsLossClear} pts
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ════ ABA 2: CLASSIFICAÇÃO ════ */}
          <TabsContent value="standings" className="space-y-6 m-0 focus-visible:outline-none">
            {standings.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/20 border border-zinc-800/60 rounded-xl">
                <Trophy className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-zinc-300">Classificação Indisponível</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                  Os grupos e equipes ainda estão em fase de definição ou o sorteio oficial não foi homologado.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {standings.map((group) => (
                  <div key={group.groupName} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        {group.groupName}
                      </h3>
                      <span className="text-xs text-zinc-500 font-mono">
                        {group.standings.length} agremiações
                      </span>
                    </div>

                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
                      <StandingsTable
                        standings={group.standings}
                        title={group.groupName}
                        logoUrlById={logoUrlById}
                        advancingPerGroup={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ════ ABA 3: JOGOS E RESULTADOS ════ */}
          <TabsContent value="matches" className="space-y-4 m-0 focus-visible:outline-none">
            {/* Barra de Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900/50 border border-zinc-800 p-2.5 rounded-xl">
              <div className="flex items-center gap-1">
                <Button
                  variant={matchFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMatchFilter('all')}
                  className={`text-xs h-7 px-2.5 ${matchFilter === 'all' ? 'bg-amber-500 text-zinc-950 font-semibold' : 'text-zinc-400'}`}
                >
                  Todos ({matches.length})
                </Button>
                <Button
                  variant={matchFilter === 'upcoming' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMatchFilter('upcoming')}
                  className={`text-xs h-7 px-2.5 ${matchFilter === 'upcoming' ? 'bg-amber-500 text-zinc-950 font-semibold' : 'text-zinc-400'}`}
                >
                  Agendados ({matches.filter((m) => !m.isCompleted).length})
                </Button>
                <Button
                  variant={matchFilter === 'completed' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMatchFilter('completed')}
                  className={`text-xs h-7 px-2.5 ${matchFilter === 'completed' ? 'bg-amber-500 text-zinc-950 font-semibold' : 'text-zinc-400'}`}
                >
                  Encerrados ({completedCount})
                </Button>
              </div>

              {groups.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-500">Chave:</span>
                  <select
                    value={selectedGroupFilter}
                    onChange={(e) => setSelectedGroupFilter(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="all">Todas as Chaves</option>
                    {groups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Listagem de Partidas */}
            {filteredMatches.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/20 border border-zinc-800/60 rounded-xl">
                <Swords className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-zinc-300">Nenhuma partida encontrada</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Não há jogos para os filtros selecionados no momento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMatches.map((m) => (
                  <MatchDetailedCard key={m.id} match={m} onSelect={() => setSelectedMatch(m)} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ════ ABA 4: GRUPOS E EQUIPES ════ */}
          <TabsContent value="teams" className="space-y-6 m-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groups.length > 0 ? (
                groups.map((grpName) => {
                  const grpTeams = teams.filter((t) => t.groupName === grpName);
                  return (
                    <div key={grpName} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Layers className="h-4 w-4 text-amber-500" />
                          {grpName}
                        </h3>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                          {grpTeams.length} equipes
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {grpTeams.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between p-2.5 bg-zinc-900/80 hover:bg-zinc-800/60 border border-zinc-800/80 rounded-lg transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {t.logoUrl ? (
                                <img
                                  src={t.logoUrl}
                                  alt={t.teamName}
                                  className="h-8 w-8 rounded-full bg-zinc-800 object-cover border border-zinc-700"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-amber-400">
                                  {t.shortName ? t.shortName.slice(0, 2) : t.teamName.slice(0, 2)}
                                </div>
                              )}
                              <div>
                                <span className="text-sm font-semibold text-white block leading-tight">
                                  {t.teamName}
                                </span>
                                {t.city && <span className="text-xs text-zinc-400">{t.city}</span>}
                              </div>
                            </div>

                            {t.shortName && (
                              <span className="text-xs font-mono font-bold text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded">
                                {t.shortName}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 space-y-3">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                    Equipes Confirmadas ({teams.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {teams.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl"
                      >
                        {t.logoUrl ? (
                          <img
                            src={t.logoUrl}
                            alt={t.teamName}
                            className="h-9 w-9 rounded-full bg-zinc-800 object-cover border border-zinc-700"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-amber-400">
                            {t.shortName ? t.shortName.slice(0, 2) : t.teamName.slice(0, 2)}
                          </div>
                        )}
                        <div className="truncate">
                          <span className="text-sm font-semibold text-white block truncate">{t.teamName}</span>
                          <span className="text-xs text-zinc-500">{t.city || 'Confirmada'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Aviso de Privacidade e LGPD */}
            <div className="p-4 bg-zinc-900/30 border border-zinc-800/60 rounded-xl text-xs text-zinc-500 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-zinc-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Privacidade e LGPD:</strong> No MVP público, o BaseOS preserva a privacidade dos atletas e dados cadastrais sensíveis. As agremiações realizam a autogestão de seus elencos exclusivamente pelo portal privado de inscrição com token seguro.
              </span>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ── SEÇÃO DE APOIADORES E PATROCINADORES OFICIAIS DO EVENTO ── */}
      {competition.supporters && competition.supporters.length > 0 && (
        <section className="border-t border-zinc-800/60 bg-zinc-950/80 py-8 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="text-center space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500 block">
                Parceiros Oficiais
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Apoiadores e Patrocinadores da Competição
              </h3>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2">
              {competition.supporters.map((sup) => {
                const tierLabel =
                  sup.tier === 'master'
                    ? 'Patrocinador Master'
                    : sup.tier === 'official'
                    ? 'Patrocinador Oficial'
                    : sup.tier === 'support'
                    ? 'Apoiador'
                    : sup.tier === 'media'
                    ? 'Parceiro de Mídia'
                    : null;

                const CardContent = (
                  <div className="flex items-center gap-3 p-2.5 px-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all group shadow-sm">
                    {sup.logoUrl ? (
                      <img
                        src={sup.logoUrl}
                        alt={sup.name}
                        className="w-8 h-8 rounded-lg object-contain bg-zinc-950 p-1 border border-zinc-800 shrink-0 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                        {sup.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left">
                      <span className="text-xs font-semibold text-white block group-hover:text-amber-400 transition-colors">
                        {sup.name}
                      </span>
                      {tierLabel && (
                        <span className="text-[10px] text-zinc-400 block font-medium">
                          {tierLabel}
                        </span>
                      )}
                    </div>
                  </div>
                );

                if (sup.websiteUrl) {
                  return (
                    <a
                      key={sup.id}
                      href={sup.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 rounded-xl"
                    >
                      {CardContent}
                    </a>
                  );
                }

                return <div key={sup.id}>{CardContent}</div>;
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── RODAPÉ INSTITUCIONAL (ATRIBUIÇÃO DA PLATAFORMA BASEOS) ── */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-6 px-4 sm:px-6 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto space-y-2">
          <div className="flex items-center justify-center gap-1.5 font-medium text-zinc-400">
            <span>Powered by</span>
            <span className="font-bold tracking-tight text-white">
              Base<span className="text-amber-500">OS</span>
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-[11px] text-zinc-400">Gestão Profissional de Voleibol</span>
          </div>
          <p className="text-zinc-600 text-[11px]">
            Dados oficiais atualizados conforme a persistência do BaseOS. Portal de leitura pública.
          </p>
        </div>
      </footer>

      {/* ── MODAL DE QR CODE ── */}
      <CompetitionQRCodeModal
        open={isQrOpen}
        onOpenChange={setIsQrOpen}
        competitionName={competition.name}
        slug={competition.slug}
      />

      {/* ── MODAL DE DETALHES DO JOGO COM MVP ── */}
      <PublicMatchModal
        open={selectedMatch !== null}
        onOpenChange={(open) => !open && setSelectedMatch(null)}
        match={selectedMatch}
        competitionName={competition.name}
      />
    </div>
  );
}

// ============================================================================
// Subcomponentes de Partida
// ============================================================================

function MatchCardItem({ match, onSelect }: { match: PublicMatchDTO; onSelect?: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={`p-3 bg-zinc-900/70 border border-zinc-800/80 rounded-lg text-xs space-y-2 transition-all ${
        onSelect ? 'cursor-pointer hover:border-zinc-700 hover:bg-zinc-900' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1 max-w-[65%] truncate">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-semibold text-zinc-200 truncate">{match.teamAName}</span>
            {match.isCompleted && (
              <span className={`font-mono font-bold ${match.winnerSide === 'A' ? 'text-amber-400' : 'text-zinc-500'}`}>
                {match.setsWonA}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-semibold text-zinc-200 truncate">{match.teamBName}</span>
            {match.isCompleted && (
              <span className={`font-mono font-bold ${match.winnerSide === 'B' ? 'text-amber-400' : 'text-zinc-500'}`}>
                {match.setsWonB}
              </span>
            )}
          </div>
        </div>

        <div className="text-right flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1.5">
            {match.court && (
              <Badge
                variant="outline"
                className={`text-[9px] font-semibold px-1.5 py-0 ${
                  match.court.includes('2')
                    ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                    : 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                }`}
              >
                📍 {match.court}
              </Badge>
            )}
            {match.isCompleted ? (
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] px-1.5 py-0">
                Encerrado
              </Badge>
            ) : (
              <Badge variant="outline" className="border-zinc-700 bg-zinc-800/60 text-zinc-400 text-[10px] px-1.5 py-0">
                {match.scheduledTime ? match.scheduledTime.slice(11, 16) : 'Agendado'}
              </Badge>
            )}
          </div>
          {match.groupName && <span className="text-[10px] text-zinc-500">{match.groupName}</span>}
        </div>
      </div>

      {/* Parciais dos Sets se finalizado */}
      {match.isCompleted && match.setScores && match.setScores.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1 font-mono text-[10px]">
          <span className="text-zinc-500 uppercase font-sans text-[9px] font-semibold">Sets:</span>
          {match.setScores.map((s, idx) => (
            <span
              key={idx}
              className={`px-1.5 py-0.5 rounded ${
                s.scoreA > s.scoreB ? 'bg-zinc-800 text-zinc-200 font-semibold' : 'bg-zinc-800/60 text-zinc-400'
              }`}
            >
              {s.scoreA}×{s.scoreB}
            </span>
          ))}
        </div>
      )}

      {/* Pílula compacta de MVP no card resumido */}
      {match.highlightAthlete && (
        <div
          className="pt-1.5 border-t border-zinc-800/60 flex items-center gap-1.5 text-[11px] text-amber-300 truncate"
          data-testid="public-match-highlight-compact"
        >
          <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="font-bold text-amber-400 text-[10px] uppercase tracking-wider shrink-0">
            ⭐ MVP:
          </span>
          <span className="font-semibold text-white truncate">
            {match.highlightAthlete.jerseyNumber != null ? `[#${match.highlightAthlete.jerseyNumber}] ` : ''}
            {match.highlightAthlete.name}
          </span>
          <span className="text-[10px] text-zinc-400 truncate">
            ({match.highlightAthlete.teamName})
          </span>
        </div>
      )}
    </div>
  );
}

function MatchDetailedCard({ match, onSelect }: { match: PublicMatchDTO; onSelect?: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={`bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 sm:p-5 transition-all space-y-3 ${
        onSelect ? 'cursor-pointer hover:border-zinc-700 hover:bg-zinc-900/80 shadow-sm' : ''
      }`}
    >
      <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800/60 pb-2">
        <div className="flex items-center gap-2">
          {match.groupName && (
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px]">
              {match.groupName}
            </Badge>
          )}
          {match.court && (
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold px-2 py-0.5 ${
                match.court.includes('2')
                  ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                  : 'border-amber-500/40 bg-amber-500/15 text-amber-300'
              }`}
            >
              📍 {match.court}
            </Badge>
          )}
          {match.matchNumber && <span>Jogo #{match.matchNumber}</span>}
          {match.round && <span>• Rodada {match.round}</span>}
        </div>

        <div className="flex items-center gap-2">
          {match.isWo && (
            <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-400 text-[10px]">
              W.O.
            </Badge>
          )}
          {match.isHomologated ? (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px]">
              Homologado
            </Badge>
          ) : match.isCompleted ? (
            <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-400 text-[10px]">
              Encerrado
            </Badge>
          ) : (
            <Badge variant="outline" className="border-zinc-700 bg-zinc-800/80 text-zinc-400 text-[10px]">
              Agendado
            </Badge>
          )}
        </div>
      </div>

      {/* Confronto e Placar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4 py-1">
        {/* Equipe A */}
        <div className="sm:col-span-5 flex items-center justify-between sm:justify-end gap-3 order-1">
          <span className={`text-base font-bold truncate ${match.winnerSide === 'A' ? 'text-white' : 'text-zinc-300'}`}>
            {match.teamAName}
          </span>
          {match.teamALogoUrl ? (
            <img src={match.teamALogoUrl} alt={match.teamAName} className="h-8 w-8 rounded-full bg-zinc-800 object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-amber-400 flex-shrink-0">
              A
            </div>
          )}
        </div>

        {/* Placar Central de Sets */}
        <div className="sm:col-span-2 flex flex-col items-center justify-center order-3 sm:order-2">
          {match.isCompleted ? (
            <div className="flex items-center gap-2 font-mono text-2xl font-black">
              <span className={match.winnerSide === 'A' ? 'text-amber-400' : 'text-zinc-500'}>
                {match.setsWonA}
              </span>
              <span className="text-zinc-600 text-lg">x</span>
              <span className={match.winnerSide === 'B' ? 'text-amber-400' : 'text-zinc-500'}>
                {match.setsWonB}
              </span>
            </div>
          ) : (
            <div className="text-xs text-zinc-500 font-mono flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{match.scheduledTime ? match.scheduledTime.slice(11, 16) : 'VS'}</span>
            </div>
          )}
        </div>

        {/* Equipe B */}
        <div className="sm:col-span-5 flex items-center justify-between sm:justify-start gap-3 order-2 sm:order-3">
          {match.teamBLogoUrl ? (
            <img src={match.teamBLogoUrl} alt={match.teamBName} className="h-8 w-8 rounded-full bg-zinc-800 object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-amber-400 flex-shrink-0">
              B
            </div>
          )}
          <span className={`text-base font-bold truncate ${match.winnerSide === 'B' ? 'text-white' : 'text-zinc-300'}`}>
            {match.teamBName}
          </span>
        </div>
      </div>

      {/* Parciais dos Sets e Localização */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/40 text-xs text-zinc-500">
        <div className="flex flex-wrap items-center gap-2">
          {match.setScores && match.setScores.length > 0 ? (
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-zinc-500">Sets:</span>
              {match.setScores.map((s, idx) => (
                <span
                  key={idx}
                  className={`px-1.5 py-0.5 rounded ${
                    s.scoreA > s.scoreB ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-800/60 text-zinc-400'
                  }`}
                >
                  {s.scoreA}x{s.scoreB}
                </span>
              ))}
            </div>
          ) : (
            <span>Aguardando início</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {match.court && <span>Quadra: {match.court}</span>}
          {match.venue && <span>Local: {match.venue}</span>}
        </div>
      </div>

      {/* Destaque da Partida (MVP) — Pílula Premium Gold/Amber (visível somente após homologação) */}
      {match.highlightAthlete && (
        <div
          className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 text-xs text-amber-200 shadow-sm"
          data-testid="public-match-highlight"
        >
          <div className="h-6 w-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
            <span className="font-bold text-[11px] text-amber-400 uppercase tracking-wider flex items-center gap-1">
              ⭐ MVP da Partida:
            </span>
            <span className="font-semibold text-white truncate">
              {match.highlightAthlete.jerseyNumber != null ? `[#${match.highlightAthlete.jerseyNumber}] ` : ''}
              {match.highlightAthlete.name}
            </span>
            <span className="text-[11px] text-amber-300/70 truncate">
              ({match.highlightAthlete.teamName})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
