# BASEOS — FASE 7.4: AUDITORIA DE CORREÇÃO CIRÚRGICA DE CONTRATOS DEV
**Data Access, Database, Lifecycle, MVP e Inscrição Pública**

- **Data da Execução:** 12 de Setembro de 2026
- **Status da Fase 7.4:** CONCLUÍDA COM SUCESSO (GO)
- **Ambiente:** DEV Exclusivo (Local / Docker: `supabase-db` PostgreSQL 15, Vite Dev/Build)
- **Ambiente de Produção (VOLTZ):** INTOCADO (Zero acesso, zero conexões, zero modificações)
- **Responsável:** Engenheiro de Software Sênior / Arquiteto de Sistemas BaseOS

---

## 1. DIAGNÓSTICO INICIAL (HERDADO DA FASE 7.3)
A auditoria profunda da Fase 7.3 comprovou que o erro operacional `POST /rest/v1/competition_teams → 400 Bad Request` não era isolado, mas sim parte de uma classe de falhas contratuais entre o TypeScript, os Adaptadores de Dados, o PostgREST e o PostgreSQL no ambiente DEV:
- **Classe A (PK Obrigatória sem Geração):** As tabelas no PostgreSQL DEV possuem `id text NOT NULL` sem `DEFAULT`. Métodos no `supabaseAdapter` inseriam registros sem a chave `id`, disparando erro PostgreSQL `23502 (not-null constraint violation)`.
- **Divergência de Enum `match_status`:** O PostgreSQL DEV continha apenas 8 valores no tipo `match_status`, enquanto o TypeScript definia 15 estados. O status `'homologated'` gerava erro `22P02`.
- **Coluna MVP Ausente:** A migração que adicionava `highlight_athlete_id` à tabela `matches` não havia sido executada no banco DEV.
- **Tabelas Pendentes:** As tabelas `venues` e `app_settings` não existiam no banco DEV.
- **Inscrição Pública:** A rota `/equipe/inscricao/:token` realizava INSERT direto em `competition_athletes`, falhando na política RLS para usuários anônimos.
- **Mocks Permissivos:** O mock do Supabase em `src/test/dataAccessAdapter.test.ts` auto-gerava IDs falsos, mascarando as omissões de campos obrigatórios.

---

## 2. PROBLEMAS CONFIRMADOS
1. **[CONFIRMADO - P0]** Omissão de `id` nos métodos `createReferee`, `createVenue`, `createMatch`, `saveDraw` e `addAuditLog` no `supabaseAdapter`.
2. **[CONFIRMADO - P0]** Enum `match_status` desatualizado no PostgreSQL, impedindo persistência de partidas com status `'homologated'`.
3. **[CONFIRMADO - P0]** Coluna `matches.highlight_athlete_id` ausente no banco DEV.
4. **[CONFIRMADO - P1]** Ausência física das tabelas `venues` e `app_settings` no banco DEV.
5. **[CONFIRMADO - P1]** Bloqueio de RLS para usuários anônimos na inscrição pública de atletas devido à ausência de uso da RPC `register_athlete`.
6. **[CONFIRMADO - P1]** Mock em `dataAccessAdapter.test.ts` que auto-injetava IDs e mascarava violações de constraints.

---

## 3. PROBLEMAS DESCARTADOS / AVALIADOS COM PARCIMÔNIA
1. **[DESCARTADO] Adicionar `DEFAULT gen_random_uuid()` em massa a todas as tabelas:** Descartado para respeitar a arquitetura canônica do BaseOS, na qual a aplicação é a detentora da geração de identificadores prefixados (`ct-...`, `ath-...`, `comp-...`, `team-...`, `ref-...`, `venue-...`, `match-...`, `draw-...`, `audit-...`).
2. **[DESCARTADO] Criar tabelas artificiais para `modalities`, `persons`, `document_edits`, `template_layouts`:** A investigação comprovou que nenhuma dessas 4 entidades possui migração histórica no repositório. Criar tabelas arbitrariamente sem especificação formal foi rejeitado para evitar contaminação de schema que divirja da produção VOLTZ. Elas continuam operando no domínio local / templates.

