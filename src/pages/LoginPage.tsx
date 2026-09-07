// Página de login (acesso por perfil: organizador, árbitro, equipe).
// No modo demonstração (sem Supabase), exibe as contas demo para acesso rápido.

import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Volleyball, UserRound, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '@/components/auth/useAuth';
import { DEMO_USERS } from '@/services/authService';
import { ROLE_LABELS } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

import { BaseOsLogo } from '@/components/common/BaseOsLogo';

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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  if (!loading && session) return <Navigate to={from} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.ok) {
      navigate(from, { replace: true });
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center justify-center mb-5">
          <BaseOsLogo size="lg" showSubtitle />
        </div>

        <Card className="card-elevated shadow-none border border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <LogIn className="w-4 h-4 text-primary" />
              Acessar o sistema
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Informe suas credenciais para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3.5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="login-email" className="text-[10px] uppercase font-semibold text-muted-foreground">E-mail</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="login-password" className="text-[10px] uppercase font-semibold text-muted-foreground">Senha</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="h-8 text-xs bg-zinc-900 border-zinc-800 rounded-md font-mono"
                />
              </div>
              {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
              <Button type="submit" size="sm" className="w-full h-8 text-xs font-semibold rounded-md shadow-none" disabled={submitting}>
                {submitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            {!isSupabaseConfigured() && (
              <div className="pt-2 border-t border-border/40">
                <p className="text-[10px] text-muted-foreground mb-2">
                  Modo demonstração — acesso rápido:
                </p>
                <div className="space-y-1.5">
                  {DEMO_USERS.map(user => {
                    const Icon = DEMO_ROLE_ICONS[user.role as keyof typeof DEMO_ROLE_ICONS] ?? UserRound;
                    const pass = user.email === 'diegoantmartins89@gmail.com' ? 'Au15022020...' : 'demo123';
                    return (
                      <Button
                        key={user.id}
                        type="button"
                        variant="outline"
                        className="w-full justify-start gap-2 h-auto py-1.5 px-2.5 rounded-md border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 hover:border-zinc-700 text-left"
                        onClick={() => quickFill(user.email, pass)}
                      >
                        <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium text-foreground leading-tight">{ROLE_LABELS[user.role]}</span>
                          <span className="block text-[10px] text-muted-foreground leading-tight truncate">{user.email}</span>
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}