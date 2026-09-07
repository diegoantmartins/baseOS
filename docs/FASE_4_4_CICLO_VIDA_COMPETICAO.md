# BASEOS — FASE 4.4: CICLO DE VIDA, INTEGRIDADE E CONGELAMENTO DA COMPETIÇÃO

## 1. Estado Anterior

Antes da Fase 4.4, o sistema possuía a definição das regras no `CompetitionRulesService` (Fase 4.2) e seus consumidores migrados (Fase 4.3). No entanto:
- O ciclo de vida era apenas parcialmente verificado via `CompetitionLifecycleService.validateTransition`, sem métodos canônicos para consultar permissões de ação como `canEditRules`, `canCreateMatch`, `canRecordResult`.
- O congelamento de regras através do campo `rulesSnapshot` (modelado na Fase 4.2) nunca era gerado ou persistido em nenhuma transição de estado da competição.
- Os diálogos de lançamento de placar e a mesa do apontador gravavam resultados sem validar se a competição estava em um estado que permitia novas partidas ou pontuações (ex.: permitia lançar partidas em competições já finalizadas ou canceladas).
- O banco de dados (Supabase) não possuía as colunas `config jsonb` e `rules_snapshot jsonb` na tabela `competitions`.

---

## 2. Problemas Encontrados na Auditoria

1. **Ausência de Congelamento Efetivo**: O `rulesSnapshot` estava implementado como fallback prioritário em `CompetitionRulesService.getConfig()`, mas nenhuma ação de ciclo de vida gravava o snapshot.
2. **Falta de Idempotência Formal**: Não havia uma garantia de que, caso um snapshot já existisse, atualizações posteriores na competição preservassem o snapshot original intacto.
3. **Decisões de Integridade Descentralizadas**: A permissão para alterar regras esportivas dependia de verificações isoladas (`playedMatchesCount > 0` vs `matches.length > 0`), sem distinção entre categorias de dados (regras esportivas vs configurações operacionais vs metadados).
4. **Vulnerabilidade de Integridade Temporal**: Sem travas ativas na gravação de resultados, competições arquivadas (`completed` ou `cancelled`) podiam receber alterações indevidas.

---

## 3. Modelo Final do Ciclo de Vida

O modelo unificado e canônico de estados da competição é:

```text
planning (ou draft)
       ↓
registration-open (ou registration)
       ↓
registration-closed
       ↓
draw-pending / groups-defined
       ↓
in-progress  ──▶ [FREEZE rulesSnapshot] (Idempotente & Imutável)
       ↓
playoffs
       ↓
completed    ──▶ [LOCK TOTAL de Jogos e Resultados]
       │
       └── (a qualquer momento antes de completed) ──▶ cancelled
```

---

## 4. Tabela de Transições e Regras

| Estado Atual | Ação Solicitada | Estado Alvo | Permitido | Condições e Efeitos |
| :--- | :--- | :--- | :---: | :--- |
| `planning` / `draft` | Abrir Inscrições | `registration-open` | Sim | Exige nome e formatos configurados |
| `registration-open` | Fechar Inscrições | `registration-closed` | Sim | Exige mínimo de equipes inscritas para os grupos |
| `registration-closed` | Liberar Sorteio | `draw-pending` | Sim | Exige ao menos 2 equipes confirmadas |
| `draw-pending` | Iniciar Jogos | `in-progress` | Sim | **Gera e congela `rulesSnapshot`**. Exige confrontos gerados. |
| `in-progress` | Iniciar Mata-mata | `playoffs` | Sim | Exige todos os jogos da fase de grupos finalizados/homologados |
| `playoffs` / `in-progress` | Finalizar Torneio | `completed` | Sim | Exige todas as partidas concluídas/homologadas e pódio definido. **Bloqueio total de edição**. |
| Qualquer (antes de completed) | Cancelar Torneio | `cancelled` | Sim | Cancela a competição e bloqueia novas partidas/resultados |
| `completed` | Reverter status | Qualquer | **Não** | Bloqueado: estados terminais são irreversíveis |

---

## 5. Lock das Regras (Granularidade)

O BaseOS classifica os dados da competição em três categorias estritas:

### Categoria A — Regras Esportivas Históricas
- **Propriedades**: `setRules`, `setsToWin`, `scoring` (pontos por vitória/derrota/WO), `standings` (critérios de desempate), `registration` (limites de atletas, líberos e capitães).
- **Regra**: `canEditRules(competition, matches)` retorna `false` assim que a competição atinge `in-progress`, `playoffs`, `completed`, `cancelled` ou caso haja partidas cadastradas/jogadas.
- **Efeito**: Nenhuma dessas propriedades pode ser alterada. Leituras utilizam incondicionalmente o `rulesSnapshot`.

### Categoria B — Configurações Operacionais
- **Propriedades**: Locais (`venue`), datas (`startDate`, `endDate`), intervalo padrão de partidas, tempo de descanso.
- **Regra**: Editáveis enquanto a competição não estiver finalizada (`completed`) ou cancelada (`cancelled`).

### Categoria C — Metadados Administrativos
- **Propriedades**: Nome, descrição, observações.
- **Regra**: Editáveis por administradores autorizados.

---

## 6. Snapshot de Regras (`rulesSnapshot`)

