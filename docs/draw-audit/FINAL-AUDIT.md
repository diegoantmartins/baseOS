# BASEOS — AUDITORIA FINAL DO MÓDULO DE SORTEIO

## 1. Resumo Executivo

O módulo de sorteio do BASEOS (VolleyPro) é um sistema bem estruturado que permite a distribuição de equipes em grupos para a fase classificatória e geração automática da tabela de jogos usando o algoritmo Berger Table. O módulo suporta dois modos:

- **Random**: Sorteio puramente aleatório (com seed determinístico)
- **Seeded**: Sorteio dirigido com cabeças de chave

O código está organizado em camadas claras: serviço de negócio (`drawService.ts`), componentes de UI (`DrawPage.tsx`, `LiveDrawModal.tsx`), camada de persistência (`dataAccess.ts`) e tipos (`types/draw.ts`).

---

## 2. Arquitetura Atual

```
┌─────────────────────────────────────────┐
│         DRAW PAGE (UI)                   │
│  - DrawPage.tsx                          │
│  - LiveDrawModal.tsx                     │
└─────────────────┬─────────────────────────┘
                  │
┌─────────────────▼─────────────────────────┐
│         DRAW SERVICE (Lógica)              │
│  - drawService.ts                          │
│  - runDraw()                               │
│  - distributeTeamsIntoGroups()             │
│  - generateDrawMatches()                   │
└─────────────────┬─────────────────────────┘
                  │
┌─────────────────▼─────────────────────────┐
│      DATA ACCESS (Persistência)            │
│  - dataAccess.ts                           │
└─────────────────┬─────────────────────────┘
                  │
┌─────────────────▼─────────────────────────┐
│        SUPABASE / LOCAL STORAGE            │
│  - tabela draws                            │
└─────────────────────────────────────────┘
```

---

## 3. Arquivos Principais

| Arquivo | Responsabilidade | Importância |
|---------|------------------|-------------|
| `src/services/drawService.ts` | Motor de lógica (sorteio, distribuição, Berger) | CRÍTICO |
| `src/pages/DrawPage.tsx` | Página principal de configuração e execução | ALTO |
| `src/components/draw/LiveDrawModal.tsx` | Apresentação visual do sorteio | MÉDIO |
| `src/services/dataAccess.ts` | Persistência (saveDraw, getDrawByCompetition) | ALTO |
| `src/types/draw.ts` | Tipos TypeScript do módulo | ALTO |
| `supabase/migrations/20260819000001_draws.sql` | Schema SQL | ALTO |
| `src/test/drawService.test.ts` | Testes unitários | ALTO |

---

## 4. Sorteio Random

### Comportamento Atual

**Algoritmo:**
1. Todas as equipes são embaralhadas com Fisher-Yates usando PRNG `mulberry32`
2. Equipes são distribuídas para grupos com mais vagas disponíveis (algoritmo guloso)
3. Grupos são reordenados por seed

**Diferença do esperado:**
- O sistema é descrito como "distribuição serpentina", mas é "distribuição gulosa por capacidade"
- `headSeeds` são ignorados no modo random (movidos para pool geral)

**Determinismo:**
- Sim, mesmo seed gera resultado idêntico

**Balanceamento:**
- Sim, diferença máxima entre grupos = 1

---

## 5. Sorteio Seeded

### Comportamento Atual

**Algoritmo:**
1. Cabeças de chave são separadas e ordenadas por prioridade
2. Cabezas são distribuídas uma por grupo via `i % groupsCount` (round-robin)
3. Equipes restantes são embaralhadas e distribuídas gulosamente

**Cabeças de Chave:**
- **Máximo:** Igual ao número de grupos (limitado na UI)
- **Mínimo:** 0
- **Mais que grupos:** Distribui com `i % n` (pode haver múltiplas cabeças por grupo)
- **IDs inválidos:** Silenciosamente ignorados

**Determinismo:**
- Sim, mesmo seed gera resultado idêntico

**Ordem de Prioridade:**
- Definida pela ordem no array `headSeeds` (ímndice 0 = 1ª prioridade)

---

## 6. Seed (Semente)

### Implementação

