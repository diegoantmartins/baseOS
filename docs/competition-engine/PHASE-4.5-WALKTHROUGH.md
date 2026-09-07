# PHASE-4.5-WALKTHROUGH: Relatório Executivo e Certificação da Fase 4.5

**Projeto:** BaseOS  
**Fase:** 4.5 — Auditoria e Arquitetura da Persistência do Competition Format Engine  
**Data:** 05/09/2026  
**Modo:** AUDITORIA + ARQUITETURA — SEM IMPLEMENTAÇÃO  
**Workspace:** `/home/diego-martins/docker/volei`  
**Status da Certificação:** **APROVADA — ARQUITETURA DEFINIDA**  

---

## 1. RESUMO EXECUTIVO DA FASE

A Fase 4.5 cumpriu integralmente sua missão de auditar a camada de persistência do BaseOS (PostgreSQL, Supabase, `dataAccess.ts`, migrations e serviços de chaveamento) e projetar a arquitetura definitiva para suportar múltiplos formatos esportivos, múltiplos estágios, confrontos com equipes ainda indefinidas, BYEs e rotas de progressão sem recorrer a equipes fictícias (`TBD`) e sem deformar o domínio esportivo construído nas Fases 4.1 a 4.4.1.

Em estrita obediência às regras da fase, **nenhum código de produção foi alterado, nenhuma migration foi executada e nenhum schema de banco foi modificado**.

---

## 2. BASELINE OBRIGATÓRIO DE QUALIDADE

Antes de qualquer conclusão, todos os comandos canônicos de verificação foram executados e registrados:

| Verificação | Comando | Resultado | Status |
|---|---|---|---|
| **Git Working Tree** | `git status --short` | Limpo no início dos trabalhos | ✅ Aprovado |
| **Histórico Git** | `git log -5 --oneline` | Head em `a9e42ac` (Walkthrough Fase 4.4.1) | ✅ Aprovado |
| **TypeScript** | `npx tsc -p tsconfig.app.json --noEmit` | 0 erros | ✅ Aprovado |
| **Vitest** | `npm test` | 86 arquivos, 710 testes aprovados, 0 falhas | ✅ Aprovado |
| **ESLint** | `npm run lint` | 0 erros, 1 aviso pré-existente (`DrawArenaCanvas.tsx`) | ✅ Aprovado |
| **Build de Produção** | `npm run build` | Bundle gerado com sucesso pelo Vite em 60s | ✅ Aprovado |

---

## 3. ARQUIVOS E MIGRATIONS AUDITADAS

### 3.1. Migrations PostgreSQL (`supabase/migrations/`)
Foram auditadas todas as 17 migrations do banco:
- `20260818000000_initial_schema.sql` (Schema de `matches`, `teams`, `competitions`, RLS)
- `20260819000000_venues_logos_phases.sql` (Colunas `phase` e `group_name` em `matches`)
- `20260819000001_draws.sql` e `20260829000001_draws_status.sql` (Tabela `draws`)
- `20260903000001_competition_lifecycle_and_rules.sql` (`config` e `rules_snapshot` em `competitions`)
- `20260904000001_audit_logs.sql` (`audit_logs`)
- `20260905000001_lifecycle_enum_sync.sql` e `20260905000002_legacy_status_migration.sql` (Lifecycle de competições)
- `20260905000003_rls_portal_security.sql` e `20260905000005_competition_slug_and_views.sql` (RLS e Slugs)

### 3.2. Serviços de Persistência e Consumidores
- `src/services/dataAccess.ts` (1390 linhas: queries, adapters, `saveDrawWithMatches`)
- `src/services/playoffsService.ts` (414 linhas: geração de slots, IDs `TBD`, avanço hardcoded)
- `src/services/competitionBracketService.ts` (210 linhas: checagens de integridade)
- `src/services/publicCompetitionService.ts` (424 linhas: DTOs públicos)
- `src/pages/MatchesPage.tsx` (linhas 380-440: persistência de playoffs e inferência de grupos)
- `src/components/competition/TournamentBracket.tsx` (componente visual de bracket)
- `src/lib/pdf/matchSheetPdf.ts` (geração de súmulas oficiais em PDF)

---

