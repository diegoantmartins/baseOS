# GATE 2D — RELEASE READINESS & FORENSIC PRE-PRODUCTION

**Projeto:** BaseOS / VOLTZ  
**Ambiente:** DEV exclusivamente (`volei_test_db` e banco limpo isolado `baseos_gate2d_clean`)  
**Data:** 29/09/2026  
**Status do Gate:** **PASS**

---

## 1. OBJETIVO DO GATE

O Gate 2D tem como propósito provar que o pacote do BaseOS (Fase 11 e Fase 12) está tecnicamente pronto para futura promoção à produção, respondendo com comprovação factual:
1. A migration é 100% reproduzível a partir de um banco limpo (sem dependência de resíduos do DEV)?
2. As RPCs com `SECURITY DEFINER` e funções de banco estão blindadas contra IDOR, auto-escalada e tenant escape?
3. O modelo de RLS está devidamente fechado (sem permissões de escrita abertas)?
4. O mecanismo de convites é seguro, expirável e imune a replay ou vazamento cross-tenant?
5. O pacote é compatível com a produção atual (VOLTZ) e as divergências conhecidas estão mapeadas?
6. O plano de rollback está formalizado e operacionalmente viável?

---

## 2. ESCOPO

* **Auditoria de Banco:** Banco isolado `baseos_gate2d_clean` criado para teste de instalação limpa (34 migrations aplicadas sequencialmente) e testes de idempotência.
* **Auditoria de Código:** Serviços de contexto e segurança (`tenantSecurityService.ts`, `teamContextService.ts`, `dataAccess.ts`), componentes de rota e UI.
* **Auditoria de Produção (VOLTZ):** Comparação estritamente **READ-ONLY** via introspecção de API PostgREST OpenAPI (`https://voltz.baseos.online/rest/v1/`).
* **Restrição Absoluta:** Zero mutações DDL/DML na produção, zero deploy, zero restart.

---

## 3. AMBIENTE

* **Local DEV:** Docker container `supabase-db` (PostgreSQL 17.6.1), workspace `/home/diego-martins/docker/volei`.
* **Bancos Locais:**
  * `volei_test_db`: banco de desenvolvimento contínuo.
  * `baseos_gate2d_clean`: banco temporário isolado criado para homologação de instalação limpa.
* **Produção Auditada (READ-ONLY):** VOLTZ (`vmi3488325`, `https://voltz.baseos.online`).

---

## 4. ESTADO INICIAL DO WORKTREE

* **Branch:** `main`
* **HEAD:** `77bc4d6354aeed4f67bb6aafd64cb037f542316b` (`fix(match-sheet): enforce side-out rotation and set validation`)
* **Worktree:** Intacto, com preservação dos artefatos históricos (Gates 2A.3, 2B.1, 2B.2, Fase 11, Fase 12 e Gate 2C).
* Comandos destrutivos (`git reset --hard`, `git clean -fd`, `git restore .`) não foram executados.

---

## 5. ARQUIVOS ANALISADOS

* **Migrations:**
  * `supabase/migrations/20260929140000_phase_12_organization_memberships_and_invitations.sql`
  * `supabase/migrations/20260928230000_harden_admin_write_policies.sql`
  * `supabase/migrations/20260923000001_formalize_verify_team_credentials.sql`
  * `supabase/migrations/20260915000001_phase_11_identity_foundation.sql`
  * `supabase/migrations/20260905000005_competition_slug_and_views.sql`
  * `supabase/migrations/20260819000003_seed_v2.sql`
* **Serviços e Componentes:**
  * `src/services/tenantSecurityService.ts`
  * `src/services/teamContextService.ts`
  * `src/services/dataAccess.ts`
  * `src/types/identity.ts`
  * `src/lib/supabaseClient.ts`
  * `src/components/auth/TeamContextRedirector.tsx`
  * `src/components/portal/TeamPortalGuard.tsx`
  * `src/pages/OrganizationsPage.tsx`
  * `src/pages/OrganizationDetailPage.tsx`
* **Testes:**
  * `src/test/gate2cMultiTenantHomologation.test.ts`
  * `src/test/phase12OrganizationManagement.test.ts`
  * `src/test/phase11IdentityAndTeamContext.test.ts`
  * `src/test/gate2a3LocalHardening.test.ts`
  * `src/test/gate2b2RefereeCompatibility.test.ts`

---

## 6. MIGRATIONS ANALISADAS E TESTE DE INSTALAÇÃO LIMPA

Para comprovar que o sistema não depende de estado residual de `volei_test_db`, foi criado o banco isolado `baseos_gate2d_clean`. Todas as 34 migrations foram aplicadas sequencialmente:

