import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Props {
  variant?: 'outline' | 'default' | 'ghost' | 'accent';
  size?: 'sm' | 'default' | 'icon';
  className?: string;
  showText?: boolean;
}

export function PwaInstallButton({ variant = 'outline', size = 'sm', className = '', showText = true }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success('VolleyPro instalado com sucesso!');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (isInstalled) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast.info('Instalar VolleyPro no dispositivo', {
        description: 'No seu navegador (Chrome/Edge/Safari), clique no menu de opções e selecione "Instalar Aplicativo" ou "Adicionar à Tela de Início".',
      });
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        toast.success('Instalando VolleyPro...');
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('PWA install error:', err);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleInstall}
      className={`gap-1.5 font-medium ${className}`}
      title="Instalar VolleyPro como Aplicativo (PWA)"
    >
      <Smartphone className="w-4 h-4 text-primary" />
      {showText && <span>Instalar App (PWA)</span>}
    </Button>
  );
}
