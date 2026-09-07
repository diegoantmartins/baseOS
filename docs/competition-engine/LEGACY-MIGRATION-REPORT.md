# Relatório de Compatibilidade e Migração Legada (Fase 4.8)

**Projeto:** BaseOS  
**Módulo:** Competition Format Engine — Legacy Coexistence & Migration  
**Documento:** `LEGACY-MIGRATION-REPORT.md`  
**Status:** Homologado

---

## 1. Contexto e Desafio

O BaseOS opera em produção competições que utilizam o modelo legado de chaveamento (`advancePlayoffBrackets`, `competitionBracketService`, arrays de partidas pré-geradas).

A nova arquitetura introduz:
- `competition_stages`
- `competition_rounds`
- `competition_match_slots`
- `CompetitionRuntimeService`

O desafio da Fase 4.8 era habilitar a execução do novo engine **sem quebrar nenhuma competição legado existente** e sem forçar migrações destrutivas imediatas.

---

## 2. Estratégia de Coexistência (Branching Transparente)

Foi estabelecida uma regra de desvio unificada nas interfaces de operação de partidas (`MatchesPage.tsx` e `LiveScorerDeskModal.tsx`):

```typescript
// src/pages/MatchesPage.tsx & LiveScorerDeskModal.tsx

// 1. Verifica se a competição já utiliza a nova arquitetura relacional
const slots = await dataAccess.listMatchSlots(competitionId);

if (slots.length > 0) {
  // Competência gerenciada pelo novo Runtime Engine
  await CompetitionRuntimeService.handleMatchCompleted(competitionId, matchId);
} else {
  // Competência gerenciada pelo fluxo legado
  await advancePlayoffBrackets(competitionId);
}
```

### Vantagens da Abordagem:
1. **Zero Downtime**: Competições ativas continuam operando normalmente via `advancePlayoffBrackets`.
2. **Zero Regressão**: Nenhuma alteração destrutiva foi feita em `advancePlayoffBrackets` ou nas tabelas legadas.
3. **Adoção Gradual**: Novas competições ou estágios gerados a partir do Format Builder/Draw Arena automaticamente geram slots relacionais e são assumidas pelo novo runtime.

---

## 3. Auditoria de Compatibilidade de Dados (`createMatch` vs `materializeSlotMatch`)

| Característica | Modelo Legado (`createMatch`) | Novo Modelo (`materializeSlotMatch`) |
| :--- | :--- | :--- |
| **Identificação do confronto** | Baseada em nomes de equipes fictícias (`TBD-A-1`, `__BYE__`) | Baseada em `slot_id` imutável e referências estruturais |
| **Origem dos dados** | Montado em memória pelo front-end | Materializado via RPC transacional no PostgreSQL |
| **Isolamento de concorrência** | Nenhum (race conditions de REST) | Bloqueio pessimista de linha (`FOR UPDATE`) na RPC |
| **Coluna `slot_id`** | Opcional / nula nas partidas legadas | Obrigatória e vinculada por Foreign Key composta |
| **Duplicação de partida** | Possível se dois operadores salvarem ao mesmo tempo | Bloqueada por índice único `uq_matches_competition_slot_id` |

---

## 4. Plano de Transição para Descontinuação Futura do Legado

1. **Fase 4.8 (Atual - Concluída)**: Coexistência pacífica com auto-detecção por presença de slots.
2. **Fase 5.x (Chaveamento Visual & UI)**: Interface gráfica renderiza o chaveamento a partir de `competition_match_slots`.
3. **Fase 6.x (Migração de Histórico)**: Script de retro-alimentação converte competições finalizadas legadas para a estrutura de estágios e slots.
4. **Fase 7.x (Remoção do Legado)**: Depreciação oficial e remoção de `advancePlayoffBrackets`.
