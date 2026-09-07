# BASEOS — FASE 3.1: Maquina de Estados de Animacao

## 1. Visao Geral

A revelacao do sorteio e controlada por uma maquina de estados finitos (FSM) implementada no hook `useDrawReveal`. Esta maquina garante que apenas uma operacao ocorra por vez, previne estados invalidos, e fornece ganchos para UI e animacao.

## 2. Estados

```typescript
type RevealState =
  | 'idle'        // Aguardando preparacao
  | 'ready'       // Sequencia preparada, aguardando inicio
  | 'drawing'     // Animacao de selecao em andamento
  | 'revealing'   // Revelando resultado atual
  | 'revealed'    // Resultado atual visivel
  | 'completed'   // Todos os itens revelados
  | 'error'       // Erro durante o processo
  | 'cancelled';  // Usuario cancelou
```

### 2.1 Descricao de Estados

| Estado | Significado | UI Esperada |
|--------|-------------|-------------|
| `idle` | Nenhuma revelacao ativa | Botao "Iniciar Sorteio" |
| `ready` | Sequencia carregada | Botao "Sortear Proximo" |
| `drawing` | Animacao de "sorteando..." | Indicador de loading, botao desabilitado |
| `revealing` | Animacao de revelacao | Card de equipe aparecendo |
| `revealed` | Equipe visivel | Card estatico + botao "Proximo" |
| `completed` | Fim da sequencia | Mensagem de conclusao |
| `error` | Falha inesperada | Mensagem de erro + botao retry |
| `cancelled` | Cancelado pelo usuario | Volta ao estado idle |

## 3. Diagrama de Transicoes

```
                              erro
        ┌──────────────────────────────────────────────────────────┐
        │                                                          │
        │                                                          │
        │                                                          ▼
┌───────────────┐    prepare     ┌─────────────┐   next()    ┌───────────┐
│     IDLE      │───────────────▶│    READY    │────────────▶│  DRAWING  │
└───────────────┘                └─────────────┘             └─────┬─────┘
     ▲     ▲                          ▲                              │
     │     │                          │                              │
     │     │ reset()                  │ next()                      │ timeout
     │     │                          │                              ▼
     │     │                     ┌────┴────┐                  ┌───────────┐
     │     │                     │ CANCEL  │                  │ REVEALING │
     │     │                     └─────────┘                  └─────┬─────┘
     │     │                                                       │
     │     │                                                       │ timeout
     │     │                                                       ▼
     │     │                                                  ┌───────────┐
     │     │                                                  │  REVEALED │
     │     │                                                  └─────┬─────┘
     │     │                                                        │
     │     │                               ┌────────────────────────┤
     │     │                               │                        │
     │     │                               │ next()                 │ next()
     │     │                               │                        │
     │     │                               ▼                        ▼
     │     │                        ┌─────────────┐           ┌───────────┐
     │     │                        │  COMPLETED  │           │  DRAWING  │
     │     │                        └─────────────┘           └─────┬─────┘
     │     │                                                        │
     │     │                                                        │
     │     │     ┌───────────────────────────────────────────────────┘
     │     │     │              erro
     │     │     ▼
     │     │ ┌───────────┐
     │     │ │   ERROR   │
     │     │ └─────┬─────┘
     │     │       │ reset()
     │     │       ▼
     │     └───────┘
     │
     │     ┌─────────────────────────────────────┐
     └─────┤           CANCELLED                 │
           │         (estado terminal           │
           │          de interrupcao)            │
           └─────────────────────────────────────┘
```

## 4. Eventos / Acoes

| Evento | Descricao | Condicoes |
|--------|-----------|----------|
| `prepare` | Prepara a sequencia de revelacao | De: `idle` |
| `next` | Avanca para o proximo item | De: `ready`, `revealed` |
| `cancel` | Cancela a revelacao em curso | De: `drawing`, `revealing` |
| `reset` | Reinicia para o inicio | De: `completed`, `error`, `cancelled` |
| `timeout_drawing` | Animacao de sorteio terminou | De: `drawing` |
| `timeout_revealing` | Animacao de revelacao terminou | De: `revealing` |
| `error` | Falha nao recuperavel | De: qualquer estado |

