/**
 * BaseOS — Página de Login Dedicada (/login)
 *
 * Design Dark Tech de Alto Contraste:
 * - Fundo profundo: Zinc-950 (#09090b)
 * - Card de controle: Zinc-900 com borda nítida em Zinc-800
 * - Ação principal: Âmbar BaseOS (#F59E0B / amber-500) com texto escuro em negrito
 * - Inputs escuros nítidos com foco em anel âmbar
 *
 * Preserva TODA a lógica de autenticação existente:
 * - signIn via authService (modo demo local + Supabase Auth)
 * - getSafeDestination por perfil de usuário
 * - Painel de acesso rápido no modo demo
 */

import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LogIn,
  Eye,
  EyeOff,
  ArrowRight,
  UserRound,
  ShieldCheck,
  Users,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@/components/auth/useAuth';
import { DEMO_USERS } from '@/services/authService';
import { ROLE_LABELS } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

const COMMERCIAL_WHATSAPP_URL =
  'https://wa.me/5546999123456?text=Ol%C3%A1!%20Gostaria%20de%20contratar%20a%20plataforma%20BaseOS%20para%20o%20meu%20campeonato.';

const DEMO_ROLE_ICONS = {
  organizer: UserRound,
  referee: ShieldCheck,
  team: Users,
};

export default function LoginPage() {
  const { session, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  const getSafeDestination = (
    userRole: string,
    targetPath?: string,
    isPlatformAdmin?: boolean
  ): string => {
    if (isPlatformAdmin) return '/master';
    if (userRole === 'team') return '/equipe';
    if (userRole === 'referee' || userRole === 'scorer') {
      if (targetPath && (targetPath.startsWith('/jogos') || targetPath.startsWith('/sumulas'))) {
        return targetPath;
      }
      return '/jogos';
    }
    if (targetPath && targetPath !== '/' && targetPath !== '/login' && targetPath !== '/equipe') {
      return targetPath;
    }
    return '/dashboard';
  };

  if (!loading && session) {
    return <Navigate to={getSafeDestination(session.user.role, from)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.ok) {
      const dest = getSafeDestination(result.session.user.role, from, result.session.user.isPlatformAdmin);
      navigate(dest, { replace: true });
    } else {
      setError(result.error);
    }
  };

  const quickFill = (demoEmail: string, demoPass = 'demo123') => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans antialiased text-zinc-100 selection:bg-amber-500 selection:text-zinc-950">
      {/* Header público oficial Dark Tech */}
      <header className="w-full bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/80">
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
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white transition-colors py-1.5 px-3 rounded-full hover:bg-zinc-900/60"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar ao Início</span>
          </Link>
        </div>
      </header>

      {/* Conteúdo central */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {/* Logo + título */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-800 bg-zinc-900 text-xs mb-5 font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]" />
              <span className="uppercase tracking-wider text-[11px] text-amber-400 font-bold">
                SPORTS INTELLIGENCE PLATFORM
              </span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Acesso ao Sistema
            </h1>
            <p className="text-sm text-zinc-400 mt-1.5">
              Digite suas credenciais para entrar na plataforma.
            </p>
          </div>

          {/* Card do formulário Dark Tech */}
          <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-3xl p-7 sm:p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Campo e-mail */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-1.5"
                >
                  E-MAIL OU CPF
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="w-full bg-zinc-950 text-white placeholder:text-zinc-600 border border-zinc-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 rounded-2xl h-12 px-4 font-medium transition-all outline-none"
                />
              </div>

              {/* Campo senha */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider"
                  >
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
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="w-full bg-zinc-950 text-white placeholder:text-zinc-600 border border-zinc-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 rounded-2xl h-12 px-4 pr-11 font-medium font-mono transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors"
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Botão de submit */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold h-12 shadow-lg shadow-amber-500/25 transition-all text-sm cursor-pointer active:scale-[0.98]"
              >
                {submitting ? (
                  <span>Validando credenciais...</span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <LogIn className="w-4 h-4" />
                    <span>Acessar Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Painel de acesso rápido (modo demo) */}
            {!isSupabaseConfigured() && (
              <div className="mt-6 pt-5 border-t border-zinc-800">
                <p className="text-[10px] text-zinc-400 uppercase font-mono font-bold mb-2.5 tracking-wider">
                  Acesso Rápido — Modo Demonstração:
                </p>
                <div className="space-y-2">
                  {DEMO_USERS.map((user) => {
                    const Icon =
                      DEMO_ROLE_ICONS[user.role as keyof typeof DEMO_ROLE_ICONS] ?? UserRound;
                    const pass =
                      user.email === 'diegoantmartins89@gmail.com' ||
                      user.email === 'diegomartins@baseos.online'
                        ? 'Au15022020...'
                        : 'demo123';
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => quickFill(user.email, pass)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl
                                   border border-zinc-800 bg-zinc-950 hover:bg-zinc-850 hover:border-zinc-700
                                   shadow-sm text-left transition-all cursor-pointer group active:scale-[0.98]"
                      >
                        <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-white leading-tight group-hover:text-amber-400 transition-colors">
                            {ROLE_LABELS[user.role]}
                          </span>
                          <span className="block text-[10px] text-zinc-400 font-mono leading-tight truncate mt-0.5">
                            {user.email}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-amber-400 transition-colors shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Link para o catálogo público */}
            <div className="mt-5 pt-4 border-t border-zinc-800 text-center">
              <Link
                to="/competicoes-publicas"
                className="text-xs text-zinc-400 hover:text-amber-400 font-medium transition-colors"
              >
                Ver competições sem fazer login
              </Link>
            </div>
          </div>

          {/* Links jurídicos */}
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-zinc-500">
            <Link to="/privacidade" className="hover:text-zinc-300 transition-colors">
              Privacidade (LGPD)
            </Link>
            <Link to="/termos" className="hover:text-zinc-300 transition-colors">
              Termos de Uso
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}