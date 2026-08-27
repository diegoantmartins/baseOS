import React from 'react';
import { Calendar, Trophy, GitBranch, Clock, ClipboardList, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MatchesSubTab = 'todos' | 'grupos' | 'mata-mata' | 'agenda' | 'sumulas' | 'resultados';

export interface MatchTabsNavProps {
  activeSubTab: MatchesSubTab;
  onTabChange: (tab: MatchesSubTab) => void;
}

const TABS = [
  { id: 'todos', label: 'Todos os Jogos', icon: Calendar },
  { id: 'grupos', label: 'Fase de Grupos', icon: Trophy },
  { id: 'mata-mata', label: 'Mata-mata', icon: GitBranch },
  { id: 'agenda', label: 'Agenda e Horários', icon: Clock },
  { id: 'sumulas', label: 'Súmulas Oficiais', icon: ClipboardList },
  { id: 'resultados', label: 'Resultados e Homologação', icon: CheckCircle2 },
] as const;

export function MatchTabsNav({ activeSubTab, onTabChange }: MatchTabsNavProps) {
  return (
    <div
      role="tablist"
      aria-label="Filtro de partidas por fase"
      className="border-b border-border flex items-center gap-1 overflow-x-auto scrollbar-none pb-px"
    >
      {TABS.map((tab) => {
        const active = activeSubTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-match-${tab.id}`}
            aria-selected={active}
            aria-controls={`panel-match-${tab.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onTabChange(tab.id as MatchesSubTab)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              active
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-zinc-800/40 rounded-t-md',
            )}
          >
            <Icon className={cn('w-3.5 h-3.5', active ? 'text-primary' : 'text-zinc-400')} aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
