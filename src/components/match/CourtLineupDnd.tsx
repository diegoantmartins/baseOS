import { useState, useId } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Shield, Sparkles, User, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { CompetitionAthlete } from '@/types/registration';
import { cn } from '@/lib/utils';

export type CourtPosition = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'L1' | 'L2';

export interface LineupState {
  I?: string;
  II?: string;
  III?: string;
  IV?: string;
  V?: string;
  VI?: string;
  L1?: string;
  L2?: string;
}

interface CourtLineupDndProps {
  teamName: string;
  teamShortName: string;
  roster: CompetitionAthlete[];
  initialLineup?: LineupState;
  onLineupChange?: (lineup: LineupState) => void;
  disabled?: boolean;
}

const POSITION_LABELS: Record<CourtPosition, { label: string; zone: string; desc: string }> = {
  IV: { label: 'Posição IV', zone: 'Ataque - Entrada de Rede', desc: 'Ponta/Oposto' },
  III: { label: 'Posição III', zone: 'Ataque - Meio de Rede', desc: 'Central' },
  II: { label: 'Posição II', zone: 'Ataque - Saída de Rede', desc: 'Oposto/Levantador' },
  V: { label: 'Posição V', zone: 'Defesa - Fundo Esquerda', desc: 'Defesa' },
  VI: { label: 'Posição VI', zone: 'Defesa - Fundo Meio', desc: 'Defesa' },
  I: { label: 'Posição I', zone: 'Defesa - Posição de Saque', desc: 'Sacador' },
  L1: { label: 'Líbero 1', zone: 'Especialista em Defesa', desc: 'Líbero Principal' },
  L2: { label: 'Líbero 2', zone: 'Especialista em Defesa', desc: 'Líbero Reserva' },
};