## 4. PRINCIPAIS ACHADOS DA AUDITORIA (FINDINGS)

| ID | Severidade | Problema Identificado | Impacto no Domínio |
|---|---|---|---|
| **PERSIST-001** | **CRITICAL** | `matches.team_a_id` e `team_b_id` são `NOT NULL REFERENCES teams(id)` | Impede fisicamente persistir jogos cujas equipes dependem de fases anteriores (Play-in, Quartas). |
| **PERSIST-002** | **CRITICAL** | `saveDrawWithMatches` executa 3 requisições REST sem transação | Falhas de rede após o DELETE apagam partidas sem gravar as novas. |
| **PERSIST-003** | **HIGH** | `matches.phase` e `group_name` são textos livres sobrecarregados | Heurísticas de string frágeis (`'classificatoria'`, `'quartas'`) quebram chaveamento. |
| **PERSIST-004** | **HIGH** | Inexistência de entidade de Grupo no banco | Equipes não possuem vínculo com grupos; sistema deduz grupo lendo partidas disputadas. |
| **PERSIST-005** | **HIGH** | `draws` possui unique constraint em `competition_id` | Impede múltiplos sorteios em torneios com fases independentes. |
| **PERSIST-006** | **CRITICAL** | Código legado gera IDs falsos (`TBD-A-1`) | Dispara violação de FK no Supabase/PostgreSQL real. |
| **PERSIST-007** | **HIGH** | Avanço de mata-mata hardcoded para 4 ou 2 grupos | Impede Play-in, repescagens, formatos com BYEs ou brackets de 8/16 equipes. |
| **PERSIST-008** | **MEDIUM** | RLS de `matches` permite mutação a qualquer usuário autenticado | Gestor de equipe pode alterar partidas de terceiros via API direta. |

---

## 5. ARQUITETURA ESCOLHIDA: MODELO HÍBRIDO (ALTERNATIVA C)

Após comparar exaustivamente o **Modelo Documental Puro (Alternativa A)**, o **Modelo Relacional Puro (Alternativa B)** e o **Modelo Híbrido (Alternativa C)**:

### Por que a Alternativa C foi aprovada?
1. **Preserva `CompetitionConfig` como SSOT:** As regras esportivas e a estrutura do torneio residem de forma declarativa e imutável no JSONB de configuração.
2. **Runtime Relacional de Alta Performance:** Cria tabelas físicas enxutas (`competition_stages`, `competition_rounds`, `competition_match_slots`) para rastrear o estado dos confrontos e permitir consultas rápidas e ordenadas no PostgreSQL.
3. **Separação Rígida Match Slot $\ne$ Match:** O `MatchSlot` representa o lugar na chave (suportando participantes desconhecidos ou BYEs), enquanto o `Match` representa o evento esportivo com data, hora, local e súmula.
4. **Zero Equipes Fantasmas:** Participantes desconhecidos mantêm `resolved_team_id = NULL` e referências estruturadas em JSONB. BYEs não geram equipes falsas no banco.
5. **Transações Atômicas Seguras:** Operações de sorteio e propagação passam a ser executadas via RPCs transacionais no PostgreSQL (`save_stage_draw_and_slots` e `rpc_propagate_slot_outcome`).

---

## 6. PROVAS ARQUITETURAIS CONCEITUAIS (CASOS DE TESTE 1 A 8)

Sem alterar nenhum teste de produção, verificou-se conceitualmente a capacidade do modelo em representar todos os cenários exigidos:

### Caso 1: Torneio Voltz (12 Equipes, 4 Grupos, Play-in, Quartas, Semis, Final)
- **Stage 1 (groups):** 4 grupos $\times$ 3 equipes. Classificação gera ranking intergrupos (1º ao 12º).
- **Stage 2 (play-in):** 4 slots gerados via estratégia `high-low`:
  - Slot PI-1: 5º Geral vs 12º Geral.
  - Slot PI-2: 6º Geral vs 11º Geral.
  - Slot PI-3: 7º Geral vs 10º Geral.
  - Slot PI-4: 8º Geral vs 9º Geral.
- **Stage 3 (knockout - quartas):** 4 slots gerados:
  - QF-1: 1º Geral vs Vencedor PI-4.
  - QF-2: 4º Geral vs Vencedor PI-1.
  - QF-3: 2º Geral vs Vencedor PI-3.
  - QF-4: 3º Geral vs Vencedor PI-2.
