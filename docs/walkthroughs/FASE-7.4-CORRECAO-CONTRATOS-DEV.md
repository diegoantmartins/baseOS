# BASEOS — FASE 7.4: WALKTHROUGH DE CORREÇÃO CIRÚRGICA DE CONTRATOS DEV
**Data Access, Database, Lifecycle, MVP e Inscrição Pública**

- **Data da Execução:** 12 de Setembro de 2026
- **Status Final:** **GO**
- **Ambiente:** DEV Exclusivo (Local / Docker: `supabase-db` PostgreSQL 15, Vite Dev/Build)
- **Instância de Produção (VOLTZ):** **100% CONGELADA / INTOCADA** (Zero conexões, zero acessos, zero alterações)

---

## 1. O QUE FOI ANALISADO

Em conformidade com o diagnóstico da Fase 7.3 e as regras da Fase 7.4, foram auditados e confrontados:
1. **Camada de Acesso a Dados (`src/services/dataAccess.ts`):**
   - Comparação linha a linha entre os métodos do `localStorageAdapter` e do `supabaseAdapter`.
   - Mapeamento das rotinas de INSERT: geração de `id`, mappers `toSnake`/`toCamel`, repasse de `access_token` e tratamento de erros PostgREST.
2. **Serviço de Inscrição e Rota Pública (`src/services/registrationService.ts`):**
   - Fluxo da tela pública `/equipe/inscricao/:token` consumida por gestores de equipe.
   - Análise de privilégios RLS na tabela `competition_athletes` vs. a função RPC `public.register_athlete(p_token, ...)` com privilégios `SECURITY DEFINER`.
3. **Migrações e Schema do PostgreSQL DEV:**
   - Auditoria do catálogo do banco local `volei_test_db` (`information_schema.columns`, `pg_enum`, `pg_tables`, `pg_indexes`).
   - Verificação das migrações pendentes em `supabase/migrations/`:
     - `20260819000000_venues_logos_phases.sql` (criação da tabela `venues`)
     - `20260818000002_app_settings.sql` (criação da tabela `app_settings`)
     - `20260910000002_match_highlight_athlete.sql` (coluna `highlight_athlete_id` em `matches`)
     - Definição do enum `match_status`.
4. **Ciclo de Vida de Partidas e MVP (Fases 7.2 / 7.2.1):**
   - `MatchRecord`, `entities.ts`, `MatchHomologationDialog.tsx`, `MatchMvpSelector.tsx`, `getEligibleHighlightAthletes`.
   - Compatibilidade de tipos e integridade referencial com a tabela `matches`.
5. **Mocks de Testes Unitários (`src/test/dataAccessAdapter.test.ts`):**
   - Comportamento permissivo do mock `insert`, que sintetizava chaves primárias e ocultava violações da restrição `NOT NULL`.
6. **Entidades sem Migração:**
   - Investigação de `modalities`, `persons`, `document_edits` e `template_layouts`.

---

## 2. O QUE FOI ALTERADO

Modificações estritamente cirúrgicas focadas na coerência de contratos, sem qualquer refatoração desnecessária ou alteração de layout:

### 2.1 Código TypeScript
- **`src/services/dataAccess.ts`:**
  - Injetada a geração canônica de identificadores prefixados (`generateId`) em todos os métodos de criação do `supabaseAdapter`:
    - `createCompetition` (`comp-`)
    - `createTeam` (`team-`)
    - `createReferee` (`ref-`)
    - `createVenue` (`venue-`)
    - `createMatch` (`match-`)
    - `saveDraw` e `saveDrawWithMatches` (`draw-`)
    - `createCompetitionTeam` (`ct-`)
    - `createCompetitionAthlete` (`ath-`)
    - `addAuditLog` (`audit-`)
  - Adicionado o contrato `registerAthletePublic(token, input)` na interface de `dataAccess`, implementado tanto no `localStorageAdapter` quanto no `supabaseAdapter` (que despacha para `supabase.rpc('register_athlete', ...)`).
- **`src/services/registrationService.ts`:**
  - Atualizado o método `addAthlete`: ao operar em contexto público com `team.accessToken`, delega para `dataAccess.registerAthletePublic`, garantindo inserção via `SECURITY DEFINER` com validação de regras de negócio, preservando o fallback administrativo `createCompetitionAthlete` para sessões autenticadas.
