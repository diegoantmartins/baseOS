/**
 * AdminSetupDialog — Fase 1
 *
 * Modal para o Platform Admin configurar o administrador de uma organização.
 * Cria usuário Auth + profile + membership em uma única operação.
 *
 * Usado no MasterDashboard — botão "Configurar Admin" por organização.
 */

import React, { useState } from 'react';
import { UserPlus, Eye, EyeOff, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { dataAccess } from '@/services/dataAccess';
import { toast } from 'sonner';

interface AdminSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  currentUserId: string;
  onSuccess?: (result: { userId: string; membershipId: string }) => void;
}

export function AdminSetupDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  currentUserId,
  onSuccess,
}: AdminSetupDialogProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#';
    let pw = '';
    for (let i = 0; i < 12; i++) {
      pw += chars[Math.floor(Math.random() * chars.length)];
    }
    setPassword(pw);
  };

  const copyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  const handleReset = () => {
    setEmail('');
    setName('');
    setPassword('');
    setShowPassword(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !email.includes('@')) {
      toast.error('Informe um e-mail válido.');
      return;
    }
    if (!name.trim()) {
      toast.error('Informe o nome do administrador.');
      return;
    }
    if (!password || password.length < 8) {
      toast.error('A senha deve ter ao menos 8 caracteres.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await dataAccess.setupOrganizationAdmin({
        organizationId,
        email: email.trim(),
        name: name.trim(),
        password,
        invitedBy: currentUserId,
      });

      toast.success(`Administrador configurado com sucesso!`, {
        description: `${name.trim()} (${email.trim()}) agora é administrador de "${organizationName}".`,
        duration: 6000,
      });

      onSuccess?.(result);
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao configurar administrador.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl p-6">
        <DialogHeader className="space-y-2">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-1">
            <UserPlus className="w-5 h-5" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Configurar Administrador
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-zinc-400">
            Crie o administrador para a organização{' '}
            <Badge className="bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 text-xs font-semibold px-2 py-0.5">
              {organizationName}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="admin-name" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nome completo *
            </Label>
            <Input
              id="admin-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João da Silva"
              required
              className="h-10 text-sm bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 focus-visible:ring-1 focus-visible:ring-amber-500"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="admin-email" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              E-mail *
            </Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@organizacao.com"
              required
              autoComplete="off"
              className="h-10 text-sm bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 focus-visible:ring-1 focus-visible:ring-amber-500"
            />
          </div>

          {/* Senha temporária */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="admin-password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Senha temporária *
              </Label>
              <button
                type="button"
                onClick={generateTempPassword}
                className="text-[11px] text-amber-600 hover:text-amber-700 font-semibold transition-colors"
              >
                Gerar senha aleatória
              </button>
            </div>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                autoComplete="new-password"
                className="h-10 text-sm bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 focus-visible:ring-1 focus-visible:ring-amber-500 pr-20 font-mono"
              />
              <div className="absolute right-1 top-1 flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={copyPassword}
                  title="Copiar senha"
                  className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded"
                >
                  {copiedPassword ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500">
              Compartilhe esta senha com o administrador. O acesso é imediato após a criação.
            </p>
          </div>

          {/* Aviso sobre o que será criado */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-3 space-y-1">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">O que será criado:</p>
            <ul className="text-[11px] text-blue-600 dark:text-blue-500 space-y-0.5 pl-3">
              <li>• Conta de acesso (Supabase Auth)</li>
              <li>• Perfil com papel: Administrador da Organização</li>
              <li>• Vínculo ativo com "{organizationName}"</li>
            </ul>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-full text-xs h-9 border-slate-200 dark:border-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || !email.trim() || !name.trim() || !password}
              className="rounded-full bg-blue-950 hover:bg-blue-900 text-white font-semibold text-xs h-9 px-6 shadow-md transition-all"
              id="btn-confirmar-admin-setup"
            >
              {submitting ? 'Configurando...' : 'Configurar Administrador'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
