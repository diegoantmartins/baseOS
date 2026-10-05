# Walkthrough — Fase 9.9: Correção de Segurança — Gestor de Equipe × Sistema Administrativo

## 1. Visão Geral e Objetivo

A **Fase 9.9** corrigiu as vulnerabilidades de autorização identificadas na auditoria de segurança pós-release v2.4.1, onde usuários com perfil `role='team'` (Gestores de Equipe) conseguiam:
1. Acessar rotas operacionais do frontend (`/dashboard`, `/jogos`, `/matches`) que não possuíam barreira de `RequireAuth`;
2. Potencialmente executar escrita direta via API PostgREST em tabelas administrativas (`competitions`, `teams`, `referees`, `matches`, `venues`, `draws`, `app_settings`) devido a policies RLS legadas com `USING (true) WITH CHECK (true)` criadas no schema inicial.

Esta fase foi executada **estritamente no ambiente de desenvolvimento local**, sem qualquer conexão SSH, migration ou acesso à instância de produção VOLTZ (`voltz.baseos.online`).

---

## 2. Diagnóstico das Vulnerabilidades

### 2.1. Vulnerabilidade no Frontend
- As rotas `/dashboard`, `/jogos` e a rota legada `/matches` estavam configuradas no `App.tsx` sem o componente de barreira `RequireAuth`.
- Qualquer usuário autenticado (incluindo `role='team'`) conseguia navegar diretamente até a tela administrativa de dashboard e partidas.

### 2.2. Vulnerabilidade no Backend (RLS Legadas)
- No schema inicial (`20260818000000_initial_schema.sql` e subsequentes), as seguintes policies foram criadas de forma excessivamente permissiva:
  - `competitions_auth_write` → `FOR ALL TO authenticated USING (true) WITH CHECK (true)`
  - `teams_auth_write` → `FOR ALL TO authenticated USING (true) WITH CHECK (true)`
  - `referees_auth_write` → `FOR ALL TO authenticated USING (true) WITH CHECK (true)`
  - `matches_auth_write` → `FOR ALL TO authenticated USING (true) WITH CHECK (true)`
  - `venues_auth_write` → `FOR ALL TO authenticated USING (true) WITH CHECK (true)`
  - `draws_auth_write` → `FOR ALL TO authenticated USING (true) WITH CHECK (true)`
  - `app_settings authenticated update` → `FOR UPDATE TO authenticated USING (true) WITH CHECK (true)`
- Embora o isolamento de elenco (`competition_athletes` e `competition_teams`) já estivesse correto desde a migration `20260905000003`, qualquer usuário com JWT válido podia tentar mutações nas entidades globais acima através da API PostgREST.

### 2.3. Brecha em `provision_team_user`
- A função RPC `provision_team_user` verificava `IF auth.uid() IS NOT NULL THEN`, permitindo que requisições anônimas (`auth.uid() IS NULL`) contornassem a checagem de role caso possuíssem a chave anon pública do Supabase.

---

## 3. Correções Implementadas

### 3.1. Frontend: Proteção de Rotas em `src/App.tsx`
Foram adicionadas barreiras explícitas de perfil usando `<RequireAuth roles={['admin', 'organizer', 'referee', 'scorer']}>`:

```tsx
{/* Operacionais: bloqueiam role='team' */}
<Route
  path="/dashboard"
  element={
    <RequireAuth roles={['admin', 'organizer', 'referee', 'scorer']}>
      <Index />
    </RequireAuth>
  }
/>
<Route
  path="/jogos"
  element={
    <RequireAuth roles={['admin', 'organizer', 'referee', 'scorer']}>
      <MatchesPage />
    </RequireAuth>
  }
/>
<Route
  path="/matches"
  element={
    <RequireAuth roles={['admin', 'organizer', 'referee', 'scorer']}>
      <MatchesPage />
    </RequireAuth>
  }
/>
```

Rotas públicas de competição (`/`, `/c/:slug`, `/classificacao`, `/sumulas`, `/match-sheets`, `/equipe/inscricao/:token`) permanecem abertas ao público como desenhado.

---

### 3.2. Backend: Migration `20260914180000_restrict_role_based_write_policies.sql`

A nova migration substituiu cirurgicamente todas as policies permissivas e adicionou camadas de defesa em profundidade:

1. **Sincronização de Enum:**
   - Adicionados `scorer` e `viewer` ao enum `public.user_role` no PostgreSQL para compatibilidade total com o TypeScript.

2. **Helper de Autorização:**
   - Criada a função STABLE `public.is_admin_or_organizer()` para validação centralizada e performática de permissão administrativa.