- **`src/test/dataAccessAdapter.test.ts`:**
  - Mock de `insert` endurecido para reproduzir a constraint `NOT NULL` do PostgreSQL (lança erro `23502` se `payload.id` estiver ausente).
  - Adicionados testes unitários específicos para validar `createCompetitionTeam`, `createCompetitionAthlete`, `createReferee`, `createVenue`, a RPC `registerAthletePublic` e o bloqueio de payloads sem ID.

### 2.2 Migrações e Banco de Dados DEV
- **`supabase/migrations/20260912000001_match_lifecycle_enum_sync.sql` (Nova migração):**
  - Adiciona ao enum PostgreSQL `match_status` os 7 valores canônicos faltantes do domínio: `'awaiting_schedule'`, `'negotiating'`, `'sheet_available'`, `'awaiting_homologation'`, `'homologated'`, `'rescheduled'`, `'wo'`.
- **Aplicação no PostgreSQL DEV (`volei_test_db`):**
  - Executadas as migrações estruturais pendentes (`venues`, `app_settings`, `matches.highlight_athlete_id` e a sincronização do enum `match_status`).

---

## 3. DECISÕES TÉCNICAS

1. **Rejeição do `DEFAULT gen_random_uuid()` genérico no PostgreSQL:**
   - *Motivo:* A arquitetura do BaseOS utiliza identificadores semânticos com prefixo (`ct-UUID`, `ath-UUID`, `match-UUID`, etc.), fundamentais para rastreabilidade em logs, auditoria, testes e compatibilidade com o `localStorageAdapter`. A responsabilidade correta é do adaptador injetar o ID da entidade caso o chamador não forneça.
2. **Uso Exclusivo da RPC `register_athlete` na Inscrição Pública:**
   - *Motivo:* A tabela `competition_athletes` possui política de RLS que bloqueia INSERT direto para a role `anon`. A rota pública `/equipe/inscricao/:token` deve utilizar a RPC `register_athlete`, que roda com `SECURITY DEFINER`, valida a trava da equipe (`is_locked`), prazo da competição (`registration_deadline`), unicidade de camisa e limites máximos de elenco.
3. **Não-criação de tabelas artificiais sem especificação:**
   - *Motivo:* As entidades `modalities`, `persons`, `document_edits` e `template_layouts` nunca tiveram migrações criadas no histórico do repositório. Criar tabelas arbitrariamente poderia desalinhar o ambiente DEV da arquitetura de dados planejada. Elas continuam registradas como pendências arquiteturais de longo prazo.
4. **Criação de Migração Incremental para o Enum `match_status`:**
   - *Motivo:* As migrações históricas não devem ser editadas. Criou-se a migração `20260912000001_match_lifecycle_enum_sync.sql` com comandos `ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS ...`, garantindo execução idempotente e segura.

---

## 4. BANCO DE DADOS (POSTGRESQL DEV)

### 4.1 Schema Antes vs. Depois

| Objeto / Coluna | Antes (Fase 7.3) | Depois (Fase 7.4) | Status |
| :--- | :--- | :--- | :---: |
| `public.venues` | Tabela inexistente | Tabela criada com PK, índices e constraints | ✅ Alinhado |
| `public.app_settings` | Tabela inexistente | Tabela criada com `key text PRIMARY KEY` | ✅ Alinhado |
| `matches.highlight_athlete_id` | Coluna inexistente | `text REFERENCES competition_athletes(id)` | ✅ Alinhado |
| `matches.lineups` | Coluna inexistente | `jsonb DEFAULT '{}'` | ✅ Alinhado |
| `teams.logo_url` | Coluna inexistente | `text` | ✅ Alinhado |
| `public.match_status` (Enum) | 8 valores (sem `homologated`) | 15 valores canônicos (100% alinhado ao TS) | ✅ Alinhado |

### 4.2 Migrações Aplicadas no DEV
1. `supabase/migrations/20260819000000_venues_logos_phases.sql`
2. `supabase/migrations/20260818000002_app_settings.sql`
3. `supabase/migrations/20260910000002_match_highlight_athlete.sql`
4. `supabase/migrations/20260912000001_match_lifecycle_enum_sync.sql`