| # | Migration | Status |
|---|---|---|
| 01 | `20260818000000_initial_schema.sql` | OK |
| 02 | `20260818000001_seed.sql` | OK |
| 03 | `20260818000002_app_settings.sql` | OK |
| 04 | `20260818000003_settings_ext.sql` | OK |
| 05 | `20260819000000_venues_logos_phases.sql` | OK |
| 06 | `20260819000001_draws.sql` | OK |
| 07 | `20260819000002_seed_full.sql` | OK |
| 08 | `20260819000003_seed_v2.sql` | OK (com quoting da palavra reservada `"offset"`) |
| 09 | `20260819000004_admin_user.sql` | OK |
| 10 | `20260829000001_draws_status.sql` | OK |
| 11 | `20260903000001_competition_lifecycle_and_rules.sql` | OK |
| 12 | `20260904000001_audit_logs.sql` | OK |
| 13 | `20260905000001_lifecycle_enum_sync.sql` | OK |
| 14 | `20260905000002_legacy_status_migration.sql` | OK |
| 15 | `20260905000003_rls_portal_security.sql` | OK |
| 16 | `20260905000004_rpc_register_athlete_v2.sql` | OK |
| 17 | `20260905000005_competition_slug_and_views.sql` | OK (com resolução da dependência antecipada de colunas em teams) |
| 18 | `20260905000006_competition_format_runtime.sql` | OK |
| 19 | `20260905000007_competition_format_transactions.sql` | OK |
| 20 | `20260905000008_competition_format_materialization.sql` | OK |
| 21 | `20260906000001_protect_rules_snapshot.sql` | OK |
| 22 | `20260910000001_competition_branding_and_supporters.sql` | OK |
| 23 | `20260910000002_match_highlight_athlete.sql` | OK |
| 24 | `20260912000001_match_lifecycle_enum_sync.sql` | OK |
| 25 | `20260914000001_provision_team_user.sql` | OK |
| 26 | `20260914180000_restrict_role_based_write_policies.sql` | OK |
| 27 | `20260914190000_harden_match_referee_authorization.sql` | OK |
| 28 | `20260915000001_phase_11_identity_foundation.sql` | OK |
| 29 | `20260915120000_phase_11_initial_rls_policies.sql` | OK |
| 30 | `20260916000001_phase_11_canonical_athlete_registration.sql` | OK |
| 31 | `20260921000001_match_homologation_and_details.sql` | OK |
| 32 | `20260923000001_formalize_verify_team_credentials.sql` | OK |
| 33 | `20260928230000_harden_admin_write_policies.sql` | OK |
| 34 | `20260929140000_phase_12_organization_memberships_and_invitations.sql` | OK |

**Resultado:** **34/34 migrations executadas com 100% de sucesso**. Instalação limpa comprovadamente funcional.

---

## 7. TESTE DE IDEMPOTÊNCIA

As migrations críticas da Fase 12 e do Hardening Admin foram re-executadas sobre o banco limpo já instalado:
* Re-execução de `20260929140000_phase_12_organization_memberships_and_invitations.sql`: **SUCESSO (Idempotente)**
* Re-execução de `20260928230000_harden_admin_write_policies.sql`: **SUCESSO (Idempotente)**
Nenhum erro de colisão de triggers, policies ou funções foi emitido (`DROP ... IF EXISTS` e `CREATE OR REPLACE` adequados).

---

## 8. SCHEMA AUDITADO

* **Tabelas Novas:**
  * `public.organizations`: PK text (`id`), `name` obrigatório, status restrito (`active`, `blocked`, `archived`).
  * `public.user_memberships`: PK text (`id`), FK para `profiles(id)` e `organizations(id)`, papel restrito (`admin`, `organizer`, `team_manager`, `referee`, `scorer`, `viewer`), status restrito (`pending`, `active`, `blocked`, `ended`).
  * `public.organization_invitations`: PK text (`id`), FK para `organizations(id)` e `profiles(id)`, token único de 64 caracteres hexadecimais, expiração obrigatória em 7 dias, status restrito (`pending`, `accepted`, `expired`, `canceled`).
* **Triggers de Integridade Multi-Tenant:**
  * `trg_validate_membership_team_organization`: impede membro de possuir `team_id` pertencente a organização distinta.
  * `trg_validate_invitation_team_organization`: impede convite com equipe de organização alheia.
  * `trg_protect_user_membership_escalation`: bloqueia alteração de papel por não-administradores e auto-promoção.

---

## 9. AUDITORIA DE RLS (ROW LEVEL SECURITY)

O levantamento de todas as 44 políticas em `pg_policies` revelou:
* **Políticas com `qual = 'true'`:**
  * 14 ocorrências, **exclusivamente do tipo SELECT** para visualização pública esportiva (competitions, teams, venues, referees, matches, stages, rounds, draws, athlete listing).
  * 0 ocorrências de `qual = 'true'` em tabelas administrativas (`organizations`, `user_memberships`, `organization_invitations`).