O método canônico de congelamento foi centralizado em:
```ts
CompetitionLifecycleService.freezeRulesSnapshot(competition: CompetitionRecord): CompetitionRecord
```

- **Idempotência**: Se `competition.rulesSnapshot` já existe, a função retorna o registro existente sem nenhuma alteração.
- **Imutabilidade**: O snapshot é uma cópia profunda (`deep copy`) da configuração efetiva gerada pelo `CompetitionRulesService.createRulesSnapshot`.
- **Prevalência**: Uma vez gravado o snapshot, qualquer alteração posterior no objeto `config` externo é ignorada pelo motor de cálculo (`CompetitionRulesService.getConfig`), que consome estritamente o `rulesSnapshot`.

---

## 7. Integridade de Partidas, Resultados e Classificação

1. **Gravação de Resultados**:
   - `CompetitionLifecycleService.canRecordResult(competition, match)` é validado antes de persistir resultados em `MatchesPage` e na mesa do apontador (`LiveScorerDeskModal`).
   - Competições `completed` ou `cancelled` rejeitam qualquer tentativa de lançamento de placar.
   - Partidas `homologated` ou `cancelled` não aceitam novos resultados sem reabertura formal.
2. **Classificação Oficial**:
   - `standingsService` e `computeStandingsByGroup` consideram apenas partidas com status `completed` ou `homologated`.
   - Pontuações de cada partida são calculadas com base nas regras congeladas no `rulesSnapshot`.

---

## 8. Concorrência e Proteção contra Race Conditions

- A idempotência do `freezeRulesSnapshot` garante que múltiplos disparos simultâneos de início de competição não gerem snapshots divergentes nem sobrescrevam o estado já congelado.
- Gravações no banco/LocalStorage realizam patches atômicos em `updateCompetition` e `updateMatch`.

---

## 9. Banco de Dados e Supabase / RLS

Foi criada a migration não-destrutiva:
`supabase/migrations/20260903000001_competition_lifecycle_and_rules.sql`

```sql
alter table public.competitions
  add column if not exists config jsonb,
  add column if not exists rules_snapshot jsonb;

create index if not exists idx_competitions_status on public.competitions (status);
```

- As políticas RLS existentes (`competitions_public_read` e `competitions_auth_write`) garantem leitura pública e escrita restrita a usuários autenticados autorizados (`competition:edit`).
- Paridade total de campos entre LocalStorage e PostgreSQL (`toSnake` / `toCamel` mapeiam `rulesSnapshot` ↔ `rules_snapshot` e `config` ↔ `config`).

---

## 10. Respostas Obrigatórias da Auditoria de Integridade Final

### Pergunta 1: Existe mais de um lugar decidindo se a competição pode ser iniciada?
**Não.** A decisão é centralizada exclusivamente em `CompetitionLifecycleService.validateTransition(competition, 'in-progress', context)`.

### Pergunta 2: Existe mais de um lugar decidindo se as regras podem ser alteradas?
**Não.** A decisão é centralizada exclusivamente em `CompetitionLifecycleService.canEditRules(competition, matches)` (e espelhada em `CompetitionRulesService.areRulesLocked`).

### Pergunta 3: Existe algum caminho legítimo que permite alterar regras depois do congelamento?
**Não.** O formulário de edição bloqueia os campos via `areRulesLocked`, e o motor de regras consome incondicionalmente o `rulesSnapshot`, ignorando mutações posteriores.

### Pergunta 4: Existe algum caminho que permite registrar resultado inválido?
**Não.** Todo resultado passa obrigatoriamente por `CompetitionRulesService.validateMatchScore` antes da persistência, e a permissão de gravação é validada por `CompetitionLifecycleService.canRecordResult`.

### Pergunta 5: Existe algum caminho que permite uma competição encerrada receber uma partida indevidamente?
**Não.** `CompetitionLifecycleService.canCreateMatch` bloqueia a criação de partidas se o status for `completed` ou `cancelled`.

### Pergunta 6: Existe algum caminho que permite alteração de configuração reinterpretar resultados históricos?
**Não.** Porque as regras utilizadas na classificação e validação vêm do `rulesSnapshot` congelado, e não da `config` mutável.

### Pergunta 7: O `rulesSnapshot` pode ser sobrescrito acidentalmente?
**Não.** `freezeRulesSnapshot` verifica `if (competition.rulesSnapshot) return competition;`, garantindo preservação incondicional do snapshot original.

### Pergunta 8: A RLS permite operações que a aplicação considera proibidas?
**Não.** A política `competitions_auth_write` exige autenticação e todas as mutações passam pelo adapter unificado `dataAccess.ts`, onde as regras de ciclo de vida são aplicadas.

---

## 11. Testes e Validação da Fase 4.4

- Suíte de ciclo de vida expandida: `src/test/competitionLifecycleService.test.ts` (18 testes).
- Suíte de integração ponta a ponta criada: `src/test/competitionLifecycleIntegration.test.ts` (1 teste completo cobrindo criação, parametrização, congelamento, tentativa de adulteração, resultado, classificação e finalização).
- Total da suíte do projeto: **65 arquivos de teste, 517 testes aprovados (100% verde)**.
- TypeScript: 0 erros (`tsc` limpo).
- ESLint: 0 erros.
- Build: Concluído com sucesso pelo Vite v5.4 em 56.43s.