```typescript
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### Características
- PRNG determinístico de 32 bits
- **Mesmo seed → mesma sequência de números aleatórios**
- **Seed diferente → sequência diferente** (com alta probabilidade)
- Faixa de saída: `[0, 1)`

### Uso
- Gerado aleatoriamente ao carregar a página (linha 78 de DrawPage.tsx)
- Pode ser editado manualmente
- Botão "Nova" gera novo seed

---

## 7. Distribuição em Grupos

### Fórmula de Capacidade

```typescript
function buildBalancedCapacities(total: number, groupsCount: number): number[] {
  const base = Math.floor(total / groupsCount);
  const extra = total % groupsCount;
  return Array.from({ length: groupsCount }, (_, i) => base + (i < extra ? 1 : 0));
}
```

### Exemplos

| Equipes | Grupos | Capacidade |
|---------|--------|------------|
| 8 | 2 | [4, 4] |
| 10 | 3 | [4, 3, 3] |
| 14 | 4 | [4, 4, 3, 3] |
| 17 | 4 | [5, 4, 4, 4] |

### Balanceamento Garantido
- Diferença máxima entre grupos = 1
- Sempre distribui todas as equipes

---

## 8. Berger Table (Geração de Jogos)

### Algoritmo

1. Se número de equipes é ímpar, adiciona `__BYE__`
2. Para cada rodada:
   - Emparelha `ids[i]` vs `ids[m-1-i]`
   - Roda constante: move último elemento para posição 1
3. Remove confrontos com `__BYE__`

### Fórmulas

| Propriedade | Fórmula |
|-------------|---------|
| Total de jogos | n × (n-1) / 2 |
| Total de rodadas | n-1 (par) ou n (ímpar) |
| Jogos por rodada | n/2 (par) ou (n-1)/2 (ímpar) |

### Exemplo (4 equipes: A, B, C, D)

| Rodada | Jogos |
|--------|-------|
| 1 | A vs D, B vs C |
| 2 | A vs C, D vs B |
| 3 | A vs B, C vs D |

---

## 9. Interface (DrawPage + LiveDrawModal)

### DrawPage

**Estado:**
- Configuração: `groupsCount`, `seedingMode`, `seed`, `headSeeds`
- Dados: `teams`, `groups`, `matches`
- Controle: `loading`, `saving`, `isLiveModalOpen`

**Fluxo:**
1. Carrega competições, equipes, sorteios
2. Usuário configura parâmetros
3. Clica "Realizar Sorteio" → `runDraw()` → preview
4. Opcional: drag-and-drop → atualiza preview
5. Clica "Salvar" → persiste draw + cria matches
6. Botão "Modo Apresentação" → abre LiveDrawModal

### LiveDrawModal

**Interatividade** (delega ao visualizador selecionado por feature flag):

- **Draw Arena 3D (principal)** — `DrawArenaController`:
  - Máquina de estados: `INTRO → READY → DRAWING → REVEAL → GROUP_UPDATE → COMPLETE`
  - Reveal por equipe com **~4–5s** (timing centralizado em `ANIMATION_TIMINGS` + `resolveDrawTimings`)
  - Controles de ritmo: **Pausar/Reproduzir (autoplay)**, **Avançar**, **slider de velocidade**
  - Mostra: nome/marca da equipe + grupo, urna 3D, painel de grupos
- **fallback** — `DrawScene3D`:
  - Reveal automático por equipe (urna giratória + painéis de grupo responsivos)
  - Controles: **Pausar/Reproduzir**, **Avançar**, **slider de velocidade**, **Pular animação**
  - Timing padrão `SCENE3D_REVEAL_MS` (~4s)
- Fallback seguro quando `VITE_DRAW_ARENA_3D=false` ou WebGL indisponível (sem tela vazia/erro).

---

## 10. Persistência

### Schema da Tabela `draws`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | text | PK |
| competition_id | text | FK → competitions, UNIQUE |
| config | jsonb | groupsCount, seedingMode, seed, headSeeds |
| groups | jsonb | Array de { name, teams[] } |
| matches | jsonb | Array de propostas de jogo |
| created_at | timestamptz | Timestamp |
| updated_at | timestamptz | Timestamp |

### Políticas RLS

```sql
create policy "draws_public_read" on public.draws for select using (true);
create policy "draws_auth_write" on public.draws for all to authenticated using (true) with check (true);
```

---

## 11. Integridade

### Problemas Identificados

| Problema | Severidade | Descrição |
|----------|------------|-------------|
| Estado inconsistente | CRÍTICO | Falha após salvar draw mas antes de criar todos os matches |
| Race condition | ALTO | Duplo clique pode gerar múltiplos salvatos |
| Concorrência | ALTO | Dois usuários podem sobrescrever sorteio |
| cabeças ignoradas no random | MÉDIO | Confusão do usuário |
| Documentação | MÉDIO | Termo "serpentina" está incorreto |

---

## 12. Testes

### Execução

```
✓ src/test/drawService.test.ts (17 tests) 181ms
  Tests: 17 passed
