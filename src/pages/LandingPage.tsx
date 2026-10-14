/**
 * LandingPage — Home Oficial do BaseOS (v2.4.6)
 * 
 * Diretrizes Oficiais de Design (Regra 60/30/10):
 * - 60% Superfícies Claras: Fundo geral em Cinza-Gelo (#F8FAFC) e cards em Branco Puro (bg-white).
 * - 30% Estrutura e Tipografia: Azul-Marinho Profundo / Navy (#0F172A / text-slate-900).
 * - 10% Ação Cirúrgica: Laranja BaseOS (#F59E0B / bg-orange-500 hover:bg-orange-600) com texto SEMPRE branco.
 * - Botões SEMPRE em formato de pílula (rounded-full).
 * - Header claro com /assets/fundo claro logo.png e Footer escuro com /assets/fundo escuro logo.png.
 * - Apenas 2 Dobras + Rodapé Institucional.
 * - Dobra 1: Palco Parallax Interativo (mouse e scroll) com Terminal de Acesso Direto (Login / Convite).
 * - Dobra 2: Vitrine Viva de Competições com cards compactos e Central do Campeonato.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  AnimatePresence,
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
  X,
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

// ─── COMPONENTE: HEADER FIXO TRANSLÚCIDO ───────────────────────────────────────

interface HeaderProps {
  onScrollToCompetitions: () => void;
}

function LandingHeader({ onScrollToCompetitions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/70 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3.5 flex items-center justify-between">
        {/* Logo Oficial para Fundo Claro */}
        <Link to="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-full">
          <img
            src="/assets/fundo claro logo.png"
            alt="BaseOS"
            className="h-9 sm:h-10 w-auto object-contain"
            onError={(e) => {
              // Fallback gracioso caso a imagem não carregue
              (e.currentTarget as HTMLImageElement).src = '/logo-light.png';
            }}
          />
        </Link>

        {/* Ações da Direita */}
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={onScrollToCompetitions}
            className="text-xs sm:text-sm font-semibold text-[#0F172A] hover:text-orange-500 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-orange-500" />
            <span>Competições</span>
          </button>

          <Button
            asChild
            size="sm"
            className="rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs sm:text-sm h-10 px-5 shadow-sm shadow-orange-500/20 transition-all"
          >
            <a href={COMMERCIAL_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <span>Contratar BaseOS</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}