## 5. Regras de Transicao

### 5.1 Preparacao

```typescript
idle --prepare()--> ready
  pre-condicao: result nao vazio, teams.length > 0
  efeito colateral: buildRevealSequence(), set currentIndex = -1
```

### 5.2 Avanco

```typescript
ready --next()--> drawing
  pre-condicao: currentIndex < sequence.length - 1
  efeito colateral: currentIndex++, onRevealItem() callback

drawing --timeout_drawing--> revealing
  pre-condicao: animacao de sorteio concluida
  efeito colateral: nenhum

revealing --timeout_revealing--> revealed
  pre-condicao: animacao de revelacao concluida
  efeito colateral: onRevealItem() callback (ja chamado em ready)

revealed --next()--> drawing | completed
  pre-condicao: currentIndex < sequence.length - 1
  se proximo existe: transiciona para 'drawing'
  se ultimo: transiciona para 'completed'
```

### 5.3 Cancelamento

```typescript
drawing --cancel()--> cancelled
  pre-condicao: nenhuma
  efeito colateral: limpa timers, interrompe animacao

revealing --cancel()--> cancelled
  pre-condicao: nenhuma
  efeito colateral: limpa timers

cancelled --reset()--> idle
  pre-condicao: nenhuma
  efeito colateral: currentIndex = -1, sequence = []
```

### 5.4 Erro

```typescript
ANY --error--> error
  pre-condicao: excecao lancada
  efeito colateral: logs, cleanup de timers

error --reset()--> idle
  pre-condicao: nenhuma
  efeito colateral: sequence = [], currentIndex = -1
```

## 6. Propriedades Derivadas

```typescript
interface DerivedState {
  canPrepare: boolean;       // state === 'idle'
  canNext: boolean;          // state === 'ready' || state === 'revealed'
  canCancel: boolean;        // state === 'drawing' || state === 'revealing'
  canReset: boolean;         // state === 'completed' || state === 'error' || state === 'cancelled'
  isAnimating: boolean;      // state === 'drawing' || state === 'revealing'
  isComplete: boolean;       // state === 'completed'
  progress: number;          // 0-100 baseado em currentIndex / sequence.length
  currentEvent: DrawRevealEvent | null;
  currentTeam: TeamRecord | null;
  remainingCount: number;    // sequence.length - currentIndex - 1
}
```

## 7. Implementacao do Hook

