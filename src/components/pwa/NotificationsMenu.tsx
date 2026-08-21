import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, Volume2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { notificationService, AppNotificationItem } from '@/services/notificationService';
import { toast } from 'sonner';

export function NotificationsMenu() {
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [hasWebPerm, setHasWebPerm] = useState(false);
  const [open, setOpen] = useState(false);

  const refresh = () => {
    setNotifications(notificationService.getHistory());
    setHasWebPerm(notificationService.getPermission() === 'granted');
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleRequestPermission = async () => {
    const granted = await notificationService.requestPermission();
    setHasWebPerm(granted);
  };

  const handleClearAll = () => {
    notificationService.saveHistory([]);
    setNotifications([]);
    toast.success('Histórico de notificações limpo.');
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    notificationService.saveHistory(updated);
    setNotifications(updated);
  };

  return (
    <Popover open={open} onOpenChange={v => { setOpen(v); if (v) refresh(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-foreground hover:bg-muted/80 rounded-xl" title="Notificações em Tempo Real">
          <Bell className="w-4 h-4 text-foreground/80" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full ring-2 ring-background animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-xl border border-border bg-card">
        <div className="flex items-center justify-between p-3.5 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm text-foreground">Notificações em Tempo Real</span>
            {unreadCount > 0 && (
              <Badge variant="default" className="text-[10px] h-5 px-1.5 bg-primary">
                {unreadCount} nova{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={handleMarkAllRead} title="Marcar lidas" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <CheckCheck className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={handleClearAll} title="Limpar tudo" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Permissão Web Notification Banner */}
        {!hasWebPerm && (
          <div className="p-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-2 text-xs">
            <div className="space-y-0.5 min-w-0">
              <p className="font-semibold text-primary">Receber avisos no celular/PC?</p>
              <p className="text-[11px] text-muted-foreground truncate">Ative para resultados imediatos.</p>
            </div>
            <Button size="sm" variant="default" onClick={handleRequestPermission} className="h-7 text-xs shrink-0 bg-primary">
              Ativar
            </Button>
          </div>
        )}

        {/* Lista de Notificações */}
        <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs space-y-1">
              <p className="font-medium text-foreground">Nenhuma notificação recente</p>
              <p>Os resultados e avisos de jogos finalizados aparecerão aqui.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 transition-colors hover:bg-muted/40 text-xs space-y-1 ${!n.read ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground truncate">{n.title}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                    {new Date(n.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">{n.body}</p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