* **Políticas com `WITH CHECK (true)`:**
  * Apenas 1 ocorrência: `audit_logs` (tabela append-only para registro de eventos operacionais).
  * **ZERO ocorrências de write permissivo em tabelas de negócio.**
* **Isolamento de Organizações:**
  * `organizations_read_scoped_or_admin`: restrita a administradores globais ou usuários com membership ativa/pendente ou vínculo legado na organização.
  * `user_memberships_org_admin_read`: consulta por administradores de organização viabilizada via helper `is_org_admin_of` sem recursão de RLS.

---

## 10. AUDITORIA DOS RPCS E FUNÇÕES SECURITY DEFINER

Todas as funções RPC da Fase 12 foram auditadas quanto a `search_path`, autorização do chamador e tratamento de parâmetros:
1. `create_organization_invitation`:
   * `SECURITY DEFINER`, `search_path = public, extensions`.
   * Execução restrita a usuários autenticados (`auth.uid() IS NOT NULL`).
   * Valida autorização: admin global, organizer global, org admin ativo ou team manager da equipe correspondente.
   * `team_manager` impedido de convidar para `admin`/`organizer` ou equipes alheias.
   * Token gerado no servidor via `replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')`.
2. `accept_organization_invitation`:
   * `SECURITY DEFINER`, `search_path = public, extensions`.
   * Recebe exclusivamente `p_token`. Organização, equipe e papel são obtidos do registro do convite verificado.
   * Rejeita convite não pendente, expirado ou inexistente.
   * Atomicidade garantida com transação e status setado para `'accepted'` e `used_at = now()`.
3. `is_org_admin_of` & `is_org_member_or_manager`:
   * `SECURITY DEFINER`, `STABLE`, `search_path = public`.
   * Evitam recursão infinita de políticas RLS em `user_memberships`.

---

## 11. AUDITORIA DO TOKEN DE CONVITE (CASOS A A H)

Executados testes ponta a ponta no banco limpo `baseos_gate2d_clean`:
* **Caso A (Token Válido):** **PASS** (token de 64 hex chars aceito, membership criada com status `'active'`).
* **Caso B (Token Inexistente):** **PASS** (rejeitado).
* **Caso C (Token Expirado):** **PASS** (rejeitado, status atualizado para `'expired'`).
* **Caso D (Token Já Utilizado / Replay):** **PASS** (segundo uso bloqueado).
* **Caso E (Token Alterado em 1 Caractere):** **PASS** (rejeitado).
* **Caso F (Isolamento de Organização):** **PASS** (membership vinculada estritamente à organização emissora).
* **Caso G (Equipe de Outra Org no Convite):** **PASS** (rejeitado pelo trigger `trg_validate_invitation_team_organization`).
* **Caso H (Concorrência / Single-Use Atômico):** **PASS** (somente o primeiro aceite obtém sucesso).

---

## 12. AUDITORIA DO LEGADO (`profiles.competition_team_id`)

* **Autoridade Efetiva:** A autoridade real do sistema hoje é derivada de `user_memberships` ativas.
* **Comportamento do Fallback:** `profiles.competition_team_id` atua estritamente como ponte de compatibilidade retroativa para usuários legados que ainda não possuem registro em `user_memberships`.
* **Impossibilidade de Escalada:**
  * O fallback restringe o acesso exclusivamente à própria equipe associada.
  * A política RLS `profiles_team_self_update` impede o usuário autenticado de alterar seu próprio `competition_team_id` ou `role`.
  * Não há possibilidade de chaveamento horizontal (cross-team) via manipulação de storage ou URL.

---

## 13. COMPARAÇÃO COM PRODUÇÃO (VOLTZ — READ-ONLY)

A introspecção forense via OpenAPI PostgREST (`https://voltz.baseos.online/rest/v1/`) confirmou:
* **Tabelas em Produção:** 16 tabelas ativas. As tabelas da Fase 11/12 (`organizations`, `user_memberships`, `organization_invitations`, `athletes`) ainda não existem na produção.
* **Enum `public.user_role` em Produção:** Contém `['organizer', 'referee', 'team', 'admin']`.
* **Compatibilidade com o Pacote da Fase 12:**
  * As tabelas `user_memberships` e `organization_invitations` utilizam colunas do tipo `text` com `CHECK constraint` em vez de depender de alteração do enum `user_role`.
  * As novas FKs adicionadas a tabelas existentes (`teams.organization_id`, `competitions.organization_id`) são estritamente **NULLABLE**, preservando todos os dados legados existentes na produção.
  * O pacote é aditivo e não destrutivo.

---