```

### Cobertura

| Função | Testes | Cobertura |
|--------|--------|-----------|
| mulberry32 | 2 | Bom |
| groupNameForIndex | 1 | Parcial |
| distributeTeamsIntoGroups | 6 | Parcial (faltam edge cases) |
| generateGroupRoundRobin | 4 | Bom |
| generateDrawMatches | 2 | Parcial |
| runDraw | 2 | Baixo |
| roundRobinMatchCount/RoundCount | Implícitos | Não testados separadamente |

### Falta de Testes

- ❌ headSeeds > groupsCount
- ❌ IDs inválidos em headSeeds
- ❌ Estado inconsistente (erro durante criação de matches)
- ❌ Concorrência
- ❌ Persistência
- ❌ Drag-and-drop
- ❌ UI

---

## 13. Divergências

| Item | Documentação | Código Real | Divergência |
|------|--------------|-------------|-------------|
| Random Mode | "distribuição aleatória" | Fisher-Yates + gulosa | ⚠️ Parcial |
| Seeded Mode | "sorteio dirigido" | heads + gulosa | ✓ Correto |
| Seed | "determinístico" | mulberry32 | ✓ Correto |
| Cabeças | "uma por grupo" | round-robin caps | ✓ Correto |
| Distribuição | "serpentina" | gulosa por capacidade | ❌ Divergente |
| Berger | "método do círculo" | implementado corretamente | ✓ Correto |

---

## 14. Problemas

| Severidade | Problema | Arquivo | Impacto |
|------------|----------|---------|---------|
| CRÍTICO | Falha parcial durante save | DrawPage.tsx | Estado corrompido |
| ALTO | Race condition (duplo clique) | DrawPage.tsx | Dados duplicados |
| ALTO | Concorrência (2 usuários) | dataAccess.ts | Perda de dados |
| MÉDIO | Documentação "serpentina" | drawService.ts | Confusão |
| MÉDIO | headSeeds ignorado no random | drawService.ts | UX confuso |
| MÉDIO | Sem validação de headSeeds | drawService.ts | Edge case |
| BAIXO | Horário artificial | DrawPage.tsx | Falta flexibilidade |
| BAIXO | matchNumber global | drawService.ts | Confusão visual |

---

## 15. O que NÃO Deve Ser Alterado

Partes que **devem ser preservadas** na próxima fase:

1. **Algoritmo Berger Table** — já está correto
2. **Tipo `DrawConfig` e `DrawResult`** — contrato estável
3. **Camada `dataAccess`** — abstração funcional
4. **Componente `LiveDrawModal`** — boa separação de apresentação
5. **Função `mulberry32`** — PRNG determinístico estável
6. **Balanceamento de capacidades** — fórmula correta

---

## 16. O Que Precisa Evoluir

Partes que **podem ser modificadas**:

1. **Documentação de algoritmo** — corrigir "serpentina" → "gulosa por capacidade"
2. **Validação de headSeeds** — adicionar no motor ou UI
3. **Transacionalidade** — agrupar save + createMatch
4. **Lock de sorteio** — proteger contra re-salvamento
5. **Horários de partidas** — sistema de agenda real
6. **Debug/Logging** — auditoria de ações

---

## 17. Pontos de Extensão

Para futura experiência 3D/visual avançada:

| Arquivo | Tipo de Extensão |
|---------|------------------|
| `drawService.ts` | Novo algoritmo de distribuição |
| `types/draw.ts` | ExtendedDrawConfig |
| `LiveDrawModal.tsx` | Substituir por Draw3DScene |
| `dataAccess.ts` | VisualState no DrawRecord |
| Novo arquivo | drawValidator.ts |

---

## 18. Arquitetura Recomendada (FUTURA)

Para experiência 3D com separação clara:

```
CONFIGURATION
     ↑ (props)