export function CourtLineupDnd({
  teamName,
  teamShortName,
  roster,
  initialLineup = {},
  onLineupChange,
  disabled = false,
}: CourtLineupDndProps) {
  const dndContextId = useId();
  const [lineup, setLineup] = useState<LineupState>(initialLineup);
  const [activeAthleteId, setActiveAthleteId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  const assignedAthleteIds = new Set(Object.values(lineup).filter(Boolean));
  const availableRoster = roster.filter(ath => !assignedAthleteIds.has(ath.id));

  const getAthlete = (id?: string) => roster.find(ath => ath.id === id);
  const activeAthlete = roster.find(ath => ath.id === activeAthleteId);

  const handleDragStart = (event: DragStartEvent) => {
    if (disabled) return;
    setActiveAthleteId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveAthleteId(null);

    if (!over || disabled) return;

    const athleteId = String(active.id);
    const targetSlot = String(over.id) as CourtPosition | 'bench';

    const newLineup: LineupState = { ...lineup };

    // Se foi solto no banco de reservas
    if (targetSlot === 'bench') {
      (Object.keys(newLineup) as CourtPosition[]).forEach(pos => {
        if (newLineup[pos] === athleteId) {
          delete newLineup[pos];
        }
      });
      setLineup(newLineup);
      onLineupChange?.(newLineup);
      return;
    }

    // Se foi solto em uma posição de quadra
    const previousSlot = (Object.keys(newLineup) as CourtPosition[]).find(
      pos => newLineup[pos] === athleteId
    );

    const occupantInTarget = newLineup[targetSlot];

    // Se havia alguém na posição de destino e o atleta vinha de outra posição, troca as posições
    if (previousSlot) {
      if (occupantInTarget) {
        newLineup[previousSlot] = occupantInTarget;
      } else {
        delete newLineup[previousSlot];
      }
    }

    newLineup[targetSlot] = athleteId;
    setLineup(newLineup);
    onLineupChange?.(newLineup);
  };

  const handleClear = () => {
    const empty: LineupState = {};
    setLineup(empty);
    onLineupChange?.(empty);
  };

  const handleAutoFill = () => {
    const newLineup: LineupState = {};
    const regularAthletes = roster.filter(a => !a.isLibero);
    const liberos = roster.filter(a => a.isLibero);

    const positions: CourtPosition[] = ['IV', 'III', 'II', 'V', 'VI', 'I'];
    positions.forEach((pos, idx) => {
      if (regularAthletes[idx]) {
        newLineup[pos] = regularAthletes[idx].id;
      }
    });

    if (liberos[0]) newLineup.L1 = liberos[0].id;
    if (liberos[1]) newLineup.L2 = liberos[1].id;

    setLineup(newLineup);
    onLineupChange?.(newLineup);
  };

  const filledPositionsCount = ['I', 'II', 'III', 'IV', 'V', 'VI'].filter(
    pos => Boolean(lineup[pos as CourtPosition])
  ).length;

  return (
    <DndContext
      id={dndContextId}
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Card className="border-border/60 shadow-lg bg-card/95 backdrop-blur">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-display font-bold">
                  Escalação Tática em Quadra
                </CardTitle>
                <Badge variant={filledPositionsCount === 6 ? 'default' : 'secondary'}>
                  {filledPositionsCount}/6 Titulares
                </Badge>
              </div>
              <CardDescription>
                Arraste os atletas para as posições regulamentares (I a VI) e Líberos de {teamName} ({teamShortName}).
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoFill}
                disabled={disabled || roster.length === 0}
                className="text-xs gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Preencher Titulares
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={disabled || Object.keys(lineup).length === 0}
                className="text-xs gap-1.5 text-muted-foreground hover:text-destructive"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Quadra de Vôlei Visual */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-[500px] bg-gradient-to-b from-amber-600/90 to-amber-700/90 rounded-2xl p-4 shadow-2xl border-4 border-amber-900/40 relative overflow-hidden">
              {/* Efeito de Madeira/Piso de Quadra */}
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

              {/* Rede / Linha Central (Topo) */}
              <div className="w-full h-3 bg-white/90 rounded-t-sm shadow-md flex items-center justify-center mb-3">
                <span className="text-[9px] font-black text-slate-800 tracking-widest uppercase">
                  REDE (LINHA CENTRAL)
                </span>
              </div>

              {/* Zona de Ataque (Posições IV, III, II) */}
              <div className="mb-2">
                <div className="text-[10px] font-bold text-amber-100/80 uppercase tracking-wider mb-1 text-center">
                  Zona de Ataque (3m)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <CourtSlot
                    position="IV"
                    athlete={getAthlete(lineup.IV)}
                    disabled={disabled}
                  />
                  <CourtSlot
                    position="III"
                    athlete={getAthlete(lineup.III)}
                    disabled={disabled}
                  />
                  <CourtSlot
                    position="II"
                    athlete={getAthlete(lineup.II)}
                    disabled={disabled}
                  />
                </div>
              </div>

              {/* Linha de 3 Metros */}
              <div className="w-full h-1 bg-white/80 my-3 rounded-full shadow-sm" />

              {/* Zona de Defesa (Posições V, VI, I) */}
              <div>
                <div className="text-[10px] font-bold text-amber-100/80 uppercase tracking-wider mb-1 text-center">
                  Zona de Defesa & Saque
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <CourtSlot
                    position="V"
                    athlete={getAthlete(lineup.V)}
                    disabled={disabled}
                  />
                  <CourtSlot
                    position="VI"
                    athlete={getAthlete(lineup.VI)}
                    disabled={disabled}
                  />
                  <CourtSlot
                    position="I"
                    athlete={getAthlete(lineup.I)}
                    isServerSlot
                    disabled={disabled}
                  />
                </div>
              </div>

              {/* Área dos Líberos */}
              <div className="mt-4 pt-3 border-t border-amber-500/40">
                <div className="text-[10px] font-bold text-amber-100/80 uppercase tracking-wider mb-1 text-center">
                  Líberos Especialistas
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <CourtSlot
                    position="L1"
                    athlete={getAthlete(lineup.L1)}
                    isLiberoSlot
                    disabled={disabled}
                  />
                  <CourtSlot
                    position="L2"
                    athlete={getAthlete(lineup.L2)}
                    isLiberoSlot
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Banco de Reservas & Elenco Disponível */}
          <div className="lg:col-span-5 flex flex-col">
            <RosterBenchDropZone
              availableRoster={availableRoster}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Item sendo arrastado */}
      <DragOverlay>
        {activeAthlete && (
          <AthleteCard athlete={activeAthlete} isDragging />
        )}
      </DragOverlay>
    </DndContext>
  );
}