```typescript
export function useDrawReveal(options: UseDrawRevealOptions) {
  const [state, setState] = useState<RevealState>('idle');
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [error, setError] = useState<Error | null>(null);

  const sequence = useMemo(
    () => buildRevealSequence(options.result.groups),
    [options.result.groups]
  );

  const currentEvent = useMemo(
    () => (currentIndex >= 0 ? sequence[currentIndex] : null),
    [currentIndex, sequence]
  );

  const currentTeam = useMemo(
    () => (currentEvent ? options.teams.find(t => t.id === currentEvent.teamId) : null),
    [currentEvent, options.teams]
  );

  const progress = useMemo(
    () => (sequence.length > 0 ? ((currentIndex + 1) / sequence.length) * 100 : 0),
    [currentIndex, sequence.length]
  );

  const prepare = useCallback(() => {
    if (state !== 'idle') return;
    setState('ready');
    setCurrentIndex(-1);
    setError(null);
  }, [state]);

  const next = useCallback(() => {
    if (state === 'ready' || state === 'revealed') {
      if (currentIndex < sequence.length - 1) {
        setState('drawing');
        setCurrentIndex(prev => prev + 1);
        if (options.onRevealItem && sequence[currentIndex + 1]) {
          const team = options.teams.find(
            t => t.id === sequence[currentIndex + 1].teamId
          );
          if (team) options.onRevealItem(sequence[currentIndex + 1], team);
        }
      } else if (state === 'revealed') {
        setState('completed');
        if (options.onComplete) options.onComplete(sequence);
      }
    }
  }, [state, currentIndex, sequence, options]);

  const cancel = useCallback(() => {
    if (state === 'drawing' || state === 'revealing') {
      setState('cancelled');
    }
  }, [state]);

  const reset = useCallback(() => {
    setState('idle');
    setCurrentIndex(-1);
    setError(null);
  }, []);

  // Auto-transition: drawing -> revealing
  useEffect(() => {
    if (state === 'drawing') {
      const timer = setTimeout(() => {
        setState('revealing');
      }, options.drawDurationMs ?? 1500);
      return () => clearTimeout(timer);
    }
  }, [state, options.drawDurationMs]);

  // Auto-transition: revealing -> revealed
  useEffect(() => {
    if (state === 'revealing') {
      const timer = setTimeout(() => {
        setState('revealed');
      }, options.revealDurationMs ?? 2500);
      return () => clearTimeout(timer);
    }
  }, [state, options.revealDurationMs]);

  return {
    state,
    currentIndex,
    currentEvent,
    currentTeam,
    sequence,
    progress,
    canPrepare: state === 'idle',
    canNext: state === 'ready' || state === 'revealed',
    canCancel: state === 'drawing' || state === 'revealing',
    canReset: state === 'completed' || state === 'error' || state === 'cancelled',
    isAnimating: state === 'drawing' || state === 'revealing',
    isComplete: state === 'completed',
    error,
    prepare,
    next,
    cancel,
    reset,
  };
}
```

## 8. Sincronizacao com UI

### 8.1 UI 2D (DrawPresentation2D)

```typescript
// O componente 2D existenterecebe o estado do hook
// e sincroniza suas animacoes com a FSM

function DrawPresentation2D({
  externalState,
  externalSequence,
  onExternalNext,
}: {
  externalState: RevealState;
  externalSequence: DrawRevealEvent[];
  onExternalNext: () => void;
}) {
  // Sincroniza estado local com a FSM
  const isRevealing = externalState === 'drawing' || externalState === 'revealing';
  const isFinished = externalState === 'completed';

  return (
    // ... existente, adaptado
    <Button
      onClick={onExternalNext}
      disabled={externalState === 'drawing' || externalState === 'revealing'}
    >
      {/* texto baseado em externalState */}
    </Button>
  );
}
```

### 8.2 UI 3D (DrawScene3D)

```typescript
// A cena 3D recebe indices e estados do hook
// e controla suas animacoes internas de acordo

<DrawScene3D
  currentIndex={currentIndex}
  isAnimating={isAnimating}
  state={state}
  onAnimationEnd={next}
/>
```

## 9. Atalhos de Teclado

| Tecla | Acao | Estados permitidos |
|-------|------|-------------------|
| `Space` | Proximo | `ready`, `revealed` |
| `Escape` | Cancelar | `drawing`, `revealing` |
| `R` | Reiniciar | `completed`, `cancelled`, `error` |
| `F` | Tela cheia | qualquer |

## 10. Eventos de Acessibilidade

```typescript
// O hook dispara callbacks para UI e logging
interface RevealCallbacks {
  onRevealItem?: (event: DrawRevealEvent, team: TeamRecord) => void;
  onComplete?: (events: DrawRevealEvent[]) => void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number, currentIndex: number) => void;
}
```

## 11. Testes da FSM

```typescript
// Casos de teste
test('idle -> ready via prepare()', () => { ... });
test('ready -> drawing -> revealing -> revealed via next()', () => { ... });
test('drawing -> cancelled via cancel()', () => { ... });
test('cancelled -> idle via reset()', () => { ... });
test('sequence end -> completed', () => { ... });
test('next() nao faz nada em idle', () => { ... });
test('cancel() nao faz nada em revealed', () => { ... });
test('progress calculado corretamente', () => { ... });
```
