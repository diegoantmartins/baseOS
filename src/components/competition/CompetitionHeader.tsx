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
import { ContextualHelpButton } from '@/components/help/ContextualHelpButton';

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
    <div className="bg-card border border-border rounded-xl shadow-none overflow-hidden mb-6">
      {/* Top Banner with info */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                {competition.name}
              </h1>
              <Badge variant={statusInfo.variant} className="text-[10px] py-0 px-1.5 h-4">
                {statusInfo.label}
              </Badge>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-zinc-800 bg-zinc-900 text-zinc-400">
                {competition.modality === 'beach' ? 'Vôlei de Praia' : 'Vôlei de Quadra'}
              </Badge>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-zinc-800 bg-zinc-900 text-zinc-400 uppercase">
                {competition.genderCategory === 'female' ? 'Feminino' : competition.genderCategory === 'male' ? 'Masculino' : 'Misto'}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
              {competition.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-zinc-400" />
                  {competition.venue}
                </span>
              )}
              {competition.startDate && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3 text-zinc-400" />
                  {new Date(competition.startDate).toLocaleDateString('pt-BR')}
                  {competition.endDate && ` até ${new Date(competition.endDate).toLocaleDateString('pt-BR')}`}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3 text-zinc-400" />
                {competition.setFormat === '5-sets' ? 'Melhor de 5 sets' : 'Melhor de 3 sets'} ({competition.playerFormat})
              </span>
            </div>
          </div>
        </div>

        {/* Quick metrics & Contextual Help */}
        <div className="flex items-center gap-2.5 self-end md:self-center">
          <ContextualHelpButton
            articles={[
              { articleId: 'criar-competicao', label: 'Como gerenciar esta competição' },
              { articleId: 'configurar-modalidade', label: 'Regras de sets e modalidades' },
              { articleId: 'sorteio-grupos', label: 'Como fazer o sorteio de grupos' },
              { articleId: 'regras-classificacao', label: 'Critérios de desempate CBV' },
              { articleId: 'fases-finais-mata-mata', label: 'Como configurar mata-mata' },
            ]}
            label="Ajuda nesta tela"
          />

          {extraStats && (
            <>
              {extraStats.teamsCount !== undefined && (
                <div className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-center">
                  <span className="block text-xs font-semibold tabular-nums text-foreground">{extraStats.teamsCount}</span>
                  <span className="block text-[9px] text-muted-foreground uppercase font-medium">Equipes</span>
                </div>
              )}
              {extraStats.matchesCount !== undefined && (
                <div className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-center">
                  <span className="block text-xs font-semibold tabular-nums text-foreground">{extraStats.matchesCount}</span>
                  <span className="block text-[9px] text-muted-foreground uppercase font-medium">Jogos</span>
                </div>
              )}
              {extraStats.athletesCount !== undefined && (
                <div className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-center">
                  <span className="block text-xs font-semibold tabular-nums text-foreground">{extraStats.athletesCount}</span>
                  <span className="block text-[9px] text-muted-foreground uppercase font-medium">Atletas</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="px-2 border-t border-border bg-zinc-950/40 overflow-x-auto scrollbar-none flex items-center gap-1">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                active
                  ? 'border-primary text-foreground font-medium bg-zinc-800/40'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-zinc-800/20',
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', active ? 'text-primary' : 'text-zinc-400')} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
