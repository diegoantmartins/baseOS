// Serviço de Notificações Web e PWA em Tempo Real para Resultados de Jogos

import { toast } from 'sonner';
import type { MatchRecord } from '@/types/entities';

export interface AppNotificationItem {
  id: string;
  title: string;
  body: string;
  icon?: string;
  timestamp: string;
  url?: string;
  read: boolean;
}

const STORAGE_KEY = 'volleypro_notifications_history';

export const notificationService = {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  },

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      toast.error('Notificações não são suportadas neste navegador.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Notificações em tempo real ativadas!', {
          description: 'Você receberá avisos quando os resultados dos jogos forem homologados.',
        });
        return true;
      } else {
        toast.warning('Permissão de notificação não concedida.');
        return false;
      }
    } catch {
      return false;
    }
  },

  getHistory(): AppNotificationItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveHistory(items: AppNotificationItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
    } catch {
      // fallback
    }
  },

  addNotification(title: string, body: string, url?: string): AppNotificationItem {
    const item: AppNotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      body,
      icon: '/pwa-192x192.svg',
      timestamp: new Date().toISOString(),
      url,
      read: false,
    };

    const history = [item, ...this.getHistory()];
    this.saveHistory(history);

    // Dispara notificação nativa do sistema se tiver permissão
    if (this.isSupported() && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body,
              icon: '/pwa-192x192.svg',
              badge: '/pwa-192x192.svg',
              data: { url },
              tag: `match-${Date.now()}`,
            });
          });
        } else {
          new Notification(title, {
            body,
            icon: '/pwa-192x192.svg',
            data: { url },
          });
        }
      } catch (err) {
        console.warn('Native notification trigger fallback:', err);
      }
    }

    // Também emite toast no aplicativo
    toast.info(title, {
      description: body,
      duration: 6000,
    });

    return item;
  },

  notifyMatchResult(match: MatchRecord): void {
    const setsA = match.sets.filter((s) => s.scoreA > s.scoreB).length;
    const setsB = match.sets.filter((s) => s.scoreB > s.scoreA).length;
    const setsStr = match.sets.map((s) => `${s.scoreA}x${s.scoreB}`).join(', ');

    const winnerName = setsA > setsB ? match.teamAName : match.teamBName;
    const title = `🏐 Placar Final: ${match.teamAName} ${setsA} x ${setsB} ${match.teamBName}`;
    const body = `Vitória de ${winnerName}! Parciais: ${setsStr || 'Encerrado'} (${match.venue || 'Quadra Principal'}).`;

    this.addNotification(title, body, `/jogos`);
  },
};