DRAW ENGINE ←→ DRAW PRESENTATION
     ↓ (result)
   PERSISTENCE
```

**Regras:**
- DrawResult é imutável após geração
- Presentation só lê, não modifica
- Extension points bem definidos

---

## 19. Comandos de Validação Executados

| Comando | Resultado | Erros | Warnings | Status |
|---------|-----------|-------|----------|--------|
| `npm run lint` | 1 erro | 1 (arquivo de backup `.antigravity`) | 0 | OK |
| `npx tsc --noEmit` | Sem erros | 0 | 0 | PASSED |
| `npm test` | 17 testes passados | 0 | 0 | PASSED |
| `npm run build` | Não executado (timeout) | - | - | PENDING |

**Nota:** O erro de lint é em um arquivo de backup/historical, não do código da aplicação.

---

## 20. Matriz Executiva

| Área | Estado Atual | Qualidade | Risco | Preservar? | Evoluir? |
|------|--------------|-----------|-------|------------|----------|
| Random | Implementado | Médio | Médio | Sim | Sim |
| Seeded | Implementado | Médio | Médio | Sim | Sim |
| Seed | Determinístico | Alto | Baixo | Sim | Não |
| Cabeças | Round-robin | Alto | Baixo | Sim | Não |
| Distribuição | Gulosa | Médio | Baixo | Parcial | Sim |
| Berger | Correto | Alto | Baixo | Sim | Não |
| Persistência | Funcional | Médio | Alto | Parcial | Sim |
| Drag-and-drop | Implementado | Médio | Médio | Sim | Sim |
| LiveDrawModal | Separado | Alto | Baixo | Sim | Sim |
| DrawPage | Completo | Médio | Médio | Sim | Sim |
| Testes | Básico | Baixo | Médio | Sim | Sim |
| Integridade | Vulnerável | Baixo | Alto | Não | Sim |

---

## 21. Próxima Fase (Fase 2)

### Objetivos

1. **Corrigir documentação** — atualizar "serpentina" → "gulosa"
2. **Implementar transacionalidade** — evitar estado inconsistente
3. **Adicionar validação de cabeças** — checar headSeeds > groupsCount
4. **Implementar lock de sorteio** — flag na competição
5. **Expandir testes** — cobrir edge cases e integração
6. **Projetar motor 3D** — separar lógica da apresentação visual

### Priorização

| Prioridade | Tarefa | Estimativa |
|------------|--------|------------|
| 1 | Corrigir documentação | 1h |
| 2 | Validação de headSeeds | 2h |
| 3 | Transacionalidade | 4h |
| 4 | Lock de sorteio | 3h |
| 5 | Testes de edge cases | 3h |
| 6 | Arquitetura 3D | 8h+ |

---

## 22. Conclusão

O módulo de sorteio do BASEOS é **funcional e bem estruturado**. A separação entre lógica de negócio e apresentação é clara, permitindo evoluções futuras. Os principais pontos de melhoria estão em:

1. **Documentação** — corrigir termos incorretos
2. **Validação** — mais robusta na camada de serviço
3. **Integridade** — transacionalidade e concorrência
4. **Testes** — cobrir edge cases e ausentes

O motor de sorteio está **pronto para evolução** com novos algoritmos de distribuição e experiências visuais 3D.

---

## Anexos

- [01-system-discovery.md](./01-system-discovery.md)
- [02-architecture.md](./02-architecture.md)
- [03-draw-page.md](./03-draw-page.md)
- [04-draw-engine.md](./04-draw-engine.md)
- [05-random-draw.md](./05-random-draw.md)
- [06-seeded-draw.md](./06-seeded-draw.md)
- [07-group-distribution.md](./07-group-distribution.md)
- [08-berger-matches.md](./08-berger-matches.md)
- [09-live-draw-ui.md](./09-live-draw-ui.md)
- [10-persistence.md](./10-persistence.md)
- [11-drag-and-drop.md](./11-drag-and-drop.md)
- [12-tests.md](./12-tests.md)
- [13-security-integrity.md](./13-security-integrity.md)
- [14-documentation-vs-code.md](./14-documentation-vs-code.md)
- [15-risks-and-problems.md](./15-risks-and-problems.md)
- [16-extension-points.md](./16-extension-points.md)