- **Resultado da Prova:** O modelo híbrido persiste essa estrutura perfeitamente: os 4 melhores colocados já têm seus IDs resolvidos nas Quartas, enquanto os 4 adversários aguardam a homologação do Play-in, com zero equipes falsas.

### Caso 2: 6 Equipes (2 Grupos $\times$ 3, Semifinais e Final)
- **Stage 1 (groups):** 2 grupos $\times$ 3 equipes.
- **Stage 2 (knockout):**
  - Semifinal 1: 1º do Grupo A vs 2º do Grupo B.
  - Semifinal 2: 1º do Grupo B vs 2º do Grupo A.
  - Final: Vencedor Semifinal 1 vs Vencedor Semifinal 2.
- **Resultado da Prova:** 100% suportado por referências do tipo `group-position` e `match-winner`.

### Caso 3: 8 Equipes (Knockout Direto)
- **Stage 1 (knockout):** Bracket de 8 times, 3 rodadas (Quartas, Semis, Final).
- **Participantes Iniciais:** Feeds do tipo `seed` (1 a 8) emparelhados por `bracket-by-seed` (1x8, 4x5, 2x7, 3x6).
- **Resultado da Prova:** Dispensa fase de grupos e opera nativamente como estágio eliminatório único.

### Caso 4: 5 Equipes (Bracket de 8 Slots com 3 BYEs)
- **Slots de Quartas:**
  - QF-1: Seed 1 vs `type: 'bye'` $\to$ **Seed 1 avança direto para Semifinal 1**.
  - QF-2: Seed 4 vs Seed 5 $\to$ Jogo disputado em quadra.
  - QF-3: Seed 2 vs `type: 'bye'` $\to$ **Seed 2 avança direto para Semifinal 2**.
  - QF-4: Seed 3 vs `type: 'bye'` $\to$ **Seed 3 avança direto para Semifinal 2**.
- **Resultado da Prova:** Os slots com BYE não criam partidas na tabela `matches`. O `GenericProgressionEngine` propaga automaticamente as equipes isentas para as semifinais, sem criar times falsos.

### Caso 5: Winner of Match X $\to$ Match Y
- Suportado nativamente via rota de progressão: `ProgressionRoute { sourceSlotId: 'X', onWinner: { targetSlotId: 'Y', targetSide: 'A' } }`.

### Caso 6: Overall Ranking #5 $\to$ Match Slot
- Suportado nativamente via referência: `{ type: 'overall-ranking', stageId: 'groups', position: 5 }`.

### Caso 7: Group A Position #1 $\to$ Match Slot
- Suportado nativamente via referência: `{ type: 'group-position', stageId: 'groups', groupIndex: 0, position: 1 }`.

### Caso 8: Winner Play-in 1 $\to$ Quarterfinal
- Suportado nativamente via referência: `{ type: 'match-winner', slotId: 'PI-1' }`.

---

## 7. RESPOSTA ÀS 18 PERGUNTAS DO CRITÉRIO DE SUCESSO

1. **Como persistir Stage?**  
   Na tabela relacional `competition_stages`, vinculada a `competitions(id)`, com status de runtime (`pending`, `in-progress`, `completed`).
2. **Como persistir Round?**  
   Na tabela relacional `competition_rounds`, vinculada a `competition_stages(id)`, com ordem e contagem de slots.
3. **Como persistir Match Slot?**  
   Na tabela relacional `competition_match_slots`, contendo posição visual, referências dos lados A e B, e FK opcional para `matches`.
4. **Como persistir Participant Reference?**  
   Como coluna JSONB estruturada (`participant_a_reference`, `participant_b_reference`) utilizando os 8 tipos canônicos da Fase 4.4.1.
5. **Como persistir BYE?**  
   Como referência explícita `{ type: 'bye' }` com status `'bye'` e `resolved_team_id = NULL`. Jamais como equipe na tabela `teams`.
6. **Como persistir Winner/Loser progression?**  
   Como rotas declarativas em `competition_match_slots.progression_route` (`onWinner`, `onLoser`).