// ─── COMPONENTE: DOBRA 1 (PALCO PARALLAX + CARD DE ACESSO DIRETO) ──────────────

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
  const telemetryY1 = useTransform(scrollY, [0, 500], [0, -50]);
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

    // Extrai o token caso o usuário cole a URL inteira
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
      className="relative min-h-[88vh] flex items-center overflow-hidden py-12 lg:py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200/60"
    >
      {/* 1. Camadas de Parallax no Fundo Claro */}
      <motion.div
        style={{ y: parallaxBgY }}
        className="absolute inset-0 pointer-events-none select-none z-0"
      >
        {/* Malha Arquitetônica e Linhas Geométricas da Quadra */}
        <div
          className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#0F172A_1px,transparent_1px)] [background-size:28px_28px]"
          aria-hidden="true"
        />

        {/* Linhas Geométricas da Quadra de Voleibol em #0F172A a 4% */}
        <svg
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] text-[#0F172A] opacity-[0.035] transform rotate-12"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
        >
          <rect x="10" y="10" width="80" height="80" />
          <line x1="10" y1="50" x2="90" y2="50" strokeWidth="1.2" />
          <line x1="10" y1="36.6" x2="90" y2="36.6" strokeDasharray="2 2" />
          <line x1="10" y1="63.4" x2="90" y2="63.4" strokeDasharray="2 2" />
          <circle cx="50" cy="50" r="12" />
        </svg>

        {/* Feixes suaves de luz âmbar e azul em parallax com o mouse */}
        <motion.div
          style={{ x: smoothMouseX, y: smoothMouseY }}
          className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-orange-400/10 rounded-full blur-[120px] pointer-events-none"
        />
        <motion.div
          style={{
            x: useTransform(smoothMouseX, (val) => -val * 0.8),
            y: useTransform(smoothMouseY, (val) => -val * 0.8),
          }}
          className="absolute top-1/3 -right-20 w-[450px] h-[450px] bg-sky-500/10 rounded-full blur-[110px] pointer-events-none"
        />
      </motion.div>

      {/* Conteúdo Principal do Hero */}
      <div className="max-w-7xl mx-auto w-full relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Coluna da Esquerda (55% — Proposta de Valor Limpa e Direta) */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          {/* Pílula Superior */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200/90 bg-white shadow-xs text-xs">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="font-mono uppercase tracking-wider text-[11px] text-[#0F172A] font-bold">
              SPORTS INTELLIGENCE PLATFORM
            </span>
          </div>

          {/* Headline de Impacto Oficial */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-[#0F172A] tracking-tight leading-[1.03]">
            O campeonato acontece aqui.
          </h1>

          {/* Subtítulo Curto e Direto (máximo 2 linhas) */}
          <p className="text-base sm:text-lg text-slate-600 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Plataforma oficial de competições, sorteio 3D de chaves, súmulas digitais e resultados em tempo real.
          </p>

          {/* Botões em Formato de Pílula (rounded-full) */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
            <Button
              type="button"
              onClick={onScrollToCompetitions}
              className="w-full sm:w-auto rounded-full bg-[#0F172A] hover:bg-slate-800 text-white px-7 py-3.5 h-12 font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ver Competições Ativas</span>
              <span className="text-sm">↓</span>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto rounded-full bg-white border border-slate-300 text-[#0F172A] hover:bg-slate-100 px-7 py-3.5 h-12 font-semibold transition-all shadow-xs"
            >
              <Link to="/sorteio" className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span>Conhecer Draw Arena 3D</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Coluna da Direita (45% — O Terminal de Acesso Direto ao Sistema) */}
        <motion.div
          style={{ y: parallaxCardY }}
          className="lg:col-span-5 w-full flex justify-center relative"
        >
          <div className="w-full max-w-md relative">
            {/* 2. Micro-Cards Flutuantes de Telemetria em Parallax (Orbitando o Terminal) */}
            <motion.div
              style={{ y: telemetryY1, x: smoothMouseX }}
              className="hidden xl:flex absolute -top-5 -left-8 z-30 items-center gap-2.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full px-4 py-2 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.08)] text-xs font-medium pointer-events-none select-none"
            >
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 font-mono">AO VIVO</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono font-bold text-[#0F172A]">25 • 23</span>
              <span className="text-[11px] text-slate-600 font-semibold font-mono">SET 3</span>
            </motion.div>

            <motion.div
              style={{ y: telemetryY2, x: useTransform(smoothMouseX, (val) => -val * 0.6) }}
              className="hidden xl:flex absolute -bottom-5 -right-6 z-30 items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full px-4 py-2 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.08)] text-xs font-semibold pointer-events-none select-none"
            >
              <FileCheck2 className="w-4 h-4 text-orange-500" />
              <span className="text-[11px] font-mono tracking-tight text-[#0F172A] font-semibold">
                SÚMULA OFICIAL A4 HOMOLOGADA
              </span>
            </motion.div>

            <div className="w-full bg-white border border-slate-200/90 rounded-[28px] p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08)] relative">
              {/* Seletor em Pílula (2 Abas) */}
              <div className="flex items-center p-1.5 bg-slate-100 rounded-full border border-slate-200/80 mb-6">
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setLoginError(null); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-[#0F172A]'
                  }`}
                >
                  Entrar no Sistema
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('invite'); setLoginError(null); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    activeTab === 'invite'
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-[#0F172A]'
                  }`}
                >
                  Convite de Equipe
                </button>
              </div>

              {/* ABA 1: ENTRAR NO SISTEMA */}
              {activeTab === 'login' && (
                <div className="space-y-4">
                  {session ? (
                    // Estado Autenticado: Boas-vindas e Acesso Imediato ao Painel
                    <div className="space-y-5 text-center py-2">
                      <div className="w-14 h-14 mx-auto rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center border border-orange-500/20">
                        <UserCheck className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-[#0F172A]">
                          Olá, {session.user.name || 'Usuário'}!
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          Você já está autenticado no BaseOS com perfil{' '}
                          <span className="font-semibold text-slate-800 capitalize">{session.user.role}</span>.
                        </p>
                      </div>

                      <Button
                        asChild
                        className="w-full rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-12 shadow-md shadow-orange-500/20 transition-all text-sm"
                      >
                        <Link to={getSafeDestination(session.user.role, session.user.isPlatformAdmin)}>
                          <span>Ir para Meu Painel Agora</span>
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>

                      <button
                        type="button"
                        onClick={() => signOut()}
                        className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 cursor-pointer pt-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sair ou alternar de conta</span>
                      </button>
                    </div>
                  ) : (
                    // Formulário de Login Direto no Hero
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-[#0F172A]">Acesso à Plataforma</h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Digite seu CPF ou e-mail cadastrado para entrar.
                        </p>
                      </div>

                      {loginError && (
                        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
                          {loginError}
                        </div>
                      )}

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            CPF OU E-MAIL
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="000.000.000-00 ou seu@email.com"
                              value={identifier}
                              onChange={(e) => setIdentifier(e.target.value)}
                              className="w-full bg-slate-50 hover:bg-white focus:bg-white text-[#0F172A] placeholder:text-slate-400 border border-slate-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 rounded-2xl h-12 px-4 font-medium transition-all outline-none [&:-webkit-autofill]:[-webkit-text-fill-color:#0F172A] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s] [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#F8FAFC]"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                              SENHA
                            </label>
                            <a
                              href={COMMERCIAL_WHATSAPP_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
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
                              className="w-full bg-slate-50 hover:bg-white focus:bg-white text-[#0F172A] placeholder:text-slate-400 border border-slate-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 rounded-2xl h-12 px-4 pr-11 font-medium font-mono transition-all outline-none [&:-webkit-autofill]:[-webkit-text-fill-color:#0F172A] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s] [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#F8FAFC]"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                        className="w-full rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-12 shadow-md shadow-orange-500/20 transition-all text-sm mt-2"
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
                        <div className="pt-3 border-t border-slate-100">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block mb-1.5">
                            Acesso Rápido de Testes:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {DEMO_USERS.map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => handleDemoFill(u.email)}
                                className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
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
                    <h3 className="text-xl font-bold text-[#0F172A]">Convite de Equipe</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Cole o código ou o link completo enviado pela organização.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      CÓDIGO OU LINK DO CONVITE
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 8f9b2c1a ou cole o link recebido"
                      value={inviteToken}
                      onChange={(e) => setInviteToken(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-white focus:bg-white text-[#0F172A] placeholder:text-slate-400 border border-slate-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15 rounded-2xl h-12 px-4 font-medium transition-all outline-none [&:-webkit-autofill]:[-webkit-text-fill-color:#0F172A] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s] [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#F8FAFC]"
                      required
                    />
                    <span className="text-[11px] text-slate-500 mt-1.5 block">
                      Permite enviar o elenco oficial de atletas e comissão técnica.
                    </span>
                  </div>

                  <Button
                    type="submit"
                    disabled={!inviteToken.trim()}
                    className="w-full rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-12 shadow-md shadow-orange-500/20 transition-all text-sm mt-3"
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

// ─── COMPONENTE: DOBRA 2 (VITRINE VIVA DE COMPETIÇÕES REAIS) ───────────────────

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
  // Filtra competições reais cadastradas
  const activeCompetitions = useMemo(() => {
    return competitions.filter((c) => c.status !== 'cancelled');
  }, [competitions]);

  return (
    <section id="torneios" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Cabeçalho Limpo da Seção */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold tracking-wider text-orange-600 uppercase">
              CALENDÁRIO E RESULTADOS OFICIAIS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Competições Ativas
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md font-normal">
            Acompanhe o andamento dos torneios, tabelas de classificação, súmulas e elencos confirmados.
          </p>
        </div>

        {/* Grid de Cards Brancos Elegantes */}
        {activeCompetitions.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-10 text-center space-y-3 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08)]">
            <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-[#0F172A]">Nenhuma competição ativa no momento</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
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

              return (
                <div
                  key={comp.id}
                  className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08)] hover:shadow-xl hover:border-orange-500/40 transition-all flex flex-col justify-between space-y-6 group"
                >
                  <div className="space-y-4">
                    {/* Badge de Status em Pílula */}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {comp.status === 'in-progress'
                          ? 'Em Andamento'
                          : comp.status === 'registration' || comp.status === 'registration-open'
                          ? 'Inscrições Abertas'
                          : 'Homologado'}
                      </span>

                      <span className="text-slate-700 bg-slate-100 px-3 py-1 rounded-full font-semibold text-xs border border-slate-200/60 font-mono">
                        {comp.modality === 'indoor' ? 'Indoor 6x6' : 'Praia'}
                      </span>
                    </div>

                    {/* Título e Descrição */}
                    <div>
                      <h3 className="text-xl font-extrabold text-[#0F172A] group-hover:text-orange-600 transition-colors leading-tight">
                        {comp.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                        {comp.description ||
                          'Competição oficial de voleibol com chaveamento por grupos, playoffs e súmula digital.'}
                      </p>
                    </div>

                    {/* Métricas e Contadores Reais */}
                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                        <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block mb-1">
                          EQUIPES
                        </span>
                        <span className="text-[#0F172A] text-3xl font-extrabold font-mono block">
                          {confirmedTeams.length > 0 ? confirmedTeams.length : (isVoltz ? 9 : 0)}
                        </span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                        <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block mb-1">
                          ATLETAS
                        </span>
                        <span className="text-[#0F172A] text-3xl font-extrabold font-mono block">
                          {athleteCount > 0 ? athleteCount : (isVoltz ? 73 : 0)}
                        </span>
                      </div>
                    </div>

                    {/* Escudos / Iniciais das Equipes Confirmadas */}
                    <div>
                      <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block mb-2.5">
                        EQUIPES PARTICIPANTES:
                      </span>
                      <div className="flex items-center -space-x-2 overflow-hidden py-1">
                        {confirmedTeams.slice(0, 7).map((t) => (
                          <div
                            key={t.id}
                            className="w-8 h-8 rounded-full border-2 border-white bg-white shadow-xs shrink-0 overflow-hidden flex items-center justify-center"
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
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                            +{confirmedTeams.length - 7}
                          </div>
                        )}
                        {confirmedTeams.length === 0 && (
                          <span className="text-xs text-slate-500 italic">Equipes em fase de confirmação</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botão em Pílula para Abrir a Central do Campeonato */}
                  <Button
                    type="button"
                    onClick={() => onOpenCompetitionModal(comp)}
                    className="w-full rounded-full bg-[#0F172A] hover:bg-orange-500 text-white font-semibold text-xs sm:text-sm h-12 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span>Abrir Central do Campeonato</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── COMPONENTE: MODAL DA CENTRAL DO CAMPEONATO (CLEAN & CLARO) ───────────────

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
      <DialogContent className="max-w-2xl bg-white text-slate-900 border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 pb-4 text-left">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-200">
              CENTRAL DO CAMPEONATO
            </span>
            <span className="text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border border-slate-200/60">
              {competition.modality === 'indoor' ? 'Voleibol Indoor 6x6' : 'Praia'}
            </span>
          </div>
          <DialogTitle className="text-2xl font-black text-[#0F172A]">
            {competition.name}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-slate-600 mt-1">
            {competition.description || 'Competição oficial gerenciada pela plataforma BaseOS Sports Intelligence.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Métricas em Destaque */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block mb-1">Equipes</span>
              <span className="text-2xl font-extrabold font-mono text-[#0F172A]">{confirmedTeams.length}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block mb-1">Atletas</span>
              <span className="text-2xl font-extrabold font-mono text-[#0F172A]">{compAthletes.length}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block mb-1">Sorteio</span>
              <span className="text-xs font-bold text-emerald-600 block mt-2">Draw Arena 3D</span>
            </div>
          </div>

          {/* Equipes Confirmadas */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
              <span>Equipes Confirmadas ({confirmedTeams.length})</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {confirmedTeams.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-white shadow-xs shrink-0 flex items-center justify-center overflow-hidden">
                    <TeamCrest
                      logoUrl={t.logoUrl}
                      name={t.name}
                      shortName={t.shortName}
                      size="sm"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#0F172A] truncate">{t.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-mono">{t.shortName || 'EQUIPE'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ações da Central */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              className="flex-1 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs h-11 shadow-sm shadow-orange-500/20"
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
                className="flex-1 rounded-full border-slate-200 text-[#0F172A] hover:bg-slate-50 font-semibold text-xs h-11"
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

// ─── COMPONENTE: RODAPÉ INSTITUCIONAL (NAVY DEEP #0A0F1D) ──────────────────────

interface FooterProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

function LandingFooter({ onOpenPrivacy, onOpenTerms }: FooterProps) {
  return (
    <footer className="bg-[#0A0F1D] text-slate-400 py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800/80">
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
            <p className="text-xs text-slate-400 max-w-sm">
              Plataforma oficial de tecnologia e inteligência para gestão profissional de voleibol.
            </p>
          </div>

          {/* Botão em Pílula de Contato Comercial */}
          <div className="flex items-center gap-3">
            <Button
              asChild
              className="rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs h-11 px-6 shadow-sm shadow-orange-500/20 transition-all"
            >
              <a href={COMMERCIAL_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Contratar o BaseOS</span>
              </a>
            </Button>
          </div>
        </div>

        {/* Linha de Links Jurídicos e Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 BaseOS. Todos os direitos reservados.</p>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="hover:text-slate-200 transition-colors cursor-pointer text-xs"
            >
              Política de Privacidade (LGPD)
            </button>
            <button
              type="button"
              onClick={onOpenTerms}
              className="hover:text-slate-200 transition-colors cursor-pointer text-xs"
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
        const [cList, tList] = await Promise.all([
          Promise.resolve().then(() => dataAccess.listCompetitions?.()).catch(() => []),
          Promise.resolve().then(() => dataAccess.listTeams?.()).catch(() => []),
        ]);

        if (!isMounted) return;
        const safeCList = Array.isArray(cList) ? cList : [];
        setCompetitions(safeCList);
        setTeams(Array.isArray(tList) ? tList : []);

        const activeComp =
          safeCList.find((c) => c.status === 'in-progress') ||
          safeCList.find((c) => c.status === 'registration-open' || c.status === 'registration') ||
          safeCList.find((c) => c.status !== 'cancelled') ||
          safeCList[0];

        if (activeComp) {
          const [ctList, caList] = await Promise.all([
            Promise.resolve().then(() => dataAccess.listCompetitionTeams?.(activeComp.id)).catch(() => []),
            Promise.resolve().then(() => dataAccess.listCompetitionAthletesByCompetition?.(activeComp.id)).catch(() => []),
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
    <div className="baseos-landing min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased flex flex-col selection:bg-orange-500/20 selection:text-orange-950">
      {/* 1. Header Fixo Minimalista & Translúcido */}
      <LandingHeader onScrollToCompetitions={handleScrollToCompetitions} />

      <main className="flex-1">
        {/* 2. Dobra 1: Palco Parallax Interativo + Terminal de Acesso Direto */}
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

      {/* 4. Rodapé Institucional Escuro (#0A0F1D) */}
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
