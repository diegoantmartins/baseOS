# BASEOS — MODELO DE PERSISTÊNCIA DO COMPETITION FORMAT ENGINE

**Documento:** PERSISTENCE-IMPLEMENTATION.md  
**Fase:** 4.6  
**Status:** HOMOLOGADO  
**Data:** 05/09/2026  

---

## 1. HIERARQUIA E RELACIONAMENTOS DO MODELO

A persistência do novo Competition Format Engine organiza-se em quatro níveis relacionais estritamente normalizados:

```text
competitions (UUID/Text PK)
   │
   └── competition_stages (id PK, competition_id FK)
         │
         └── competition_rounds (id PK, stage_row_id FK, competition_id FK)
               │
               └── competition_match_slots (id PK, round_row_id FK, stage_row_id FK, competition_id FK)
                     ├── participant_a_reference (JSONB) ──► resolved_team_a_id (FK teams.id, NULLABLE)
                     ├── participant_b_reference (JSONB) ──► resolved_team_b_id (FK teams.id, NULLABLE)
                     ├── progression_route (JSONB, NULLABLE)
                     └── match_id (FK matches.id, NULLABLE)
```

---

## 2. A DISTINÇÃO FUNDAMENTAL: MatchSlot vs. Match

A auditoria da Fase 4.5 identificou que tentar forçar chaveamentos e vagas indeterminadas diretamente dentro da tabela `matches` gera severas distorções no domínio, incluindo a necessidade de criar equipes falsas (`TBD-A-1`, `__BYE__`) para contornar a obrigatoriedade de `matches.team_a_id` e `matches.team_b_id` serem `NOT NULL`.

A arquitetura aprovada resolve este desafio separando rigorosamente:

| Dimensão | `MatchSlot` (Vaga Estrutural) | `Match` (Evento Esportivo) |
| :--- | :--- | :--- |
| **Definição** | "Existe uma vaga de confronto nesta rodada/fase que deve ser preenchida de acordo com determinadas regras". | "Existe um jogo concreto agendado entre duas equipes reais". |
| **Participantes Conhecidos** | Não obrigatório. Podem ser `unresolved` (ex.: "vencedor do Jogo 1"). | **Obrigatório**. `team_a_id` e `team_b_id` devem apontar para equipes reais. |
| **Participante BYE** | Suportado nativamente (`participant_reference = { type: 'bye' }`). | Não existe partida para BYE (`match_id = NULL`). |
| **Ciclo de Vida** | Criado no momento da definição da chave / estágio. | Criado apenas quando ambos os participantes estiverem materializados. |
| **Equipes Fantasmas** | **Zero**. `resolved_team_id` permanece `NULL` até a resolução. | Nenhuma equipe artificial é inserida na tabela `teams`. |
| **Estatísticas e Súmula** | Não se aplica. | Pontuações, sets, árbitros, súmulas e auditoria residem aqui. |

---

## 3. IDENTIDADE FÍSICA vs. IDENTIDADE LÓGICA

Para garantir integridade idempotente e permitir reconstrução determinística sem colisões, cada entidade possui uma identidade física (Primary Key técnica) e uma identidade lógica natural garantida por constraint única:

### 3.1 Estágios (`competition_stages`)
- **Identidade Física:** `id` (ex.: `stage-uuid` ou `stage-timestamp-hash`).
- **Identidade Lógica:** `competition_id + stage_id`.
  - Exemplo: `(comp-001, "group-stage")`, `(comp-001, "knockout")`.
  - Constraint: `UNIQUE (competition_id, stage_id)`.
- **Ordem Sequencial:** `competition_id + stage_order`.
  - Constraint: `UNIQUE (competition_id, stage_order)`.

### 3.2 Rodadas (`competition_rounds`)
- **Identidade Física:** `id` (ex.: `round-uuid`).
- **Identidade Lógica:** `stage_row_id + round_id`.
  - Exemplo: `(stage-row-1, "quarterfinals")`, `(stage-row-1, "semifinals")`.
  - Constraint: `UNIQUE (stage_row_id, round_id)`.
- **Ordem Sequencial:** `stage_row_id + round_order`.
  - Constraint: `UNIQUE (stage_row_id, round_order)`.

### 3.3 Slots de Confronto (`competition_match_slots`)
- **Identidade Física:** `id` (ex.: `slot-uuid`).
- **Identidade Lógica:** `competition_id + slot_id`.
  - Exemplo: `(comp-001, "SLOT-QF-01")`, `(comp-001, "SLOT-FINAL")`.
  - Constraint: `UNIQUE (competition_id, slot_id)`.
- **Posicionamento na Rodada:** `round_row_id + position`.
  - Constraint: `UNIQUE (round_row_id, position)`.

---

## 4. O PARTICIPANT REFERENCE (JSONB ESTRUTURADO)

O `participant_reference` armazena a regra abstrata de proveniência do concorrente para cada lado da disputa (Lado A e Lado B).

### Os 8 Tipos Canônicos Homologados:
1. **`resolved-team`**: Equipe já conhecida desde o chaveamento.
   ```json
   { "type": "resolved-team", "teamId": "team-osasco", "teamName": "Osasco" }
   ```
2. **`group-position`**: Classificado por posição dentro de um grupo específico.
   ```json
   { "type": "group-position", "stageId": "group-stage", "groupIndex": 0, "position": 1 }
   ```
3. **`overall-ranking`**: Classificado pelo ranking geral intergrupos da fase anterior.
   ```json
   { "type": "overall-ranking", "stageId": "group-stage", "position": 5, "filter": "group-runners-up-only" }
   ```
4. **`stage-position`**: Classificado por posição absoluta em estágio anterior.
   ```json
   { "type": "stage-position", "stageId": "play-in", "position": 1 }
   ```
5. **`match-winner`**: Vencedor de um confronto de slot anterior.
   ```json
   { "type": "match-winner", "slotId": "SLOT-QF-01" }
   ```
6. **`match-loser`**: Perdedor de um confronto anterior (disputa de 3º lugar ou repescagem).
   ```json
   { "type": "match-loser", "slotId": "SLOT-SF-01" }
   ```
7. **`seed`**: Cabeça de chave baseado no chaveamento inicial.
   ```json
   { "type": "seed", "seedNumber": 1 }
   ```
8. **`bye`**: Folga regulamentar na rodada.
   ```json
   { "type": "bye" }
   ```

---

## 5. POLÍTICA DE ZERO EQUIPES FANTASMAS (TBD / BYE)

É expressamente proibido persistir equipes fictícias como `TBD`, `TBD-A-1`, `__BYE__` ou `UNKNOWN` na tabela `teams`.

1. **Quando o participante ainda não foi determinado:**
   - `participant_a_reference`: contém a regra de proveniência (ex.: `match-winner`).
   - `participant_a_status`: `'unresolved'`.
   - `resolved_team_a_id`: `NULL`.
   - `match_id`: `NULL`.
2. **Quando o participante é BYE:**
   - `participant_b_reference`: `{ "type": "bye" }`.
   - `participant_b_status`: `'bye'`.
   - `resolved_team_b_id`: `NULL`.
   - `match_id`: `NULL`.
3. **Validação Automática:**
   Tanto a função `isArtificialTeamId` no repositório TypeScript quanto as CHECK constraints do PostgreSQL rejeitam categoricamente qualquer tentativa de passar identificadores fictícios.
