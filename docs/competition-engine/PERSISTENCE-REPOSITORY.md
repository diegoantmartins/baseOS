# BASEOS — CONTRATOS DO REPOSITÓRIO DE PERSISTÊNCIA DO COMPETITION FORMAT ENGINE

**Documento:** PERSISTENCE-REPOSITORY.md  
**Fase:** 4.6  
**Localização:** `src/services/dataAccess.ts`  
**Status:** IMPLEMENTADO E HOMOLOGADO  

---

## 1. INTEGRAÇÃO COM A ARQUITETURA DO DATA ACCESS

Seguindo estritamente a regra do projeto de **porta única de acesso a dados**, os métodos do novo motor de estágios foram incorporados diretamente no módulo central `src/services/dataAccess.ts`.

Nenhum arquivo paralelo concorrente (`newDataAccess.ts`, `formatDataAccess.ts`) foi criado.

Toda a aplicação consome a fachada `dataAccess`, que seleciona transparentemente entre `localStorageAdapter` e `supabaseAdapter` com base na presença das variáveis de ambiente do Supabase.

---

## 2. CONTRATOS E MÉTODOS IMPLEMENTADOS

### 2.1 Módulo de Estágios (`Stages`)

#### `listStages(competitionId: string): Promise<StageRecord[]>`
- **Entrada:** `competitionId` (string).
- **Saída:** Lista de estágios ordenados ascendentemente por `stageOrder`.
- **Isolamento:** Retorna apenas os estágios pertencentes à competição informada.

#### `getStage(id: string): Promise<StageRecord | null>`
- **Entrada:** `id` (PK técnica do estágio).
- **Saída:** Registro do estágio ou `null` se inexistente.

#### `getStageByLogicalId(competitionId: string, stageId: string): Promise<StageRecord | null>`
- **Entrada:** `competitionId` (string) e `stageId` (identificador natural, ex.: `'group-stage'`).
- **Saída:** Registro do estágio correspondente ou `null`.

#### `createStage(stage: Omit<StageRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string; status?: StageRuntimeStatus }): Promise<StageRecord>`
- **Entrada:** Dados do estágio. `id` e `status` são opcionais (default `status = 'pending'`).
- **Validações:**
  - Obrigatoriedade de `competitionId` e `stageId`.
  - Verificação de existência da competição associada.
  - Verificação de unicidade: `(competitionId, stageId)` e `(competitionId, stageOrder)`.
  - Verificação de status permitido (`'pending' | 'in-progress' | 'completed' | 'cancelled'`).
- **Tratamento de Erro:** Lança `Error` com mensagem explicativa em caso de falha de validação ou colisão.

#### `updateStage(id: string, updates: Partial<StageRecord>): Promise<StageRecord | null>`
- **Entrada:** `id` do estágio e objeto com campos parciais para atualização.
- **Validações:** Impede colisões de unicidade se `stageId` ou `stageOrder` forem alterados. Valida novo status.
- **Saída:** Registro atualizado com `updatedAt` renovado ou `null` se não encontrado.

#### `deleteStage(id: string): Promise<void>`
- **Entrada:** `id` do estágio.
- **Cascata:** Remove em cascata todas as rodadas associadas e os respectivos match slots.

---

### 2.2 Módulo de Rodadas (`Rounds`)

#### `listRounds(stageRowId: string): Promise<RoundRecord[]>`
- **Entrada:** `stageRowId` (PK do estágio pai).
- **Saída:** Lista de rodadas ordenadas por `roundOrder`.

#### `getRound(id: string): Promise<RoundRecord | null>`
- **Entrada:** `id` (PK técnica da rodada).

#### `getRoundByLogicalId(stageRowId: string, roundId: string): Promise<RoundRecord | null>`
- **Entrada:** `stageRowId` e `roundId` (identificador natural, ex.: `'quarterfinals'`).