---

## 4. ALTERAÇÕES DE BANCO DE DADOS (POSTGRESQL DEV)
No banco `volei_test_db` (container `supabase-db`), foram aplicadas com sucesso:
1. Criação da tabela `public.venues`, índices de fase/grupo e coluna `teams.logo_url`.
2. Criação da tabela `public.app_settings` e coluna `matches.lineups`.
3. Criação da coluna `matches.highlight_athlete_id` com chave estrangeira para `competition_athletes(id)` e índice parcial.
4. Atualização do enum `public.match_status` com os 7 valores canônicos faltantes: `'awaiting_schedule'`, `'negotiating'`, `'sheet_available'`, `'awaiting_homologation'`, `'homologated'`, `'rescheduled'`, `'wo'`.

---

## 5. MIGRATIONS APLICADAS
As seguintes migrações foram consolidadas no ambiente DEV:
- `supabase/migrations/20260819000000_venues_logos_phases.sql`
- `supabase/migrations/20260818000002_app_settings.sql`
- `supabase/migrations/20260910000002_match_highlight_athlete.sql`
- `supabase/migrations/20260912000001_match_lifecycle_enum_sync.sql` (Nova migração criada na Fase 7.4)

---

## 6. ALTERAÇÕES DE CÓDIGO FONTE
As modificações foram estritamente cirúrgicas e localizadas em apenas 3 arquivos:

### 6.1 `src/services/dataAccess.ts`
- **Geração de IDs Canônicos:**
  - `createCompetition`: Injeta `id: input.id || generateId('comp')`.
  - `createTeam`: Injeta `id: input.id || generateId('team')`.
  - `createReferee`: Injeta `id: input.id || generateId('ref')`.
  - `createVenue`: Injeta `id: input.id || generateId('venue')`.
  - `createMatch`: Injeta `id: match.id || generateId('match')`.
  - `saveDraw`: Garante `drawId = existing?.id || generateId('draw')`.
  - `saveDrawWithMatches`: Garante `drawId = existingDraw?.id || generateId('draw')`.
  - `createCompetitionTeam`: Injeta `id: input.id || generateId('ct')`.
  - `createCompetitionAthlete`: Injeta `id: input.id || generateId('ath')`.
  - `addAuditLog`: Injeta `id: entry.id || generateId('audit')`.
- **Inscrição Pública:**
  - Adicionado `registerAthletePublic(token, input)` tanto no `localStorageAdapter` quanto no `supabaseAdapter`.
  - No `supabaseAdapter`, invoca `supabase.rpc('register_athlete', ...)` repassando os parâmetros canônicos e retornando o atleta mapeado.

### 6.2 `src/services/registrationService.ts`
- Em `addAthlete`: quando `team.accessToken` estiver disponível e `dataAccess.registerAthletePublic` estiver configurado, despacha a chamada para a RPC pública segura, preservando o fallback administrativo `createCompetitionAthlete` para casos internos/admin.

### 6.3 `src/test/dataAccessAdapter.test.ts`
- Endurecido o mock de `insert`: lança erro simulando constraint NOT NULL do PostgreSQL (`PostgreSQL 23502`) se `payload.id` estiver ausente.
- Adicionados testes unitários para validar prefixos de ID e o fluxo de RPC pública `register_athlete`.

---

## 7. ARQUIVOS MODIFICADOS
```
M  src/services/dataAccess.ts
M  src/services/registrationService.ts
M  src/test/dataAccessAdapter.test.ts
A  supabase/migrations/20260912000001_match_lifecycle_enum_sync.sql
```

---

