# WALKTHROUGH — FASE 7.3: AUDITORIA TÉCNICA PROFUNDA DO AMBIENTE DEV

## 1. O QUE FOI ANALISADO
Nesta auditoria técnica factual e não-destrutiva, foram investigados os seguintes domínios do projeto BaseOS no ambiente de desenvolvimento:
- **Camada de Acesso a Dados (`src/services/dataAccess.ts`):** Todos os métodos de CRUD do `supabaseAdapter` e do `localStorageAdapter`, mappers `toSnake` / `toCamel`, semântica de `update`/`patch`, e estratégia de geração de IDs.
- **Banco de Dados DEV (`volei_test_db` em container Docker `supabase-db`):** Schemas de tabelas, colunas, tipos, constraints NOT NULL, chaves primárias, defaults, chaves estrangeiras, enums (`pg_enum`) e policies de RLS (`pg_policies`).
- **Migrações SQL (`supabase/migrations/`):** Todos os 16 arquivos de migração existentes no repositório foram confrontados com o estado real das tabelas do banco DEV.
- **Tipos TypeScript (`src/types/entities.ts`):** Confronto com os contratos de banco de dados e mapeamento de campos ausentes ou divergentes.
- **Fluxos de Negócio e Serviços:** Inscrição pública de equipes e atletas (`registrationService.ts`), homologação de partidas e seleção de MVP (`MatchMvpSelector`, `MatchHomologationDialog`), cálculo de classificação (`standingsService.ts`), e geração de súmulas e relatórios (`document-engine/baseos/`, `matchSheetPdf.ts`, `reportsPdf.ts`).
- **Suíte de Testes Automatizados (`src/test/`):** Execução e análise dos 107 arquivos de teste, verificando a acurácia dos mocks e o motivo pelo qual a falha de inserção de IDs não foi capturada previamente.

---

## 2. COMO A AUDITORIA FOI EXECUTADA
1. **Inspeção de Integridade do Git:** Verificação da branch (`main`), commit inicial (`0509406`), ausência de arquivos pendentes e garantia de preservação do worktree.
2. **Inspeção do Banco DEV via Container:** Execução de consultas SQL de metadados (`information_schema.columns`, `pg_enum`, `pg_tables`, `pg_policies`) no container `supabase-db` através de `docker exec`.
3. **Análise Estática de Código:** Busca global de todas as chamadas `.insert()`, `.update()`, `.upsert()`, conversões de ID e enums no código TypeScript.
4. **Execução da Suíte de Verificação Oficial:**
   - `npx tsc -p tsconfig.app.json --noEmit`
   - `npm run lint` (`npx eslint src`)
   - `npm test -- --run`
   - `npm run build`
5. **Consolidação das Evidências:** Elaboração da matriz de problemas e contratos no relatório formal `docs/audits/FASE-7.3-AUDITORIA-TECNICA-DEV.md`.

---

## 3. ARQUIVOS E FONTES ANALISADAS

### 3.1 Código Fonte e Configurações
- `src/services/dataAccess.ts`
- `src/services/registrationService.ts`
- `src/services/standingsService.ts`
- `src/types/entities.ts`
- `src/App.tsx`
- `src/components/MatchHomologationDialog.tsx`
- `src/components/MatchMvpSelector.tsx`
- `src/components/DrawArenaCanvas.tsx`
- `src/document-engine/baseos/`
- `src/lib/pdf/matchSheetPdf.ts`
- `src/lib/pdf/reportsPdf.ts`
- `src/test/dataAccessAdapter.test.ts`
- `src/test/standingsPage.test.tsx`
- `src/test/baseosScoresheetConsolidation.test.ts`
- `src/test/document-engine/baseos/generateInspectionPdfs.test.ts`

### 3.2 Banco de Dados DEV e Migrações
- Banco: PostgreSQL 15.1 (`volei_test_db` em localhost:5432)
- Migrações analisadas:
  - `supabase/migrations/20260901000001_initial_schema.sql`
  - `supabase/migrations/20260901000004_rls_policies.sql`
  - `supabase/migrations/20260901000006_public_registration_functions.sql`
  - `supabase/migrations/20260905000001_sync_competition_lifecycle_statuses.sql`
  - `supabase/migrations/20260905000002_venues_and_schedules.sql`
  - `supabase/migrations/20260905000005_app_settings.sql`
  - `supabase/migrations/20260910000002_match_highlight_athlete.sql`
  - (e todas as demais 9 migrações intermediárias)

---

## 4. PROBLEMAS ENCONTRADOS E EVIDÊNCIAS TÉCNICAS

### 4.1 Problemas de Severidade P0 (Bloqueantes)
1. **Omissão de ID na Criação de Entidades no `supabaseAdapter`:**
   - *Evidência:* No banco DEV, `referees.id`, `venues.id`, `matches.id`, `competition_draws.id` e `audit_logs.id` são `text NOT NULL` sem valor padrão (`column_default IS NULL`). Em `src/services/dataAccess.ts`, os métodos correspondentes montavam payloads omitindo a propriedade `id`.
   - *Comportamento:* PostgREST retorna `400 Bad Request` com código PostgreSQL `23502 (not_null_violation)`.
2. **Incompatibilidade Fatal do Enum `match_status`:**
   - *Evidência:* No PostgreSQL, `SELECT enumlabel FROM pg_enum WHERE typname = 'match_status'` retornou apenas 8 valores. O status `'homologated'` não consta no enum do banco.
   - *Comportamento:* Ao finalizar e homologar uma partida, o banco recusa a atualização com erro `22P02 (invalid_text_representation)` (HTTP 400).
