# BASEOS — MODELO DE FASES (STAGE MODEL)

**Data:** 05/09/2026  
**Documento:** Especificação Técnica Conceitual do Modelo de Fases do BaseOS  
**Status:** Arquitetura Definida (Fase 4.2)  
**Escopo:** Definição formal de `StageDefinition`, `StageRecord`, ciclo de vida, transições de estado, desacoplamento de strings literais e compatibilidade com dados legados.

---

## 1. MOTIVAÇÃO E DIAGNÓSTICO DO PROBLEMA ATUAL

Na auditoria da Fase 4.1, identificou-se que o BaseOS não possui uma entidade de primeira classe para representar uma **Fase**. As limitações identificadas no código atual são:

1. **Fases como Strings Descritivas:** O campo `matches.phase` armazena strings arbitrárias como `"classificatória"`, `"classificatoria"` (com ou sem acento), `"quartas"`, `"semifinal"`, `"final"`. A lógica de negócio espalhada por `competitionBracketService.ts`, `playoffsService.ts` e `MatchesPage.tsx` realiza comparações literais de strings (`m.phase === 'classificatória'`), gerando fragilidade a erros de digitação e acentuação.
2. **Ciclo de Vida Bipolar e Hardcoded:** Em `competitionLifecycleService.ts`, a competição só conhece duas fases: grupos (`status = 'in-progress'`) e playoffs (`status = 'playoffs'`). Qualquer formato que necessite de uma etapa intermediária (repescagem, play-in, repescagem de 3º lugar, fase preliminar) é impossível de ser modelado sem quebrar as transições de status.
3. **Ausência de Configuração Específica por Fase:** Não é possível definir regras de partida distintas por fase (por exemplo: fase de grupos em melhor de 3 sets de 25/15 e finais em melhor de 5 sets de 25/15).
4. **Acoplamento entre UI e Domínio:** As strings exibidas nas abas da interface do usuário definem o comportamento do banco de dados, invertendo a relação saudável de dependência de software.

O **Stage Model** resolve essa deficiência estabelecendo uma separação clara entre a **definição estrutural da fase** (em configuração) e a **execução da fase** (em tempo de execução).

---

## 2. A SEPARAÇÃO FUNDAMENTAL: DEFINIÇÃO VS. EXECUÇÃO

O modelo adota uma arquitetura híbrida de duas camadas:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CAMADA DE DEFINIÇÃO                              │
│                    (Config-Time / Imutável no rulesSnapshot)                │
│                                                                             │
│   CompetitionConfigV2.format.stages: StageDefinition[]                      │
│   - id: "stage-groups" | "stage-repechage" | "stage-qf"                     │
│   - type: 'group-stage' | 'single-elimination' | 'round-robin'              │
│   - name: "Fase de Grupos" (label para UI)                                  │
│   - order: 1                                                                │
│   - matchRulesOverride?: Partial<MatchRulesConfig>                          │
│   - pairingConfig: PairingRules                                             │
│   - progressionConfig: ProgressionRules                                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ instanciação / execução
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            CAMADA DE EXECUÇÃO                               │
│                   (Run-Time / Persistência no Banco / LocalStorage)         │
│                                                                             │
│   StageRecord (Tabela 'competition_stages' / LocalStorage key)             │
│   - id: UUID                                                                │
│   - competitionId: UUID                                                     │
│   - stageDefinitionId: "stage-repechage"                                    │
│   - order: 2                                                                │
│   - status: 'pending' | 'in-progress' | 'completed' | 'cancelled'           │
│   - startedAt: timestamp                                                    │
│   - completedAt: timestamp                                                  │
│   - qualifiedTeamIds: UUID[]                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Por que essa separação é ideal?
1. **Configuração como SSOT:** Todo o regulamento do campeonato fica salvo no `CompetitionConfig`, que é versionado e congelado no `rulesSnapshot` no momento da publicação.
2. **Execução Rastreada:** O progresso do torneio (se a repescagem começou, se as quartas terminaram) fica registrado nos `StageRecords`, permitindo transições seguras, auditoria esportiva e validação de bloqueios.
3. **Desacoplamento do Banco de Dados:** Permite simulações em memória (dry-run) durante o planejamento e chaveamento sem precisar persistir dados parciais.

---

## 3. CONTRATOS TYPESCRIPT FORMAIS

### 3.1 Tipos e Enums de Fase

```typescript
/**
 * Tipo canônico que define a mecânica operacional da fase.
 */
export type StageType = 
  | 'group-stage'           // Múltiplos grupos com classificação interna
  | 'round-robin'           // Grupo único onde todos jogam contra todos
  | 'single-elimination'    // Mata-mata eliminatório tradicional (bracket)
  | 'play-in'               // Confrontos de repescagem / cruzamento qualificatório
  | 'third-place'           // Disputa isolada de 3º e 4º lugar
  | 'custom-pairing';       // Confrontos definidos por chaveamento específico

/**
 * Status formal do ciclo de vida de uma fase.
 */
export type StageStatus = 
  | 'pending'       // Aguardando conclusão de fases precedentes ou sorteio
  | 'ready'         // Participantes definidos; confrontos prontos para geração/início
  | 'in-progress'   // Jogos em andamento
  | 'completed'     // Todas as partidas finalizadas e classificação apurada
  | 'locked';       // Fase encerrada e imutável para evitar adulteração retroativa
```

