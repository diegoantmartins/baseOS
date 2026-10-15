/**
 * BaseOS — Central Pública de Competições (/competicoes-publicas)
 *
 * Catálogo público de todas as competições cadastradas na plataforma.
 * Acessível SEM autenticação para atletas, torcedores e interessados.
 *
 * Diretrizes visuais Dark Tech de Alto Contraste:
 * - Fundo principal: Deep Dark Zinc-950 (#09090b)
 * - Superfícies: Zinc-900 com bordas nítidas em Zinc-800
 * - Tipografia de Alto Contraste: Headings em text-white, corpo em text-zinc-300
 * - Ação primária: Âmbar BaseOS (#F59E0B / amber-500)
 * - Badges com pontos luminosos em neon (Emerald, Amber, Sky)
 * - Botões em formato de pílula (rounded-full)
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Search,
  ArrowRight,
  Users,
  MapPin,
  Calendar,
  Volleyball,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  Layers,
  ChevronLeft,
  Filter,
  PhoneCall,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { dataAccess } from '@/services/dataAccess';
import { generateCompetitionSlug, getPublicStatusLabel } from '@/services/publicCompetitionService';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { Button } from '@/components/ui/button';
import type { CompetitionRecord, CompetitionLifecycleStatus } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';

const COMMERCIAL_WHATSAPP_URL =
  'https://wa.me/5546999123456?text=Ol%C3%A1!%20Gostaria%20de%20contratar%20a%20plataforma%20BaseOS%20para%20o%20meu%20campeonato.';

// ─── Tipos auxiliares ────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'in-progress' | 'registration-open' | 'completed' | 'upcoming';
type ModalityFilter = 'all' | 'indoor' | 'beach';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveStatusFilter(status: CompetitionLifecycleStatus): StatusFilter {
  if (status === 'in-progress' || status === 'playoffs') return 'in-progress';
  if (status === 'registration-open' || status === 'registration') return 'registration-open';
  if (status === 'completed') return 'completed';
  if (
    status === 'planning' ||
    status === 'registration-closed' ||
    status === 'draw-pending' ||
    status === 'groups-defined' ||
    status === 'draft'
  )
    return 'upcoming';
  return 'upcoming';
}

interface StatusConfig {
  label: string;
  dot: string;
  badge: string;
}

function getStatusConfig(status: CompetitionLifecycleStatus): StatusConfig {
  switch (status) {
    case 'in-progress':
    case 'playoffs':
      return {
        label: status === 'playoffs' ? 'Fase Final' : 'Em Andamento',
        dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse',
        badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      };
    case 'registration-open':
    case 'registration':
      return {
        label: 'Inscrições Abertas',
        dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse',
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      };
    case 'completed':
      return {
        label: 'Encerrada',
        dot: 'bg-zinc-400',
        badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
      };
    case 'cancelled':
      return {
        label: 'Cancelada',
        dot: 'bg-rose-400',
        badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      };
    case 'registration-closed':
      return {
        label: 'Inscrições Encerradas',
        dot: 'bg-zinc-400',
        badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
      };
    case 'draw-pending':
      return {
        label: 'Aguardando Sorteio',
        dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      };
    case 'groups-defined':
      return {
        label: 'Grupos Definidos',
        dot: 'bg-sky-400 shadow-[0_0_8px_#38bdf8]',
        badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      };
    default:
      return {
        label: getPublicStatusLabel(status),
        dot: 'bg-zinc-500',
        badge: 'bg-zinc-800/80 text-zinc-300 border-zinc-700',
      };
  }
}

function formatDateRange(start?: string, end?: string): string {
  if (!start) return 'Data a confirmar';
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const s = new Intl.DateTimeFormat('pt-BR', opts).format(new Date(start));
  if (!end) return s;
  const e = new Intl.DateTimeFormat('pt-BR', opts).format(new Date(end));
  return `${s} — ${e}`;
}

// ─── Dados estáticos dos filtros ─────────────────────────────────────────────

const STATUS_FILTERS: { value: StatusFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Todas', icon: <Trophy className="w-3.5 h-3.5" /> },
  { value: 'in-progress', label: 'Em Andamento', icon: <Activity className="w-3.5 h-3.5" /> },
  { value: 'registration-open', label: 'Inscrições Abertas', icon: <Clock className="w-3.5 h-3.5" /> },
  { value: 'upcoming', label: 'Previstas', icon: <Calendar className="w-3.5 h-3.5" /> },
  { value: 'completed', label: 'Encerradas', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];

// ─── Componente: Card de Competição ──────────────────────────────────────────

interface CompetitionCardProps {
  comp: CompetitionRecord;
  teamCount: number;
  teams: { id: string; name: string; shortName?: string; logoUrl?: string }[];
  index: number;
}

function CompetitionCard({ comp, teamCount, teams, index }: CompetitionCardProps) {
  const slug = comp.slug || generateCompetitionSlug(comp.name);
  const statusCfg = getStatusConfig(comp.status);
  const hasSlug = Boolean(comp.slug);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16, scale: 0.97 }}
      transition={{ duration: 0.28, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      layout
      className="group bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 sm:p-7
                 shadow-xl hover:border-amber-500/50 hover:shadow-[0_12px_40px_-10px_rgba(245,158,11,0.15)]
                 transition-all duration-300 flex flex-col justify-between space-y-5"
    >
      <div className="space-y-4">
        {/* Cabeçalho: status + modalidade */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border ${statusCfg.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            {statusCfg.label}
          </span>
          <span className="text-zinc-300 bg-zinc-950 px-3 py-1 rounded-full font-semibold text-xs border border-zinc-800 font-mono">
            {comp.modality === 'indoor' ? 'Indoor 6x6' : 'Praia'}
          </span>
        </div>

        {/* Título e descrição */}
        <div>
          <h3 className="text-xl font-black text-white group-hover:text-amber-400 transition-colors leading-tight">
            {comp.name}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
            {comp.description ||
              'Competição oficial de voleibol com chaveamento por grupos, playoffs e súmula digital.'}
          </p>
        </div>

        {/* Metadados: datas e local */}
        <div className="space-y-1.5 text-xs text-zinc-400 font-medium pt-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span>{formatDateRange(comp.startDate, comp.endDate)}</span>
          </div>
          {comp.venue && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="truncate">{comp.venue}</span>
            </div>
          )}
        </div>

        {/* Indicadores em bloco de alto contraste */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3.5">
            <span className="text-zinc-500 font-mono font-bold text-xs uppercase tracking-wider block mb-0.5">
              EQUIPES
            </span>
            <span className="text-white text-2xl font-black font-mono block">
              {teamCount > 0 ? teamCount : '—'}
            </span>
          </div>
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3.5">
            <span className="text-zinc-500 font-mono font-bold text-xs uppercase tracking-wider block mb-0.5">
              FORMATO
            </span>
            <span className="text-zinc-200 text-xs font-bold block mt-1 truncate">
              {comp.modality === 'indoor' ? 'Grupos + Eliminatória' : 'Fase Única'}
            </span>
          </div>
        </div>

        {/* Amostra de escudos das equipes */}
        {teams.length > 0 && (
          <div>
            <span className="text-zinc-400 font-mono font-bold text-xs uppercase tracking-wider block mb-2">
              EQUIPES CONFIRMADAS:
            </span>
            <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
              {teams.slice(0, 6).map((t) => (
                <div
                  key={t.id}
                  className="w-7 h-7 rounded-full border-2 border-zinc-900 bg-zinc-800 shadow-sm shrink-0 overflow-hidden flex items-center justify-center"
                  title={t.name}
                >
                  <TeamCrest
                    logoUrl={t.logoUrl}
                    name={t.name}
                    shortName={t.shortName}
                    size="sm"
                    className="w-full h-full text-[8px]"
                  />
                </div>
              ))}
              {teams.length > 6 && (
                <div className="w-7 h-7 rounded-full border-2 border-zinc-900 bg-zinc-800 text-zinc-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                  +{teams.length - 6}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Botão em Pílula de Acesso Direto */}
      {hasSlug ? (
        <Link
          to={`/c/${slug}`}
          className="w-full rounded-full bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-white font-bold text-xs sm:text-sm h-11 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md border border-zinc-700/80 active:scale-[0.98]"
        >
          <span>Abrir Portal do Campeonato</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      ) : (
        <Button
          asChild
          className="w-full rounded-full bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-white font-bold text-xs sm:text-sm h-11 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md border border-zinc-700/80 active:scale-[0.98]"
        >
          <Link to={`/c/${comp.id}`}>
            <span>Ver Informações</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      )}
    </motion.div>
  );
}

// ─── Componente Principal da Página ──────────────────────────────────────────

export default function PublicCatalogPage() {
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string; shortName?: string; logoUrl?: string }[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>('all');

  // Carrega dados públicos
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const [comps, tms, cTeams] = await Promise.all([
          Promise.resolve().then(() => dataAccess.listCompetitions?.()).catch(() => []),
          Promise.resolve().then(() => dataAccess.listTeams?.()).catch(() => []),
          Promise.resolve().then(() => dataAccess.listCompetitionTeams?.()).catch(() => []),
        ]);
        if (!isMounted) return;
        setCompetitions(Array.isArray(comps) ? comps : []);
        setTeams(Array.isArray(tms) ? tms : []);
        setCompetitionTeams(Array.isArray(cTeams) ? cTeams : []);
      } catch (err) {
        console.error('[PublicCatalogPage] Erro ao carregar catálogo:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Mapeamento de equipes por competição
  const teamsByCompetition = useMemo(() => {
    const map = new Map<string, { id: string; name: string; shortName?: string; logoUrl?: string }[]>();
    for (const ct of competitionTeams) {
      const team = teams.find((t) => t.id === ct.teamId);
      if (team) {
        const existing = map.get(ct.competitionId) || [];
        existing.push(team);
        map.set(ct.competitionId, existing);
      }
    }
    return map;
  }, [competitionTeams, teams]);

  // Contagem por status para os botões de filtro
  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: 0,
      'in-progress': 0,
      'registration-open': 0,
      upcoming: 0,
      completed: 0,
    };
    for (const c of competitions) {
      if (c.status === 'cancelled') continue;
      counts.all += 1;
      const group = resolveStatusFilter(c.status);
      counts[group] = (counts[group] || 0) + 1;
    }
    return counts;
  }, [competitions]);

  // Filtragem ativa
  const filteredCompetitions = useMemo(() => {
    return competitions.filter((comp) => {
      if (comp.status === 'cancelled') return false;

      // Filtro de status
      if (statusFilter !== 'all') {
        const group = resolveStatusFilter(comp.status);
        if (group !== statusFilter) return false;
      }

      // Filtro de modalidade
      if (modalityFilter !== 'all') {
        if (comp.modality !== modalityFilter) return false;
      }

      // Filtro de busca textual
      if (search.trim()) {
        const term = search.toLowerCase();
        const matchesName = comp.name?.toLowerCase().includes(term);
        const matchesDesc = comp.description?.toLowerCase().includes(term);
        const matchesLoc = comp.venue?.toLowerCase().includes(term);
        if (!matchesName && !matchesDesc && !matchesLoc) return false;
      }

      return true;
    });
  }, [competitions, statusFilter, modalityFilter, search]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('all');
    setModalityFilter('all');
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans antialiased text-zinc-100 selection:bg-amber-500 selection:text-zinc-950">
      {/* ─── Header público oficial Dark Tech ─── */}
      <header className="sticky top-0 z-50 w-full bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-full"
          >
            <img
              src="/assets/fundo escuro logo.png"
              alt="BaseOS"
              className="h-9 sm:h-10 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo-dark.png';
              }}
            />
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/"
              className="text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-full hover:bg-zinc-900/60"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar para a Home</span>
            </Link>

            <Button
              asChild
              size="sm"
              className="rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm h-10 px-5 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
            >
              <Link to="/login">
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Hero do Catálogo com Alto Contraste ─── */}
      <section className="relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-b border-zinc-850 bg-gradient-to-b from-zinc-900/50 via-zinc-950 to-zinc-950">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-800 bg-zinc-900 text-xs font-mono">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
              CENTRAL PÚBLICA DE COMPETIÇÕES
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Todos os Campeonatos
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 font-normal max-w-2xl leading-relaxed">
              Consulte calendários, tabelas de classificação, súmulas homologadas e elencos oficiais de todas as competições gerenciadas pela plataforma BaseOS.
            </p>
          </div>

          {/* Barra de Busca de Alto Contraste */}
          <div className="pt-2 max-w-xl relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome do torneio, cidade ou modalidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 text-white placeholder:text-zinc-500 border border-zinc-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-full h-12 pl-11 pr-10 text-sm font-medium transition-all outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─── Barra de Filtros por Status e Modalidade ─── */}
      <section className="sticky top-20 z-40 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-850 py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Filtros de Status em Pílulas */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto scrollbar-none">
            {STATUS_FILTERS.map((f) => {
              const active = statusFilter === f.value;
              const count = statusCounts[f.value] ?? 0;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] ${
                    active
                      ? 'bg-amber-500 text-zinc-950 shadow-md'
                      : 'bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-850 border border-zinc-800'
                  }`}
                >
                  {f.icon}
                  <span>{f.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      active ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filtro de Modalidade (Indoor / Praia) */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider hidden md:inline">
              MODALIDADE:
            </span>
            <div className="inline-flex p-1 bg-zinc-900 rounded-full border border-zinc-800">
              <button
                type="button"
                onClick={() => setModalityFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  modalityFilter === 'all'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setModalityFilter('indoor')}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  modalityFilter === 'indoor'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Indoor
              </button>
              <button
                type="button"
                onClick={() => setModalityFilter('beach')}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  modalityFilter === 'beach'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Praia
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Grid de Competições ─── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-7 space-y-4 animate-pulse"
              >
                <div className="flex justify-between">
                  <div className="h-5 w-24 bg-zinc-800 rounded-full" />
                  <div className="h-5 w-16 bg-zinc-800 rounded-full" />
                </div>
                <div className="h-6 w-3/4 bg-zinc-800 rounded-md" />
                <div className="h-4 w-full bg-zinc-800/60 rounded-md" />
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <div className="h-16 bg-zinc-950 rounded-2xl" />
                  <div className="h-16 bg-zinc-950 rounded-2xl" />
                </div>
                <div className="h-12 w-full bg-zinc-800 rounded-full pt-4" />
              </div>
            ))}
          </div>
        ) : filteredCompetitions.length === 0 ? (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-xl">
            <Trophy className="w-12 h-12 text-zinc-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">Nenhuma competição encontrada</h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              Não encontramos nenhum campeonato com os filtros selecionados. Tente alterar a busca ou limpar os filtros.
            </p>
            <Button
              type="button"
              onClick={clearFilters}
              className="rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs h-10 px-5 cursor-pointer mt-2"
            >
              Limpar Filtros de Busca
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredCompetitions.map((comp, idx) => {
                const compTeams = teamsByCompetition.get(comp.id) || [];
                return (
                  <CompetitionCard
                    key={comp.id}
                    comp={comp}
                    teamCount={compTeams.length}
                    teams={compTeams}
                    index={idx}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* ─── Rodapé oficial Dark Tech ─── */}
      <footer className="bg-black text-zinc-400 py-12 px-4 sm:px-6 lg:px-8 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <img
              src="/assets/fundo escuro logo.png"
              alt="BaseOS"
              className="h-8 w-auto object-contain mx-auto md:mx-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo-dark.png';
              }}
            />
            <p className="text-xs text-zinc-400">
              Plataforma oficial de tecnologia e inteligência para gestão profissional de voleibol.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <p>© 2026 BaseOS. Todos os direitos reservados.</p>
            <a
              href={COMMERCIAL_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 font-semibold"
            >
              Falar com o Suporte
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
