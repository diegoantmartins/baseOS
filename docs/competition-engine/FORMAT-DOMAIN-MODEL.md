# Modelo de Domínio e Contratos de Formatos — Format Domain Model (Fase 4.3)

**Data:** 05/09/2026  
**Módulos:** `src/types/competitionConfig.ts`, `src/types/entities.ts`  
**Status:** Implementado, compatível e 100% tipado no TypeScript  

---

## 1. Princípio da Fonte Única de Verdade (SSOT)

Um dos pilares arquiteturais firmados na Fase 4.2 e reforçados na Fase 4.3 foi:

> **O `CompetitionConfig` existente continua sendo a ÚNICA fonte de verdade (SSOT) da configuração de competições no BaseOS. Não foi criado nenhum `CompetitionConfigV2`.**

A evolução dos tipos ocorreu por extensão composicional e retrocompatível das estruturas existentes, mantendo todos os consumidores, rotas, telas e os 638 testes de regressão funcionando de imediato.

---

## 2. Estrutura Canônica dos Tipos de Domínio

### 2.1. Formatos e Estágios

```typescript
export type CompetitionFormatType =
  | 'round-robin'
  | 'groups'
  | 'knockout'
  | 'groups-knockout'
  | 'groups-play-in-knockout'
  | 'custom';

export type StageType =
  | 'group-stage'
  | 'play-in'
  | 'knockout'
  | 'classification-matches'
  | 'custom';
```

### 2.2. Contrato de Alimentação de Participantes (`ParticipantFeedDefinition`)

Define a origem conceitual das equipes que ingressam em cada estágio da competição, desacoplando a fase de quem a consome:

```typescript
export interface ParticipantFeedDefinition {
  feedType:
    | 'direct-entry'               // Inscrição direta da competição
    | 'from-stage-rank-range'       // Faixa de seeds do ranking de um estágio anterior (ex: 5 a 12)
    | 'from-stage-winners'          // Vencedores das partidas de um estágio anterior
    | 'from-stage-losers'           // Perdedores das partidas de um estágio anterior (ex: disputa de 3º)
    | 'group-winners'               // Primeiros colocados de grupos
    | 'group-runners-up'            // Segundos colocados de grupos
    | 'custom';
  sourceStageId?: string;
  rankRange?: [number, number];     // Ex: [1, 4] para avanço direto; [5, 12] para play-in
}
```

### 2.3. Contrato de Pareamento (`PairingConfig`)

Define a matemática determinística de montagem dos confrontos:

```typescript
export interface PairingConfig {
  method:
    | 'high-low'         // Seed mais alto contra seed mais baixo (ex: 1º vs 8º, 2º vs 7º)
    | 'adjacent'         // 1º vs 2º, 3º vs 4º
    | 'same-position'    // 1º Gr.A vs 1º Gr.B
    | 'draw'             // Sorteio entre os classificados
    | 'manual';
  avoidSameGroupInFirstRound?: boolean; // Evitar que equipes do mesmo grupo se enfrentem na primeira rodada
}
```

### 2.4. Definição do Estágio (`StageDefinition`)

```typescript
export interface StageDefinition {
  id: string;
  name: string;
  sequenceOrder: number;
  stageType: StageType;
  feed: ParticipantFeedDefinition;
  pairing?: PairingConfig;
  targetMatchCount?: number;
  advancingTeamCount?: number;
  eliminatedTeamCount?: number;
  notes?: string;
}
```

---

## 3. Extensão do `CompetitionConfig`

No bloco `format` de `CompetitionConfig`, novos campos opcionais foram anexados sem quebrar o esquema existente:

```typescript
export interface CompetitionConfig {
  // ... campos existentes preservados ...
  format?: {
    type: CompetitionType; // 'points' | 'brackets' | 'groups_brackets' (preservado para compatibilidade)
    formatType?: CompetitionFormatType; // Novo vocabulário genérico
    stages?: StageDefinition[];         // Lista sequencial de estágios
    aggregationStrategy?: OverallRankingStrategy;
    // ...
  };
  scoringRules?: ScoringRuleConfig;
  tiebreakCriteriaOrder?: TiebreakCriterionId[];
  // ...
}
```

---

## 4. Fronteira Rigorosa: Fase 4.3 vs Fase 4.4

| Capacidade | Fase 4.3 (Concluída) | Fase 4.4 (Futura) |
| :--- | :---: | :---: |
| Vocabulário de Domínio de Estágios e Feeds | ✅ Homologado | Consumido pelo motor |
| Tipos de Formato e Estratégias de Ranking | ✅ Homologado | Consumido pelo motor |
| Cálculo Matemático de Ranking e Mini-Tabela | ✅ Homologado | Consumido pelo motor |
| Geração de Pareamentos Determinísticos | ✅ Provado conceitualmente | Integrado na árvore |
| Execução Operacional de Chaves e Partidas | ❌ Fora de escopo | ✅ Motor de Progressão |
| Transição de Rodadas (`playoffsService`) | ❌ Preservado legado | ✅ Migrado para novo motor |
| Persistência e Tabelas no Banco | ❌ Proibido alterar schema | Fase 4.5 |
