# GATE-4.5-TECHNICAL-REVIEW: Fechamento Técnico Pré-Implementação da Persistência

**Projeto:** BaseOS  
**Fase:** 4.5 — Gate Técnico Pré-Implementação  
**Data:** 05/09/2026  
**Status:** REVISÃO TÉCNICA CONCLUÍDA — DIRETRIZES VINCULANTES PARA FASE 4.6  
**Workspace:** `/home/diego-martins/docker/volei`  

---

## 1. OBJETIVO DO GATE TÉCNICO

Esta revisão técnica formaliza o fechamento dos 6 pontos críticos levantados na auditoria e homologação da Fase 4.5, estabelecendo **regras de ouro vinculantes** para a implementação física da Fase 4.6 (Schema DDL, Migrations, Repositório de Persistência e RPCs).

---

## 2. FECHAMENTO DOS 6 PONTOS CRÍTICOS

### 🔴 PONTO 1: IDENTIDADE LÓGICA VS IDENTIDADE FÍSICA (`stage_id`, `round_id`, `slot_id`)

#### A Definição Rígida:
- **`id` (Físico):** Chave primária artificial (`PRIMARY KEY TEXT` ou UUID) utilizada internamente pelo banco para relacionamentos e foreign keys com integridade referencial.
- **`stage_id`, `round_id`, `slot_id` (Lógico/Domínio):** Identificadores estáveis declarados na `CompetitionConfig` e consumidos pelo domínio esportivo, URLs e navegação.

#### Esquema de Chaves Naturais e Unicidade no Banco:
```sql
-- 1. STAGE: Identidade única por competição
TABLE competition_stages (
  id TEXT PRIMARY KEY,                       -- Ex: 'stg_comp1_groups' (ou UUID)
  competition_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,                    -- Ex: 'groups', 'play-in', 'knockout'
  UNIQUE (competition_id, stage_id)          -- IDENTIDADE LÓGICA
);

-- 2. ROUND: Identidade única por fase
TABLE competition_rounds (
  id TEXT PRIMARY KEY,                       -- Ex: 'rnd_comp1_ko_qf' (ou UUID)
  competition_id TEXT NOT NULL,
  stage_row_id TEXT NOT NULL REFERENCES competition_stages(id),
  round_id TEXT NOT NULL,                    -- Ex: 'r1', 'qf', 'sf', 'final'
  UNIQUE (stage_row_id, round_id)            -- IDENTIDADE LÓGICA
);

-- 3. MATCH SLOT: Identidade esportiva globalmente única dentro da competição
TABLE competition_match_slots (
  id TEXT PRIMARY KEY,                       -- Ex: 'slot_comp1_qf1' (ou UUID)
  competition_id TEXT NOT NULL,
  stage_row_id TEXT NOT NULL REFERENCES competition_stages(id),
  round_row_id TEXT NOT NULL REFERENCES competition_rounds(id),
  slot_id TEXT NOT NULL,                     -- Ex: 'QF-1', 'PI-1', 'FINAL-1'
  position INTEGER NOT NULL,
  UNIQUE (competition_id, slot_id),          -- IDENTIDADE LÓGICA GLOBAL NO TORNEIO
  UNIQUE (round_row_id, position)            -- ORDEM VISUAL NO ROUND
);
```

**Regra Vinculante:**
1. Rota de progressão aponta para o identificador lógico determinístico: `targetSlotId: 'QF-1'`.
2. A resolução é indexada e resolvida diretamente por `(competition_id, slot_id)`, sem ambiguidade entre torneios distintos.

---

### 🔴 PONTO 2: BLINDAGEM DO JSONB DE `participant_reference`

O armazenamento em JSONB não pode ser uma brecha para payloads arbitrários ou corrompidos (`{"foo": "bar"}`).

#### Camada 1: Validação por CHECK Constraint no PostgreSQL
A migration DDL da Fase 4.6 implementará constraints rígidas no PostgreSQL validando os 8 tipos canônicos da Fase 4.4.1:

```sql
ALTER TABLE public.competition_match_slots
  ADD CONSTRAINT chk_slot_participant_a_type CHECK (
    participant_a_reference ? 'type' AND
    (participant_a_reference->>'type') IN (
      'resolved-team', 'group-position', 'overall-ranking', 
      'stage-position', 'match-winner', 'match-loser', 'seed', 'bye'
    )
  ),
  ADD CONSTRAINT chk_slot_participant_b_type CHECK (
    participant_b_reference ? 'type' AND
    (participant_b_reference->>'type') IN (
      'resolved-team', 'group-position', 'overall-ranking', 
      'stage-position', 'match-winner', 'match-loser', 'seed', 'bye'
    )
  );
```