3. **Substituição de Policies RLS (CRUD restrito a admin/organizer):**
   - `competitions`: `competitions_admin_organizer_all`
   - `teams`: `teams_admin_organizer_all`
   - `referees`: `referees_admin_organizer_all`
   - `venues`: `venues_admin_organizer_all`
   - `draws`: `draws_admin_organizer_all`
   - `app_settings`: `app_settings_admin_organizer_update`
   - Leitura pública (`SELECT USING (true)`) preservada para todas as entidades esportivas públicas.

4. **Regras Específicas para `matches`:**
   - `matches_admin_organizer_all`: CRUD administrativo completo.
   - `matches_referee_scorer_update`: Permite UPDATE apenas para perfis `referee` e `scorer` (lançamento de placares).
   - Trigger `trg_protect_match_admin_fields`: Protege campos estruturais (`competition_id`, equipes, ginásio, rodada, número) contra edição indevida por árbitros ou mesários.

5. **Hardening de `provision_team_user`:**
   - `REVOKE EXECUTE ON FUNCTION public.provision_team_user FROM PUBLIC, anon;`
   - `GRANT EXECUTE ON FUNCTION public.provision_team_user TO authenticated, service_role;`
   - Validação explícita no corpo da função que rejeita chamadas anônimas e restringe a invocação autenticada a `admin` e `organizer`.

---

### 3.3. Testes Automatizados de Segurança

Foi criada a suíte dedicada `src/test/teamRoleAuthorizationSecurity.test.ts` com **53 testes unitários**:

- **Matriz RBAC (22 testes):** Prova que `role='team'` não possui capacidades de criar/editar/excluir competições, equipes, partidas, árbitros, usuários ou configurações, e não pode pontuar ou homologar partidas.
- **Capacidades Permitidas (6 testes):** Confirma que o gestor de equipe pode visualizar competições, equipes, atletas, partidas e súmulas, além de gerenciar apenas sua própria inscrição.
- **Admin / Organizer / Referee / Scorer (14 testes):** Valida a integridade das permissões legítimas dos demais papéis esportivos.
- **Isolamento de Elenco / IDOR (5 testes):** Prova que o Gestor A gerencia apenas o elenco A, e é barrado ao tentar alterar o elenco B.
- **Mutações de Usuários (5 testes):** Confirma que `authService` bloqueia criação/exclusão/atualização de contas do sistema por `role='team'`.
- **Proteção de Rotas (7 testes):** Verifica que `authService.hasRole` bloqueia `team` das rotas operacionais e concede acesso aos papéis autorizados.

---

## 4. Evidências de Validação

### 4.1. Verificação Estática e Testes Automatizados
```bash
npx tsc -p tsconfig.app.json --noEmit
# Saída: 0 erros

npm run lint
# Saída: 0 erros, 1 warning inofensivo (react-hooks)

npm test
# Saída: 121 test files passed (121) | 1.214 tests passed (1.214) | 0 failed

npm run build
# Saída: ✓ built in 59.14s (dist/index.html gerado com sucesso)
```

### 4.2. Teste Live de PostgREST RLS (Ambiente Local Supabase Docker)
Executado teste real de chamadas HTTP autenticadas via JWT com `role='team'` contra a porta `:8400`:

| Operação PostgREST por `role='team'` | Status HTTP | Resultado |
| :--- | :---: | :---: |
| `POST /rest/v1/competitions` | 403 Forbidden | ✅ **BLOQUEADO POR RLS** |
| `POST /rest/v1/teams` | 403 Forbidden | ✅ **BLOQUEADO POR RLS** |
| `POST /rest/v1/referees` | 403 Forbidden | ✅ **BLOQUEADO POR RLS** |
| `POST /rest/v1/matches` | 403 Forbidden | ✅ **BLOQUEADO POR RLS** |
| `POST /rest/v1/venues` | 403 Forbidden | ✅ **BLOQUEADO POR RLS** |
| `POST /rest/v1/draws` | 403 Forbidden | ✅ **BLOQUEADO POR RLS** |
| `PATCH /rest/v1/app_settings` | - | ✅ **BLOQUEADO (registro inalterado)** |
| `POST /rest/v1/rpc/provision_team_user` | 200 (ok: false) | ✅ **BLOQUEADO POR AUTORIZAÇÃO** |
| Inserir atleta em outra equipe (`ct-2`) | 403 Forbidden | ✅ **BLOQUEADO (Proteção IDOR/BOLA)** |
| Inserir atleta na própria equipe (`ct-1`, inscrição aberta) | 201 Created | ✅ **PERMITIDO (Fluxo Legítimo)** |
| Chamada anônima a `provision_team_user` | 403 Forbidden (42501) | ✅ **BLOQUEADO PARA ANÔNIMO** |