### 3.2 Contrato `StageDefinition` (Config-Time)

```typescript
export interface StageDefinition {
  /** Identificador estável dentro da competição (ex: 'groups', 'repechage', 'quarterfinals') */
  id: string;

  /** Sequência ordinal da fase no torneio (1, 2, 3...) */
  order: number;

  /** Nome amigável de apresentação inicial (ex: "Fase Classificatória", "Repescagem") */
  name: string;

  /** Tipo estrutural da fase */
  type: StageType;

  /** Lista de IDs de fases que precisam estar 'completed' para esta fase iniciar */
  dependsOnStageIds: string[];

  /** Configuração específica para fases baseadas em grupos */
  groupConfig?: {
    groupsCount: number;
    teamsPerGroup: number;
    /** 'single' = turno único, 'home-and-away' = ida e volta */
    rounds: 'single' | 'home-and-away';
  };

  /** Configuração específica para fases eliminatórias */
  eliminationConfig?: {
    /** Número de vagas/slots na chave (ex: 8 para quartas, 4 para semis) */
    bracketSize: 2 | 4 | 8 | 16 | 32;
    /** Se true, perdedores das semifinais alimentam a disputa de 3º lugar */
    hasThirdPlaceMatch?: boolean;
    /** 'single-match' = jogo único, 'two-legged' = ida e volta */
    seriesType: 'single-match' | 'two-legged';
  };

  /** 
   * Sobrescrita opcional de regras de partida para esta fase específica.
   * Exemplo: Fase de grupos joga melhor de 3, mas a Fase 'final' joga melhor de 5.
   */
  matchRulesOverride?: Partial<MatchRulesConfig>;

  /** Regras de desempate específicas para esta fase (se omitido, herda do torneio) */
  tieBreakCriteriaOverride?: TieBreakCriterion[];

  /** Regras de entrada de participantes para alimentar os slots desta fase */
  participantFeeds: ParticipantFeedDefinition[];
}
```

### 3.3 Contrato `StageRecord` (Run-Time)

```typescript
export interface StageRecord {
  /** UUID persistido */
  id: string;

  /** ID da competição associada */
  competitionId: string;

  /** ID da definição correspondente no CompetitionConfig */
  stageDefinitionId: string;

  /** Ordem de execução */
  order: number;

  /** Status atual de execução */
  status: StageStatus;

  /** Momento do início da fase */
  startedAt?: string;

  /** Momento da conclusão da fase */
  completedAt?: string;

  /** Metadados de auditoria e controle */
  metadata?: {
    totalMatches?: number;
    completedMatches?: number;
    advancingTeamIds?: string[];
    tieBreakNotes?: string[];
  };
}
```

---

## 4. O FIM DAS STRINGS LITERAIS EM `matches.phase`

### 4.1 Problema Atual
Hoje o BaseOS faz:
```typescript
// Código Frágil Atual
const isGroupStage = match.phase === 'classificatória' || match.phase === 'classificatoria';
const isQuarter = match.phase === 'quartas';
```
Qualquer divergência ortográfica, internacionalização (i18n) ou suporte a novas fases quebra a aplicação.

### 4.2 Nova Arquitetura de Identificadores Estáveis
Na nova arquitetura, cada partida (`MatchRecord`) passará a ter:
- `stageId: string` — Referência direta ao `StageDefinition.id` estável (ex: `"groups"`, `"repechage"`, `"quarterfinals"`).
- `stageRecordId?: string` — FK opcional para o registro de execução `StageRecord.id`.
- `roundIndex?: number` — Rodada dentro da fase (ex: Rodada 1, Rodada 2 da fase de grupos).
- `bracketMatchId?: string` — Slot identificador no chaveamento (ex: `"QF-1"`, `"SF-2"`, `"FINAL"`).

### 4.3 Camada de Tradução e Apresentação (UI)
As strings em português passam a ser resolvidas por um catálogo puro de apresentação:

```typescript
export const StageDisplayNames: Record<StageType, (customName?: string) => string> = {
  'group-stage': (custom) => custom || 'Fase de Grupos',
  'round-robin': (custom) => custom || 'Pontos Corridos',
  'single-elimination': (custom) => custom || 'Eliminatória',
  'play-in': (custom) => custom || 'Repescagem',
  'third-place': (custom) => custom || 'Disputa de 3º Lugar',
  'custom-pairing': (custom) => custom || 'Fase Eliminatória Especial',
};
```

---

## 5. CICLO DE VIDA E MÁQUINA DE ESTADOS DA FASE

Uma fase transita por estados bem definidos:

