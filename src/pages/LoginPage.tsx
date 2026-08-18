// Página de login (acesso por perfil: organizador, árbitro, equipe).
// No modo demonstração (sem Supabase), exibe as contas demo para acesso rápido.

import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Volleyball, UserRound, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { DEMO_USERS } from '@/services/authService';
import { ROLE_LABELS } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

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

  const quickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <Volleyball className="w-7 h-7 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground leading-tight">VolleyPro</h1>
            <p className="text-sm text-muted-foreground">Sistema de Gestão de Competições</p>
          </div>
        </div>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5" />
              Acessar o sistema
            </CardTitle>
            <CardDescription>
              Informe suas credenciais para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-mail</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" variant="accent" className="w-full" disabled={submitting}>
                {submitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            {!isSupabaseConfigured() && (
              <div className="pt-2 border-t border-border/60">
                <p className="text-xs text-muted-foreground mb-3">
                  Modo demonstração — use uma das contas abaixo (senha <strong>demo123</strong>):
                </p>
                <div className="space-y-2">
                  {DEMO_USERS.map(user => {
                    const Icon = DEMO_ROLE_ICONS[user.role];
                    return (
                      <Button
                        key={user.id}
                        type="button"
                        variant="outline"
                        className="w-full justify-start gap-2 h-auto py-2.5"
                        onClick={() => quickFill(user.email)}
                      >
                        <Icon className="w-4 h-4 text-accent" />
                        <span className="text-left">
                          <span className="block text-sm font-semibold">{ROLE_LABELS[user.role]}</span>
                          <span className="block text-xs text-muted-foreground">{user.email}</span>
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