import {
  Trophy,
  LayoutDashboard,
  Settings,
  Users,
  UserCheck,
  Dices,
  Calendar,
  ListOrdered,
  FileSpreadsheet,
  CalendarDays,
  MapPin,
  Tag,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CompetitionRecord } from '@/types/entities';
import { cn } from '@/lib/utils';

export type CompetitionTab =
  | 'overview'
  | 'config'
  | 'teams'
  | 'athletes'
  | 'draw'
  | 'matches'
  | 'standings'
  | 'reports';

export interface CompetitionHeaderProps {
  competition: CompetitionRecord;
  activeTab: CompetitionTab;
  onTabChange: (tab: CompetitionTab) => void;
  extraStats?: {
    teamsCount?: number;
    matchesCount?: number;
    athletesCount?: number;
  };
}

const TABS: { id: CompetitionTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'config', label: 'Configuração', icon: Settings },
  { id: 'teams', label: 'Equipes', icon: Users },
  { id: 'athletes', label: 'Atletas', icon: UserCheck },
  { id: 'draw', label: 'Sorteio', icon: Dices },
  { id: 'matches', label: 'Jogos', icon: Calendar },
  { id: 'standings', label: 'Classificação', icon: ListOrdered },
  { id: 'reports', label: 'Relatórios', icon: FileSpreadsheet },
];

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'success' | 'destructive' }> = {
  planning: { label: 'Planejamento', variant: 'outline' },
  'registration-open': { label: 'Inscrições Abertas', variant: 'secondary' },
  'registration-closed': { label: 'Inscrições Encerradas', variant: 'secondary' },
  'draw-pending': { label: 'Sorteio Pendente', variant: 'outline' },
  'groups-defined': { label: 'Grupos Definidos', variant: 'default' },
  'in-progress': { label: 'Em Andamento', variant: 'default' },
  playoffs: { label: 'Fase Eliminatória', variant: 'default' },
  completed: { label: 'Finalizado', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  draft: { label: 'Rascunho', variant: 'outline' },
  registration: { label: 'Inscrições', variant: 'secondary' },
};

export function CompetitionHeader({
  competition,
  activeTab,
  onTabChange,
  extraStats,
}: CompetitionHeaderProps) {
  const statusInfo = STATUS_MAP[competition.status] ?? { label: competition.status, variant: 'default' };

  return (
    <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden mb-6">
      {/* Top Banner with info */}
      <div className="p-5 md:p-6 bg-gradient-to-r from-card via-card to-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">
                {competition.name}
              </h1>
              <Badge variant={statusInfo.variant} className="text-xs font-semibold">
                {statusInfo.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {competition.modality === 'beach' ? 'Vôlei de Praia' : 'Vôlei de Quadra'}
              </Badge>
              <Badge variant="outline" className="text-xs uppercase">
                {competition.genderCategory === 'female' ? 'Feminino' : competition.genderCategory === 'male' ? 'Masculino' : 'Misto'}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
              {competition.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {competition.venue}
                </span>
              )}
              {competition.startDate && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {new Date(competition.startDate).toLocaleDateString('pt-BR')}
                  {competition.endDate && ` até ${new Date(competition.endDate).toLocaleDateString('pt-BR')}`}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                {competition.setFormat === '5-sets' ? 'Melhor de 5 sets' : 'Melhor de 3 sets'} ({competition.playerFormat})
              </span>
            </div>
          </div>
        </div>

        {/* Quick metrics */}
        {extraStats && (
          <div className="flex items-center gap-3 self-end md:self-center">
            {extraStats.teamsCount !== undefined && (
              <div className="px-3 py-1.5 rounded-lg bg-muted/60 text-center">
                <span className="block text-xs font-semibold text-foreground">{extraStats.teamsCount}</span>
                <span className="block text-[10px] text-muted-foreground uppercase font-medium">Equipes</span>
              </div>
            )}
            {extraStats.matchesCount !== undefined && (
              <div className="px-3 py-1.5 rounded-lg bg-muted/60 text-center">
                <span className="block text-xs font-semibold text-foreground">{extraStats.matchesCount}</span>
                <span className="block text-[10px] text-muted-foreground uppercase font-medium">Jogos</span>
              </div>
            )}
            {extraStats.athletesCount !== undefined && (
              <div className="px-3 py-1.5 rounded-lg bg-muted/60 text-center">
                <span className="block text-xs font-semibold text-foreground">{extraStats.athletesCount}</span>
                <span className="block text-[10px] text-muted-foreground uppercase font-medium">Atletas</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="px-3 border-t border-border bg-muted/30 overflow-x-auto scrollbar-none flex items-center gap-1">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2.5 text-xs md:text-sm font-medium border-b-2 transition-all whitespace-nowrap',
                active
                  ? 'border-primary text-primary font-semibold bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              <Icon className={cn('w-4 h-4', active ? 'text-primary' : 'text-muted-foreground')} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