// Slot da quadra onde o atleta pode ser solto
function CourtSlot({
  position,
  athlete,
  isServerSlot = false,
  isLiberoSlot = false,
  disabled = false,
}: {
  position: CourtPosition;
  athlete?: CompetitionAthlete;
  isServerSlot?: boolean;
  isLiberoSlot?: boolean;
  disabled?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: position,
    disabled,
  });

  const info = POSITION_LABELS[position];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'h-24 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-1.5 relative overflow-hidden',
        isOver
          ? 'border-white bg-white/30 scale-105 shadow-glow ring-2 ring-white'
          : athlete
          ? 'border-white/60 bg-black/40 backdrop-blur-sm'
          : 'border-white/30 bg-black/20 hover:bg-black/30',
        isServerSlot && !athlete && 'bg-amber-900/30',
        isLiberoSlot && !athlete && 'bg-emerald-950/30 border-emerald-400/40'
      )}
    >
      {/* Indicador da Posição */}
      <div className="absolute top-1 left-2 text-[11px] font-black text-amber-200/90 tracking-tight">
        {position}
      </div>

      {athlete ? (
        <DraggableAthleteCard athlete={athlete} position={position} disabled={disabled} />
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-1">
          <span className="text-[10px] font-semibold text-white/70">{info.label}</span>
          <span className="text-[8px] text-white/50">{info.desc}</span>
        </div>
      )}
    </div>
  );
}

// Banco de Reservas (Droppable para devolver atletas)
function RosterBenchDropZone({
  availableRoster,
  disabled,
}: {
  availableRoster: CompetitionAthlete[];
  disabled?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'bench',
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 flex flex-col rounded-2xl border-2 p-4 transition-all',
        isOver
          ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
          : 'border-border/60 bg-muted/20'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          Atletas no Banco ({availableRoster.length})
        </h4>
        <span className="text-[11px] text-muted-foreground">
          Arraste para a quadra
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pr-1">
        {availableRoster.map(athlete => (
          <DraggableAthleteCard
            key={athlete.id}
            athlete={athlete}
            disabled={disabled}
          />
        ))}

        {availableRoster.length === 0 && (
          <div className="h-32 flex flex-col items-center justify-center text-center text-muted-foreground p-4 border border-dashed rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1" />
            <p className="text-xs font-medium">Todos os atletas escalados!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente Draggable do Atleta
function DraggableAthleteCard({
  athlete,
  position,
  disabled,
}: {
  athlete: CompetitionAthlete;
  position?: CourtPosition;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: athlete.id,
    disabled,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn('w-full cursor-grab active:cursor-grabbing', isDragging && 'opacity-30')}
    >
      <AthleteCard athlete={athlete} position={position} />
    </div>
  );
}

// Card Visual do Atleta
function AthleteCard({
  athlete,
  position,
  isDragging = false,
}: {
  athlete: CompetitionAthlete;
  position?: CourtPosition;
  isDragging?: boolean;
}) {
  const isLibero = athlete.isLibero;
  const isCaptain = athlete.isCaptain;

  return (
    <div
      className={cn(
        'rounded-lg p-2 transition-all flex items-center justify-between gap-2 border select-none',
        isDragging && 'shadow-2xl ring-2 ring-primary bg-card scale-105',
        isLibero
          ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-100'
          : 'bg-card border-border/80 text-card-foreground',
        position && 'bg-black/60 border-white/20 text-white w-full'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Número da Camisa */}
        <span
          className={cn(
            'w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0',
            isLibero
              ? 'bg-emerald-500 text-slate-950 font-black'
              : 'bg-primary text-primary-foreground'
          )}
        >
          {athlete.jerseyNumber !== undefined ? athlete.jerseyNumber : '--'}
        </span>

        {/* Nome e badges */}
        <div className="min-w-0 flex flex-col">
          <span className="text-xs font-bold truncate leading-tight">
            {athlete.name}
          </span>
          <span className="text-[10px] text-muted-foreground truncate">
            {athlete.position || (isLibero ? 'Líbero' : 'Atleta')}
          </span>
        </div>
      </div>

      {/* Badges especiais */}
      <div className="flex items-center gap-1 shrink-0">
        {isCaptain && (
          <Badge
            variant="outline"
            className="px-1 py-0 text-[9px] font-black border-amber-400 text-amber-400 bg-amber-950/40"
          >
            (C)
          </Badge>
        )}
        {isLibero && (
          <Badge
            variant="outline"
            className="px-1 py-0 text-[9px] font-black border-emerald-400 text-emerald-400 bg-emerald-950/40"
          >
            LIB
          </Badge>
        )}
      </div>
    </div>
  );
}
