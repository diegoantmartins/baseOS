# Arquitetura do Runtime de Competições (Fase 4.8)

**Projeto:** BaseOS  
**Módulo:** Competition Format Engine — Runtime Orchestrator  
**Documento:** `RUNTIME-ARCHITECTURE.md`  
**Status:** Homologado (PostgreSQL Real + TypeScript + Vitest)

---

## 1. Visão Geral e Propósito

A Fase 4.8 consolida a transição dos motores matemáticos e contratos puros (Fases 4.1 a 4.4.1) e da fundação de persistência relacional transacional (Fases 4.5 a 4.7) para um **Runtime de Execução Determinístico, Atômico e Concorrência-Safe**.

O runtime não inventa regras de progressão nem mantém estado volátil em memória. Ele atua como um **orquestrador desacoplado** de ciclo de vida competitivo, garantindo a separação rígida entre:

1. **Evento Esportivo Real (`Match`)**: Ocorrência física, sets, pontos, súmula e arbitragem.
2. **Resultado Canônico (`CanonicalMatchResult`)**: Tradução esportiva normalizada segundo as regras do torneio (`CompetitionRulesService`).
3. **Estrutura de Chaveamento (`MatchSlot`)**: Posicionamento na árvore de progressão, referências a participantes e rotas de avanço.
4. **Persistência Transacional (PostgreSQL RPCs)**: Execução atômica e idempotente no banco de dados com isolamento e bloqueio pessimista (`FOR UPDATE`).

---

## 2. Diagrama de Arquitetura do Ciclo de Vida

```text
       [ Evento Esportivo: Finalização de Partida ]
                         │
                         ▼
        CompetitionRuntimeService.handleMatchCompleted()
                         │
   ┌─────────────────────┴──────────────────────┐
   │ 1. Resolução Canônica                     │
   │    CompetitionRulesService.deriveMatchResult(match)
   │    -> CanonicalMatchResult (vencedor, sets, pontos, status)
   └─────────────────────┬──────────────────────┘
                         │
   ┌─────────────────────┴──────────────────────┐
   │ 2. Avaliação Pura de Progressão            │
   │    GenericProgressionEngine.evaluate(slot, canonicalResult)
   │    -> AdvancementEntry[] (alvo, time, critério)
   └─────────────────────┬──────────────────────┘
                         │
   ┌─────────────────────┴──────────────────────┐
   │ 3. Persistência Transacional via RPC       │
   │    dataAccess.propagateSlotOutcome(...)
   │    -> rpc_propagate_slot_outcome(competition_id, slot_id, ...)
   │    * Atualiza slot de origem para completed
   │    * Propaga time vencedor/perdedor para slots-alvo
   └─────────────────────┬──────────────────────┘
                         │
   ┌─────────────────────┴──────────────────────┐
   │ 4. Resolução de Participantes Afetados     │
   │    buildResolutionContext(...)
   │    ParticipantResolutionEngine.resolveSlot(...)
   │    * Atualiza slots afetados (group-position, ranking, etc)
   └─────────────────────┬──────────────────────┘
                         │
   ┌─────────────────────┴──────────────────────┐
   │ 5. Materialização Atômica via RPC          │
   │    dataAccess.materializeSlotMatch(...)
   │    -> rpc_materialize_slot_match(competition_id, slot_id)
   │    * Bloqueio pessimista: SELECT ... FOR UPDATE
   │    * Validação de participantes (ambos resolved, sem fake teams)
   │    * Verificação de inscrição em competition_teams
   │    * Inserção atômica de Match esportivo
   │    * Vinculação biunívoca: slot.match_id = match.id
   └─────────────────────┬──────────────────────┘
                         │
                         ▼
             [ Nova Partida Elegível Agendada ]
```

---

## 3. Os 5 Gates Obrigatórios e Garantias Arquiteturais

### Gate 1: Auditoria de `createMatch` e Adaptação de Persistência
- O método legado `dataAccess.createMatch()` não foi presumido como autoridade para a nova arquitetura.
- Foi constatado que a tabela `matches` não possui colunas como `phase` ou `group_name`, e possui `slot_id` como identificador de origem.
- Foi implementado o canal dedicado `dataAccess.materializeSlotMatch()` e sua RPC correspondente `rpc_materialize_slot_match`, que injeta metadados com segurança em `observations` e vincula o `slot_id`.

### Gate 2: A RPC como Verdadeira Autoridade de Materialização
- É estritamente proibido o fluxo ingênuo no cliente (`SELECT slot -> if (!match) INSERT match -> UPDATE slot`), pois reabriria race conditions.
- A RPC `rpc_materialize_slot_match` adquire `SELECT ... FOR UPDATE` no `competition_match_slots`, verifica se `match_id` já existe, valida participantes e equipes, insere em `matches` e atualiza `competition_match_slots.match_id` na **mesma transação física**.

### Gate 3: Identidade Contextual e Integridade Referencial de `slot_id`
- A coluna `slot_id` em `matches` não é uma string solta.
- Existe a Foreign Key composta:
  ```sql
  CONSTRAINT fk_matches_competition_match_slot
  FOREIGN KEY (competition_id, slot_id)
  REFERENCES public.competition_match_slots (competition_id, slot_id)
  ON DELETE SET NULL (slot_id);
  ```
- E a constraint de unicidade parcial:
  ```sql
  CREATE UNIQUE INDEX uq_matches_competition_slot_id
    ON public.matches (competition_id, slot_id)
    WHERE slot_id IS NOT NULL;
  ```
- Isso garante que a identidade é **contextual à competição** e impede fisicamente a existência de dois `Match` para o mesmo `MatchSlot`.

### Gate 4: `advanceByes()` sem Lógica Ad-Hoc
- O método `advanceByes()` atua exclusivamente como executor de `AdvancementEntry(type = 'bye-advance')` emitidas pelo `GenericProgressionEngine`.
- O Runtime não contém condicionais como `if (slotA === null) advance()`. A determinação de avanço por BYE é responsabilidade pura do engine.

### Gate 5: Certificação Multidimensional
- O fechamento da Fase 4.8 foi validado por:
  1. `npx tsc -p tsconfig.app.json --noEmit` (0 erros)
  2. `npm run lint` (0 erros)
  3. `npm test` (89 arquivos de teste, 771 testes unitários/integração 100% aprovados)
  4. `npm run build` (build de produção limpo em 55.9s)
  5. `scripts/test-runtime-postgres.sh` (7 provas executadas contra PostgreSQL 17.6 real em container)

---

## 4. Tratamento do Caso E — Voltz e Ressalva Arquitetural

> **Ressalva Técnica Obrigatória:**  
> O cruzamento das Quartas de Final do cenário Voltz (ex.: 1º Geral vs Vencedor Play-In 4) é uma **configuração técnica de teste** utilizada para certificar a capacidade multi-estágio e encadeamento do engine. O BaseOS **não** transforma essa configuração em regra universal hardcoded.

A arquitetura do BaseOS respeita o fluxo:
$$\text{Regulamento Declarativo} \longrightarrow \text{CompetitionConfig} \longrightarrow \text{StageDefinition} \longrightarrow \text{PairingDefinition} \longrightarrow \text{Runtime}$$

Qualquer formato (FIVB, CBV, Voltz, Torneio Local) é configurado através de definições declarativas em JSON, sem necessidade de branches condicionais (`if (competition === 'Voltz')`) no código de produção.