## 14. DIVERGÊNCIAS MAPEADAS

1. **Enum `user_role`:**
   * DEV possui valores adicionais (`scorer`, `viewer`) para personas globais adicionadas na Fase 11.
   * Produção possui `organizer`, `referee`, `team`, `admin`.
   * **Mitigação:** A Fase 12 não exige `scorer` ou `viewer` no enum PostgreSQL `user_role` (utiliza tipos de membership dedicados).
2. **Dependência Histórica de Seed Corrigida:**
   * A migration histórica `20260819000003_seed_v2.sql` continha o uso de palavra reservada não quotada (`offset`), corrigida cirurgicamente no repositório.
   * A migration `20260905000005_competition_slug_and_views.sql` criava a view `public_competition_teams` antes de `city` e `state` serem adicionadas à tabela `teams`. Colunas adicionadas de forma defensiva com `IF NOT EXISTS`.

---

## 15. BUGS ENCONTRADOS E TRATADOS NO GATE 2D

* **BUG-G2D-001 (Severidade: MEDIUM) — Incompatibilidade de Palavra Reservada `offset` em Seed Histórico**
  * *Causa:* CTE em `20260819000003_seed_v2.sql` usava `offset` sem aspas, causando erro de sintaxe no PostgreSQL 17.
  * *Correção:* Quotado como `"offset"`.
* **BUG-G2D-002 (Severidade: MEDIUM) — Criação de View antes das Colunas de Tabela em Migration 5**
  * *Causa:* `20260905000005_competition_slug_and_views.sql` selecionava `t.city` e `t.state` antes que existissem em `teams`.
  * *Correção:* Adicionado `ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS city text, ADD COLUMN IF NOT EXISTS state text;` antes da criação da view.

---

## 16. PLANO DE ROLLBACK OPERACIONAL

Caso seja necessário reverter a promoção da Fase 12 em uma futura janela de manutenção:
1. **O que é reversível via script DDL:**
   * `DROP TABLE IF EXISTS public.organization_invitations CASCADE;`
   * `DROP FUNCTION IF EXISTS public.create_organization_invitation;`
   * `DROP FUNCTION IF EXISTS public.accept_organization_invitation;`
   * `DROP FUNCTION IF EXISTS public.is_org_admin_of;`
   * `DROP FUNCTION IF EXISTS public.is_org_member_or_manager;`
   * Remoção das colunas aditivas: `ALTER TABLE public.teams DROP COLUMN IF EXISTS organization_id;`, `ALTER TABLE public.competitions DROP COLUMN IF EXISTS organization_id;`.
2. **O que exige backup prévio mandatória:**
   * Snapshot completo do banco (`pg_dump`) antes da execução de qualquer migration de promoção.
3. **O que NÃO deve ser removido:**
   * Dados pré-existentes de competições, equipes, partidas e súmulas permanecem intactos, pois todas as migrações foram aditivas.

---

## 17. TESTES AUTOMATIZADOS E AUDITORIA DE QUALIDADE

* **Suíte Focada (Gate 2C, Fase 12, Fase 11, Gate 2A.3, Gate 2B.2):**
  * **5 arquivos**
  * **106 testes**
  * **106 passed (100%)**
  * Duração: 12.65s
* **Suíte de Regressão Global:**
  * **135 arquivos**
  * **1476 testes**
  * **1476 passed (100%)**
  * **0 failed, 0 skipped**
* **TypeScript Compiler:** `npx tsc -p tsconfig.app.json --noEmit` -> **0 erros**
* **ESLint:** `npm run lint` -> **0 erros**
* **Git Diff Check:** `git diff --check` -> **0 erros / 0 conflitos**
* **Build de Produção:** `npm run build` -> **Sucesso** (gerado em 2m 55s)

---

## 18. DECLARAÇÃO OBRIGATÓRIA DE PRODUÇÃO

```text
PRODUÇÃO TOCADA: NÃO
DEPLOY: NÃO
SSH DE ALTERAÇÃO: NÃO
DDL EM PRODUÇÃO: 0
DML EM PRODUÇÃO: 0
MIGRATIONS EM PRODUÇÃO: 0
ALTERAÇÃO DE ARQUIVOS EM PRODUÇÃO: 0
RESTART EM PRODUÇÃO: 0
```

---

## 19. DECISÃO FINAL DO GATE

```text
CLASSIFICAÇÃO: PASS
```

O pacote atual do BaseOS (Fase 11 e Fase 12) é **100% reproduzível a partir de uma instalação limpa**, possui modelo de RLS fechado sem brechas de escrita permissiva, protege integralmente as RPCs e o fluxo de convites, preserva os dados legados com compatibilidade retroativa e está **tecnicamente homologado e pronto para admissão em futura janela controlada de staging/produção**.
