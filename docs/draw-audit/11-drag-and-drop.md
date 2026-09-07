# 11 — Auditoria do Drag-and-Drop

## Biblioteca: `@dnd-kit/core`

## Arquivo: `src/pages/DrawPage.tsx` (linhas 19-29, 83-115, 467-477, 574-655)

## Configuração

```typescript
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
);
```

## Comportamento

### handleGroupDragEnd (linha 88-115)

```typescript
const handleGroupDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  const currentGroups = preview?.groups ?? existingDraw?.groups ?? null;
  if (!over || !currentGroups) return;

  const teamId = String(active.id);
  const targetGroupName = String(over.id);

  const currentGroup = currentGroups.find(g => g.teams.some(t => t.teamId === teamId));
  if (!currentGroup || currentGroup.name === targetGroupName) return;

  const entryToMove = currentGroup.teams.find(t => t.teamId === teamId);
  if (!entryToMove) return;

  const newGroups = currentGroups.map(g => {
    if (g.name === currentGroup.name) {
      return { ...g, teams: g.teams.filter(t => t.teamId !== teamId) };
    }
    if (g.name === targetGroupName) {
      return { ...g, teams: [...g.teams, entryToMove] };
    }
    return g;
  });

  const newMatches = generateDrawMatches(newGroups);
  setPreview({ groups: newGroups, matches: newMatches });
  toast.info(`Equipe movida para o ${targetGroupName} e tabela recalculada!`);
};
```

## Quando Pode Ser Utilizado

| Estado | Funciona? | Observação |
|--------|-----------|------------|
| Antes do sorteio (sem preview, sem existingDraw) | Não | Não há grupos para arrastar |
| Após "Realizar Sorteio" (preview preenchido) | Sim | Modifica o preview |
| Após salvar (existingDraw presente, sem preview) | Sim | Cria/atualiza preview com drag |
| Durante drag-and-drop (estado intermediário) | Sim | DndContext gerencia |

## O Que Modifica

### Equipes
- **Move equipes entre grupos** (remove de um, adiciona em outro)
- **Não reordena dentro do mesmo grupo** (mesmo `targetGroupName`)
- **NÃO pode mover entre sub-grupos ou criar novos grupos**

### Estado
- **Sempre atualiza `preview`**, não modifica `existingDraw` diretamente
- Gera novos matches automaticamente com `generateDrawMatches(newGroups)`

### Cabeças de Chave
- **NÃO altera `headSeeds`** — array de cabeças permanece inalterado
- **Implicação:** Uma equipe pode ser cabeça de chave, ser movida de grupo, mas a `headSeeds` array ainda a referencia

## Funciona Antes do Sorteio?

**NÃO** — o drag-and-drop depende de `currentGroups` que vem de `preview` ou `existingDraw`. Se nenhum dos dois existir, o handler retorna sem ação.

## Funciona Durante o Sorteio?

**NÃO APLICÁVEL** — o sorteio é síncrono (executa em `handleRunDraw`). Não há animação de "sorteio em progresso" para interferir.

## Funciona Depois (Após Salvar)?

**SIM** — funciona com `existingDraw.groups`, criando um novo `preview` ao arrastar. Isso permite ajustar o sorteio já salvo.

## Pode Alterar Cabeças de Chave?

**NÃO diretamente** — drag-and-drop não modifica o array `headSeeds`. Mas pode haver inconsistência:
- Se uma equipe é cabeça (`headSeeds`) e é movida, o sorteio é regerado mas ela continua como cabeça conceitualmente
- Isso pode causar situações onde 2 cabeças ficam no mesmo grupo (após drag)

## Existe Trava Após Iniciar o Sorteio?

**NÃO** — após `handleRunDraw`, o preview é definido e o usuário pode arrastar imediatamente. Não há estado "sorteio em andamento" que bloqueie drag.

## Componentes Envolvidos

### DroppableGroupCard (linha 574-613)

```typescript
function DroppableGroupCard({ group, teams }: { group: DrawGroup; teams: TeamRecord[] }) {
  const { isOver, setNodeRef } = useDroppable({
    id: group.name,
  });
  // ...
}
```

- Cada card de grupo é uma **drop zone**
- `id` é o `group.name` ("Grupo A", "Grupo B", etc.)
- Visual muda quando hover (`isOver`)

### DraggableTeamRow (linha 615-655)

```typescript
function DraggableTeamRow({ teamId, idx, team }: ...) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: teamId,
  });
  // ...
}
```

- Cada linha de equipe é **draggable**
- `id` é o `teamId`
- Aplica transformações CSS durante drag
- Reduz opacidade quando arrastando

## Validação

### Validação de Movimento
```typescript
if (!currentGroup || currentGroup.name === targetGroupName) return;
```
- Não move para o mesmo grupo
- Não move se equipe não encontrada

### Validação de Estado
```typescript
if (!over || !currentGroups) return;
```
- Não executa se não há drop target
- Não executa se não há grupos

**Observação:** Validação mínima — confia nos dados de entrada.

## Fluxo de Drag-and-Drop

```
Usuário arrasta equipe X do Grupo A para o Grupo B
         ↓
DndContext detecta drop
         ↓
handleGroupDragEnd(event) executa
         ↓
1. Identifica teamId (active.id) e targetGroupName (over.id)
2. Encontra grupo atual de X
3. Cria novo array de grupos:
   - Remove X do grupo atual
   - Adiciona X ao grupo alvo
4. Regenera matches com generateDrawMatches(newGroups)
5. setPreview({ groups: newGroups, matches: newMatches })
         ↓
UI atualizada com novos grupos e tabela
```

## Restrições de UX

1. **Distância mínima de 5px** para ativar drag (evita cliques acidentais)
2. **Delay de 150ms para touch** (sensível a scroll)
3. **Não há limite de movimentos** — usuário pode arrastar várias vezes
4. **Não há undo** — cada drag é definitivo (até próximo sorteio)

## Cenários Não Suportados

1. **Reordenar dentro do mesmo grupo** — o handler retorna se mesmo grupo
2. **Criar novo grupo** — não há UI para isso
3. **Trocar posições** — apenas mover, não trocar
4. **Drag de múltiplas equipes** — cada uma é individual
5. **Persistir apenas as mudanças de drag** — ao salvar, todo o sorteio é re-salvo

## Pontos de Atenção

1. **Inconsistência potencial com cabeças**: drag pode colocar 2 cabeças no mesmo grupo
2. **Sem feedback visual de hierarquia** — equipes "cabeça" não são destacadas visualmente
3. **Sem validação pós-drag** — não verifica se regras do sorteio são violadas
4. **`over.id` é `group.name`** — usar nome como ID é frágil se mudar
5. **Estado `preview` pode ficar dessincronizado** se `existingDraw` mudar
6. **Não limpa preview** após salvar — usuário pode ver dois estados diferentes

## Recomendações para FASE 2

1. Validar regras após drag (uma cabeça por grupo, etc.)
2. Destacar visualmente equipes que são cabeças
3. Considerar histórico de movimentos (undo)
4. Reordenar equipes dentro do mesmo grupo via drag
5. Indicar visualmente onde cada equipe foi "originalmente" sorteada