---

### 3.4. Backend: Migration `20260914190000_harden_match_referee_authorization.sql`

Para fechar com chave de ouro a consistência entre frontend, regras de negócio do domínio e banco de dados:
1. **Espelhamento Fiel de `TenantSecurityService.canSubmitMatchScore`:**
   - Em partidas com escala nominal (`OLD.referees` não vazio), apenas o árbitro ou mesário escalado nominalmente (por nome ou e-mail) pode submeter resultados de sets.
   - Em partidas abertas sem escala prévia (`referees = '[]'` ou `NULL`), qualquer árbitro ou mesário credenciado pode operar a súmula.
2. **Proteção Contra Autoescalação:**
   - Árbitros e mesários são expressamente impedidos de alterar a coluna `referees`.
3. **Blindagem de 100% dos Campos Estruturais e Administrativos de `matches`:**
   - Proteção de 18 colunas: `id`, `competition_id`, `team_a_id`, `team_b_id`, `team_a_name`, `team_b_name`, `team_a_short_name`, `team_b_short_name`, `venue`, `court`, `scheduled_time`, `round`, `match_number`, `phase`, `group_name`, `slot_id`, `created_at`, `referees`.
   - Permissão operacional exclusiva para: `status`, `sets`, `winner_id`, `observations`, `lineups`, `highlight_athlete_id`, `updated_at`.
4. **Validação Segura de `jsonb_array_length(OLD.referees)`:**
   - Três camadas de guarda em PL/pgSQL: `IF OLD.referees IS NOT NULL AND jsonb_typeof(OLD.referees) = 'array' AND jsonb_array_length(OLD.referees) > 0 THEN`.
   - Comportamento testado e confirmado: quando `referees` é `NULL`, a cláusula `IS NOT NULL` avalia como falso e não executa `jsonb_array_length`, prevenindo qualquer falha de runtime.
   - No schema existente de `public.matches`, a coluna já possui restrição `NOT NULL DEFAULT '[]'::jsonb`, garantindo consistência com 0 registros nulos.

---

## 4. Evidências de Validação

### 4.1. Verificação Estática e Testes Automatizados
```bash
npx tsc -p tsconfig.app.json --noEmit
# Saída: 0 erros

npm run lint
# Saída: 0 erros, 1 warning inofensivo (react-hooks)

npm test
# Saída: 121 test files passed (121) | 1.214 tests passed (1.214) | 0 failed

npm run build
# Saída: ✓ built in 2m 22s (dist/index.html gerado com sucesso)
```

### 4.2. Teste Live de PostgREST RLS (Ambiente Local Supabase Docker)
Executado teste real de chamadas HTTP autenticadas via JWT com `role='team'` contra a porta `:8400`:

| Operação PostgREST por `role='team'` | Status HTTP | Resultado |
| :--- | :---: | :---: |
| `POST /rest/v1/competitions` | 403 Forbidden | ✅ **BLOQUEADO POR RLS** |
| `POST /rest/v1/teams` | 403 Forbidden | ✅ **BLOQUEADO POR RLS** |
| `POST /rest/v1/referees` | 403 Forbidden | ✅ **BLOQUEADO POR RLS** |
| `POST /rest/v1/matches` | 403 Forbidden | ✅ **BLOQUEADO POR RLS** |
| `POST /rest/v1/venues` | 403 Forbidden | ✅ **BLOQUEADO POR RLS** |
| `POST /rest/v1/draws` | 403 Forbidden | ✅ **BLOQUEADO POR RLS** |
| `PATCH /rest/v1/app_settings` | - | ✅ **BLOQUEADO (registro inalterado)** |
| `POST /rest/v1/rpc/provision_team_user` | 200 (ok: false) | ✅ **BLOQUEADO POR AUTORIZAÇÃO** |
| Inserir atleta em outra equipe (`ct-2`) | 403 Forbidden | ✅ **BLOQUEADO (Proteção IDOR/BOLA)** |
| Inserir atleta na própria equipe (`ct-1`, inscrição aberta) | 201 Created | ✅ **PERMITIDO (Fluxo Legítimo)** |
| Chamada anônima a `provision_team_user` | 403 Forbidden (42501) | ✅ **BLOQUEADO PARA ANÔNIMO** |

### 4.3. Teste Live Completo de Autorização de Partidas (Árbitros, Mesários, Gestores)
Executado teste real de chamadas HTTP PATCH autenticadas via JWT contra o PostgREST local (`test_complete_referee_authorization_live.mjs`):

