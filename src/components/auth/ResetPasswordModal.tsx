import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { authService } from '@/services/authService';
import { toast } from 'sonner';
import type { SystemUser } from '@/types/auth';

interface ResetPasswordModalProps {
  user: SystemUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  user,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setShowPassword(true);
    setError(null);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setError('Por favor, informe uma nova senha.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await authService.adminResetPassword(user.id, newPassword);
      if (!res.ok) {
        setError(res.error ?? 'Falha ao redefinir a senha.');
        return;
      }

      toast.success(`Senha de ${user.name} redefinida com sucesso!`, {
        description: 'O usuário já poderá efetuar login utilizando a nova credencial.',
      });
      onOpenChange(false);
      setNewPassword('');
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao processar alteração.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <KeyRound className="w-4 h-4 text-primary" />
            Redefinir Senha de Usuário
          </DialogTitle>
          <DialogDescription>
            Defina uma nova senha de acesso para o usuário <strong>{user.name}</strong> ({user.email}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleResetPassword} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="adminNewPass" className="text-xs">Nova Senha Provisória / Definitiva</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-primary gap-1 px-2 hover:bg-primary/10"
                onClick={handleGeneratePassword}
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                Gerar Senha Segura
              </Button>
            </div>
            <div className="relative">
              <Input
                id="adminNewPass"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => {
                  setNewPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Mínimo de 8 caracteres"
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <PasswordStrengthIndicator password={newPassword} />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="sm"
              disabled={isLoading || !newPassword}
            >
              {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
