# BASEOS — FASE 4.6: IMPLEMENTAÇÃO DA FUNDAÇÃO DE PERSISTÊNCIA DO COMPETITION FORMAT ENGINE

**Projeto:** BaseOS  
**Fase:** 4.6  
**Status:** CONCLUÍDA  
**Data:** 05/09/2026  
**Ambiente:** Linux (Docker / Local / Supabase Client)  
**Baseline de Testes:** 86 arquivos, 710 testes (100% pass)  
**Validação Final:** 87 arquivos, 745 testes (100% pass, 0 falhas)  
**TypeScript:** 0 erros  
**ESLint:** 0 erros (1 warning preexistente)  
**Build:** Vite build sucesso (1m 3s)

---

## 1. OBJETIVO DA FASE 4.6

Construir e homologar a fundação de persistência relacional do novo Competition Format Engine do BaseOS, composta por:
1. DDL relacional no PostgreSQL/Supabase (`competition_stages`, `competition_rounds`, `competition_match_slots`).
2. Integridade referencial estrita, constraints de unicidade lógica e checks estruturais em JSONB.
3. Índices de alta seletividade para consultas e lookups relacionais.
4. Políticas de segurança em nível de linha (RLS) alinhadas ao modelo de autorização do BaseOS.
5. Adaptação simétrica da camada de persistência central (`src/services/dataAccess.ts`) para `localStorageAdapter` e `supabaseAdapter`.
6. Validação profunda no nível TypeScript impedindo a inserção de equipes fantasmas (`TBD`, `__BYE__`, `UNKNOWN`).
7. Suíte de testes de integração e persistência garantindo zero regressões.

---

## 2. ESCOPO IMPLEMENTADO vs. NÃO IMPLEMENTADO

### Escopo Implementado (Fase 4.6):
- [x] Schema DDL de runtime relacional (`competition_stages`, `competition_rounds`, `competition_match_slots`).
- [x] Enums nativos PostgreSQL para status de runtime e resolução.
- [x] Constraints de integridade (`UNIQUE(competition_id, stage_id)`, `UNIQUE(competition_id, stage_order)`, `UNIQUE(stage_row_id, round_id)`, `UNIQUE(stage_row_id, round_order)`, `UNIQUE(competition_id, slot_id)`, `UNIQUE(round_row_id, position)`).
- [x] CHECK constraints estruturais no JSONB para os 8 tipos canônicos de `ParticipantReference`.
- [x] RLS policies restritivas para as novas tabelas (leitura pública, escrita restrita a organizadores/administradores autenticados).
- [x] Métodos de repositório no `dataAccess.ts` para Stages, Rounds e MatchSlots em ambos os adaptadores (`localStorage` e `Supabase`).
- [x] Proteção anti-equipes artificiais (`isArtificialTeamId`, rejeitando `TBD*`, `__BYE*`, etc.).
- [x] Suíte de 33 testes unitários e de integração (`src/test/stagePersistenceRepository.test.ts`).
- [x] 2 novos testes de validação de adapter Supabase (`src/test/dataAccessAdapter.test.ts`).

### Escopo Fora da Fase 4.6 (Posteriores):
- **Fase 4.7**: RPCs transacionais PL/pgSQL (`save_stage_draw_and_slots`, `rpc_propagate_slot_outcome`), locks transacionais, auditoria de segurança global.
- **Fase 4.8**: Integração operacional do `genericProgressionEngine` e transição do `playoffsService`.
- **Fase 4.9**: Reformulação visual do `TournamentBracket` e Draw Arena multi-fases.
- **Fase 4.10**: Format Builder declarativo e presets esportivos.
- **Fase 4.11**: Homologação operacional End-to-End pré-release.

---

## 3. ARQUIVOS MODIFICADOS E CRIADOS

| Arquivo | Ação | Descrição |
| :--- | :--- | :--- |
| `supabase/migrations/20260905000006_competition_format_runtime.sql` | [NOVO] | DDL, Enums, Constraints, Índices e RLS das 3 novas tabelas |
| `src/lib/supabaseClient.ts` | [MODIFICADO] | Adicionadas `competitionStages`, `competitionRounds`, `competitionMatchSlots` a `SUPABASE_TABLES` |
| `src/types/entities.ts` | [MODIFICADO] | Tipos TypeScript: `StageRecord`, `RoundRecord`, `MatchSlotRecord`, enums de status |
| `src/services/dataAccess.ts` | [MODIFICADO] | Repository CRUD, validação de ParticipantReference, proteção anti-TBD, seeds e clear |
| `src/test/stagePersistenceRepository.test.ts` | [NOVO] | 33 testes de persistência, unicidade, BYE, unknown participants e isolamento |
| `src/test/dataAccessAdapter.test.ts` | [MODIFICADO] | Mock do query builder atualizado e testes para SupabaseAdapter com Stages e Slots |

---

## 4. HIERARQUIA DE VERDADE E DECISÕES ARQUITETURAIS

1. **CompetitionConfig / rules_snapshot como Único SSOT**:
   Nenhuma regra esportiva ou configuração de chaveamento foi duplicada nas tabelas relacionais de runtime. As tabelas `competition_stages`, `competition_rounds` e `competition_match_slots` atuam estritamente como estado de execução estrutural (runtime tracking).
2. **Separação Rígida entre MatchSlot e Match**:
   - `MatchSlot`: representa a vaga estrutural e a intenção de cruzamento (`participant_reference`). Pode existir sem participantes conhecidos (`resolved_team_id = NULL`) e sem partida criada (`match_id = NULL`).
   - `Match`: representa o evento esportivo concreto. Suas colunas `team_a_id` e `team_b_id` permanecem `NOT NULL`, preservando intacto todo o ecossistema legado de súmulas, arbitragem e placares.
3. **Zero Equipes Fantasmas**:
   Eliminada a necessidade de criar registros falsos como `TBD-A-1` ou `__BYE__` na tabela `teams`. Participantes não definidos são mantidos como `resolved_team_id = NULL` com `ParticipantReference` indicando a regra de proveniência (`match-winner`, `overall-ranking`, etc.). BYE é representado canonicamente por `{ type: 'bye' }` com status `'bye'` e `resolved_team = NULL`.
4. **Resolução Materializada**:
   `resolved_team_a_id` e `resolved_team_b_id` são projeções derivadas que facilitam JOINs, queries e indexação sem suplantar o `participant_reference`.

---

## 5. LIMITAÇÕES RECONHECIDAS DA FASE 4.6

1. **Sem Atomicidade em Multi-Slots (Postergada para 4.7)**:
   A criação e atualização de múltiplos slots ocorrem via chamadas de repositório individuais. A garantia ACID transacional (all-or-nothing em nível de banco de dados com rollback) será implementada na Fase 4.7 através de RPCs PL/pgSQL dedicadas.
2. **Sem Propagação de Resultados Operacional (Postergada para 4.8)**:
   A resolução automática de slots subsequentes a partir do encerramento de partidas não está conectada ao fluxo operacional. O motor puro existe (Fase 4.4.1), mas a orquestração runtime pertence à Fase 4.8.
3. **Legado Operacional Preservado**:
   A interface de sorteio (`DrawPage.tsx`) e o chaveamento visual (`playoffsService.ts`) continuam utilizando o modelo pré-existente até as Fases 4.8 e 4.9.