## 8. DECISÕES ARQUITETURAIS
1. **Preservação do Padrão de IDs Prefixo-UUID:** O BaseOS adota identificadores legíveis e semanticamente prefixados (`comp-UUID`, `team-UUID`, `match-UUID`, etc.). Em vez de transferir a geração para defaults opacos no banco, alinhou-se o `supabaseAdapter` para sempre fornecer a chave canônica, igualando seu comportamento ao `localStorageAdapter`.
2. **Separação RLS entre Admin CRUD e Inscrição Pública:** Usuários administradores autenticados continuam usando o método CRUD direto com RLS autenticado; gestores de equipe usando link público anônimo passam a usar a RPC `register_athlete`, que valida token, deadline, regras e insere como `SECURITY DEFINER`.
3. **Imutabilidade de Migrações Históricas:** Nenhuma migração existente foi alterada. Foi criada uma migração incremental (`20260912000001_match_lifecycle_enum_sync.sql`) para estender os tipos do PostgreSQL.

---

## 9. ESTRATÉGIA DE GERAÇÃO DE IDs

| Entidade | Prefixo | Geração no Código | Comportamento no DB |
| :--- | :---: | :--- | :--- |
| `competitions` | `comp` | `input.id \|\| generateId('comp')` | `id text PRIMARY KEY NOT NULL` |
| `teams` | `team` | `input.id \|\| generateId('team')` | `id text PRIMARY KEY NOT NULL` |
| `competition_teams` | `ct` | `input.id \|\| generateId('ct')` | `id text PRIMARY KEY NOT NULL` |
| `competition_athletes` | `ath` | `input.id \|\| generateId('ath')` | `id text PRIMARY KEY NOT NULL` |
| `matches` | `match` | `match.id \|\| generateId('match')` | `id text PRIMARY KEY NOT NULL` |
| `referees` | `ref` | `input.id \|\| generateId('ref')` | `id text PRIMARY KEY NOT NULL` |
| `venues` | `venue` | `input.id \|\| generateId('venue')` | `id text PRIMARY KEY NOT NULL` |
| `draws` | `draw` | `existing?.id \|\| generateId('draw')` | `id text PRIMARY KEY NOT NULL` |
| `audit_logs` | `audit` | `entry.id \|\| generateId('audit')` | `id text PRIMARY KEY NOT NULL` |

---

## 10. ESTRATÉGIA DE `match_status`
Alinhamento completo entre `MatchLifecycleStatus` (TypeScript) e o tipo enum `match_status` no PostgreSQL:
- Estados pré-jogo: `awaiting_schedule`, `negotiating`, `scheduled`, `sheet_available`
- Estados em quadra: `warmup`, `in-progress`, `timeout`, `set-break`
- Estados de encerramento: `completed`, `awaiting_homologation`, `homologated`
- Estados de exceção: `postponed`, `cancelled`, `rescheduled`, `wo`

---

## 11. ESTRATÉGIA DE MVP
- Coluna `matches.highlight_athlete_id` ativa no PostgreSQL DEV (`text REFERENCES competition_athletes(id) ON DELETE SET NULL`).
- Suporte a anulação explícita (`null`) e preservação de integridade em caso de exclusão de atleta.
- Preservados os fluxos de homologação e seleção de MVP (`MatchHomologationDialog`, `MatchMvpSelector`, `getEligibleHighlightAthletes`).

---

## 12. ESTRATÉGIA DE INSCRIÇÃO PÚBLICA
- Rota: `/equipe/inscricao/:token`
- Autenticação: Token de acesso exclusivo da equipe (`access_token`).
- Mecanismo Backend: Função PostgreSQL `public.register_athlete(p_token, ...)` com privilégios `SECURITY DEFINER`.
- Validações Garantidas pelo Banco:
  1. Existência e validade do token;
  2. Trava de equipe (`is_locked`);
  3. Prazo de inscrição (`registration_deadline`);
  4. Status da competição (`registration-open` ou `registration`);
  5. Duplicidade de número de camisa no elenco da equipe;
  6. Limite máximo de elenco dinâmico (`maxAthletes` das regras da competição).

