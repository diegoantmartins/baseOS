# STAGE-PERSISTENCE-MODEL: Modelo de Dados Relacional de Estágios, Rodadas e Slots

**Projeto:** BaseOS  
**Fase:** 4.5 — Auditoria e Arquitetura da Persistência do Competition Format Engine  
**Data:** 05/09/2026  
**Status:** ESPECIFICAÇÃO DE PERSISTÊNCIA CONCLUÍDA — SEM ALTERAÇÃO DE CÓDIGO  
**Workspace:** `/home/diego-martins/docker/volei`  

---

## 1. INTRODUÇÃO E OBJETIVO

Este documento especifica o modelo físico e relacional de runtime para a materialização dos contratos da Fase 4.4.1:
- `StageDefinition` $\to$ `competition_stages`
- `RoundDefinition` $\to$ `competition_rounds`
- `MatchSlot` $\to$ `competition_match_slots`
- Conexão com o evento esportivo $\to$ `matches`

O objetivo é fornecer um esquema robusto para o PostgreSQL/Supabase que elimine completamente as gambiarras de strings livres em `matches.phase` e garanta consultas de alta velocidade para o portal público e o chaveamento administrativo.

---

## 2. ESQUEMA RELACIONAL RECOMENDADO (RUNTIME DDL PROPOSTO)

### 2.1. Tabela `public.competition_stages` (Instâncias de Fases)
Armazena o estado operacional de cada fase configurada na competição.

```sql
CREATE TYPE public.stage_runtime_status AS ENUM (
  'pending',     -- Fase aguardando conclusão de etapas pré-requisito
  'in-progress', -- Fase em andamento com jogos sendo disputados
  'completed',   -- Todos os slots/jogos da fase finalizados
  'cancelled'    -- Fase cancelada
);

CREATE TABLE public.competition_stages (
  id TEXT PRIMARY KEY, -- Ex: 'stg_comp123_groups' ou UUID
  competition_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL, -- Identificador estável da config (ex: 'groups', 'play-in', 'knockout')
  name TEXT NOT NULL, -- Nome exibido (ex: 'Fase de Grupos', 'Play-in Preliminar')
  stage_order INTEGER NOT NULL, -- Ordem cronológica da fase (1, 2, 3...)
  stage_type TEXT NOT NULL, -- 'groups' | 'play-in' | 'elimination' | 'round-robin' | 'swiss'
  status public.stage_runtime_status NOT NULL DEFAULT 'pending',
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (competition_id, stage_id),
  UNIQUE (competition_id, stage_order)
);

CREATE INDEX idx_stages_competition ON public.competition_stages(competition_id);
CREATE INDEX idx_stages_status ON public.competition_stages(competition_id, status);
```

### 2.2. Tabela `public.competition_rounds` (Rodadas Canônicas da Fase)
Materializa as divisões temporais internas de uma fase (ex: "Rodada 1", "Quartas de Final", "Semifinais", "Disputa de 3º Lugar", "Final").

```sql
CREATE TYPE public.round_runtime_status AS ENUM (
  'pending',
  'in-progress',
  'completed'
);

CREATE TABLE public.competition_rounds (
  id TEXT PRIMARY KEY, -- Ex: 'rnd_comp123_knockout_qf' ou UUID
  competition_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  stage_row_id TEXT NOT NULL REFERENCES public.competition_stages(id) ON DELETE CASCADE,
  round_id TEXT NOT NULL, -- Identificador canônico da config (ex: 'r1', 'qf', 'sf', 'final')
  name TEXT NOT NULL, -- Ex: 'Quartas de Final', 'Rodada 2'
  round_order INTEGER NOT NULL, -- Sequência dentro do estágio (1, 2, 3...)
  slots_count INTEGER NOT NULL DEFAULT 0,
  status public.round_runtime_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stage_row_id, round_id),
  UNIQUE (stage_row_id, round_order)
);

CREATE INDEX idx_rounds_stage ON public.competition_rounds(stage_row_id);
```