---

## 5. CÓDIGO E CONTRATOS

### 5.1 Matriz de Geração de IDs

| Método no `dataAccess` | Tabela PostgREST | Geração no SupabaseAdapter | Prefixo |
| :--- | :--- | :--- | :---: |
| `createCompetition` | `competitions` | `input.id \|\| generateId('comp')` | `comp-` |
| `createTeam` | `teams` | `input.id \|\| generateId('team')` | `team-` |
| `createCompetitionTeam` | `competition_teams` | `input.id \|\| generateId('ct')` | `ct-` |
| `createCompetitionAthlete` | `competition_athletes` | `input.id \|\| generateId('ath')` | `ath-` |
| `createReferee` | `referees` | `input.id \|\| generateId('ref')` | `ref-` |
| `createVenue` | `venues` | `input.id \|\| generateId('venue')` | `venue-` |
| `createMatch` | `matches` | `match.id \|\| generateId('match')` | `match-` |
| `saveDraw` | `draws` | `existing?.id \|\| generateId('draw')` | `draw-` |
| `saveDrawWithMatches` | `draws` | `existingDraw?.id \|\| generateId('draw')` | `draw-` |
| `addAuditLog` | `audit_logs` | `entry.id \|\| generateId('audit')` | `audit-` |

### 5.2 Fluxo de Inscrição Pública vs. Administrativo

```
Fluxo Administrativo (Logado / Organização):
  Admin UI → registrationService.addAthlete() 
           → dataAccess.createCompetitionAthlete() [ID: ath-...] 
           → INSERT competition_athletes (RLS: authenticated)

Fluxo Público (Gestor da Equipe via Link):
  /equipe/inscricao/:token → registrationService.addAthlete(teamWithToken)
                           → dataAccess.registerAthletePublic(token, input)
                           → supabase.rpc('register_athlete', { p_token, ... })
                           → PostgreSQL valida regras & insere (SECURITY DEFINER)
```

---

## 6. TESTES E VERIFICAÇÕES (EVIDÊNCIAS REAIS)

### 6.1 Verificações Automatizadas

| Verificação | Comando | Resultado | Métricas / Detalhes |
| :--- | :--- | :---: | :--- |
| **Typecheck** | `npx tsc -p tsconfig.app.json --noEmit` | 🟢 **PASS** | 0 erros de tipagem |
| **Linter** | `npm run lint` | 🟢 **PASS** | 0 erros (1 warning pré-existente de hook no DrawArenaCanvas) |
| **Suites Focadas Vitest** | `npx vitest run src/test/...` | 🟢 **PASS** | **100/100 testes passaram** |
| - `dataAccessAdapter.test.ts` | Unitário de contratos e mocks | 🟢 PASS | 14/14 testes |
| - `registrationService.test.ts` | Regras de inscrição de elenco | 🟢 PASS | 18/18 testes |
| - `matchesPage.test.tsx` | UI e persistência de partidas | 🟢 PASS | 7/7 testes |
| - `matchHighlightDomain.test.ts`| Regras e elegibilidade do MVP | 🟢 PASS | 19/19 testes |
| - `e2ePhase62Homologation.test.ts`| E2E de homologação e ciclo de vida | 🟢 PASS | 24/24 testes |
| - `standingsPage.test.tsx` | Classificação e desempate | 🟢 PASS | 7/7 testes |
| - `baseosScoresheetConsolidation.test.ts` | Súmula e consolidação de súmula | 🟢 PASS | 10/10 testes |
| - `generateInspectionPdfs.test.ts` | Geração de PDFs de inspeção | 🟢 PASS | 1/1 teste |
| **Build de Produção** | `npm run build` | 🟢 **PASS** | Exit code 0 (bundle gerado com sucesso em 1m 7s) |

### 6.2 Testes Funcionais Reais no PostgreSQL DEV (`volei_test_db`)

Executado script de integração real com operações transacionais no container `supabase-db`:

- **Fluxo A — Equipe e Vínculo (`competition_teams`):**
  - Criação da competição `comp-test-74`, equipe `team-test-74` e vínculo `competition_teams` com chave `ct-test-74-1`.
  - Verificação no banco: Registro localizado, `id` preenchido e íntegro. 🟢 **PASS**
- **Fluxo B — Atleta Administrativo (`competition_athletes`):**
  - Criação de atleta via inserção administrativa com chave `ath-test-74-1`.
  - Verificação no banco: Registro persistido com sucesso. 🟢 **PASS**
- **Fluxo C — Inscrição Pública via RPC (`register_athlete`):**
  - Configuração de equipe com `access_token = 'token-fase-74-test'`, competição com status `registration-open` e prazo futuro.
  - Execução da chamada RPC `public.register_athlete` operando com role `anon`.
  - Verificação: Retorno `{"ok": true, "athlete_id": "ath-...", "team_id": "..."}`. Zero erro de violação de RLS. 🟢 **PASS**
- **Fluxo D — Homologação de Partida e MVP:**
  - Partida criada com status inicial `completed`.
  - Atualizada para `status = 'homologated'` e `highlight_athlete_id = 'ath-test-74-1'`.
  - Verificação: Partida salva com sucesso sem erro `22P02`, coluna de MVP preenchida e FK validada. 🟢 **PASS**

---

## 7. MATRIZ DE RESULTADOS

| Categoria | Status | Observações |
| :--- | :---: | :--- |
| **Correção de Contratos de ID** | **PASS** | Todos os métodos do `supabaseAdapter` fornecem IDs prefixados |
| **Sincronização de Enum `match_status`** | **PASS** | 15 valores suportados no PostgreSQL DEV sem erro 22P02 |
| **Suporte a MVP (`highlight_athlete_id`)** | **PASS** | Coluna criada, indexada e integrada ao domínio |
| **Inscrição Pública via RPC** | **PASS** | RLS preservado e seguro com `SECURITY DEFINER` |
| **Endurecimento de Mocks** | **PASS** | Mock agora rejeita inserts sem ID simulando erro 23502 |
| **Testes Unitários & E2E** | **PASS** | 100% das suites focadas aprovadas |
| **Compilação TypeScript** | **PASS** | 0 erros |
| **Build de Produção** | **PASS** | Compilação limpa (exit code 0) |
| **Testes Funcionais DEV** | **PASS** | 4 fluxos reais executados contra o PostgreSQL local |
| **Produção VOLTZ** | **NOT EXECUTED** | Conforme regra fundamental (Produção congelada) |

---

## 8. PENDÊNCIAS E LIMITAÇÕES

1. **Entidades Modalities, Persons, Document Edits e Template Layouts:**
   - Permitem uso no adaptador LocalStorage, mas não possuem tabelas no banco de dados. Uma futura fase de expansão funcional poderá especificar essas estruturas no PostgreSQL se o módulo de templates corporativos for ativado no banco.
2. **Ambiente de Produção VOLTZ:**
   - As migrações executadas no banco DEV (`20260819000000`, `20260818000002`, `20260910000002` e `20260912000001`) deverão ser aplicadas em produção apenas durante a janela de release formal.

---

## 9. RISCOS PARA A FUTURA RELEASE EM PRODUÇÃO

- **Risco 1 (Ordem de Migrações em Produção):** As migrações devem ser aplicadas antes do deploy do novo bundle JS na VOLTZ para que o banco já conheça o novo enum `match_status` e a coluna `highlight_athlete_id`.
  - *Mitigação:* Todas as migrações são estritamente aditivas e idempotentes (`IF NOT EXISTS`), garantindo risco zero de indisponibilidade.
- **Risco 2 (Cache de Schema do PostgREST):** Após aplicar as migrações no banco de produção, pode ser necessário enviar o sinal `NOTIFY pgrst, 'reload schema'` para que o PostgREST reconheça as novas colunas e enums imediatamente.

---

## 10. STATUS FINAL

### Classificação: **GO**

O ambiente DEV do BaseOS encontra-se plenamente estabilizado, com contratos perfeitamente alinhados entre TypeScript, Data Access, Migrações e PostgreSQL, com suíte de testes aprovada e sem qualquer impacto ou intervenção no ambiente de produção VOLTZ.