#### Camada 2: Validação Defesa em Profundidade (Application & RPC)
A integridade não depende exclusivamente do frontend nem do banco isolado. Segue a esteira estrita:
`UI` $\to$ `Domain Validation` $\to$ `TypeScript/Zod` $\to$ `dataAccess` $\to$ `RPC (validações SQL/PLpgSQL próprias)` $\to$ `PostgreSQL CHECK constraints`.

As RPCs no PostgreSQL contêm suas próprias verificações imperativas em PL/pgSQL e nunca assumem que receberam dados válidos do cliente.
- `resolved-team` exige `teamId: string`.
- `group-position` exige `stageId: string`, `groupIndex: number`, `position: number`.
- `overall-ranking` exige `stageId: string`, `position: number`.
- `match-winner` / `match-loser` exige `slotId: string`.
- `seed` exige `seedNumber: number`.
- `bye` não aceita campos espúrios.

---

### 🔴 PONTO 3: HIERARQUIA DE VERDADE (`CompetitionConfig` SSOT vs `MatchSlot.participant_reference` vs `resolved_team_id`)

#### A Regra Arquitetural:
- **SSOT das Regras e Estrutura Declarativa:** `CompetitionConfig` e seu snapshot imutável `competitions.rules_snapshot`. Não existe uma segunda fonte de verdade concorrente.
- **Fonte da Verdade da Intenção Estrutural do Participante:** `MatchSlot.participant_reference` (JSONB).
  Registra fielmente a intenção no slot: *"Esta vaga pertence ao Vencedor de Quartas 1"*. Essa intenção semântica **nunca é apagada**.
- **Projeção / Materialização Derivada:** `resolved_team_a_id` e `resolved_team_b_id`.
  O ID da equipe é uma **materialização de cálculo** mantida para indexação rápida, queries relacionais (`JOIN teams`) e integridade referencial com a tabela de equipes reais.

```text
CompetitionConfig / rules_snapshot (SSOT Único de Regras e Estrutura)
                               │
                               ▼
MatchSlot.participant_reference (Fonte de Verdade da Intenção Estrutural do Participante)
                               │
                               ▼ (Cálculo determinístico via CanonicalMatchResult)
resolved_team_id (Projeção / Materialização Derivada anulável)
```

#### Implicação Crítica para Rollback e Correções de Súmula:
Se a súmula da partida de Quartas 1 for anulada ou corrigida no tapetão:
1. A referência `participant_b_reference` continua sendo `{ type: 'match-winner', slotId: 'QF-1' }` (intenção estrutural intacta).
2. A projeção `resolved_team_b_id` é revertida para `NULL` e `status = 'unresolved'`.
3. Quando o novo resultado for apurado, `resolved_team_b_id` é atualizado novamente para o novo vencedor, **sem perder a história de como a equipe chegou até ali**.

---

### 🔴 PONTO 4: RELAÇÃO ESTRITA `MatchSlot` $\to$ `Match` (`match_id`)

#### A Distinção Funcional:
- `MatchSlot`: Existe a partir do momento em que a fase é criada. Representa a **vaga na chave/tabela**.
- `Match`: O **evento esportivo da partida** (data, hora, local, quadra, árbitros, súmula de mesa).
- `match_id` no Slot: Chave estrangeira anulável (`REFERENCES public.matches(id) ON DELETE SET NULL`).

```text
MatchSlot (Criado no Planejamento)
    ├── slot_id: 'QF-1'
    ├── participant_a: { type: 'overall-ranking', position: 1 } (Resolvido: 'team-1')
    ├── participant_b: { type: 'match-winner', slotId: 'PI-4' }  (Pendente: NULL)
    └── match_id: NULL  <-- Não existe partida ainda!
           │
           ▼ (Play-in 4 termina, time 2 é apurado)
    ├── participant_b: Resolvido ('team-2')
    └── match_id: 'match_qf_1'  <-- Partida física gerada no calendário esportivo!
```

#### Regras:
1. Se um slot for um `BYE`, `match_id` permanece `NULL` para sempre (BYE não gera jogo).
2. Se uma partida agendada for remarcada ou cancelada, a exclusão da partida dá `SET NULL` em `match_id`, preservando o slot estrutural intacto.

---

### 🔴 PONTO 5: ESTRATÉGIA EXPLÍCITA PARA OS IDs LEGADOS `TBD-*`

