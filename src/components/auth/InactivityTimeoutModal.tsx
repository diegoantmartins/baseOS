import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert, LogOut, RefreshCw } from 'lucide-react';
import { authService } from '@/services/authService';
import { SecurityConfigService } from '@/lib/security';
import { toast } from 'sonner';

export const InactivityTimeoutModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const lastActivityRef = useRef<number>(Date.now());
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (isOpen) {
      setIsOpen(false);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }
  }, [isOpen]);

  const handleLogout = useCallback(async () => {
    setIsOpen(false);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    await authService.signOut();
    toast.error('Sessão encerrada por inatividade.', {
      description: 'Por segurança, você foi desconectado após um período sem interação.',
    });
  }, []);

  useEffect(() => {
    const handleUserInteraction = () => {
      // Se o modal de aviso ainda não abriu, renova a contagem
      if (!isOpen) {
        lastActivityRef.current = Date.now();
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleUserInteraction, { passive: true }));

    // Verificador a cada 5 segundos
    const checkInterval = setInterval(() => {
      const session = authService.getStoredSession();
      if (!session) return; // Não monitorar se deslogado

      const prefs = SecurityConfigService.getPreferences();
      if (!prefs.inactivityTimeoutEnabled) return;

      const maxInactivityMs = (prefs.inactivityTimeoutMinutes || 30) * 60 * 1000;
      const warningThresholdMs = maxInactivityMs - 60 * 1000; // 60s antes
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= maxInactivityMs) {
        handleLogout();
      } else if (elapsed >= warningThresholdMs && !isOpen) {
        setIsOpen(true);
        const remainingSeconds = Math.max(1, Math.ceil((maxInactivityMs - elapsed) / 1000));
        setCountdown(remainingSeconds);

        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              handleLogout();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, 5000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleUserInteraction));
      clearInterval(checkInterval);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isOpen, handleLogout]);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md border-amber-500/30">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center mb-2">
            <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400 animate-pulse" />
          </div>
          <DialogTitle className="text-center text-lg">Aviso de Inatividade</DialogTitle>
          <DialogDescription className="text-center text-sm pt-1">
            Você esteve inativo por um período. Por segurança, sua sessão será encerrada automaticamente em:
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 text-center">
          <span className="text-4xl font-mono font-bold text-amber-600 dark:text-amber-400">
            {countdown}s
          </span>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2 text-xs"
            onClick={handleLogout}
          >
            <LogOut className="w-3.5 h-3.5" />
            Desconectar Agora
          </Button>
          <Button
            type="button"
            variant="accent"
            className="gap-2 text-xs font-semibold"
            onClick={resetActivity}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Continuar Conectado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