```text
    ┌───────────┐
    │  PENDING  │  (Fases precedentes ainda não concluídas)
    └─────┬─────┘
          │ Precedentes concluídas & Participantes apurados
    ┌─────▼─────┐
    │   READY   │  (Chaveamento/confrontos gerados; aguarda início)
    └─────┬─────┘
          │ Primeira partida iniciada / Rodada aberta
    ┌─────▼─────┐
    │IN_PROGRESS│  (Partidas sendo disputadas e súmulas enviadas)
    └─────┬─────┘
          │ 100% das partidas concluídas & Classificação consolidada
    ┌─────▼─────┐
    │ COMPLETED │  (ProgressionEngine acionado -> Alimenta próxima fase)
    └─────┬─────┘
          │ Competição encerrada ou homologação de súmulas
    ┌─────▼─────┐
    │   LOCKED  │  (Resultados imutáveis; proteção esportiva)
    └───────────┘
```

### 5.1 Regras de Transição
1. **PENDING $\to$ READY:** Só ocorre quando `dependsOnStageIds` tiver todos os seus `StageRecord.status === 'completed'`. O `ProgressionEngine` é invocado para resolver as origens das equipes (feeds) e preencher os slots de times da fase.
2. **READY $\to$ IN_PROGRESS:** Ocorre assim que o organizador abre os jogos da fase ou o primeiro resultado entra no sistema.
3. **IN_PROGRESS $\to$ COMPLETED:** Ocorre de forma automática ou por comando do administrador quando `totalMatches === completedMatches` e todos os eventuais critérios de desempate forem resolvidos. Nesse momento, as equipes classificadas são emitidas como eventos de progressão para alimentar a fase seguinte.
4. **COMPLETED $\to$ LOCKED:** Trava esportiva para evitar alterações acidentais de placar em fases anteriores que alterariam retroativamente as equipes de fases subsequentes já disputadas.

---

## 6. DEPENDÊNCIAS DE FASES (GRAFO DIRECIONADO ACÍCLICO - DAG)

As fases formam um Grafo Direcionado Acíclico (DAG). Cada fase aponta para as suas predecessoras via `dependsOnStageIds`.

### Exemplo: Fluxo do Campeonato Voltz
```text
[Stage 1: Fase de Grupos]
         │
         ├─── (Top 1–4 geral) ──────────────────────┐
         │                                          │
         └─── (5º–12º geral) ─► [Stage 2: Repescagem]
                                        │
                                (Vencedores R1..R4)
                                        │
                                        ▼
                            [Stage 3: Quartas de Final]
                                        │
                                        ▼
                            [Stage 4: Semifinais]
                                 │          │
                       (Vencedores)       (Perdedores)
                                 │          │
                                 ▼          ▼
                        [Stage 5: Final]  [Stage 6: 3º Lugar]
```

O motor de fases percorre esse grafo de forma determinística: nenhuma fase pode avançar para `READY` se os seus nós ascendentes não estiverem em `COMPLETED`.

---

## 7. MODELO DE PERSISTÊNCIA DUAL: SUPABASE E LOCALSTORAGE

Para manter a equivalência rigorosa de arquitetura estabelecida no `dataAccess.ts`:

### 7.1 No Supabase (PostgreSQL)
- Uma tabela relacional simples e protegida por RLS:
  ```sql
  CREATE TABLE IF NOT EXISTS competition_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    stage_definition_id TEXT NOT NULL,
    stage_order INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- O campo `matches.stage_id` vincula cada partida diretamente à sua fase.

### 7.2 No LocalStorage
- Coleção armazenada na chave `volleyscore_competition_stages`.
- Total paridade com a API assíncrona do `dataAccess.ts`:
  - `dataAccess.getStages(competitionId)`
  - `dataAccess.updateStageStatus(stageId, status)`
  - `dataAccess.createStagesBatch(stages)`

---

## 8. ESTRATÉGIA DE COMPATIBILIDADE COM DADOS LEGADOS

As competições legadas no BaseOS foram criadas com strings simples (`phase = 'classificatória'`). O motor aplicará um **Adapter de Normalização em Memória**:

1. Se `competition.config.format` não existir ou não contiver `stages`:
   - Se `competition.format === 'round-robin'`: É sintetizada uma única `StageDefinition` (`id: 'stage-round-robin'`, `type: 'round-robin'`).
   - Se `competition.format === 'groups-playoffs'`: São sintetizadas duas `StageDefinitions` (`id: 'stage-groups'`, `type: 'group-stage'`, e `id: 'stage-playoffs'`, `type: 'single-elimination'`).
2. Mapeamento de `matches.phase` legado:
   - `'classificatória'` $\to$ mapeado em tempo de execução para `stageId = 'stage-groups'`.
   - `'quartas'`, `'semifinal'`, `'final'` $\to$ mapeados para `stageId = 'stage-playoffs'`.
3. Dessa forma, **nenhuma migration destrutiva é necessária**, e as competições já existentes continuam funcionando normalmente na interface antiga e na nova.
