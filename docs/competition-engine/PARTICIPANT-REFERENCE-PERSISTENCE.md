# PARTICIPANT-REFERENCE-PERSISTENCE: Persistência e Resolução de Referências de Participantes

**Projeto:** BaseOS  
**Fase:** 4.5 — Auditoria e Arquitetura da Persistência do Competition Format Engine  
**Data:** 05/09/2026  
**Status:** ESPECIFICAÇÃO DE PERSISTÊNCIA CONCLUÍDA — SEM ALTERAÇÃO DE CÓDIGO  
**Workspace:** `/home/diego-martins/docker/volei`  

---

## 1. O PRINCÍPIO INVIOLÁVEL: SEM EQUIPES FANTASMAS

A auditoria da Fase 4.5 revelou que o código legado recorria a gambiarras perigosas no arquivo `src/services/playoffsService.ts`:
```typescript
teamAId: teamA?.id ?? `TBD-A-${slot.matchIndex}`,
teamBId: teamB?.id ?? `TBD-B-${slot.matchIndex}`,
```
Essa abordagem de inventar IDs fictícios (`TBD-A-1`, `__WINNER__`, `__BYE__`) é **ESTRITAMENTE PROIBIDA** no BaseOS.

### 1.1. Razões Técnicas e Esportivas:
1. **Corrupção de Chave Estrangeira:** A tabela `public.matches` possui `FOREIGN KEY (team_a_id) REFERENCES public.teams(id)`. Criar IDs inventados dispara exceção `23503` (Foreign Key Violation) no PostgreSQL.
2. **Poluição Cadastral:** Inserir registros fictícios na tabela `teams` polui relatórios, estatísticas de equipes, buscas no portal e cadastros oficiais.
3. **Ambiguidade Semântica:** Não permite diferenciar se o time é desconhecido porque o jogo anterior ainda não acabou, se é uma vaga de folga (BYE) ou se houve erro de chaveamento.

---

## 2. OS 8 TIPOS DE PARTICIPANT REFERENCE NO BANCO

No modelo recomendado, a intenção de quem deve ocupar uma vaga em um `MatchSlot` é persistida na coluna JSONB `participant_a_reference` e `participant_b_reference` da tabela `competition_match_slots`, utilizando a união discriminada estrita validada na Fase 4.4.1:

```typescript
export type ParticipantReference =
  | { type: 'resolved-team'; teamId: string; teamName?: string }
  | { type: 'group-position'; stageId: string; groupIndex: number; position: number }
  | { type: 'overall-ranking'; stageId: string; position: number; filter?: 'group-winners-only' | 'group-runners-up-only' | 'non-winners' | 'all' }
  | { type: 'stage-position'; stageId: string; position: number }
  | { type: 'match-winner'; slotId: string }
  | { type: 'match-loser'; slotId: string }
  | { type: 'seed'; seedNumber: number }
  | { type: 'bye' };
```

Abaixo detalha-se como cada um é persistido em JSONB e como é resolvido:

---

### 2.1. Tipo `resolved-team` (Equipe Pré-Determinada)
- **Cenário:** Torneios onde a equipe é alocada manualmente ou cabeça de chave fixada antes do início.
- **Payload JSONB Persistido:**
  ```json
  {
    "type": "resolved-team",
    "teamId": "team_osasco_2026",
    "teamName": "Osasco Voleibol Clube"
  }
  ```
- **Campos Relacionais no Slot:**
  - `status`: `'resolved'`
  - `resolved_team_id`: `'team_osasco_2026'` (FK válida para `teams.id`)

---

### 2.2. Tipo `group-position` (Posição Específica em um Grupo)
- **Cenário:** Padrão olímpico clássico (ex: "1º Lugar do Grupo A" ou "2º Lugar do Grupo B").
- **Payload JSONB Persistido:**
  ```json
  {
    "type": "group-position",
    "stageId": "groups",
    "groupIndex": 0,
    "position": 1
  }
  ```
- **Resolução pelo Engine:**
  - O `ParticipantResolutionEngine` consulta a classificação do grupo `A` do estágio `groups`.
  - Enquanto o grupo não estiver 100% concluído:
    - `status`: `'unresolved'`
    - `resolved_team_id`: `NULL`
    - `label`: `"1º do Grupo A"`
  - Quando o grupo é homologado:
    - O 1º colocado é identificado (ex: `team_flamengo`).
    - `status`: `'resolved'`
    - `resolved_team_id`: `'team_flamengo'`

---

### 2.3. Tipo `overall-ranking` (Posição no Ranking Geral Intergrupos)
- **Cenário:** Torneios com múltiplos grupos que consolidam classificação unificada (ex: Circuito Voltz, Copa Brasil).
- **Payload JSONB Persistido (Exemplo: 5º Geral para o Play-in 1):**
  ```json
  {
    "type": "overall-ranking",
    "stageId": "groups",
    "position": 5
  }
  ```
