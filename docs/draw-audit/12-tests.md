# 12 — Auditoria de Testes

## Arquivo: `src/test/drawService.test.ts` (199 linhas)

## Framework: Vitest 3.2.4

## Configuração

```typescript
// src/test/drawService.test.ts
import { describe, expect, it } from 'vitest';
import {
  distributeTeamsIntoGroups,
  generateDrawMatches,
  generateGroupRoundRobin,
  groupNameForIndex,
  mulberry32,
  roundRobinMatchCount,
  roundRobinRoundCount,
  runDraw,
} from '@/services/drawService';
```

## Classificação dos Testes

### UNIT TESTS
Todos os testes existentes são **unitários** — testam funções puras isoladamente.

**Não há:**
- Testes de integração
- Testes de UI (componentes)
- Testes de banco de dados
- Testes E2E

## Cobertura Existente

### mulberry32 (2 testes)

```typescript
describe('mulberry32', () => {
  it('é determinístico: mesmo seed produz a mesma sequência', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produz valores entre 0 e 1', () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
```

**Cobre:**
- ✓ Determinismo
- ✓ Range de saída [0, 1)

**NÃO cobre:**
- Distribuição estatística (uniformidade)
- Sensibilidade a seeds similares

---

### groupNameForIndex (1 teste)

```typescript
describe('groupNameForIndex', () => {
  it('gera nomes de grupo em sequência alfabética', () => {
    expect(groupNameForIndex(0)).toBe('Grupo A');
    expect(groupNameForIndex(1)).toBe('Grupo B');
    expect(groupNameForIndex(3)).toBe('Grupo D');
  });
});
```

**Cobre:**
- ✓ Sequência A, B, D

**NÃO cobre:**
- Mais de 26 grupos (overflow)

---

### distributeTeamsIntoGroups (6 testes)

```typescript
describe('distributeTeamsIntoGroups', () => {
  it('distribui as equipes de forma balanceada (2 grupos para 6 equipes)', () => { ... });
  it('equipes com números ímpares deixa grupos com diferença de no máximo 1', () => { ... });
  it('modo seeded: cabeças de chave ficam uma por grupo', () => { ... });
  it('modo seeded sem cabeças de chave distribui tudo aleatoriamente e balanceado', () => { ... });
  it('é determinístico: mesma semente gera o mesmo sorteio', () => { ... });
  it('sementes diferentes geram sorteios diferentes (alta probabilidade)', () => { ... });
});
```

**Cobre:**
- ✓ Balanceamento básico
- ✓ Diferença máxima de 1 com ímpares
- ✓ Cabeças uma por grupo (2 cabeças, 2 grupos)
- ✓ Modo seeded sem cabeças
- ✓ Determinismo
- ✓ Sementes diferentes (probabilístico)

**NÃO cobre:**
- ❌ headSeeds > groupsCount (overflow)
- ❌ headSeeds com IDs inválidos
- ❌ headSeeds duplicados
- ❌ Modo random com headSeeds (cabeças ignoradas?)
- ❌ Distribuição 8/3, 10/3, 14/4, 17/4
- ❌ Grupo vazio (0 equipes)
- ❌ 1 equipe (mínimo viável)
- ❌ groupsCount > total (clamping)
- ❌ groupsCount = 1

---

### generateGroupRoundRobin (4 testes)

```typescript
describe('generateGroupRoundRobin', () => {
  it('cada dupla joga uma única vez (turno único)', () => { ... });
  it('nenhuma equipe enfrenta a si mesma', () => { ... });
  it('com número par de equipes gera n-1 rodadas com n/2 jogos', () => { ... });
  it('com número ímpar de equipes uma fica de folga por rodada', () => { ... });
});
```

**Cobre:**
- ✓ Cada dupla joga uma vez (4 equipes)
- ✓ Sem confronto consigo mesmo (5 equipes)
- ✓ Par: n-1 rodadas, n/2 jogos (6 equipes)
- ✓ Ímpar: n rodadas (5 equipes)

**NÃO cobre:**
- ❌ Grupo com 2 equipes (mínimo)
- ❌ Grupo com 1 equipe (edge case)
- ❌ Grupo vazio (0 equipes)
- ❌ Berger Table para 8+ equipes
- ❌ Distribuição de BYE (qual equipe folga em qual rodada)
- ❌ Continuidade de matchNumber entre grupos

---

### generateDrawMatches (2 testes)

```typescript
describe('generateDrawMatches', () => {
  it('gera jogos com fase, grupo e numeração sequencial', () => { ... });
  it('contagem de jogos por equipe confere com a fórmula', () => { ... });
});
```

**Cobre:**
- ✓ Fase configurada
- ✓ Numeração sequencial
- ✓ Associação a grupo
- ✓ Total de jogos = soma de roundRobinMatchCount por grupo