### 2.3. Tabela `public.competition_match_slots` (Intenção Estrutural de Confronto)
Esta é a entidade-chave que resolve a limitação histórica do BaseOS: ela representa o **lugar na tabela/chave**, independente de os times já estarem decididos ou não.

```sql
CREATE TYPE public.slot_participant_status AS ENUM (
  'unresolved', -- Participante ainda não apurado (depende de jogo anterior ou ranking)
  'resolved',   -- Equipe apurada com sucesso
  'bye',        -- Avanço automático (isenção de jogo na rodada)
  'invalid'     -- Impossível resolver (ex: desistência sem substituto)
);

CREATE TABLE public.competition_match_slots (
  id TEXT PRIMARY KEY, -- Ex: 'comp123:knockout:qf:slot-1' ou UUID
  competition_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  stage_row_id TEXT NOT NULL REFERENCES public.competition_stages(id) ON DELETE CASCADE,
  round_row_id TEXT NOT NULL REFERENCES public.competition_rounds(id) ON DELETE CASCADE,
  slot_id TEXT NOT NULL, -- Identificador esportivo único no torneio (ex: 'QF-1', 'PI-3')
  position INTEGER NOT NULL, -- Posição visual na chave (1, 2, 3...)
  label TEXT, -- Ex: 'Quartas 1: 1º Geral vs Venc. Play-in 4'
  
  -- Lado A
  participant_a_reference JSONB NOT NULL, -- ParticipantReference canônico da Fase 4.4.1
  participant_a_status public.slot_participant_status NOT NULL DEFAULT 'unresolved',
  resolved_team_a_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
  
  -- Lado B
  participant_b_reference JSONB NOT NULL, -- ParticipantReference canônico da Fase 4.4.1
  participant_b_status public.slot_participant_status NOT NULL DEFAULT 'unresolved',
  resolved_team_b_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
  
  -- Vínculo com a partida física (criada quando ambos os times são conhecidos)
  match_id TEXT REFERENCES public.matches(id) ON DELETE SET NULL,
  
  -- Rotas de progressão vinculadas ao desfecho deste slot
  progression_route JSONB, -- ProgressionRoute estruturado (onWinner, onLoser)
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (competition_id, slot_id),
  UNIQUE (round_row_id, position)
);

CREATE INDEX idx_slots_competition ON public.competition_match_slots(competition_id);
CREATE INDEX idx_slots_round ON public.competition_match_slots(round_row_id);
CREATE INDEX idx_slots_team_a ON public.competition_match_slots(resolved_team_a_id);
CREATE INDEX idx_slots_team_b ON public.competition_match_slots(resolved_team_b_id);
CREATE INDEX idx_slots_match ON public.competition_match_slots(match_id);
```

---

## 3. IDENTIDADE ESTÁVEL: DETERMINÍSTICA VS UUID

### 3.1. O Problema das Chaves Artificiais Aleatórias
Em sistemas de torneio, se cada recálculo de chaveamento gerar novos UUIDs aleatórios (`gen_random_uuid()`), todas as URLs salvas, referências de rotas (`targetSlotId`) e integrações externas perdem a sincronia.

### 3.2. Estratégia Adotada: Identidade Hierárquica Estável (Slugs Compostos Canônicos)
Para manter total integridade e rastreabilidade visual, adota-se um padrão de ID determinístico com fallback UUID:

```text
Formato de Identificador Estável:
  Stage:       {competition_id}:stage:{stage_id}
  Round:       {competition_id}:{stage_id}:round:{round_id}
  Match Slot:  {competition_id}:{stage_id}:{round_id}:slot:{position}
```

Exemplo Real no Formato Voltz:
- Stage Play-in: `comp-voltz-2026:stage:play-in`
- Round Play-in 1: `comp-voltz-2026:play-in:round:preliminar`
- Slot Play-in 1: `comp-voltz-2026:play-in:preliminar:slot:1` (5º vs 12º)
- Slot Quartas 1: `comp-voltz-2026:knockout:qf:slot:1` (1º Geral vs Vencedor Play-in 4)