- **Resolução pelo Engine:**
  - O engine executa o algoritmo puro de agregação intergrupos (`by-group-position-first` ou configurado).
  - Determina a equipe na 5ª posição global.
  - Atualiza atomicamente `resolved_team_id` no slot correspondente.

---

### 2.4. Tipo `stage-position` (Posição Final na Fase Anterior)
- **Cenário:** Torneio de fase única que classifica por colocação geral ordinal (1º ao N-ésimo).
- **Payload JSONB Persistido:**
  ```json
  {
    "type": "stage-position",
    "stageId": "qualifier-stage",
    "position": 3
  }
  ```

---

### 2.5. Tipo `match-winner` (Vencedor de Confronto Anterior)
- **Cenário:** Semifinais e Finais de chaves eliminatórias; Quartas de Final alimentadas por Play-in.
- **Payload JSONB Persistido:**
  ```json
  {
    "type": "match-winner",
    "slotId": "PI-1"
  }
  ```
- **Resolução pelo Engine:**
  - Aguarda a homologação da partida vinculada ao slot `PI-1`.
  - Lê o `CanonicalMatchResult` da partida.
  - Se houver vencedor canônico (`canonical.winnerId`), o slot de destino recebe:
    - `status`: `'resolved'`
    - `resolved_team_id`: `canonical.winnerId`

---

### 2.6. Tipo `match-loser` (Perdedor de Confronto Anterior)
- **Cenário:** Disputa de 3º Lugar ou chave de perdedores (*Losers Bracket* em dupla eliminação).
- **Payload JSONB Persistido:**
  ```json
  {
    "type": "match-loser",
    "slotId": "SF-1"
  }
  ```
- **Resolução:**
  - Lê o `CanonicalMatchResult.loserId`.
  - Aloca o perdedor da semifinal diretamente na disputa de 3º lugar.

---

### 2.7. Tipo `seed` (Cabeça de Chave Numérico)
- **Cenário:** Chave eliminatória montada por sementes de sorteio ou ranking prévio da temporada (Seeds 1 a 16).
- **Payload JSONB Persistido:**
  ```json
  {
    "type": "seed",
    "seedNumber": 1
  }
  ```

---

### 2.8. Tipo `bye` (Isenção / Avanço Automático na Rodada)
- **Cenário:** Chave eliminatória com número de participantes ímpar ou não potência de 2 (ex: 5 equipes em bracket de 8 precisam de 3 BYEs).
- **Payload JSONB Persistido:**
  ```json
  {
    "type": "bye"
  }
  ```
- **Campos Relacionais no Slot:**
  - `status`: `'bye'`
  - `resolved_team_id`: `NULL`
  - `label`: `"BYE (Avanço Automático)"`
- **Comportamento Esportivo Sem Equipe Fantasma:**
  - **NÃO é inserida nenhuma equipe na tabela `teams`.**
  - O sistema reconhece que o adversário do BYE avança diretamente para a próxima rodada via rota de progressão `onWinner`, sem criar um registro em `matches`.

---

## 3. ESTADOS DO SLOT DE PARTICIPANTE

A tabela `competition_match_slots` mantém em cada lado (A e B) uma coluna de enum com semântica estrita:

| Status | Significado Esportivo | `resolved_team_id` | Partida Agendável? |
|---|---|---|---|
| `'unresolved'` | Aguardando desfecho de jogos ou classificação prévia. | `NULL` | Não (ou em modo rascunho informativo) |
| `'resolved'` | Equipe apurada e validada. | Preenchido com ID real | Sim, se o outro lado também estiver resolvido |
| `'bye'` | Isenção de jogo concedida ao oponente. | `NULL` | Não (gera avanço imediato) |
| `'invalid'` | Impossível determinar (ex: abandono, duplo W.O. no jogo anterior). | `NULL` | Não (exige intervenção da organização) |

---

## 4. DETECÇÃO E AUDITORIA DE REFERÊNCIAS INVÁLIDAS

Para garantir que uma configuração corrompida não trave a aplicação em produção, a rotina de validação do `ParticipantResolutionEngine` verifica em tempo de persistência:
1. **Slot Inexistente:** Se `slotId` em `match-winner` não existir no grafo de fases da competição.
2. **Ciclos Circulares:** Se o Slot A depende do vencedor do Slot B, e o Slot B depende do Slot A (validado pelo `StageGraphEngine`).
3. **Índice Fora dos Limites:** Se `group-position` solicita a 5ª posição de um grupo que possui apenas 3 equipes.
4. **Alvo Não Homologado:** Se o jogo de origem terminou com W.O. duplo ou empate não desfeito segundo as regras oficiais da competição.

Em qualquer dessas anomalias, o banco armazena `status = 'invalid'` e registra uma linha na tabela `public.audit_logs`, permitindo que o organizador visualize o alerta no painel administrativo com diagnóstico claro.