7. **Como separar Slot de Match?**  
   O Slot é o nó estrutural no grafo de fases; o Match é o evento esportivo com data/hora/árbitros gerado quando os participantes estão aptos.
8. **Como preservar CompetitionConfig como SSOT?**  
   Todas as regras esportivas e o desenho do torneio residem em `competitions.config`. As tabelas relacionais armazenam apenas estado operacional.
9. **Como preservar CanonicalMatchResult?**  
   O resultado canônico continua sendo apurado em memória pelo `CompetitionRulesService` a partir de `matches.sets` e alimenta a classificação e progressão.
10. **Como manter compatibilidade com competições antigas?**  
    Através de migração incremental (Etapa 3 de backfill) que mapeia torneios legados como estágios virtuais sem alterar o histórico de jogos.
11. **Como proteger com RLS?**  
    Leitura pública para transparência; escrita e mutação restritas estritamente para `organizer` e `admin`.
12. **Onde são necessárias transações?**  
    Em `save_stage_draw_and_slots` (RPC atômica de sorteio) e `rpc_propagate_slot_outcome` (propagação atômica de vencedores).
13. **Como impedir referências inválidas?**  
    Validação de DAG em memória pelo `StageGraphEngine` antes de salvar, somada a constraints de checagem no banco.
14. **Como impedir ciclos?**  
    Ordenação topológica no engine e constraints no PostgreSQL impedindo auto-progressão.
15. **Como impedir equipes fictícias?**  
    FKs `resolved_team_a_id` e `resolved_team_b_id` são anuláveis (`NULL`), permitindo slots pendentes sem violar integridade.
16. **Como versionar/congelar formato?**  
    Através de `competitions.rules_snapshot`, congelado imutavelmente quando a primeira partida do torneio é iniciada.
17. **Como migrar sem quebrar o BaseOS?**  
    Estratégia *Nullable-first* seguida de criação de tabelas novas, preservando a tabela `matches` existente intacta.
18. **Como o Voltz é representado sem código específico para Voltz?**  
    Pura parametrização em `CompetitionConfig`: 1 estágio de grupos + 1 estágio de play-in com emparelhamento `high-low` + 1 estágio de mata-mata. Zero linhas `if (voltz)`.

---

## 8. DOCUMENTAÇÃO TÉCNICA PRODUZIDA NA FASE 4.5

Todos os artefatos foram criados no repositório em `docs/competition-engine/`:
1. `docs/competition-engine/PHASE-4.5-AUDIT.md` (Auditoria completa do banco, schema e blockers PERSIST-001 a PERSIST-008)
2. `docs/competition-engine/PERSISTENCE-ARCHITECTURE.md` (Arquitetura Híbrida C, Config vs Runtime, SSOT e Diagrama Alvo)
3. `docs/competition-engine/STAGE-PERSISTENCE-MODEL.md` (DDL de estágios, rodadas, slots e ciclo de vida)
4. `docs/competition-engine/PARTICIPANT-REFERENCE-PERSISTENCE.md` (Persistência dos 8 tipos de referência e eliminação de times fantasmas)
5. `docs/competition-engine/PROGRESSION-PERSISTENCE.md` (Rotas de avanço, transação PostgreSQL e rollback de súmula)
6. `docs/competition-engine/MIGRATION-STRATEGY.md` (Rollout incremental sem big-bang e plano de contingência)
7. `docs/competition-engine/PHASE-4.5-WALKTHROUGH.md` (Este documento consolidado)

---

## 9. O QUE NÃO FOI IMPLEMENTADO NESTA FASE

Em rigorosa obediência ao regulamento da Fase 4.5:
- Nenhuma migration foi aplicada ao banco de dados Supabase.
- Nenhuma tabela física foi criada ou alterada.
- Nenhuma política de RLS foi modificada.
- Nenhum serviço (`dataAccess.ts`, `playoffsService.ts`) foi alterado.
---

## 10. FECHAMENTO DO GATE TÉCNICO PRÉ-IMPLEMENTAÇÃO (REVISÃO CRÍTICA 9,2/10)

Em atendimento à revisão crítica pré-implementação, os 6 pontos fundamentais foram esclarecidos e vinculados à arquitetura:

1. **Identidade Lógica vs Física:**
   - `id`: PK física do banco (`TEXT` / UUID).
   - `competition_id + stage_id`: Identidade lógica natural e única do estágio.
   - `stage_row_id + round_id`: Identidade lógica natural da rodada.
   - `competition_id + slot_id`: Identidade esportiva global do slot no torneio (`UNIQUE (competition_id, slot_id)`).
2. **Blindagem do JSONB (`ParticipantReference`):**
   - Defesa em profundidade em camadas:
     `UI` $\to$ `Validação de Domínio` $\to$ `TypeScript/Zod` $\to$ `dataAccess` $\to$ `RPC (validações PL/pgSQL próprias)` $\to$ `PostgreSQL CHECK constraints`.
   - As RPCs nunca dependem da validação do frontend; elas possuem suas próprias verificações SQL/PLpgSQL.
   - CHECK constraints no PostgreSQL validam os 8 tipos canônicos (`resolved-team`, `group-position`, `overall-ranking`, `stage-position`, `match-winner`, `match-loser`, `seed`, `bye`).
3. **Hierarquia de Verdade (`SSOT` vs `Intenção Estrutural` vs `Projeção`):**
   - `CompetitionConfig` / `rules_snapshot`: **Único SSOT** das regras esportivas e estrutura declarativa.
   - `MatchSlot.participant_reference`: **Fonte da verdade da intenção estrutural** do participante no slot.
   - `resolved_team_id`: **Projeção / materialização** do participante resolvido (anulável para FK, índices e JOINs rápidos).
   - Em caso de rollback ou retificação de súmula, `resolved_team_id` volta para `NULL`, sem perder a intenção estrutural do participante.
4. **Relação `MatchSlot` $\to$ `Match` (`match_id`):**
   - O slot existe antes da partida. `match_id` é FK anulável preenchida apenas quando os participantes estiverem apurados e o jogo for agendado. BYEs nunca possuem `match_id`.
5. **Protocolo para `TBD-*` Legados:**
   - Proibição estrita de cadastrar `TBD-*` em `teams` ou em `resolved_team_id`.
   - Conversão de registros legados com `TBD` em slots com `resolved_team_id = NULL` e `status = 'unresolved'`.
6. **O Papel de `draws` e sua Unicidade:**
   - `draws` representa o rito operacional inicial de alocação de potes em grupos/sementes.
   - Fases seguintes operam por emparelhamento determinístico do `PairingEngine`.
   - A constraint de `draws` é atualizada para `UNIQUE (competition_id, stage_id)`, permitindo sorteios secundários ao vivo se o regulamento exigir.

---

## 11. SEQUÊNCIA RECOMENDADA PARA AS PRÓXIMAS FASES

```text
Fase 4.5: Auditoria e Arquitetura da Persistência (CONCLUÍDA)
   ↓
Gate Técnico 4.5: Fechamento das Invariantes e Refinamentos (CONCLUÍDO)
   ↓
Fase 4.6: Schema + Persistence Foundation (DDL, Constraints, Indexes, RLS, Repositories, Testes de Integração)
   ↓
Fase 4.7: RPCs Transacionais + Security (save_stage_draw_and_slots, rpc_propagate_slot_outcome com validação PL/pgSQL)
   ↓
Fase 4.8: Runtime Integration (Conexão do GenericProgressionEngine e Stage Runtime com a Persistência)
   ↓
Fase 4.9: Bracket Engine + UI (TournamentBracket genérico e Draw Arena multi-fases)
   ↓
Fase 4.10: Format Builder e Presets de Formatos (incluindo template Voltz genérico)
   ↓
Fase 4.11: Testes E2E de Integração e Homologação Final
```

---

## 12. CERTIFICAÇÃO FINAL DA FASE 4.5

> ### **STATUS: APROVADA — ARQUITETURA DEFINIDA, COM GATE TÉCNICO CONCLUÍDO**
>
> A Fase 4.5 atendeu a 100% dos requisitos estipulados. Os bloqueadores físicos do schema legado foram desvendados e mapeados, a arquitetura de persistência híbrida foi formalmente desenhada e comprovada, os 6 pontos do gate técnico foram resolvidos e o caminho para a implementação da Fase 4.6 está pavimentado com integridade matemática e segurança relacional.

