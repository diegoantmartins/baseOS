import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CompetitionRecord } from '@/types/entities';

export interface MatchFiltersBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  competitionFilter: string;
  onCompetitionFilterChange: (compId: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  competitions: CompetitionRecord[];
}

export function MatchFiltersBar({
  query,
  onQueryChange,
  competitionFilter,
  onCompetitionFilterChange,
  statusFilter,
  onStatusFilterChange,
  competitions,
}: MatchFiltersBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2">
      <div className="relative flex-1">
        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
        <Input
          placeholder="Buscar por equipe, ginásio, quadra, fase ou competição..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="h-8 text-xs pl-8 bg-zinc-900 border-zinc-800"
        />
      </div>

      <div className="flex items-center gap-2">
        <Select value={competitionFilter} onValueChange={onCompetitionFilterChange}>
          <SelectTrigger className="w-[180px] text-xs h-8 bg-zinc-900 border-zinc-800">
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
          <SelectTrigger className="w-[140px] text-xs h-8 bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="text-xs">Todos os Status</SelectItem>
            <SelectItem value="completed" className="text-xs text-emerald-400 font-medium">Aguardando Homologação</SelectItem>
            <SelectItem value="homologated" className="text-xs text-blue-400">Homologados</SelectItem>
            <SelectItem value="in-progress" className="text-xs text-amber-400">Em Andamento (Ao Vivo)</SelectItem>
            <SelectItem value="scheduled" className="text-xs">Agendados</SelectItem>
            <SelectItem value="awaiting_schedule" className="text-xs">Sem Horário Definido</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
