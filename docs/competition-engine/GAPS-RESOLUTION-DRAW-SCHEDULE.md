# BaseOS — Resolução de Gaps Bloqueantes (Frente 3 e Frente 6)
**Documento:** `docs/competition-engine/GAPS-RESOLUTION-DRAW-SCHEDULE.md`  
**Módulos:** Sorteio Dinâmico via DAG, Schedule Engine e Portal da Equipe  
**Papel:** Principal Full-Stack Engineer  
**Data:** 02 de Outubro de 2026  
**Status:** Implementado, Integrado e Homologado  

---

## 1. Contexto & Objetivos

Com a evolução do Motor de Competições do BaseOS para uma arquitetura orientada a grafos canônicos de fases (`StageDefinition[]` / `CanonicalStageDefinition[]`), certas camadas periféricas mantinham dependências de valores fixos legados e ordenação engessada por rodadas. 

Este ciclo resolveu 3 frentes críticas:
1. **Sincronização Dinâmica do Sorteio (`DrawPage.tsx` e `drawService.ts`):** Eliminação de número de grupos estático e vinculação direta ao grafo de fases da competição;
2. **Ordenação Cronológica Absoluta (`dataAccess.ts` e `scheduleService.ts`):** Priorização estrita de `scheduled_time ASC` no banco e na engine pura para garantir que jogos reagendados ou antecipados respeitem a linha do tempo real;
3. **Reflexo Visual no Portal da Equipe (`TeamPortalPage.tsx`):** Consumo determinístico da agenda ordenada via memoização canônica.

---

## 2. Frente 3: Sincronização Dinâmica do Sorteio

### 2.1 Leitura do Grafo de Fases (`DrawPage.tsx`)
- **Remoção do Hardcode:** O estado `groupsCount` não mais inicializa com valor fixo `2`.
- **Efeito de Sincronização Reativo:**
```tsx
const [groupsCount, setGroupsCount] = useState<number>(1);

// Sincronização dinâmica do número de grupos a partir do DAG do Motor de Competições
useEffect(() => {
  if (!selected) return;
  const dagGroups =
    selected?.config?.format?.stages?.[0]?.groupConfig?.groupsCount ??
    selected?.config?.format?.stages?.find(
      (s) => s.type === 'group-stage' || (s.type as string) === 'round-robin'
    )?.groupConfig?.groupsCount;

  if (typeof dagGroups === 'number' && dagGroups > 0) {
    setGroupsCount(dagGroups);
  }
}, [selected]);
```

### 2.2 Propagação da Fase Canônica (`drawService.ts` & `DrawPage.tsx`)
- A função `runDraw` agora extrai o nome canônico da fase configurada no grafo (`stage.name` ou `stage.id`) e o encaminha para `generateDrawMatches`:
```typescript
const stage =
  competition?.config?.format?.stages?.find(
    (s) => s.type === 'group-stage' || (s.type as string) === 'round-robin'
  ) ?? competition?.config?.format?.stages?.[0];
const stageName = stage?.name || stage?.id || 'classificatória';
const matches = generateDrawMatches(groups, stageName);
```
- No fluxo de Drag-and-Drop de grupos (`handleGroupDragEnd` em `DrawPage.tsx`), a recalculação da tabela de jogos também propaga a fase real do grafo, persistindo o valor exato no campo `phase` de cada partida (`MatchRecord.phase`).

---

## 3. Frente 6: Ordenação Cronológica Absoluta

### 3.1 Ordenação no Adapter de Dados (`dataAccess.ts`)
- **Supabase Query:** Em `SupabaseAdapter.listMatches`, a consulta agora impõe ordenação cronológica com jogos com horário prioritários:
```typescript
query = query.order('scheduled_time', { ascending: true, nullsFirst: false });
```
- **Local Adapter:** Em `LocalAdapter.listMatches`, o array filtrado é ordenado com a mesma semântica cronológica (`scheduledTime` ASC com `nullsLast`).

### 3.2 Priorização Cronológica no Schedule Engine (`scheduleService.ts`)
- A função pura `sortScheduleMatches` foi refatorada para priorizar estritamente o horário agendado (`scheduledTime` ASC) antes de qualquer desempate por rodada:
```typescript
// 1. Horário agendado (scheduledTime) ASC — prioridade absoluta cronológica
const hasTimeA = Boolean(a.scheduledTime && a.scheduledTime.trim());
const hasTimeB = Boolean(b.scheduledTime && b.scheduledTime.trim());

if (hasTimeA && hasTimeB) {
  const timeA = new Date(a.scheduledTime).getTime();
  const timeB = new Date(b.scheduledTime).getTime();
  const validA = !Number.isNaN(timeA);
  const validB = !Number.isNaN(timeB);

  if (validA && validB && timeA !== timeB) {
    return timeA - timeB;
  }
  if (validA && !validB) return -1;
  if (!validA && validB) return 1;
} else if (hasTimeA && !hasTimeB) {
  return -1; // Com horário definido vem antes
} else if (!hasTimeA && hasTimeB) {
  return 1;
}

// 2. Rodada (round) ASC — desempate cronológico secundário quando horários coincidem ou estão ausentes
const roundA = a.round ?? 1;
const roundB = b.round ?? 1;
if (roundA !== roundB) return roundA - roundB;

// 3. Quadra (court) ASC natural
...
// 4. Número oficial do jogo (matchNumber) ASC
...
```

---

## 4. Consumo no Portal da Equipe (`TeamPortalPage.tsx`)

- No topo do componente, foi introduzido o memo canônico:
```tsx
// Partidas ordenadas cronologicamente pelo Schedule Engine Canônico
const sortedMatches = useMemo(() => sortScheduleMatches(matches), [matches]);
```
- Na renderização do grid de partidas, a iteração agora consome diretamente `sortedMatches.map((m) => { ... })`, garantindo que os atletas e comissões técnicas vejam a sequência exata de horários dos jogos da sua equipe.

---

## 5. Matriz de Homologação

| Teste / Verificação | Comando | Resultado |
|---|---|---|
| Typecheck TypeScript | `npx tsc -p tsconfig.app.json --noEmit` | **0 erros** |
| ESLint Code Quality | `npm run lint` | **0 erros** |
| Vitest Test Suite | `npm test` | **100% aprovado** (50 testes) |
| Production Build | `npm run build` | **Sucesso** |