A auditoria provou que o código legado gerava strings literais como `'TBD-A-1'` e as passava no campo `teamAId`.

#### Protocolo de Migração e Limpeza para Fase 4.6:
1. **Regra de Entrada:**
   Sob nenhuma circunstância o sistema ou as migrations permitirão inserir strings `'TBD-*'` na tabela `teams` ou nas novas colunas `resolved_team_a_id` / `resolved_team_b_id`.
2. **Algoritmo de Normalização de Partidas Legadas:**
   Durante o backfill / migração das competições existentes:
   ```typescript
   function sanitizeLegacyTeamId(rawId?: string | null): string | null {
     if (!rawId) return null;
     if (/^TBD/i.test(rawId)) return null; // Elimina TBD-A-1, TBD-B-1
     if (rawId.startsWith('__')) return null; // Elimina marcadores fictícios
     return rawId;
   }
   ```
3. **Mapeamento para MatchSlot:**
   - Se `sanitizeLegacyTeamId(match.teamAId) === null`:
     - O slot é criado com `resolved_team_a_id = NULL`.
     - `participant_a_status = 'unresolved'`.
     - `participant_a_reference` recebe a semântica correspondente (ex: lida de `match.teamAName` ou deduzida pela fase eliminatória).
   - Se for um ID real de time:
     - `resolved_team_a_id = match.teamAId`.
     - `participant_a_status = 'resolved'`.
     - `participant_a_reference = { type: 'resolved-team', teamId: match.teamAId }`.

---

### ⚠️ PONTO 6: O PAPEL DE `draws` E SUA UNICIDADE

#### O Significado Esportivo de `Draw`:
- Um **Draw (Sorteio)** é o **rito operacional inicial de distribuição estocástica/manual de equipes em grupos ou posições de cabeça de chave**.
- Fases subsequentes (como Play-in, Quartas e Semifinais) operam por **cruzamento determinístico pré-fixado em regulamento** (ex: 1º vs 2º, 5º vs 12º) via `GenericPairingEngine`, **NÃO sendo um sorteio**.

#### Decisão Arquitetural para o Banco:
1. **Não remover o conceito de Draw:** A tabela `draws` continua sendo a entidade oficial que registra o rito do sorteio, potes, restrições geográficas e auditoria da cerimônia.
2. **Escopo por Estágio:**
   A constraint única em `draws` deve ser atualizada de:
   ```sql
   -- DE:
   UNIQUE (competition_id)
   -- PARA:
   UNIQUE (competition_id, stage_id)
   ```
3. **Por que isso é a decisão correta?**
   - Na maioria dos torneios (incluindo Voltz), existe apenas 1 sorteio: para o Estágio 1 (Fase de Grupos). Os estágios seguintes (Play-in e Mata-mata) são gerados pelo `PairingEngine` sem necessidade de novo sorteio.
   - Porém, caso um torneio específico tenha um segundo sorteio ao vivo (ex: sorteio dos confrontos das Quartas de Final após os grupos), o BaseOS estará preparado para registrar esse segundo sorteio vinculado a `stage_id = 'knockout'`, com total rastreabilidade histórica.

---

## 3. CHECKLIST PARA A EXECUÇÃO DA FASE 4.6

Com esses 6 pontos formalmente fechados e documentados, a Fase 4.6 pode ser autorizada para execução dos seguintes entregáveis práticos:

- [ ] **Migration 1:** Nullable-first em `public.matches.team_a_id` e `team_b_id`.
- [ ] **Migration 2:** DDL das tabelas `competition_stages`, `competition_rounds`, `competition_match_slots` com constraints de validação de `ParticipantReference`.
- [ ] **Migration 3:** Atualização de `draws` para `UNIQUE(competition_id, stage_id)`.
- [ ] **Data Access Layer:** Implementação dos métodos de leitura/escrita tipados em `src/services/dataAccess.ts`.
- [ ] **Backfill Script:** Sanitização de `TBD-*` legados e geração de slots para competições antigas.
- [ ] **Testes de Integração:** Suíte de testes em `src/test/` validando o repositório de persistência.

---

## 4. CONCLUSÃO E HOMOLOGAÇÃO DO GATE 4.5

> **STATUS DO GATE: HOMOLOGADO E CONCLUÍDO**
> 
> As ambiguidades entre IDs físicos e lógicos foram extintas; o JSONB foi blindado com checagem de tipos estrita; a hierarquia entre SSOT semântico e projeção materializada foi estabelecida; e a estratégia para sanear os dados legados sem poluir o PostgreSQL está matematicamente definida.