3. **Ausência da Coluna de MVP `highlight_athlete_id`:**
   - *Evidência:* Consulta a `information_schema.columns` na tabela `matches` confirmou que a coluna `highlight_athlete_id` não existe no banco DEV, indicando que a migração `20260910000002_match_highlight_athlete.sql` não foi aplicada.
   - *Comportamento:* Qualquer tentativa de salvar o MVP da partida falha com erro `42703 (undefined_column)` (HTTP 400).

### 4.2 Problemas de Severidade P1 (Falhas Funcionais Importantes)
1. **Tabelas Pendentes de Execução no Banco DEV:** `venues` e `app_settings` possuem migrações no repositório, mas não existem no banco DEV.
2. **Tabelas Referenciadas no Código sem Migração Existente:** `modalities`, `persons`, `document_edits` e `template_layouts` estão mapeadas em `dataAccess.ts`, mas não possuem arquivo `.sql` de criação em `supabase/migrations/`.
3. **Bloqueio de RLS na Inscrição Pública de Atletas:** O frontend chama `dataAccess.createCompetitionAthlete` (INSERT direto) em vez de chamar a RPC `register_athlete` (`SECURITY DEFINER`). Como a policy na tabela requer usuário autenticado, a rota pública `/equipe/inscricao/:token` falha para usuários externos não autenticados.
4. **Mocks de Teste Permissivos:** `src/test/dataAccessAdapter.test.ts` gerava IDs automáticos (`id: payload.id || `${table}-novo``) durante o mock de `insert`, impedindo que os testes detectassem a ausência de IDs nos payloads reais.

---

## 5. RESULTADOS DOS TESTES E COMANDOS EXECUTADOS

| Verificação | Comando | Duração | Resultado | Detalhes |
| :--- | :--- | :---: | :---: | :--- |
| **TypeScript** | `npx tsc -p tsconfig.app.json --noEmit` | 4.12s | 🟢 **PASS** | 0 erros de compilação. Tipagem 100% íntegra. |
| **ESLint** | `npm run lint` | 3.85s | 🟢 **PASS** | 0 erros. 1 warning de hook em `DrawArenaCanvas.tsx:438`. |
| **Vitest Unit** | `npm test -- --run` | 788.77s | 🟡 **994/999 PASS** | 104 arquivos passaram, 3 falharam por timeout sob concorrência de CPU (standingsPage, scoresheetConsolidation, generateInspectionPdfs). |
| **Vite Build** | `npm run build` | 3m 21s | 🟢 **PASS** | Código de saída 0. Assets otimizados gerados em `dist/`. |

---

## 6. O QUE NÃO FOI ALTERADO (ESTRITA ADERÊNCIA À REGRA DE AUDITORIA)

- **Nenhum arquivo em `src/` foi modificado.** Não houve correções antecipadas, refatores, nem ajustes cosméticos.
- **O banco de dados DEV não sofreu alterações:** Nenhuma migração foi executada, nenhuma coluna foi criada, nenhum registro foi deletado ou alterado.
- **O ambiente de produção (VOLTZ) permaneceu 100% intocado:** Não houve conexão SSH, deploy, reinício de serviço ou acesso aos seus dados.
- **Nenhum teste foi alterado** para mascarar falhas.
- **Os únicos arquivos novos criados no repositório foram a documentação técnica:**
  1. `docs/audits/FASE-7.3-AUDITORIA-TECNICA-DEV.md`
  2. `docs/walkthroughs/FASE-7.3-AUDITORIA-TECNICA-DEV.md`

---

## 7. LIMITAÇÕES DA AUDITORIA
- A suíte de testes unitários foi executada em paralelo em ambiente compartilhado, gerando timeouts em 3 arquivos com processamento massivo de CPU (renderização pesada de PDF em disco). A execução isolada desses testes confirma que sua lógica interna está funcional.
- Como a regra fundamental da Fase 7.3 era **NÃO ALTERAR NADA**, as correções dos bugs confirmados (P0 e P1) não foram aplicadas e aguardam a Fase 7.4.

---

## 8. RECOMENDAÇÕES PARA A FASE 7.4 (CORREÇÃO CIRÚRGICA)

1. **Passo 1 (Banco DEV):** Aplicar migrações pendentes em DEV (`20260905000002`, `20260905000005`, `20260910000002`).
2. **Passo 2 (Banco DEV):** Criar e rodar migração para atualizar o enum `match_status` adicionando `'homologated'` e os demais estados do ciclo de vida.
3. **Passo 3 (Banco DEV):** Criar e rodar migração adicionando `DEFAULT gen_random_uuid()::text` nas colunas `id` de todas as tabelas públicas.
4. **Passo 4 (Código):** Atualizar `src/services/dataAccess.ts` para injetar `id: record.id || generateId()` em todos os métodos de criação do `supabaseAdapter`.
5. **Passo 5 (Código):** Atualizar `registrationService.ts` para usar a RPC `register_athlete` na inscrição pública por token.
6. **Passo 6 (Testes):** Enrijecer os mocks em `src/test/dataAccessAdapter.test.ts` para validar a presença de IDs nos payloads.

---

## 9. STATUS FINAL
- **Auditoria da Fase 7.3:** CONCLUÍDA
- **Relatório Completo:** `docs/audits/FASE-7.3-AUDITORIA-TECNICA-DEV.md`
- **Ambiente DEV:** Diagnosticado e plenamente preparado para a Fase 7.4.