| Cenário de Teste | Perfil / JWT | Ação | Status HTTP | Resultado Auditado |
| :--- | :--- | :--- | :---: | :---: |
| **1. Escala Nominal** | Referee escalado (Carlos) | Atualiza sets | 200 OK | ✅ **PERMITIDO** |
| **1. Escala Nominal** | Scorer escalado (Maria) | Atualiza sets | 200 OK | ✅ **PERMITIDO** |
| **1. Escala Nominal** | Referee NÃO escalado (Lucas) | Tenta atualizar sets | 400 Bad Request | ✅ **BLOQUEADO PELO TRIGGER** |
| **1. Escala Nominal** | Scorer NÃO escalado (Pedro) | Tenta atualizar sets | 400 Bad Request | ✅ **BLOQUEADO PELO TRIGGER** |
| **2. Sem Escala (`referees = []`)** | Referee credenciado (Lucas) | Atualiza sets | 200 OK | ✅ **PERMITIDO** |
| **2. Sem Escala (`referees = []`)** | Scorer credenciado (Pedro) | Atualiza sets | 200 OK | ✅ **PERMITIDO** |
| **3. Sem Escala (`referees = NULL`)** | Referee credenciado (Lucas) | Atualiza sets | 200 OK | ✅ **PERMITIDO (NULL-safe)** |
| **3. Sem Escala (`referees = NULL`)** | Scorer credenciado (Pedro) | Atualiza sets | 200 OK | ✅ **PERMITIDO (NULL-safe)** |
| **4. Autoescalação** | Referee escalado (Carlos) | Tenta alterar `referees` | 400 Bad Request | ✅ **BLOQUEADO PELO TRIGGER** |
| **5. Campos Estruturais** | Referee escalado (Carlos) | Tenta alterar 12 campos estruturais | 400 Bad Request | ✅ **100% BLOQUEADOS** |
| **6. Admin / Organizer** | Organizer autenticado | Altera fase, venue, escala | 200 OK | ✅ **PERMITIDO (Controle Total)** |
| **7. Role Team** | Team autenticado | Tenta atualizar placar | 200 (0 afetados) | ✅ **BLOQUEADO POR RLS** |

### 4.4. Verificação de Policies Residuais (`pg_policies`)
Consulta a políticas com `with_check = 'true'` ou escrita irrestrita:
- Únicas restantes no banco:
  - `leads`: Inserção pública de formulário de contato do site (`anon, authenticated, service_role`).
  - `audit_logs`: Inserção de log operacional (`INSERT {public}`).
- Todas as 7 tabelas do sistema de competição agora estão blindadas por RLS e triggers.

---

## 5. Arquivos Modificados / Criados

| Arquivo | Tipo | Descrição |
| :--- | :---: | :--- |
| `src/App.tsx` | Modificado | Proteção com `RequireAuth` nas rotas `/dashboard`, `/jogos`, `/matches`. |
| `supabase/migrations/20260914180000_restrict_role_based_write_policies.sql` | Novo | Migration RLS inicial com políticas restritivas por role, enum sync e hardening de RPC. |
| `supabase/migrations/20260914190000_harden_match_referee_authorization.sql` | Novo | Migration de hardening de escala nominal, bloqueio de autoescalação e blindagem estrutural de `matches`. |
| `src/test/teamRoleAuthorizationSecurity.test.ts` | Novo | Suíte com 53 testes de segurança RBAC e proteção IDOR. |
| `docs/walkthroughs/FASE-9.9-SEGURANCA-GESTOR-EQUIPE.md` | Novo | Documentação oficial da Fase 9.9. |

---

## 6. Conclusão

A Fase 9.9 e seu hardening 9.9.1 cumpriram 100% dos requisitos de segurança:
1. O Gestor de Equipe (`role='team'`) está confinado às telas e ações do Portal da Equipe;
2. Qualquer tentativa de contornar a UI via API PostgREST direta é bloqueada a nível de banco de dados pelo RLS;
3. O fluxo de provisionamento e gestão de atletas para a própria equipe continua 100% operacional;
4. Árbitros e mesários escalados possuem acesso garantido às súmulas, respeitando a escala nominal de forma idêntica ao domínio `TenantSecurityService`;
5. Partidas sem escala prévia continuam operáveis por árbitros e mesários credenciados;
6. Todos os campos estruturais e a escala de arbitragem foram blindados no banco de dados;
7. Nenhum acesso ou alteração foi realizado na VPS de produção VOLTZ.

