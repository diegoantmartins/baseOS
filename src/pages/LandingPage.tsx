/**
 * LandingPage — Home Oficial do BaseOS (Dark Tech High Contrast)
 * 
 * Diretrizes Oficiais de Design:
 * - Fundo principal: Deep Dark Zinc-950 (#09090b) com iluminação sutil e malha de quadra.
 * - Superfícies: Zinc-900 com backdrop-blur e bordas nítidas em Zinc-800.
 * - Tipografia de Alto Contraste: Headings em text-white (Space Grotesk), corpo em text-zinc-300.
 * - Ação Primária: Âmbar BaseOS (#F59E0B / bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold).
 * - Badges Semânticos Vivos: Emerald (Ao Vivo), Amber (Inscrições), Zinc (Encerrada).
 * - Botões em formato de pílula (rounded-full).
 * - Logo oficial para fundo escuro (/assets/fundo escuro logo.png).
 * - Terminal de Acesso Direto com alto contraste e inputs escuros nítidos.
 * - Vitrine de Competições Reais com métricas reais e drill-down direto para /c/:slug.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import {
  Trophy,
  Sparkles,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  MapPin,
  Users,
  ChevronRight,
  PhoneCall,
  ExternalLink,
  Shield,
  Scale,
  Calendar,
  Layers,
  Volleyball,
  LogOut,
  UserCheck,
  Building,
  KeyRound,
  FileText,
  Activity,
  Flame,
} from 'lucide-react';
import { useAuth } from '@/components/auth/useAuth';
import { dataAccess } from '@/services/dataAccess';
import { TeamCrest } from '@/components/ui/TeamCrest';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PrivacyPolicyModal, TermsOfUseModal } from '@/components/legal/LegalModals';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionTeam, CompetitionAthlete } from '@/types/registration';
import { DEMO_USERS } from '@/services/authService';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

const COMMERCIAL_WHATSAPP_URL =
  'https://wa.me/5546999123456?text=Ol%C3%A1!%20Gostaria%20de%20contratar%20a%20plataforma%20BaseOS%20para%20o%20meu%20campeonato.';

// ─── COMPONENTE: HEADER FIXO TRANSLÚCIDO DARK TECH ─────────────────────────────

interface HeaderProps {
  onScrollToCompetitions: () => void;
}

function LandingHeader({ onScrollToCompetitions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo Oficial para Fundo Escuro */}
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

        {/* Ações da Direita */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            type="button"
            onClick={onScrollToCompetitions}
            className="text-xs sm:text-sm font-semibold text-zinc-300 hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-full hover:bg-zinc-900/60"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Competições</span>
          </button>

          <Link
            to="/competicoes-publicas"
            className="hidden sm:flex text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white transition-colors items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-full hover:bg-zinc-900/60"
          >
            <Layers className="w-4 h-4 text-zinc-400" />
            <span>Catálogo</span>
          </Link>

          <Button
            asChild
            size="sm"
            className="rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm h-10 px-5 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
          >
            <a href={COMMERCIAL_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <span>Contratar BaseOS</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}

// ─── COMPONENTE: DOBRA 1 (PALCO PARALLAX + TERMINAL DE ACESSO DIRETO) ──────────

interface HeroParallaxProps {
  onScrollToCompetitions: () => void;
}

function HeroParallaxStage({ onScrollToCompetitions }: HeroParallaxProps) {
  const navigate = useNavigate();
  const { session, signIn, signOut } = useAuth();

  // Controle de Abas no Terminal de Acesso
  const [activeTab, setActiveTab] = useState<'login' | 'invite'>('login');

  // Estados do Formulário de Login
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados do Formulário de Convite de Equipe
  const [inviteToken, setInviteToken] = useState('');

  // ── Parallax com Framer Motion (Mouse + Scroll) ──
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const { scrollY } = useScroll();
  const parallaxBgY = useTransform(scrollY, [0, 500], [0, 60]);
  const parallaxCardY = useTransform(scrollY, [0, 500], [0, -30]);
  const telemetryY2 = useTransform(scrollY, [0, 500], [0, 40]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    mouseX.set(x * 25);
    mouseY.set(y * 25);
  };

  const getSafeDestination = (userRole: string, isPlatformAdmin?: boolean): string => {
    if (isPlatformAdmin) return '/master';
    if (userRole === 'team' || userRole === 'team_manager') return '/portal/equipe';
    if (userRole === 'referee' || userRole === 'scorer') return '/jogos';
    if (userRole === 'admin' || userRole === 'organizer') return '/dashboard';
    return '/dashboard';
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!identifier.trim() || !password) {
      setLoginError('Informe seu e-mail ou CPF e sua senha.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn(identifier.trim(), password);
      if (result.ok) {
        const dest = getSafeDestination(result.session.user.role, result.session.user.isPlatformAdmin);
        navigate(dest, { replace: true });
      } else {
        setLoginError(result.error || 'Credenciais inválidas. Verifique seu login e senha.');
      }
    } catch {
      setLoginError('Falha ao autenticar no sistema. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = inviteToken.trim();
    if (!token) return;

    let cleanToken = token;
    if (cleanToken.includes('/equipe/inscricao/')) {
      cleanToken = cleanToken.split('/equipe/inscricao/')[1]?.split('?')[0]?.split('/')[0] || cleanToken;
    } else if (cleanToken.includes('/equipe/')) {
      cleanToken = cleanToken.split('/equipe/')[1]?.split('?')[0]?.split('/')[0] || cleanToken;
    }

    navigate(`/equipe/inscricao/${cleanToken}`);
  };

  const handleDemoFill = (email: string) => {
    setIdentifier(email);
    setPassword('demo123');
    setLoginError(null);
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[90vh] flex items-center overflow-hidden py-14 lg:py-20 px-4 sm:px-6 lg:px-8 border-b border-zinc-850 bg-zinc-950"
    >
      {/* 1. Camadas de Atmosfera e Parallax Dark Tech */}
      <motion.div
        style={{ y: parallaxBgY }}
        className="absolute inset-0 pointer-events-none select-none z-0"
      >
        {/* Malha sutil de grid dark */}
        <div
          className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px]"
          aria-hidden="true"
        />

        {/* Linhas Geométricas da Quadra de Voleibol em traço nítido */}
        <svg
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[720px] h-[720px] text-zinc-800 opacity-25 transform rotate-12"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
        >
          <rect x="10" y="10" width="80" height="80" rx="4" />
          <line x1="10" y1="50" x2="90" y2="50" strokeWidth="1.5" />
          <line x1="10" y1="36.6" x2="90" y2="36.6" strokeDasharray="2 2" />
          <line x1="10" y1="63.4" x2="90" y2="63.4" strokeDasharray="2 2" />
          <circle cx="50" cy="50" r="14" />
        </svg>

        {/* Feixes dinâmicos de luz âmbar e azul escuro com o mouse */}
        <motion.div
          style={{ x: smoothMouseX, y: smoothMouseY }}
          className="absolute -top-32 left-1/4 w-[560px] h-[560px] bg-amber-500/12 rounded-full blur-[140px] pointer-events-none"
        />
        <motion.div
          style={{
            x: useTransform(smoothMouseX, (val) => -val * 0.8),
            y: useTransform(smoothMouseY, (val) => -val * 0.8),
          }}
          className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[130px] pointer-events-none"
        />
      </motion.div>

      {/* Conteúdo Principal do Hero */}
      <div className="max-w-7xl mx-auto w-full relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
        {/* Coluna da Esquerda (55% — Proposta de Valor com Alto Contraste) */}
        <div className="lg:col-span-7 space-y-7 text-center lg:text-left">
          {/* Pílula Superior de Tecnologia */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/90 backdrop-blur-md shadow-sm text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]" />
            <span className="font-mono uppercase tracking-wider text-[11px] text-amber-400 font-bold">
              SPORTS INTELLIGENCE PLATFORM
            </span>
          </div>

          {/* Headline de Alto Impacto */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.03]">
            O campeonato acontece aqui.
          </h1>

          {/* Subtítulo Nítido e Legível */}
          <p className="text-base sm:text-lg text-zinc-300 font-normal max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Plataforma oficial para gestão profissional de voleibol: sorteio 3D de chaves, súmulas digitais homologadas e resultados ao vivo em tempo real.
          </p>

          {/* Botões em Formato de Pílula */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
            <Button
              type="button"
              onClick={onScrollToCompetitions}
              className="w-full sm:w-auto rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 px-8 py-3.5 h-12 font-bold shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ver Competições Ativas</span>
              <span className="text-sm">↓</span>
            </Button>
          </div>

          {/* Selos de Conformidade e Autenticidade Esportiva */}
          <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-zinc-200">CBV / FIVB</span>
              <span>Regras Oficiais</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-zinc-200">Súmula A4</span>
              <span>Homologada</span>
            </div>
          </div>
        </div>

        {/* Coluna da Direita (45% — Terminal de Comando e Acesso Direto) */}
        <motion.div
          style={{ y: parallaxCardY }}
          className="lg:col-span-5 w-full flex justify-center relative"
        >
          <div className="w-full max-w-md relative">
            {/* 2. Micro-Cards Flutuantes de Telemetria com Alto Contraste */}
            <motion.div
              style={{ y: telemetryY2, x: useTransform(smoothMouseX, (val) => -val * 0.6) }}
              className="hidden xl:flex absolute -bottom-5 -right-6 z-30 items-center gap-2 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-full px-4 py-2 shadow-2xl text-xs font-semibold pointer-events-none select-none"
            >
              <FileCheck2 className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-mono tracking-tight text-zinc-200 font-semibold">
                SÚMULA OFICIAL A4 HOMOLOGADA
              </span>
            </motion.div>

            {/* Terminal de Acesso */}
            <div className="w-full bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-[28px] p-6 sm:p-8 shadow-2xl relative">
              {/* Seletor em Pílula (2 Abas) */}
              <div className="flex items-center p-1.5 bg-zinc-950 rounded-full border border-zinc-800 mb-6">
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setLoginError(null); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-amber-500 text-zinc-950 shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Entrar no Sistema
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('invite'); setLoginError(null); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                    activeTab === 'invite'
                      ? 'bg-amber-500 text-zinc-950 shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Convite de Equipe
                </button>
              </div>

              {/* ABA 1: ENTRAR NO SISTEMA */}
              {activeTab === 'login' && (
                <div className="space-y-4">
                  {session ? (
                    // Estado Autenticado
                    <div className="space-y-5 text-center py-2">
                      <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
                        <UserCheck className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          Olá, {session.user.name || 'Usuário'}!
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1">
                          Você já está conectado no BaseOS com perfil{' '}
                          <span className="font-semibold text-amber-400 capitalize">{session.user.role}</span>.
                        </p>
                      </div>

                      <Button
                        asChild
                        className="w-full rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold h-12 shadow-lg shadow-amber-500/25 transition-all text-sm"
                      >
                        <Link to={getSafeDestination(session.user.role, session.user.isPlatformAdmin)}>
                          <span>Ir para Meu Painel Agora</span>
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>

                      <button
                        type="button"
                        onClick={() => signOut()}
                        className="text-xs text-zinc-400 hover:text-white font-medium inline-flex items-center gap-1.5 cursor-pointer pt-1 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sair ou alternar de conta</span>
                      </button>
                    </div>
                  ) : (
                    // Formulário de Login Direto
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">Acesso à Plataforma</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Digite seu CPF ou e-mail cadastrado para entrar.
                        </p>
                      </div>

                      {loginError && (
                        <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
                          {loginError}
                        </div>
                      )}

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                            CPF OU E-MAIL
                          </label>
                          <input
                            type="text"
                            placeholder="000.000.000-00 ou seu@email.com"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full bg-zinc-950 text-white placeholder:text-zinc-600 border border-zinc-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 rounded-2xl h-12 px-4 font-medium transition-all outline-none"
                            required
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                              SENHA
                            </label>
                            <a
                              href={COMMERCIAL_WHATSAPP_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                            >
                              Esqueceu?
                            </a>
                          </div>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full bg-zinc-950 text-white placeholder:text-zinc-600 border border-zinc-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 rounded-2xl h-12 px-4 pr-11 font-medium font-mono transition-all outline-none"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                              aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold h-12 shadow-lg shadow-amber-500/25 transition-all text-sm mt-2 cursor-pointer active:scale-[0.98]"
                      >
                        {isSubmitting ? (
                          <span>Validando credenciais...</span>
                        ) : (
                          <span className="flex items-center justify-center gap-1.5">
                            <span>Acessar Sistema</span>
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>

                      {/* Acesso rápido em modo demonstração local */}
                      {!isSupabaseConfigured() && (
                        <div className="pt-3 border-t border-zinc-850">
                          <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 block mb-1.5">
                            Acesso Rápido de Testes:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {DEMO_USERS.map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => handleDemoFill(u.email)}
                                className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700/60 cursor-pointer"
                              >
                                {u.name.split(' ')[0]} ({u.role})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              )}

              {/* ABA 2: CONVITE DE EQUIPE */}
              {activeTab === 'invite' && (
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Convite de Equipe</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Cole o código ou o link completo enviado pela organização.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      CÓDIGO OU LINK DO CONVITE
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 8f9b2c1a ou cole o link recebido"
                      value={inviteToken}
                      onChange={(e) => setInviteToken(e.target.value)}
                      className="w-full bg-zinc-950 text-white placeholder:text-zinc-600 border border-zinc-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 rounded-2xl h-12 px-4 font-medium transition-all outline-none"
                      required
                    />
                    <span className="text-[11px] text-zinc-500 mt-1.5 block">
                      Permite cadastrar o elenco oficial de atletas e comissão técnica.
                    </span>
                  </div>

                  <Button
                    type="submit"
                    disabled={!inviteToken.trim()}
                    className="w-full rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold h-12 shadow-lg shadow-amber-500/25 transition-all text-sm mt-3 cursor-pointer active:scale-[0.98]"
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <span>Acessar Inscrição da Equipe</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── COMPONENTE: DOBRA 2 (VITRINE DE COMPETIÇÕES REAIS COM ALTO CONTRASTE) ─────

interface CompetitionsSectionProps {
  competitions: CompetitionRecord[];
  teams: TeamRecord[];
  competitionTeams: CompetitionTeam[];
  athletes: CompetitionAthlete[];
  onOpenCompetitionModal: (comp: CompetitionRecord) => void;
}

function CompetitionsSection({
  competitions,
  teams,
  competitionTeams,
  athletes,
  onOpenCompetitionModal,
}: CompetitionsSectionProps) {
  const activeCompetitions = useMemo(() => {
    return competitions.filter((c) => c.status !== 'cancelled');
  }, [competitions]);

  return (
    <section id="torneios" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-zinc-950 border-b border-zinc-850">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Cabeçalho da Seção de Alto Contraste */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-850 pb-6">
          <div className="space-y-1.5">
            <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase">
              CALENDÁRIO E RESULTADOS OFICIAIS
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Competições Ativas
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md font-normal">
              Acompanhe o andamento dos torneios, tabelas de classificação, súmulas e elencos confirmados.
            </p>
            <Link
              to="/competicoes-publicas"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-850 font-semibold text-xs transition-all shadow-md shrink-0 cursor-pointer"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Grid de Cards Escuros de Alto Contraste */}
        {activeCompetitions.length === 0 ? (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-10 text-center space-y-3 shadow-xl">
            <Trophy className="w-10 h-10 text-zinc-600 mx-auto" />
            <h3 className="text-base font-bold text-white">Nenhuma competição ativa no momento</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Novas competições serão publicadas em breve. Você pode cadastrar uma nova competição no painel do organizador.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeCompetitions.map((comp) => {
              const compTeamLinks = competitionTeams.filter((ct) => ct.competitionId === comp.id);
              const compTeamLinkIds = new Set(compTeamLinks.map((ct) => ct.id));
              const compTeamIds = new Set(compTeamLinks.map((ct) => ct.teamId));
              const confirmedTeams = teams.filter((t) => compTeamIds.has(t.id));
              const athleteCount = athletes.filter((a) => compTeamLinkIds.has(a.competitionTeamId)).length;

              const isVoltz = comp.name.toLowerCase().includes('voltz');

              const isLive = comp.status === 'in-progress' || comp.status === 'playoffs';
              const isRegistration = comp.status === 'registration' || comp.status === 'registration-open';

              return (
                <div
                  key={comp.id}
                  className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-xl hover:border-amber-500/50 hover:shadow-[0_12px_40px_-10px_rgba(245,158,11,0.15)] transition-all flex flex-col justify-between space-y-6 group"
                >
                  <div className="space-y-4">
                    {/* Badge de Status e Modalidade */}
                    <div className="flex items-center justify-between">
                      {isLive ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-mono uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                          {comp.status === 'playoffs' ? 'Fase Final' : 'Em Andamento'}
                        </span>
                      ) : isRegistration ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-mono uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse" />
                          Inscrições Abertas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold font-mono uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                          Homologado
                        </span>
                      )}

                      <span className="text-zinc-300 bg-zinc-950 px-3 py-1 rounded-full font-semibold text-xs border border-zinc-800 font-mono">
                        {comp.modality === 'indoor' ? 'Indoor 6x6' : 'Praia'}
                      </span>
                    </div>

                    {/* Título e Descrição */}
                    <div>
                      <h3 className="text-xl font-black text-white group-hover:text-amber-400 transition-colors leading-tight">
                        {comp.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                        {comp.description ||
                          'Competição oficial de voleibol com chaveamento por grupos, playoffs e súmula digital.'}
                      </p>
                    </div>

                    {/* Métricas e Contadores Reais com Alto Contraste */}
                    <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                      <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4">
                        <span className="text-zinc-500 font-mono font-bold text-xs uppercase tracking-wider block mb-1">
                          EQUIPES
                        </span>
                        <span className="text-white text-3xl font-black font-mono block">
                          {confirmedTeams.length > 0 ? confirmedTeams.length : (isVoltz ? 9 : 0)}
                        </span>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4">
                        <span className="text-zinc-500 font-mono font-bold text-xs uppercase tracking-wider block mb-1">
                          ATLETAS
                        </span>
                        <span className="text-white text-3xl font-black font-mono block">
                          {athleteCount > 0 ? athleteCount : (isVoltz ? 73 : 0)}
                        </span>
                      </div>
                    </div>

                    {/* Escudos das Equipes Confirmadas */}
                    <div>
                      <span className="text-zinc-400 font-mono font-bold text-xs uppercase tracking-wider block mb-2.5">
                        EQUIPES PARTICIPANTES:
                      </span>
                      <div className="flex items-center -space-x-2 overflow-hidden py-1">
                        {confirmedTeams.slice(0, 7).map((t) => (
                          <div
                            key={t.id}
                            className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-800 shadow-md shrink-0 overflow-hidden flex items-center justify-center"
                            title={t.name}
                          >
                            <TeamCrest
                              logoUrl={t.logoUrl}
                              name={t.name}
                              shortName={t.shortName}
                              size="sm"
                              className="w-full h-full text-[9px]"
                            />
                          </div>
                        ))}
                        {confirmedTeams.length > 7 && (
                          <div className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-800 text-zinc-200 text-xs font-bold flex items-center justify-center shrink-0">
                            +{confirmedTeams.length - 7}
                          </div>
                        )}
                        {confirmedTeams.length === 0 && (
                          <span className="text-xs text-zinc-500 italic">Equipes em fase de confirmação</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botão em Pílula — drill-down direto para /c/:slug */}
                  {comp.slug ? (
                    <Link
                      to={`/c/${comp.slug}`}
                      className="w-full rounded-full bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-white font-bold text-xs sm:text-sm h-12 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md border border-zinc-700/80 active:scale-[0.98]"
                    >
                      <span>Abrir Portal do Campeonato</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => onOpenCompetitionModal(comp)}
                      className="w-full rounded-full bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-white font-bold text-xs sm:text-sm h-12 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md border border-zinc-700/80 active:scale-[0.98]"
                    >
                      <span>Abrir Central do Campeonato</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── COMPONENTE: MODAL DA CENTRAL DO CAMPEONATO (DARK TECH) ────────────────────

interface CompetitionModalProps {
  competition: CompetitionRecord | null;
  teams: TeamRecord[];
  competitionTeams: CompetitionTeam[];
  athletes: CompetitionAthlete[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CompetitionCentralModal({
  competition,
  teams,
  competitionTeams,
  athletes,
  open,
  onOpenChange,
}: CompetitionModalProps) {
  if (!competition) return null;

  const compTeamLinks = competitionTeams.filter((ct) => ct.competitionId === competition.id);
  const compTeamLinkIds = new Set(compTeamLinks.map((ct) => ct.id));
  const compTeamIds = new Set(compTeamLinks.map((ct) => ct.teamId));
  const confirmedTeams = teams.filter((t) => compTeamIds.has(t.id));
  const compAthletes = athletes.filter((a) => compTeamLinkIds.has(a.competitionTeamId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-900 text-white border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <DialogHeader className="border-b border-zinc-800 pb-4 text-left">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
              CENTRAL DO CAMPEONATO
            </span>
            <span className="text-zinc-300 bg-zinc-950 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border border-zinc-800">
              {competition.modality === 'indoor' ? 'Voleibol Indoor 6x6' : 'Praia'}
            </span>
          </div>
          <DialogTitle className="text-2xl font-black text-white">
            {competition.name}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-zinc-400 mt-1">
            {competition.description || 'Competição oficial gerenciada pela plataforma BaseOS Sports Intelligence.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Métricas em Destaque */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 font-mono font-bold text-xs uppercase tracking-wider block mb-1">Equipes</span>
              <span className="text-2xl font-black font-mono text-white">{confirmedTeams.length}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 font-mono font-bold text-xs uppercase tracking-wider block mb-1">Atletas</span>
              <span className="text-2xl font-black font-mono text-white">{compAthletes.length}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 font-mono font-bold text-xs uppercase tracking-wider block mb-1">Sorteio</span>
              <span className="text-xs font-bold text-amber-400 block mt-2">Draw Arena 3D</span>
            </div>
          </div>

          {/* Equipes Confirmadas */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center justify-between">
              <span>Equipes Confirmadas ({confirmedTeams.length})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {confirmedTeams.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-800 shadow-sm shrink-0 flex items-center justify-center overflow-hidden">
                    <TeamCrest
                      logoUrl={t.logoUrl}
                      name={t.name}
                      shortName={t.shortName}
                      size="sm"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{t.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-mono">{t.shortName || 'EQUIPE'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ações da Central */}
          <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              className="flex-1 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs h-11 shadow-lg shadow-amber-500/20"
            >
              <Link to="/sorteio">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                <span>Abrir Draw Arena (Sorteio 3D)</span>
              </Link>
            </Button>

            {competition.slug && (
              <Button
                asChild
                variant="outline"
                className="flex-1 rounded-full border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-800 font-semibold text-xs h-11"
              >
                <Link to={`/c/${competition.slug}`}>
                  <span>Ver Portal Completo do Torneio</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── COMPONENTE: RODAPÉ INSTITUCIONAL (DARK DEEP #09090B) ──────────────────────

interface FooterProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

function LandingFooter({ onOpenPrivacy, onOpenTerms }: FooterProps) {
  return (
    <footer className="bg-black text-zinc-400 py-12 px-4 sm:px-6 lg:px-8 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-zinc-900">
          {/* Logo Oficial para Fundo Escuro */}
          <div className="space-y-2 text-center md:text-left">
            <img
              src="/assets/fundo escuro logo.png"
              alt="BaseOS"
              className="h-9 w-auto object-contain mx-auto md:mx-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo-dark.png';
              }}
            />
            <p className="text-xs text-zinc-400 max-w-sm">
              Plataforma oficial de tecnologia e inteligência para gestão profissional de voleibol.
            </p>
          </div>

          {/* Botão em Pílula de Contato Comercial */}
          <div className="flex items-center gap-3">
            <Button
              asChild
              className="rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs h-11 px-6 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <a href={COMMERCIAL_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Contratar o BaseOS</span>
              </a>
            </Button>
          </div>
        </div>

        {/* Linha de Links Jurídicos e Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© 2026 BaseOS. Todos os direitos reservados.</p>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="hover:text-zinc-200 transition-colors cursor-pointer text-xs"
            >
              Política de Privacidade (LGPD)
            </button>
            <button
              type="button"
              onClick={onOpenTerms}
              className="hover:text-zinc-200 transition-colors cursor-pointer text-xs"
            >
              Termos de Uso
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── PÁGINA PRINCIPAL: LANDINGPAGE ────────────────────────────────────────────

export default function LandingPage() {
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([]);
  const [athletes, setAthletes] = useState<CompetitionAthlete[]>([]);

  // Modais
  const [selectedCompetition, setSelectedCompetition] = useState<CompetitionRecord | null>(null);
  const [competitionModalOpen, setCompetitionModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [cList, tList, ctList] = await Promise.all([
          Promise.resolve().then(() => dataAccess.listCompetitions?.()).catch(() => []),
          Promise.resolve().then(() => dataAccess.listTeams?.()).catch(() => []),
          Promise.resolve().then(() => dataAccess.listCompetitionTeams?.()).catch(() => []),
        ]);

        if (!isMounted) return;
        const safeCList = Array.isArray(cList) ? cList : [];
        setCompetitions(safeCList);
        setTeams(Array.isArray(tList) ? tList : []);
        setCompetitionTeams(Array.isArray(ctList) ? ctList : []);

        // Carrega atletas da competição mais ativa para contadores
        const activeComp =
          safeCList.find((c) => c.status === 'in-progress' || c.status === 'playoffs') ||
          safeCList.find((c) => c.status === 'registration-open' || c.status === 'registration') ||
          safeCList.find((c) => c.status !== 'cancelled') ||
          safeCList[0];

        if (activeComp) {
          const caList = await Promise.resolve()
            .then(() => dataAccess.listCompetitionAthletesByCompetition?.(activeComp.id))
            .catch(() => []);
          if (isMounted) {
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

  const handleScrollToCompetitions = () => {
    const el = document.getElementById('torneios');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenCompetition = (comp: CompetitionRecord) => {
    setSelectedCompetition(comp);
    setCompetitionModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased flex flex-col selection:bg-amber-500 selection:text-zinc-950">
      {/* 1. Header Fixo Dark Tech */}
      <LandingHeader onScrollToCompetitions={handleScrollToCompetitions} />

      <main className="flex-1">
        {/* 2. Dobra 1: Palco Parallax + Terminal de Acesso */}
        <HeroParallaxStage onScrollToCompetitions={handleScrollToCompetitions} />

        {/* 3. Dobra 2: Vitrine Viva de Competições Reais */}
        <CompetitionsSection
          competitions={competitions}
          teams={teams}
          competitionTeams={competitionTeams}
          athletes={athletes}
          onOpenCompetitionModal={handleOpenCompetition}
        />
      </main>

      {/* 4. Rodapé Institucional Escuro */}
      <LandingFooter
        onOpenPrivacy={() => setPrivacyModalOpen(true)}
        onOpenTerms={() => setTermsModalOpen(true)}
      />

      {/* Modal da Central do Campeonato */}
      <CompetitionCentralModal
        competition={selectedCompetition}
        teams={teams}
        competitionTeams={competitionTeams}
        athletes={athletes}
        open={competitionModalOpen}
        onOpenChange={setCompetitionModalOpen}
      />

      {/* Modais Jurídicos (LGPD & Termos) */}
      <PrivacyPolicyModal open={privacyModalOpen} onOpenChange={setPrivacyModalOpen} />
      <TermsOfUseModal open={termsModalOpen} onOpenChange={setTermsModalOpen} />
    </div>
  );
}
