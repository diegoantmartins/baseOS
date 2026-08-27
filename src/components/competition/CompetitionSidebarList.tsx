import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/Section';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';
import type { CompetitionRecord } from '@/types/entities';

export interface CompetitionSidebarListProps {
  competitions: CompetitionRecord[];
  filteredCompetitions: CompetitionRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  modalityFilter: 'all' | 'indoor' | 'beach';
  onModalityFilterChange: (filter: 'all' | 'indoor' | 'beach') => void;
}

export function CompetitionSidebarList({
  competitions,
  filteredCompetitions,
  selectedId,
  onSelect,
  searchTerm,
  onSearchChange,
  modalityFilter,
  onModalityFilterChange,
}: CompetitionSidebarListProps) {
  return (
    <SectionCard
      density="dense"
      divided
      title="Torneios"
      description={`${filteredCompetitions.length} de ${competitions.length} listados`}
    >
      {/* Barra de Busca & Filtro de Modalidade */}
      <div className="space-y-2 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
          <Input
            placeholder="Buscar competição..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 text-xs pl-8 bg-zinc-900 border-zinc-800"
          />
        </div>

        <div className="flex gap-1">
          <Button
            variant={modalityFilter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-[11px] px-2 flex-1"
            onClick={() => onModalityFilterChange('all')}
          >
            Todas
          </Button>
          <Button
            variant={modalityFilter === 'indoor' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-[11px] px-2 flex-1"
            onClick={() => onModalityFilterChange('indoor')}
          >
            Quadra
          </Button>
          <Button
            variant={modalityFilter === 'beach' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-[11px] px-2 flex-1"
            onClick={() => onModalityFilterChange('beach')}
          >
            Praia
          </Button>
        </div>
      </div>

      {/* Lista Selecionável */}
      <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
        {filteredCompetitions.map((comp) => {
          const isSelected = selectedId === comp.id;
          return (
            <button
              key={comp.id}
              type="button"
              onClick={() => onSelect(comp.id)}
              className={cn(
                'w-full text-left p-3 rounded-lg transition-all duration-150 text-xs flex flex-col gap-1.5 border',
                isSelected
                  ? 'bg-zinc-800/90 text-foreground font-medium border-primary/40 shadow-sm'
                  : 'hover:bg-zinc-800/40 text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              <span className="font-semibold text-foreground truncate">{comp.name}</span>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{comp.modality === 'beach' ? 'Praia' : 'Quadra'} · {comp.playerFormat}</span>
                <StatusBadge status={comp.status} showIcon={false} className="text-[9px] py-0 px-1.5 h-4" />
              </div>
            </button>
          );
        })}

        {filteredCompetitions.length === 0 && (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Nenhum torneio encontrado com os filtros atuais.
          </p>
        )}
      </div>
    </SectionCard>
  );
}
