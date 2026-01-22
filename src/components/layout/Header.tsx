import { Bell, Search, User, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Header() {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Search */}
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar campeonatos, equipes, atletas..."
          className="pl-10 bg-muted/50 border-transparent focus:border-accent"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="accent" size="default" className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Campeonato
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        </Button>

        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <div className="text-right">
            <p className="text-sm font-medium">Administrador</p>
            <p className="text-xs text-muted-foreground">Federação SP</p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full bg-primary text-primary-foreground">
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
