/**
 * LandingPage — Home Pública Institucional do BaseOS SaaS (v2.4.4)
 * 
 * Arquitetura de Produto:
 * - Vitrine Institucional do Sistema Operacional Esportivo BaseOS.
 * - Hero 100% desacoplado: foco na tecnologia SaaS, Motor DAG de Disputas, Súmula Oficial A4, Draw Arena e Multi-Tenant.
 * - Seção de Torneios em Grid com Drill-Down: cards compactos de competições na vitrine inicial.
 * - Hub Exclusivo do Torneio: exibido somente ao clicar no card da competição com botão de retorno.
 * - Zero uso do caractere "&" na interface: redação em português com "e" e tipografia limpa.
 * - Ecossistema de Portais, Contato Comercial WhatsApp e Conformidade Legal LGPD preservados.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Volleyball,
  CalendarDays,
  Clock,
  MapPin,
  ExternalLink,
  Shield,
  Users,
  FileText,
  Activity,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  LogIn,
  Search,
  ChevronRight,
  Menu,
  X,
  Layers,
  Award,
  Radio,
  Scale,
  Sparkles,
  PhoneCall,
  MessageSquare,
  Building2,
  PlayCircle,
  HelpCircle,
  Cpu,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '@/components/auth/useAuth';
import { dataAccess } from '@/services/dataAccess';
import { BaseOsLogo } from '@/components/common/BaseOsLogo';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { MatchSheetEmitDialog } from '@/components/match/MatchSheetEmitDialog';
import {
  PrivacyPolicyModal,
  TermsOfUseModal,
  TechnicalRegulationsModal,
} from '@/components/legal/LegalModals';
import { toast } from 'sonner';
import type { CompetitionRecord, MatchRecord, TeamRecord, VenueRecord } from '@/types/entities';
import type { CompetitionTeam, CompetitionAthlete } from '@/types/registration';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getSafeDestination(userRole: string, isPlatformAdmin?: boolean): string {
  if (isPlatformAdmin) return '/master';
  if (userRole === 'team') return '/portal/equipe';
  if (userRole === 'referee' || userRole === 'scorer') return '/jogos';
  return '/dashboard';
}

const COMMERCIAL_WHATSAPP_URL =
  'https://wa.me/5546999081502?text=Ola!%20Tenho%20interesse%20em%20utilizar%20o%20BaseOS%20no%20meu%20campeonato%20de%20voleibol.';

// ─── COMPONENTE 1: NAVBAR INSTITUCIONAL ───────────────────────────────────────

interface LandingNavProps {
  onOpenPrivacyModal: () => void;
  onOpenTermsModal: () => void;
}

function LandingNav({ onOpenPrivacyModal, onOpenTermsModal }: LandingNavProps) {
  const { session, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    toast.success('Sessão encerrada com sucesso.');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Identidade BaseOS */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
          >
            <BaseOsLogo size="md" showText variant="system" />
          </Link>
          <Badge
            variant="outline"
            className="hidden sm:inline-flex text-[10px] font-mono border-amber-500/30 text-amber-400 bg-amber-500/10 py-0.5 px-2"
          >
            SPORTS INTELLIGENCE • v2.4.4
          </Badge>
        </div>

        {/* Links de navegação ancorados */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <a href="#torneios" className="hover:text-foreground transition-colors flex items-center gap-1.5 text-zinc-300">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Torneios</span>
          </a>
          <a href="#recursos" className="hover:text-foreground transition-colors">
            Recursos
          </a>
          <a href="#portais" className="hover:text-foreground transition-colors">
            Portais
          </a>
          <Link to="/sorteio" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Draw Arena</span>
          </Link>
          <a href="#comercial" className="text-amber-400 hover:text-amber-300 transition-colors">
            Fale Conosco
          </a>
        </nav>

        {/* Ações de Acesso */}
        <div className="hidden sm:flex items-center gap-2.5">
          {session ? (
            <div className="flex items-center gap-2">
              <Button
                asChild
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 rounded-md shadow-sm"
              >
                <Link to={getSafeDestination(session.user.role, session.user.isPlatformAdmin)}>
                  <span>Meu Painel</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-xs text-muted-foreground hover:text-foreground h-9 px-2.5"
                title="Encerrar sessão"
              >
                Sair
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 h-9 px-3.5"
              >
                <Link to="/login">
                  <LogIn className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                  <span>Entrar</span>
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 rounded-md shadow-sm transition-all"
              >
                <Link to="/login">Acessar Plataforma</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Menu Mobile Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Alternar menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Menu Mobile Expandido */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="sm:hidden border-b border-border bg-card/95 backdrop-blur-md px-4 py-4 space-y-3"
          >
            <div className="flex flex-col space-y-2 text-sm font-medium">
              <a
                href="#torneios"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-zinc-800 text-foreground flex items-center justify-between"
              >
                <span>Competições na Plataforma</span>
                <Trophy className="w-4 h-4 text-amber-500" />
              </a>
              <a
                href="#recursos"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-zinc-800 text-foreground"
              >
                Recursos da Plataforma
              </a>
              <a
                href="#portais"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-zinc-800 text-foreground"
              >
                Portais de Acesso
              </a>
              <Link
                to="/sorteio"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-zinc-800 text-foreground flex items-center justify-between"
              >
                <span>Draw Arena (Sorteio 3D)</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </Link>
              <a
                href="#comercial"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md hover:bg-zinc-800 text-amber-400 font-bold"
              >
                Fale Conosco (WhatsApp)
              </a>
            </div>

            <div className="pt-3 border-t border-border flex flex-col gap-2">
              {session ? (
                <>
                  <Button
                    asChild
                    size="sm"
                    className="w-full bg-primary text-primary-foreground font-semibold"
                  >
                    <Link to={getSafeDestination(session.user.role, session.user.isPlatformAdmin)}>
                      Acessar Meu Painel
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full text-xs border-zinc-800"
                  >
                    Encerrar Sessão
                  </Button>
                </>
              ) : (
                <Button
                  asChild
                  size="sm"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full bg-primary text-primary-foreground font-bold text-xs"
                >
                  <Link to="/login">
                    <LogIn className="w-3.5 h-3.5 mr-1.5" />
                    <span>Entrar na Plataforma</span>
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ─── COMPONENTE 2: HERO INSTITUCIONAL SAAS (PREVIEW DO SISTEMA OPERACIONAL) ────

interface LandingHeroProps {
  totalCompetitionsCount: number;
}

function LandingHero({ totalCompetitionsCount }: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 px-4 sm:px-6 lg:px-8 border-b border-border/40">
      {/* Ambient Spotlight Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] sm:w-[1000px] h-[450px] bg-amber-500/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-1/4 right-0 w-[400px] h-[300px] bg-primary/5 blur-[100px] pointer-events-none rounded-full" />

      {/* Grid Pattern sutil */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Lado Esquerdo: Proposta de Valor SaaS */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono uppercase font-bold tracking-wide">
              SISTEMA OPERACIONAL DO VOLEIBOL • BASEOS 2026
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.08]">
            A infraestrutura definitiva para{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">
              gestão profissional de voleibol.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
            Desenvolvido para ligas, federações, prefeituras e clubes. O BaseOS unifica inscrições digitais seguras, Draw Arena para sorteio de chaves, súmula eletrônica oficial A4 e classificação instantânea.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto h-12 px-7 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm shadow-md"
            >
              <a href="#torneios">
                <Trophy className="w-4 h-4 mr-2 text-primary-foreground" />
                <span>Ver Competições na Plataforma</span>
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-12 px-6 border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-foreground font-semibold text-sm"
            >
              <Link to="/sorteio">
                <Sparkles className="w-4 h-4 mr-2 text-amber-400" />
                <span>Arena de Sorteio (Draw Arena)</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Lado Direito: SHOWCASE VISUAL DA ARQUITETURA BASEOS (4 NÚCLEOS TECNOLÓGICOS) */}
        <div className="lg:col-span-5 w-full flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="w-full max-w-md"
          >
            <Card className="border border-zinc-800 bg-zinc-900/90 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              {/* Header do Card */}
              <div className="p-4 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                    Núcleos Operacionais do Sistema
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-zinc-800 text-zinc-400">
                  ARQUITETURA SAAS
                </Badge>
              </div>

              {/* 4 Núcleos Tecnológicos */}
              <CardContent className="p-5 space-y-3.5">
                {/* 1. Motor Universal de Disputas */}
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground">Motor Universal de Disputas</h4>
                      <span className="text-[10px] font-mono text-zinc-400">DAG Engine</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      Grupos, Repescagem, Eliminatórias e Turno Único configuráveis sem código.
                    </p>
                  </div>
                </div>

                {/* 2. Súmula Digital Oficial A4 */}
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground">Súmula Digital Oficial A4</h4>
                      <span className="text-[10px] font-mono text-emerald-400">Padrão CBV e FIVB</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      Homologação em 3 e 5 sets com geração instantânea em PDF vetorial.
                    </p>
                  </div>
                </div>

                {/* 3. Draw Arena Broadcast */}
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground">Draw Arena Broadcast</h4>
                      <span className="text-[10px] font-mono text-purple-400">Sorteio Oficial</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      Distribuição matemática com Tabela de Berger e revelação de escudos ao vivo.
                    </p>
                  </div>
                </div>

                {/* 4. Ecossistema Multi-Tenant */}
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground">Ecossistema Multi-Tenant</h4>
                      <span className="text-[10px] font-mono text-sky-400">Isolamento Total</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      Portais para Organizadores, Dirigentes (CPF único) e Arbitragem.
                    </p>
                  </div>
                </div>

                {/* Rodapé do Card: Indicador de Competições Ativas */}
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{totalCompetitionsCount} competição ativa na plataforma</span>
                  </div>
                  <a
                    href="#torneios"
                    className="text-amber-400 hover:text-amber-300 font-semibold text-[11px] flex items-center gap-1"
                  >
                    <span>Ver Torneios</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── COMPONENTE 3: SEÇÃO DE COMPETIÇÕES COM CARDS E DRILL-DOWN ────────────────

interface CompetitionsSectionProps {
  competitions: CompetitionRecord[];
  matches: MatchRecord[];
  venues: VenueRecord[];
  teams: TeamRecord[];
  competitionTeams: CompetitionTeam[];
  athletes: CompetitionAthlete[];
  onSelectMatch: (m: MatchRecord) => void;
}

function CompetitionsSection({
  competitions,
  matches,
  venues,
  teams,
  competitionTeams,
  athletes,
  onSelectMatch,
}: CompetitionsSectionProps) {
  // Estado de Drill-Down: null = lista de todos os torneios; string = torneio em detalhe
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [tournamentTab, setTournamentTab] = useState<'geral' | 'equipes' | 'jogos' | 'chaves'>('geral');
  const [searchTerm, setSearchTerm] = useState('');

  // Identifica a competição selecionada
  const selectedCompetition = useMemo(() => {
    if (!selectedCompetitionId) return null;
    return competitions.find(c => c.id === selectedCompetitionId) || null;
  }, [competitions, selectedCompetitionId]);

  // Equipes vinculadas à competição selecionada
  const selectedCompTeams = useMemo(() => {
    if (!selectedCompetitionId) return [];
    return competitionTeams
      .filter(ct => ct.competitionId === selectedCompetitionId)
      .map(ct => {
        const team = teams.find(t => t.id === ct.teamId);
        return {
          ...ct,
          logoUrl: team?.logoUrl || null,
          city: team?.city || '',
        };
      });
  }, [selectedCompetitionId, competitionTeams, teams]);

  // Atletas da competição selecionada
  const selectedCompAthletes = useMemo(() => {
    if (!selectedCompetitionId) return [];
    const teamIds = selectedCompTeams.map(t => t.id);
    return athletes.filter(a => teamIds.includes(a.competitionTeamId));
  }, [selectedCompetitionId, selectedCompTeams, athletes]);

  // Partidas da competição selecionada
  const selectedCompMatches = useMemo(() => {
    if (!selectedCompetitionId) return [];
    return matches.filter(m => m.competitionId === selectedCompetitionId);
  }, [selectedCompetitionId, matches]);

  // Contagem de atletas por equipe
  const getAthleteCount = useCallback((compTeamId: string) => {
    return selectedCompAthletes.filter(a => a.competitionTeamId === compTeamId).length;
  }, [selectedCompAthletes]);

  // Helper para endereço do ginásio
  const getVenueAddress = useCallback((venueNameOrId?: string): string | undefined => {
    if (!venueNameOrId) return undefined;
    const term = venueNameOrId.trim().toLowerCase();
    const v = venues.find(
      x => x.id.toLowerCase() === term || x.name.trim().toLowerCase() === term
    );
    return v?.address;
  }, [venues]);

  const handleSelectTournament = (compId: string) => {
    setSelectedCompetitionId(compId);
    setTournamentTab('geral');
    const el = document.getElementById('torneios');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBackToTournaments = () => {
    setSelectedCompetitionId(null);
    const el = document.getElementById('torneios');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="torneios" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 scroll-mt-20">
      {/* ─── ESTADO 1: LISTA DE TORNEIOS (GRID DE CARDS COMPACTOS) ─── */}
      {!selectedCompetitionId && (
        <div className="space-y-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 font-mono">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Competições na Plataforma</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Torneios Gerenciados no BaseOS
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Selecione qualquer campeonato abaixo para entrar na página oficial do torneio, visualizar equipes participantes, regulamento e chaveamento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitions.map((comp) => {
              const compTeams = competitionTeams.filter(ct => ct.competitionId === comp.id);
              const teamIds = compTeams.map(t => t.id);
              const compAthletes = athletes.filter(a => teamIds.includes(a.competitionTeamId));
              const compMatches = matches.filter(m => m.competitionId === comp.id);

              return (
                <Card
                  key={comp.id}
                  className="border border-zinc-800 bg-zinc-900/90 hover:border-amber-500/50 transition-all flex flex-col justify-between group shadow-lg"
                >
                  <CardHeader className="p-5 pb-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                        {comp.status === 'in-progress'
                          ? 'Em Andamento'
                          : comp.status === 'completed'
                          ? 'Concluído'
                          : 'Inscrições Abertas'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono border-zinc-700 text-zinc-300">
                        {comp.modality === 'indoor' ? 'Indoor 6x6' : 'Praia'}
                      </Badge>
                    </div>

                    <div>
                      <CardTitle className="text-lg font-bold text-foreground group-hover:text-amber-400 transition-colors">
                        {comp.name}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate">{comp.venue || 'Ginásio Oficial da Liga'}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-3">
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-center text-xs">
                      <div>
                        <div className="font-mono font-bold text-foreground">{compTeams.length}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Equipes</div>
                      </div>
                      <div>
                        <div className="font-mono font-bold text-amber-400">{compAthletes.length}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Atletas</div>
                      </div>
                      <div>
                        <div className="font-mono font-bold text-zinc-400">{compMatches.length}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Jogos</div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="p-5 pt-0 border-t border-zinc-800/60 mt-2">
                    <Button
                      onClick={() => handleSelectTournament(comp.id)}
                      className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5"
                    >
                      <span>Acessar Página do Torneio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}

            {/* Card Secundário: Criar Competição no BaseOS */}
            <Card className="border border-dashed border-zinc-800 bg-zinc-950/40 p-6 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-colors">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">Organiza um campeonato?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Crie sua competição no BaseOS com súmula digital oficial, chaveamento automático e portal exclusivo para as equipes da sua região.
                </p>
              </div>

              <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold border-zinc-800 hover:bg-zinc-800">
                <a href="#comercial">Criar minha competição no BaseOS</a>
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* ─── ESTADO 2: HUB EXCLUSIVO DO TORNEIO (DRILL-DOWN COMPLETO) ─── */}
      {selectedCompetitionId && selectedCompetition && (
        <div className="space-y-6">
          {/* Barra Superior de Retorno */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToTournaments}
              className="text-xs h-9 gap-1.5 border-zinc-800 text-zinc-300 hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Voltar para todos os torneios</span>
            </Button>

            <Badge variant="outline" className="font-mono text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10">
              VISÃO DO TORNEIO OFICIAL
            </Badge>
          </div>

          {/* Cabeçalho do Torneio Selecionado */}
          <Card className="border border-zinc-800 bg-zinc-900/90 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />
            <CardHeader className="p-6 pb-4 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                      INSCRIÇÕES ABERTAS
                    </Badge>
                    <Badge variant="outline" className="font-mono text-[10px] border-zinc-700 text-zinc-300">
                      {selectedCompetition.modality === 'indoor' ? 'VOLEIBOL INDOOR 6x6' : 'PRAIA'}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {selectedCompetition.genderCategory === 'male' ? 'MASCULINO' : 'FEMININO'}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl font-black text-foreground">
                    {selectedCompetition.name}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {selectedCompetition.description || 'Competição oficial com chaveamento, súmula eletrônica e classificação em tempo real.'}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9">
                    <Link to="/sorteio">
                      <Layers className="w-3.5 h-3.5 mr-1.5" />
                      <span>Ver Arena de Sorteio</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Métricas Rápidas do Torneio */}
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1 p-3 rounded-lg bg-zinc-950/70 border border-zinc-800">
                <span className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">Local Oficial:</span>
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="truncate">{selectedCompetition.venue || 'Ginásio Poliesportivo de Quedas do Iguaçu'}</span>
                </div>
              </div>

              <div className="space-y-1 p-3 rounded-lg bg-zinc-950/70 border border-zinc-800">
                <span className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">Formato da Disputa:</span>
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>3 Chaves + Play-in + Playoffs</span>
                </div>
              </div>

              <div className="space-y-1 p-3 rounded-lg bg-zinc-950/70 border border-zinc-800">
                <span className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">Regra de Sets:</span>
                <div className="font-bold text-foreground">
                  Classif.: Melhor de 3 sets (25/25/15)
                </div>
              </div>

              <div className="space-y-1 p-3 rounded-lg bg-zinc-950/70 border border-zinc-800">
                <span className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">Equipes Confirmadas:</span>
                <div className="font-bold text-emerald-400 font-mono">
                  {selectedCompTeams.length} equipes • {selectedCompAthletes.length} atletas
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Abas Internas Exclusivas do Torneio */}
          <div className="space-y-6">
            <Tabs
              value={tournamentTab}
              onValueChange={(v) => setTournamentTab(v as typeof tournamentTab)}
              className="w-full"
            >
              <TabsList className="bg-zinc-900 border border-zinc-800 p-1 w-full sm:w-auto">
                <TabsTrigger value="geral" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Visão Geral e Formato</span>
                </TabsTrigger>
                <TabsTrigger value="equipes" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>Equipes Confirmadas ({selectedCompTeams.length})</span>
                </TabsTrigger>
                <TabsTrigger value="jogos" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Jogos e Tabela ({selectedCompMatches.length})</span>
                </TabsTrigger>
                <TabsTrigger value="chaves" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Classificação e Chaves</span>
                </TabsTrigger>
              </TabsList>

              {/* ABA 1: VISÃO GERAL E FORMATO */}
              <TabsContent value="geral" className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold font-mono text-xs flex items-center justify-center">
                      01
                    </div>
                    <h4 className="text-sm font-bold text-foreground">Fase de Grupos (3 Chaves)</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      As equipes são sorteadas nos Grupos A, B e C através do sorteio oficial homologado na Draw Arena. Confrontos todos contra todos em melhor de 3 sets.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold font-mono text-xs flex items-center justify-center">
                      02
                    </div>
                    <h4 className="text-sm font-bold text-foreground">Play-in e Repescagem</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Cruzamento dos 2ºs e 3ºs colocados de cada grupo para definir os classificados restantes para as semifinais, garantindo ampla competitividade.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold font-mono text-xs flex items-center justify-center">
                      03
                    </div>
                    <h4 className="text-sm font-bold text-foreground">Playoffs, Semifinais e Final</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Confrontos eliminatórios diretos, disputa pelo troféu oficial, medalhas e homologação instantânea de súmulas no padrão CBV e FIVB.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Inscrição oficial com limite de 6 a 14 atletas por equipe (1 Capitão e até 2 Líberos).</span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="text-xs border-zinc-800 shrink-0">
                    <Link to="/sorteio">Acessar Arena de Sorteio 3D</Link>
                  </Button>
                </div>
              </TabsContent>

              {/* ABA 2: EQUIPES CONFIRMADAS */}
              <TabsContent value="equipes" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedCompTeams.map((team) => {
                    const count = getAthleteCount(team.id);
                    return (
                      <Card
                        key={team.id}
                        className="border border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 transition-all flex flex-col justify-between"
                      >
                        <CardHeader className="p-4 pb-3">
                          <div className="flex items-center gap-3">
                            <TeamCrest
                              logoUrl={team.logoUrl}
                              name={team.teamName}
                              shortName={team.teamShortName}
                              size="md"
                            />
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-sm font-bold text-foreground truncate" title={team.teamName}>
                                {team.teamName}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                <span className="font-mono text-amber-400 font-semibold">{team.teamShortName}</span>
                                {team.city && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate">{team.city}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4 pt-0 space-y-2 text-xs">
                          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-[11px]">
                            <span className="text-muted-foreground">Atletas Registrados:</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {count > 0 ? `${count} atletas` : 'Aguardando envio'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-zinc-400">
                            <span>Status da Inscrição:</span>
                            <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10 py-0 px-1.5">
                              Confirmada
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              {/* ABA 3: JOGOS E TABELA */}
              <TabsContent value="jogos" className="space-y-4 pt-4">
                {selectedCompMatches.length === 0 ? (
                  <Card className="border border-zinc-800 bg-zinc-900/60 p-12 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <CalendarDays className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-foreground">
                        Tabela Oficial de Confrontos em Preparação
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                        A tabela oficial de confrontos, datas e horários será gerada automaticamente logo após a realização do Sorteio Oficial das Chaves na <strong>Draw Arena</strong>.
                      </p>
                    </div>
                    <div className="pt-2">
                      <Button asChild size="sm" className="bg-primary text-primary-foreground font-semibold text-xs h-9">
                        <Link to="/sorteio">
                          <Layers className="w-3.5 h-3.5 mr-1.5" />
                          <span>Conhecer a Draw Arena (Sorteio 3D)</span>
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedCompMatches.map((m) => {
                      const setsA = m.sets.filter((s) => s.scoreA > s.scoreB).length;
                      const setsB = m.sets.filter((s) => s.scoreB > s.scoreA).length;
                      const isFinished = m.status === 'completed' || m.status === 'homologated';
                      const isLive = m.status === 'in-progress';
                      const address = getVenueAddress(m.venue);
                      const gMapsUrl = address
                        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${m.venue || ''}, ${address}`)}`
                        : m.venue
                        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.venue)}`
                        : null;

                      return (
                        <Card
                          key={m.id}
                          className="border border-zinc-800 bg-card hover:border-zinc-700 transition-all flex flex-col justify-between"
                        >
                          <CardHeader className="p-4 pb-2 border-b border-border/50">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-muted-foreground">
                                Jogo #{m.matchNumber} • Rodada {m.round}
                              </span>
                              <Badge
                                variant={isLive ? 'default' : isFinished ? 'secondary' : 'outline'}
                                className={`text-[10px] font-mono ${
                                  isLive
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                                    : isFinished
                                    ? 'bg-zinc-800 text-zinc-300'
                                    : 'text-zinc-400 border-zinc-800'
                                }`}
                              >
                                {isLive ? 'Ao Vivo' : isFinished ? 'Finalizado' : 'Agendado'}
                              </Badge>
                            </div>
                          </CardHeader>

                          <CardContent className="p-4 space-y-3 flex-1">
                            <div className="grid grid-cols-7 items-center gap-1.5">
                              <div className="col-span-3 truncate">
                                <div className="font-bold text-xs sm:text-sm text-foreground truncate" title={m.teamAName}>
                                  {m.teamAName}
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground">{m.teamAShortName}</div>
                              </div>

                              <div className="col-span-1 text-center font-mono font-bold text-sm sm:text-base px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-foreground">
                                {isFinished || isLive ? `${setsA}x${setsB}` : 'vs'}
                              </div>

                              <div className="col-span-3 text-right truncate">
                                <div className="font-bold text-xs sm:text-sm text-foreground truncate" title={m.teamBName}>
                                  {m.teamBName}
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground">{m.teamBShortName}</div>
                              </div>
                            </div>

                            {m.sets && m.sets.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap pt-1 font-mono text-[10px]">
                                <span className="text-muted-foreground uppercase text-[9px] font-semibold mr-1">Sets:</span>
                                {m.sets.map((s, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                                    {s.scoreA}-{s.scoreB}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="pt-2 border-t border-border/40 text-[11px] space-y-1">
                              <div className="flex items-center justify-between text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-zinc-500" />
                                  {new Date(m.scheduledTime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{' '}
                                  às {new Date(m.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="font-medium text-foreground">{m.court || 'Quadra 1'}</span>
                              </div>

                              <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-300">
                                <div className="flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                                  <span className="truncate">{m.venue || 'Local a definir'}</span>
                                </div>
                                {gMapsUrl && (
                                  <a
                                    href={gMapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline font-semibold flex items-center gap-0.5 shrink-0"
                                  >
                                    <span>Rota</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </CardContent>

                          <CardFooter className="p-3 pt-0 border-t border-border/30 bg-zinc-950/40">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSelectMatch(m)}
                              className="w-full h-7 text-[11px] font-medium gap-1 text-muted-foreground hover:text-foreground hover:bg-zinc-800"
                            >
                              <FileText className="w-3.5 h-3.5 text-primary" />
                              <span>Súmula Oficial em PDF</span>
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ABA 4: CLASSIFICAÇÃO E CHAVES */}
              <TabsContent value="chaves" className="space-y-4 pt-4">
                <Card className="border border-zinc-800 bg-zinc-900/60 p-8 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground">
                      Estrutura de Grupos e Chaveamento
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      O chaveamento oficial é realizado na Draw Arena e atualizado em tempo real com a Tabela de Berger e critérios canônicos CBV e FIVB.
                    </p>
                  </div>
                  <Button asChild size="sm" className="bg-primary text-primary-foreground font-bold text-xs h-9">
                    <Link to="/sorteio">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      <span>Abrir Simulador e Draw Arena</span>
                    </Link>
                  </Button>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── COMPONENTE 4: BENTO GRID DE RECURSOS SAAS ────────────────────────────────

function BentoFeaturesSection() {
  return (
    <section id="recursos" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-zinc-950/60 scroll-mt-20">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="outline" className="text-xs font-mono border-amber-500/30 text-amber-400 bg-amber-500/10">
            ARQUITETURA DE OPERAÇÃO ESPORTIVA
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Tudo o que sua competição precisa para operar com excelência.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Substitua dezenas de planilhas dispersas por uma plataforma unificada que conecta organizadores, árbitros e equipes.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Card 1: Súmula Digital Oficial A4 */}
          <div className="md:col-span-2 lg:col-span-2 rounded-2xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Súmula Digital Oficial A4</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Emissão instantânea em formato padrão de federação (CBV e FIVB). Contabilização de rotação, parciais de sets, substituições, tempos técnicos e assinaturas para homologação pós-jogo.
              </p>
            </div>
            <div className="pt-6 flex items-center gap-2 text-xs font-mono text-amber-400/90">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Compatível com impressão rápida e arquivamento digital</span>
            </div>
          </div>

          {/* Card 2: Draw Arena 3D */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-amber-400">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Draw Arena 3D (Sorteio)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sorteio oficial de chaves com visual estilo transmissão ao vivo, revelação dos escudos oficiais e trava anti-conflito.
              </p>
            </div>
            <div className="pt-4 text-xs font-semibold text-zinc-400 flex items-center gap-1">
              <Link to="/sorteio" className="text-amber-400 hover:underline flex items-center gap-1">
                <span>Experimentar Arena</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: Classificação e Desempate */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-primary">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Classificação Automática</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cálculo de pontos oficiais (3, 2, 1 ou 0), confronto direto, set average e pontos average computados sem erros manuais.
              </p>
            </div>
            <div className="pt-4 text-xs font-mono text-zinc-400">
              Critérios Canônicos Oficiais
            </div>
          </div>

          {/* Card 4: Portal das Equipes */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-primary">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Portal da Equipe</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Técnicos e dirigentes gerenciam seus elencos, numeração de camisas (1 a 99), líberos, capitão e alteram o escudo do time.
              </p>
            </div>
            <div className="pt-4 text-xs font-semibold text-zinc-400">
              Isolamento estrito por equipe
            </div>
          </div>

          {/* Card 5: Ginásios e Geolocalização */}
          <div className="md:col-span-2 lg:col-span-3 rounded-2xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-zinc-700 transition-colors">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase font-mono">
                <MapPin className="w-4 h-4" />
                <span>Geolocalização e Quadras</span>
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Endereço Físico dos Ginásios e Rotas Integradas
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Atletas e torcedores localizam os ginásios e quadras instantaneamente no portal com link direto para rota no Google Maps.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button asChild variant="outline" size="sm" className="border-zinc-800 text-xs font-semibold">
                <a href="#torneios">Ver Locais Cadastrados</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── COMPONENTE 5: ECOSSISTEMA DE PORTAIS BASEOS ───────────────────────────────

function PortalsEcosystemSection() {
  const portals = [
    {
      title: 'Painel do Organizador',
      badge: 'ADMINISTRAÇÃO E CONTROLE',
      desc: 'Gestão completa do campeonato: aprovação de elencos, Draw Arena de sorteio de chaves, escalas de arbitragem e homologação de resultados pós-jogo.',
      icon: Trophy,
      link: '/login',
      ctaText: 'Acessar Painel do Organizador',
      highlight: true,
    },
    {
      title: 'Portal do Dirigente e Equipe',
      badge: 'GESTÃO DE ELENCO',
      desc: 'Inscrição digital via link exclusivo de convite, cadastro de atletas, definição de capitão, até 2 líberos, numeração oficial e upload do escudo do time.',
      icon: Users,
      link: '/portal/equipe',
      ctaText: 'Acessar Portal da Equipe',
      highlight: false,
    },
    {
      title: 'Mesa de Arbitragem e Súmula',
      badge: 'APONTAMENTO OFICIAL',
      desc: 'Painel de súmula em tempo real para apontadores e árbitros. Controle de pontuação, parciais de sets e geração instantânea de Súmulas Homologadas A4 CBV e FIVB.',
      icon: Activity,
      link: '/jogos',
      ctaText: 'Acessar Mesa de Jogos',
      highlight: false,
    },
  ];

  return (
    <section id="portais" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <Badge variant="outline" className="text-xs font-mono border-amber-500/30 text-amber-400 bg-amber-500/10">
          ECOSSISTEMA INTEGRADO DE ACESSO
        </Badge>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Ambientes dedicados para cada papel do campeonato.
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Acesse a plataforma com isolamento seguro, credenciais dedicadas e permissões desenhadas sob medida para sua atuação no torneio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {portals.map((p, idx) => {
          const Icon = p.icon;
          return (
            <div
              key={idx}
              className={`p-6 rounded-2xl bg-zinc-900 border ${
                p.highlight ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' : 'border-zinc-800'
              } flex flex-col justify-between space-y-6 hover:border-zinc-700 transition-colors relative overflow-hidden`}
            >
              {p.highlight && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-2xl pointer-events-none rounded-full" />
              )}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-xl ${p.highlight ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-800 text-foreground'} flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono border-zinc-700 text-zinc-300">
                    {p.badge}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{p.title}</h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <Button
                  asChild
                  size="sm"
                  className={`w-full text-xs font-bold ${
                    p.highlight
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-zinc-800 text-foreground hover:bg-zinc-700'
                  }`}
                >
                  <Link to={p.link}>
                    <span>{p.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── COMPONENTE 6: CONTATO COMERCIAL (LEVE O BASEOS PARA SEU CAMPEONATO) ───────

function CommercialSection() {
  return (
    <section id="comercial" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20">
      <div className="relative rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-amber-500/30 p-8 sm:p-12 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <Badge variant="outline" className="text-xs font-mono border-amber-500/40 text-amber-400 bg-amber-500/10">
            PARCERIAS, LIGAS E PREFEITURAS
          </Badge>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
            Leve o BaseOS para o campeonato da sua cidade, clube ou atlética.
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Elimine planilhas em papel e burocracia manual. O BaseOS entrega uma experiência profissional de transmissão esportiva: inscrições digitais seguras, Draw Arena ao vivo, súmula homologada A4 e suporte operacional dedicado.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto h-12 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg gap-2"
            >
              <a href={COMMERCIAL_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="w-4 h-4" />
                <span>Falar com o Comercial via WhatsApp</span>
              </a>
            </Button>
            <div className="text-xs text-muted-foreground sm:pl-2">
              <span className="block font-semibold text-zinc-300">Atendimento Direto: (46) 99908-1502</span>
              <span className="block text-[11px] text-zinc-400">contato@baseos.online • Implantação rápida</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── COMPONENTE 7: PERGUNTAS FREQUENTES (FAQ) ─────────────────────────────────

function FAQSection() {
  const faqs = [
    {
      q: 'O BaseOS precisa ser instalado em aplicativo móvel ou computador?',
      a: 'Não. O BaseOS é 100% web e pode ser acessado de qualquer navegador moderno em celulares, tablets ou computadores. Além disso, conta com suporte a PWA (Progressive Web App) para instalação direta no dispositivo sem lojas de apps.',
    },
    {
      q: 'Como os dirigentes de equipe cadastram seus atletas e enviam o escudo?',
      a: 'Cada equipe recebe um link de acesso ou pode entrar com seu e-mail no Portal da Equipe. Nele, o dirigente preenche o elenco (nome, data de nascimento, documento e número de camisa de 1 a 99), define os líberos e capitão e envia a logo ou escudo em alta qualidade.',
    },
    {
      q: 'As súmulas emitidas em PDF são aceitas em competições oficiais?',
      a: 'Sim. A súmula gerada segue a exata diagramação regulamentar A4 oficial homologada pela CBV e FIVB, incluindo espaços para assinaturas de capitães e árbitros, quadro de parciais e observações disciplinares.',
    },
    {
      q: 'Como funciona a proteção de dados (LGPD) para atletas e dirigentes?',
      a: 'Em estrita conformidade com a Lei Federal nº 13.709/2018 (LGPD), o BaseOS coleta exclusivamente os dados necessários para conferência desportiva e emissão de súmulas. Dados sensíveis como CPF e telefones nunca são expostos publicamente na Home ou tabelas abertas.',
    },
    {
      q: 'Como funciona o cálculo de desempate na classificação?',
      a: 'O sistema aplica os critérios oficiais: maior número de pontos ganhos (vitórias por 3-0 ou 3-1 = 3pts, 3-2 = 2pts ou 1pt), número de vitórias, confronto direto, set average (razão de sets) e pontos average (razão de pontos).',
    },
    {
      q: 'A localização dos ginásios é disponibilizada para atletas e torcedores?',
      a: 'Sim. Todos os ginásios cadastrados pelos organizadores exibem nome da quadra, endereço completo e atalho com um clique para navegação por GPS no Google Maps.',
    },
  ];

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 scroll-mt-20">
      <div className="text-center space-y-2">
        <Badge variant="outline" className="text-xs font-mono border-zinc-700 text-zinc-400">
          TIRA-DÚVIDAS OPERACIONAL
        </Badge>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
          Perguntas Frequentes
        </h2>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-3">
        {faqs.map((f, idx) => (
          <AccordionItem
            key={idx}
            value={`item-${idx}`}
            className="rounded-xl border border-border bg-card px-4 py-1"
          >
            <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline hover:text-amber-400 py-3">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1 pb-3">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

// ─── COMPONENTE 8: FOOTER INSTITUCIONAL COMPLETO (4 COLUNAS E LGPD) ────────────

interface LandingFooterProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onOpenRegulations: () => void;
}

function LandingFooter({ onOpenPrivacy, onOpenTerms, onOpenRegulations }: LandingFooterProps) {
  return (
    <footer className="border-t border-border/60 bg-zinc-950 pt-16 pb-12 px-4 sm:px-6 lg:px-8 text-xs text-muted-foreground">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-zinc-800">
        {/* Coluna 1: Marca e Status */}
        <div className="space-y-4">
          <BaseOsLogo size="sm" showText variant="system" />
          <p className="text-xs text-zinc-400 leading-relaxed">
            Plataforma SaaS de inteligência esportiva e gestão oficial de competições de voleibol de quadra e praia.
          </p>
          <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Todos os sistemas operacionais</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">
              Produção v2.4.4 • Supabase Postgres Multi-Tenant
            </div>
          </div>
        </div>

        {/* Coluna 2: Navegação e Torneio */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
            Navegação e Torneios
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <a href="#torneios" className="hover:text-amber-400 transition-colors">
                Torneios na Plataforma
              </a>
            </li>
            <li>
              <Link to="/sorteio" className="hover:text-amber-400 transition-colors flex items-center gap-1">
                <span>Draw Arena (Sorteio 3D)</span>
                <Sparkles className="w-3 h-3 text-amber-500" />
              </Link>
            </li>
            <li>
              <a href="#recursos" className="hover:text-amber-400 transition-colors">
                Recursos Operacionais
              </a>
            </li>
            <li>
              <a href="#portais" className="hover:text-amber-400 transition-colors">
                Portais de Acesso
              </a>
            </li>
          </ul>
        </div>

        {/* Coluna 3: Portais de Acesso */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
            Portais de Acesso
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/login" className="hover:text-foreground transition-colors font-medium text-zinc-300">
                Entrar na Plataforma
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-foreground transition-colors">
                Painel do Organizador
              </Link>
            </li>
            <li>
              <Link to="/portal/equipe" className="hover:text-foreground transition-colors">
                Portal do Dirigente e Equipe
              </Link>
            </li>
            <li>
              <Link to="/jogos" className="hover:text-foreground transition-colors">
                Mesa de Arbitragem e Súmula
              </Link>
            </li>
            <li>
              <Link to="/ajuda" className="hover:text-foreground transition-colors">
                Central de Ajuda e Suporte
              </Link>
            </li>
          </ul>
        </div>

        {/* Coluna 4: Jurídico e Conformidade LGPD */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
            Jurídico e LGPD
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="hover:text-amber-400 transition-colors text-left flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span>Política de Privacidade (LGPD)</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={onOpenTerms}
                className="hover:text-amber-400 transition-colors text-left flex items-center gap-1.5"
              >
                <Scale className="w-3.5 h-3.5 text-zinc-400" />
                <span>Termos e Condições de Uso</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={onOpenRegulations}
                className="hover:text-amber-400 transition-colors text-left flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5 text-zinc-400" />
                <span>Critérios Técnicos CBV e FIVB</span>
              </button>
            </li>
            <li>
              <a
                href={COMMERCIAL_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-emerald-400 font-medium"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Contato Comercial no WhatsApp</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Linha inferior de copyright */}
      <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[11px]">
        <div>
          © {new Date().getFullYear()} BaseOS — Sports Intelligence. Todos os direitos reservados. Em estrita conformidade com a Lei Federal nº 13.709/2018 (LGPD).
        </div>
        <div className="flex items-center gap-4">
          <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
          <Link to="/termos" className="hover:text-foreground">Termos</Link>
          <a href="#faq" className="hover:text-foreground">Dúvidas</a>
        </div>
      </div>
    </footer>
  );
}

// ─── PÁGINA PRINCIPAL: LANDINGPAGE ────────────────────────────────────────────

export default function LandingPage() {
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [venues, setVenues] = useState<VenueRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([]);
  const [athletes, setAthletes] = useState<CompetitionAthlete[]>([]);
  const [selectedMatchForPdf, setSelectedMatchForPdf] = useState<MatchRecord | null>(null);

  // Estados dos modais jurídicos
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [regulationsModalOpen, setRegulationsModalOpen] = useState(false);

  // Carrega dados públicos do dataAccess
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [cList, mList, vList, tList] = await Promise.all([
          dataAccess.listCompetitions(),
          dataAccess.listMatches(),
          dataAccess.listVenues(),
          dataAccess.listTeams(),
        ]);

        if (!isMounted) return;

        const safeCList = Array.isArray(cList) ? cList : [];
        setCompetitions(safeCList);
        setMatches(Array.isArray(mList) ? mList : []);
        setVenues(Array.isArray(vList) ? vList : []);
        setTeams(Array.isArray(tList) ? tList : []);

        // Carrega as equipes e atletas de todas as competições ativas
        const activeComp =
          safeCList.find(c => c.status === 'in-progress') ||
          safeCList.find(c => c.status === 'registration-open' || c.status === 'registration') ||
          safeCList.find(c => c.status !== 'cancelled' && c.status !== 'completed') ||
          safeCList[0];

        if (activeComp) {
          const [ctList, caList] = await Promise.all([
            dataAccess.listCompetitionTeams(activeComp.id).catch(() => []),
            dataAccess.listCompetitionAthletesByCompetition(activeComp.id).catch(() => []),
          ]);
          if (isMounted) {
            setCompetitionTeams(ctList || []);
            setAthletes(caList || []);
          }
        }
      } catch (err) {
        console.error('[LandingPage] Erro ao carregar dados:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-amber-500/30 selection:text-amber-100 flex flex-col">
      {/* 1. Header / Navbar */}
      <LandingNav
        onOpenPrivacyModal={() => setPrivacyModalOpen(true)}
        onOpenTermsModal={() => setTermsModalOpen(true)}
      />

      {/* 2. Hero Institucional SaaS (Apresentando o BaseOS e os 4 Núcleos Tecnológicos) */}
      <main className="flex-1">
        <LandingHero totalCompetitionsCount={competitions.length} />

        {/* 3. Seção de Torneios com Grid de Cards Compactos e Drill-Down */}
        <CompetitionsSection
          competitions={competitions}
          matches={matches}
          venues={venues}
          teams={teams}
          competitionTeams={competitionTeams}
          athletes={athletes}
          onSelectMatch={setSelectedMatchForPdf}
        />

        {/* 4. Bento Grid de Recursos Operacionais */}
        <BentoFeaturesSection />

        {/* 5. Ecossistema de Portais BaseOS (Organizador, Dirigente e Equipe, Mesa) */}
        <PortalsEcosystemSection />

        {/* 6. Leve o BaseOS para o seu Campeonato (Contato Comercial WhatsApp) */}
        <CommercialSection />

        {/* 7. Perguntas Frequentes (FAQ) */}
        <FAQSection />
      </main>

      {/* 8. Footer Institucional Completo (4 Colunas e LGPD) */}
      <LandingFooter
        onOpenPrivacy={() => setPrivacyModalOpen(true)}
        onOpenTerms={() => setTermsModalOpen(true)}
        onOpenRegulations={() => setRegulationsModalOpen(true)}
      />

      {/* Modal de Emissão da Súmula Oficial em PDF */}
      {selectedMatchForPdf && (
        <MatchSheetEmitDialog
          match={selectedMatchForPdf}
          competition={competitions.find(c => c.id === selectedMatchForPdf.competitionId) || null}
          open={selectedMatchForPdf !== null}
          onOpenChange={(v) => { if (!v) setSelectedMatchForPdf(null); }}
        />
      )}

      {/* Modais Jurídicos e de Regulamento */}
      <PrivacyPolicyModal open={privacyModalOpen} onOpenChange={setPrivacyModalOpen} />
      <TermsOfUseModal open={termsModalOpen} onOpenChange={setTermsModalOpen} />
      <TechnicalRegulationsModal open={regulationsModalOpen} onOpenChange={setRegulationsModalOpen} />
    </div>
  );
}
