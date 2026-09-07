# 03 — Auditoria da DrawPage

## Arquivo: `src/pages/DrawPage.tsx` (657 linhas)

## Visão Geral

A `DrawPage` é o componente principal de UI para configuração e execução do sorteio. É uma página complexa com múltiplos estados, configuração de sorteio, preview, drag-and-drop e integração com a camada de persistência.

## Imports Relevantes

```typescript
// Componentes UI
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

// Serviços
import { dataAccess } from '@/services/dataAccess';
import { runDraw, roundRobinMatchCount, roundRobinRoundCount, generateDrawMatches } from '@/services/drawService';

// Tipos
import { suggestGroupsCount } from '@/types/draw';
import type { DrawConfig, DrawGroup, DrawMatchProposal, DrawRecord } from '@/types/draw';
import type { CompetitionRecord, MatchRecord, TeamRecord } from '@/types/entities';
import type { CompetitionTeam } from '@/types/registration';
```

## Carregamento de Dados

### Função `refresh()` (linha 117)

```typescript
const refresh = useCallback(async () => {
  const [comps, teams, cts, ms, draws] = await Promise.all([
    dataAccess.listCompetitions(),
    dataAccess.listTeams(),
    dataAccess.listCompetitionTeams(),
    dataAccess.listMatches(),
    dataAccess.listDraws(),
  ]);
  // ... atribui aos estados
  const firstId = routeCompetitionId ?? comps[0]?.id ?? '';
  setSelectedId(firstId);
  const draw = draws.find(d => d.competitionId === firstId) ?? null;
  setExistingDraw(draw);
  setLoading(false);
}, [routeCompetitionId]);
```

**Observações:**
- Carregamento paralelo com `Promise.all`
- Filtra sorteio existente pela competição selecionada
- Se há `competitionId` na URL, usa como competição inicial
- Caso contrário, seleciona a primeira competição

## Definição de Equipes Inscritas

```typescript
const registeredTeams = useMemo(() => {
  if (!selected) return [];
  const cts = competitionTeams.filter(
    ct => ct.competitionId === selected.id && ct.status !== 'rejected'
  );
  return cts
    .map(ct => teams.find(t => t.id === ct.teamId))
    .filter((t): t is TeamRecord => Boolean(t));
}, [selected, competitionTeams, teams]);
```

**Observações:**
- Considera apenas `CompetitionTeam` com status diferente de `rejected`
- Acessa `TeamRecord` via lookup

## Cálculo de Jogos Estimados

```typescript
const registeredMatchCount = useMemo(() => {
  if (!selected || registeredTeams.length < 2) return 0;
  const perGroup = Math.ceil(registeredTeams.length / groupsCount);
  return roundRobinMatchCount(perGroup) * Math.min(groupsCount, registeredTeams.length);
}, [selected, registeredTeams, groupsCount]);
```

## Drag-and-Drop (linha 88-115)

```typescript
const handleGroupDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  const currentGroups = preview?.groups ?? existingDraw?.groups ?? null;
  if (!over || !currentGroups) return;
  
  const teamId = String(active.id);
  const targetGroupName = String(over.id);
  
  // ... lógica de mover equipe entre grupos
  const newMatches = generateDrawMatches(newGroups);
  setPreview({ groups: newGroups, matches: newMatches });
};
```

**Observações:**
- Funciona tanto no `preview` quanto no `existingDraw`
- Após mover, regenera automaticamente a tabela de jogos

## Execução do Sorteio (linha 166-175)

```typescript
const handleRunDraw = () => {
  if (!selected || !canDraw) return;
  const result = runDraw(selected, registeredTeams, {
    groupsCount,
    seedingMode,
    seed,
    headSeeds: seedingMode === 'seeded' ? headSeeds : [],
  });
  setPreview({ groups: result.groups, matches: result.matches });
};
```

## Persistência (linha 177-235)

```typescript
const handleSaveDraw = async () => {
  if (!selected || !preview) return;
  setSaving(true);
  try {
    await dataAccess.saveDraw({
      competitionId: selected.id,
      config: { groupsCount, seedingMode, seed, headSeeds: ... },
      groups: preview.groups,
      matches: preview.matches,
    });
    
    // Remove jogos antigos da fase classificatória
    const oldMatches = matches.filter(
      m => m.competitionId === selected.id && 
      (m.phase === 'classificatória' || m.phase === 'classificatoria'),
    );
    if (oldMatches.length > 0) {
      await dataAccess.deleteMatches(oldMatches.map(m => m.id));
    }
    
    // Cria novos jogos
    const baseDate = selected.startDate ?? new Date().toISOString().slice(0, 10);
    const venueName = selected.venue ?? 'Ginásio Municipal';
    for (let i = 0; i < savedMatches.length; i++) {
      const proposal = savedMatches[i];
      // ... cria MatchRecord
    }
    
    setSaving(false);
    toast.success('Sorteio salvo e jogos gerados!');
    await refresh();
  } catch (error) {
    setSaving(false);
    toast.error('Erro ao salvar o sorteio.');
  }
};
```