#### `createRound(round: Omit<RoundRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string; status?: RoundRuntimeStatus }): Promise<RoundRecord>`
- **Entrada:** Dados da rodada.
- **Validações:**
  - Verificação de existência do estágio pai (`stageRowId`).
  - Unicidade: `(stageRowId, roundId)` e `(stageRowId, roundOrder)`.
  - Validação de status (`'pending' | 'in-progress' | 'completed'`).
- **Propagação Automática:** Herda `competitionId` do estágio associado se omitido.

#### `updateRound(id: string, updates: Partial<RoundRecord>): Promise<RoundRecord | null>`
- **Entrada:** `id` da rodada e atualizações parciais.
- **Validações:** Impede colisão de ordem ou ID lógico na rodada.

#### `deleteRound(id: string): Promise<void>`
- **Entrada:** `id` da rodada.
- **Cascata:** Remove em cascata todos os match slots associados à rodada.

---

### 2.3 Módulo de Slots de Confronto (`MatchSlots`)

#### `listMatchSlots(competitionId: string): Promise<MatchSlotRecord[]>`
- **Entrada:** `competitionId`.
- **Saída:** Todos os slots da competição ordenados por `position`.

#### `listMatchSlotsByRound(roundRowId: string): Promise<MatchSlotRecord[]>`
- **Entrada:** `roundRowId`.
- **Saída:** Slots da rodada ordenados por `position`.

#### `getMatchSlot(id: string): Promise<MatchSlotRecord | null>`
- **Entrada:** `id` físico do slot.

#### `getMatchSlotByLogicalId(competitionId: string, slotId: string): Promise<MatchSlotRecord | null>`
- **Entrada:** `competitionId` e `slotId` (identificador estável, ex.: `'SLOT-QF-01'`).

#### `createMatchSlot(slot: Omit<MatchSlotRecord, 'id' | 'createdAt' | 'updatedAt' | 'participantAStatus' | 'participantBStatus' | 'resolvedTeamAId' | 'resolvedTeamBId' | 'matchId'> & { id?: string; participantAStatus?: SlotParticipantStatus; participantBStatus?: SlotParticipantStatus; resolvedTeamAId?: string | null; resolvedTeamBId?: string | null; matchId?: string | null }): Promise<MatchSlotRecord>`
- **Entrada:** Dados do slot. `resolvedTeamAId`, `resolvedTeamBId` e `matchId` são estritamente opcionais/nullable.
- **Validações Profundas:**
  1. `validateParticipantReference(slot.participantAReference)`: valida estrutura contra os 8 tipos canônicos.
  2. `validateParticipantReference(slot.participantBReference)`: valida estrutura do lado B.
  3. Rejeição de equipes fantasmas via `isArtificialTeamId`: proíbe `TBD*`, `__BYE*`, `UNKNOWN`, `PLACEHOLDER` tanto nas referências quanto nos IDs de times resolvidos.
  4. Verificação de integridade referencial de times: se um time for indicado em `resolvedTeamAId` ou `resolvedTeamBId`, verifica se existe na coleção de equipes.
  5. Verificação de existência da partida associada: se `matchId` for informado, verifica existência em `matches`.
  6. Unicidade: `(competitionId, slotId)` e `(roundRowId, position)`.
- **Saída:** `MatchSlotRecord` persistido.

#### `updateMatchSlot(id: string, updates: Partial<MatchSlotRecord>): Promise<MatchSlotRecord | null>`
- **Entrada:** `id` do slot e atualizações parciais (ex.: resolução de participante ou associação de `matchId`).
- **Validações:** Revalida referências, rejeita equipes artificiais e previne colisões lógicas.

#### `deleteMatchSlot(id: string): Promise<void>`
- **Entrada:** `id` do slot.

---

## 3. VALIDADORES EXPORTADOS

Além das operações de CRUD, o repositório disponibiliza funções utilitárias exportadas para consumo de serviços e testes:

```typescript
export function isArtificialTeamId(teamId: string | null | undefined): boolean;
export function validateParticipantReference(ref: unknown): ParticipantReference;
```