**NÃO cobre:**
- ❌ matchNumber entre grupos
- ❌ Phase customizada (não 'classificatória')
- ❌ Grupos vazios
- ❌ Ordem dos jogos (qual grupo vem primeiro)

---

### runDraw (2 testes)

```typescript
describe('runDraw', () => {
  it('executa o sorteio completo da competição', () => { ... });
  it('respeita os limites de rodadas e jogos', () => { ... });
});
```

**Cobre:**
- ✓ Execução completa (6 equipes, 2 grupos, seeded, 2 cabeças)
- ✓ Limites de rodadas e jogos

**NÃO cobre:**
- ❌ Múltiplas competições
- ❌ Validação de headSeeds
- ❌ Consistência com modo random
- ❌ Re-execução com mesma seed

## Resumo de Cobertura

| Categoria | Cobertura | Status |
|-----------|-----------|--------|
| **mulberry32** | 2/2 aspectos principais | ✓ Boa |
| **groupNameForIndex** | 1/2 casos | ⚠️ Parcial |
| **distributeTeamsIntoGroups** | 6/15+ cenários | ⚠️ Parcial |
| **generateGroupRoundRobin** | 4/8+ casos | ⚠️ Parcial |
| **generateDrawMatches** | 2/6+ cenários | ⚠️ Parcial |
| **runDraw** | 2/8+ cenários | ⚠️ Parcial |
| **Edge cases** | 0/10+ | ❌ Ausente |
| **Integração** | 0/5+ | ❌ Ausente |
| **UI** | 0 | ❌ Ausente |
| **Persistência** | 0 | ❌ Ausente |

## O Que EXISTE (Testado)

✓ PRNG determinístico
✓ Nomes de grupos A, B, D
✓ Balanceamento com pares e ímpares
✓ Cabeças uma por grupo (2/2)
✓ Modo seeded vs random (parcialmente)
✓ Determinismo do sorteio
✓ Sementes diferentes (probabilístico)
✓ Berger Table básico
✓ Confrontos únicos
✓ Total de jogos = fórmula n(n-1)/2
✓ Rodadas para pares e ímpares
✓ Sem confronto consigo mesmo
✓ Numeração sequencial
✓ Fase configurada

## O Que NÃO EXISTE (Não Testado)

### distributeTeamsIntoGroups
- ❌ headSeeds > groupsCount
- ❌ headSeeds com IDs inválidos/inexistentes
- ❌ headSeeds duplicados
- ❌ 8 equipes / 3 grupos
- ❌ 10 equipes / 3 grupos
- ❌ 14 equipes / 4 grupos
- ❌ 16 equipes / 4 grupos
- ❌ 17 equipes / 4 grupos
- ❌ 0 equipes
- ❌ 1 equipe
- ❌ groupsCount > total (clamping)
- ❌ groupsCount = 1
- ❌ Modo random com headSeeds (cabeças devem ser ignoradas)
- ❌ Ordem final por seed (normalização)

### generateGroupRoundRobin
- ❌ 2 equipes (mínimo)
- ❌ 1 equipe (edge case)
- ❌ 0 equipes (early return)
- ❌ 8+ equipes
- ❌ Sequência específica do BYE (qual equipe folga)

### generateDrawMatches
- ❌ matchNumber global entre múltiplos grupos
- ❌ Phase customizada
- ❌ Grupos vazios
- ❌ Ordem dos grupos (qual é processado primeiro)

### runDraw
- ❌ Múltiplas competições diferentes
- ❌ Validação de entrada
- ❌ Re-execução com mesma seed
- ❌ Consistência com drag-and-drop

### Integração
- ❌ DrawPage + dataAccess
- ❌ Drag-and-drop + generateDrawMatches
- ❌ LiveDrawModal + groups

### UI
- ❌ Renderização da DrawPage
- ❌ Interação com checkboxes
- ❌ Botões de salvar
- ❌ Loading states

### Persistência
- ❌ saveDraw (insert)
- ❌ saveDraw (update)
- ❌ getDrawByCompetition (found)
- ❌ getDrawByCompetition (not found)
- ❌ listDraws (todos)
- ❌ listDraws (filtrado)

## Testes Faltantes Críticos

1. **headSeeds > groupsCount** — comportamento indefinido documentado
2. **IDs inválidos em headSeeds** — falha silenciosa
3. **Modo random com headSeeds** — comportamento de "cabeças ignoradas" não verificado
4. **Edge cases de groupsCount** (0, 1, > total)
5. **Total de 0 equipes** — caso limite
6. **Testes de persistência** — essencial para produção

## Recomendações para FASE 2

1. Adicionar testes para edge cases
2. Adicionar testes de integração (dataAccess + drawService)
3. Adicionar testes de UI (componentes)
4. Considerar testes E2E para fluxo completo
5. Adicionar testes de regressão para bugs conhecidos