**Benefício Inestimável:** Qualquer função de progressão pode referenciar o alvo como uma string determinística, sem depender de lookups adicionais no banco.

---

## 4. CICLO DE VIDA (LIFECYCLE) DAS ENTIDADES

```text
                   ESTÁGIO (STAGE)
   [pending] ──(pré-requisitos concluídos)──► [in-progress]
                                                    │
                                         (todos os slots concluídos)
                                                    │
                                                    ▼
                                               [completed]
```

### Regras de Transição de Estado:
1. **Transição `pending` $\to$ `in-progress`:**
   - Ocorre automaticamente quando todos os estágios em `dependsOnStageIds` atingem o status `'completed'`.
   - Dispara a resolução dos feeds de participantes (`ParticipantResolutionEngine`).
2. **Transição de Slot `unresolved` $\to$ `resolved`:**
   - Ocorre no momento exato em que a fonte do participante (seja um ranking prévio ou uma partida anterior) se torna homologada.
   - `resolved_team_id` é preenchido com o ID real da equipe na tabela `teams`.
3. **Disparo da Criação da Partida (`Match`):**
   - Quando tanto `participant_a_status` quanto `participant_b_status` atingem `'resolved'`, o sistema aciona a transação de agendamento de partida, preenchendo a FK `match_id` no slot.

---

## 5. AUDITORIA DE INTEGRIDADE E POLÍTICAS DE DELEÇÃO

O que acontece se uma etapa for excluída ou redefinida? A arquitetura impõe regras restritivas para garantir a integridade histórica:

| Operação de Deleção | Política de Integridade | Justificativa Esportiva |
|---|---|---|
| **Deleção de Competição** | `CASCADE` | Limpeza completa dos dados se o torneio for apagado da lixeira. |
| **Deleção de Stage sem jogos disputados** | `CASCADE` | Permite que o organizador ajuste a grade antes do torneio iniciar. |
| **Deleção de Stage com partidas finalizadas** | `RESTRICT` (Bloqueada) | **Regra Absoluta:** O banco rejeita DML com erro. Não é permitido apagar uma fase que já possui súmulas homologadas. |
| **Deleção de Partida vinculada a Slot** | `SET NULL` no slot | Preserva o slot estrutural, marcando a partida como pendente de reagendamento. |
| **Tentativa de alterar equipe em Slot com jogo em andamento** | `RESTRICT` | Impede fraudes ou corrupção durante a execução de partidas ao vivo. |

---

## 6. AUDITORIA DE CONCORRÊNCIA E PREVENÇÃO DE CONFLITOS

### Cenário 1: Encerramento Simultâneo de Jogos de Play-in
- Jogo PI-1 e Jogo PI-2 terminam no mesmo segundo.
- Ambos tentam propagar seus vencedores para a chave de Quartas de Final.
- **Mecanismo de Proteção:** Cada slot possui sua própria linha na tabela `competition_match_slots`. A transação executa:
  ```sql
  UPDATE public.competition_match_slots
  SET resolved_team_a_id = p_winner_id, participant_a_status = 'resolved'
  WHERE id = p_target_slot_id AND participant_a_status = 'unresolved';
  ```
  O lock do PostgreSQL em nível de linha (*row-level lock*) garante atomicidade perfeita sem interferência mútua.

### Cenário 2: Re-sorteio de Fase por Organizadores Concorrentes
- Dois administradores tentam re-sortear a fase de grupos ao mesmo tempo.
- **Mecanismo de Proteção:** A RPC atômica `save_stage_draw_and_slots` obtém um `SELECT FOR UPDATE` no registro da fase (`competition_stages`), garantindo que apenas uma transação prossiga e a segunda falhe graciosamente por detecção de concorrência.
