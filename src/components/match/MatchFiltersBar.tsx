import React from 'react';
import { Search, Split, Columns, Shuffle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CompetitionRecord } from '@/types/entities';

export interface MatchFiltersBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  competitionFilter: string;
  onCompetitionFilterChange: (compId: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  courtFilter?: string;
  onCourtFilterChange?: (court: string) => void;
  competitions: CompetitionRecord[];
  onDistributeCourts?: () => void;
  isSplitView?: boolean;
  onToggleSplitView?: () => void;
}

export function MatchFiltersBar({
  query,
  onQueryChange,
  competitionFilter,
  onCompetitionFilterChange,
  statusFilter,
  onStatusFilterChange,
  courtFilter = 'all',
  onCourtFilterChange,
  competitions,
  onDistributeCourts,
  isSplitView,
  onToggleSplitView,
}: MatchFiltersBarProps) {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pb-2">
      <div className="relative flex-1">
        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
        <Input
          placeholder="Buscar por equipe, ginásio, quadra, fase ou competição..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="h-8 text-xs pl-8 bg-zinc-900 border-zinc-800"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {/* Filtro de Quadra */}
        {onCourtFilterChange && (
          <Select value={courtFilter} onValueChange={onCourtFilterChange}>
            <SelectTrigger className="w-[140px] text-xs h-8 bg-zinc-900 border-zinc-800">
              <SelectValue placeholder="Quadra" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="all" className="text-xs">Todas as Quadras</SelectItem>
              <SelectItem value="Quadra 1" className="text-xs text-amber-400 font-medium">📍 Quadra 1</SelectItem>
              <SelectItem value="Quadra 2" className="text-xs text-sky-400 font-medium">📍 Quadra 2</SelectItem>
              <SelectItem value="unassigned" className="text-xs text-zinc-400">Sem Quadra</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Select value={competitionFilter} onValueChange={onCompetitionFilterChange}>
          <SelectTrigger className="w-[170px] text-xs h-8 bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Competição" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="text-xs">Todas as Competições</SelectItem>
            {competitions.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[130px] text-xs h-8 bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="text-xs">Todos os Status</SelectItem>
            <SelectItem value="completed" className="text-xs text-emerald-400 font-medium">Aguardando Homologação</SelectItem>
            <SelectItem value="homologated" className="text-xs text-blue-400">Homologados</SelectItem>
            <SelectItem value="in-progress" className="text-xs text-amber-400">Em Andamento</SelectItem>
            <SelectItem value="scheduled" className="text-xs">Agendados</SelectItem>
            <SelectItem value="awaiting_schedule" className="text-xs">Sem Horário</SelectItem>
          </SelectContent>
        </Select>

        {/* Botão de Alternar Visualização Dividida */}
        {onToggleSplitView && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleSplitView}
            className={`h-8 px-2.5 text-xs gap-1 border-zinc-800 ${
              isSplitView
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
            title="Alternar visualização dividida por quadras"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Dividir Quadras</span>
          </Button>
        )}

        {/* Botão de Distribuição Automática de Quadras */}
        {onDistributeCourts && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onDistributeCourts}
            className="h-8 px-2.5 text-xs gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 font-medium shrink-0"
            title="Alocar alternadamente jogos entre Quadra 1 e Quadra 2"
          >
            <Split className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Distribuir Quadras</span>
          </Button>
        )}
      </div>
    </div>
  );
}