**Observações:**
- Substitui TODOS os jogos antigos da fase classificatória
- Gera horários básicos (9h + (i % 8)) — horário artificial
- Cria jogos em loop sequencial
- Não há validação de conflitos de horário

## Configuração da UI

### Slider de Número de Grupos (linha 300-319)

```typescript
<Select value={String(groupsCount)} onValueChange={v => {
  const count = Number(v);
  setGroupsCount(count);
  setHeadSeeds(prev => prev.slice(0, count));
  setPreview(null);
}}>
  {/* opções de 1 a Math.min(8, registeredTeams.length) */}
</Select>
```

### Modo de Sorteio (linha 327-347)

```typescript
<RadioGroup value={seedingMode} onValueChange={v => {
  setSeedingMode(v as DrawConfig['seedingMode']);
  setPreview(null);
}}>
  <RadioGroupItem value="seeded" /> {/* Sorteio dirigido */}
  <RadioGroupItem value="random" />  {/* Sorteio puro */}
</RadioGroup>
```

### Cabeças de Chave (linha 349-381)

```typescript
{seedingMode === 'seeded' && (
  <div>
    {registeredTeams.map(team => (
      <label>
        <Checkbox
          checked={headSeeds.includes(team.id)}
          disabled={headSeeds.includes(team.id) && headSeeds.indexOf(team.id) >= groupsCount}
          onCheckedChange={checked => {
            setHeadSeeds(prev => {
              const next = checked ? [...prev, team.id] : prev.filter(id => id !== teamId);
              return next.slice(0, groupsCount);
            });
            setPreview(null);
          }}
        />
        {team.name}
      </label>
    ))}
  </div>
)}
```

**Observações:**
- Limita cabeças a `groupsCount` (1 por grupo)
- Não há indicação visual de ordem de prioridade
- Apenas IDs são armazenados

## Validação de Sorteio

```typescript
const canDraw = (registeredTeams.length >= 2 && 
                 groupsCount >= 1 && 
                 groupsCount <= registeredTeams.length);
```

**Observações:**
- Validação mínima: apenas verifica contagens
- Não valida se `headSeeds` está correto
- Não valida restrições de equipes

## Tratamento de Erros

```typescript
try {
  // ... operação
  setSaving(false);
  toast.success('Sorteio salvo e jogos gerados!');
  await refresh();
} catch (error) {
  console.error(error);
  setSaving(false);
  toast.error('Erro ao salvar o sorteio.');
}
```

**Observações:**
- Captura genérica de erro
- Apenas console.error
- Toast.error para o usuário

## Estrutura Visual

```
┌─────────────────────────────────────────────────┐
│ PageHeader: "Sorteio e Chaveamento"             │
├──────────────────┬──────────────────────────────┤
│                  │                              │
│  Card            │   Resultado do Sorteio        │
│  Configuração    │   - Grid de Grupos (DnD)      │
│  (sidebar)       │   - Tabela de Jogos           │
│                  │   - Botão Live Modal          │
│  - Nº grupos     │                              │
│  - Modo          │                              │
│  - Cabeças       │                              │
│  - Seed          │                              │
│  - Botões        │                              │
│                  │                              │
└──────────────────┴──────────────────────────────┘
```

## Componentes Filhos

| Componente | Definição | Linhas |
|------------|-----------|--------|
| `DroppableGroupCard` | Card de grupo (drop zone) | 574-613 |
| `DraggableTeamRow` | Linha de equipe (draggable) | 615-655 |

## Pontos de Atenção

1. **Falta de Loading State Detalhado**: Apenas `loading` booleano
2. **Validação Mínima**: Não valida regras complexas
3. **Geração de Horários Artificial**: Loop simples (9h + i % 8)
4. **Não Recarrega Após Erro**: Estado pode ficar inconsistente
5. **Sem Validação de headSeeds Duplicados**: Embora UI limite, código pode ser burlado