---

## 13. ALTERAÇÕES NOS MOCKS DE TESTE
- O mock do Supabase em `src/test/dataAccessAdapter.test.ts` foi atualizado: qualquer tentativa de realizar `.insert(payload)` sem a propriedade `id` agora lança `Error: PostgreSQL 23502: null value in column "id" of relation "..." violates not-null constraint`.
- Adicionado mock para `supabase.rpc('register_athlete')`.

---

## 14. TESTES REALIZADOS E RESULTADOS
1. **TypeScript Typecheck (`npx tsc -p tsconfig.app.json --noEmit`):**
   - **Resultado:** 🟢 **PASS (0 erros)**
2. **ESLint (`npm run lint`):**
   - **Resultado:** 🟢 **PASS (0 erros, 1 warning residual pré-existente de hook em DrawArenaCanvas.tsx)**
3. **Testes Unitários Focados:**
   - `src/test/dataAccessAdapter.test.ts`: **14/14 PASS**
   - `src/test/registrationService.test.ts`: **18/18 PASS**
   - `src/test/matchesPage.test.tsx`: **7/7 PASS**
   - `src/test/matchHighlightDomain.test.ts`: **19/19 PASS**
   - `src/test/e2ePhase62Homologation.test.ts`: **24/24 PASS**
   - `src/test/standingsPage.test.tsx`: **7/7 PASS**
   - `src/test/baseosScoresheetConsolidation.test.ts`: **10/10 PASS**
   - `src/test/document-engine/baseos/generateInspectionPdfs.test.ts`: **1/1 PASS**
4. **Build de Produção (`npm run build`):**
   - **Resultado:** 🟢 **PASS (Código de saída 0, gerado em 1m 7s)**

---

## 15. TESTES FUNCIONAIS NO POSTGRESQL DEV
Executado script de integração real com 4 fluxos no container `supabase-db` (`volei_test_db`):
- **Fluxo A (Equipe):** Criação de competição, equipe e vínculo com ID explícito `ct-test-74-1` → 🟢 **PASS**
- **Fluxo B (Atleta Admin):** Cadastro direto de atleta com ID explícito `ath-test-74-1` → 🟢 **PASS**
- **Fluxo C (Inscrição Pública):** Chamada da RPC `register_athlete` com role `anon` e token de equipe → 🟢 **PASS (Retornou ok: true, zero erro de RLS)**
- **Fluxo D (Homologação e MVP):** Criação de partida, encerramento, homologação com `status = 'homologated'` e persistência de `highlight_athlete_id` → 🟢 **PASS**

---

## 16. LIMITAÇÕES
- As tabelas `modalities`, `persons`, `document_edits` e `template_layouts` permanecem sem migrações no repositório Supabase. Elas funcionam no adaptador LocalStorage, mas demandam especificação técnica caso sejam migradas para o banco relacional em fases futuras.

---

## 17. PENDÊNCIAS
- Nenhuma pendência bloqueante para o ambiente de desenvolvimento.
- Todas as metas estabelecidas para a Fase 7.4 foram atendidas.

---

## 18. RISCOS PARA PRODUÇÃO (VOLTZ)
- A produção VOLTZ está congelada. Para que estas correções entrem em produção, as migrações `20260819000000`, `20260818000002`, `20260910000002` e `20260912000001` deverão ser aplicadas na esteira oficial de release da infraestrutura de produção.
- Como todas as migrações usam `IF NOT EXISTS` e `ADD VALUE IF NOT EXISTS`, a aplicação será segura e retrocompatível.

---

## 19. RECOMENDAÇÃO PARA A PRÓXIMA RELEASE
- Preparar a **Fase 7.5 (Homologação Final Pré-Release)** ou release formal v2.3.0 para a instância VOLTZ, empacotando as correções de código e executando a esteira de migrações no banco de produção.
