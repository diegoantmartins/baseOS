# BASEOS — DESENVOLVIMENTO FASE 11
## CONSOLIDAÇÃO DA IDENTIDADE, MEMBRESIAS E CONTEXTO DE EQUIPE

**Projeto:** BaseOS / VOLTZ  
**Ambiente:** DEV exclusivamente  
**Workspace:** `/home/diego-martins/docker/volei`  
**Data:** 2026-09-29  
**Status:** PASS  

---

## 1. ESTADO INICIAL

* **Branch:** `main`
* **HEAD:** `77bc4d6354aeed4f67bb6aafd64cb037f542316b`
* **Gates Anteriores Preservados:**
  * Gate 2A.3 (Hardening RBAC/RLS de tabelas administrativas);
  * Gate 2B.1 (Forensic read-only check);
  * Gate 2B.2 (Consolidação local RBAC/RLS e compatibilidade com referee).
* **Políticas e Triggers Preservados:**
  * `competitions_admin_write`, `matches_admin_write`, `teams_admin_write`, `venues_admin_write`, `referees_admin_write`, `draws_admin_write`;
  * `matches_referee_update`, `trg_protect_match_admin_fields`.
* **Regras de Isolamento:** Produção (`https://voltz.baseos.online`) permaneceu 100% intocada (0 DDL, 0 DML, 0 deploys, 0 SSH).

---

## 2. ARQUITETURA ENCONTRADA

### 2.1 Modelo Legado
No modelo inicial do sistema, a autenticação e permissões de time dependiam unicamente de:
```text
auth.users
   ↓
profiles (role, competition_team_id)
   ↓
competition_teams
```
Essa estrutura apresentava duas limitações principais:
1. O usuário ficava restrito a um único `competition_team_id` no seu `profile`, inviabilizando que um mesmo gestor/treinador fizesse parte de múltiplas equipes ou organizações.
2. A autorização do portal dependia de checagens diretas em `profile.competition_team_id`.

### 2.2 Migrações e Entidades da Fase 11
A auditoria mapeou que as migrações estruturais da Fase 11 já haviam sido criadas:
* `20260915000001_phase_11_identity_foundation.sql`: criação de `organizations`, `athletes`, `user_memberships` e colunas FK opcionais em `teams`, `competitions`, `competition_athletes`.
* `20260915120000_phase_11_initial_rls_policies.sql`: criação de políticas RLS em `user_memberships`, `organizations`, `athletes`.
* `20260916000001_phase_11_canonical_athlete_registration.sql`: funções RPC canônicas para atletas com deduplicação por CPF normalizado.

---

## 3. TABELAS EXISTENTES NO ESCOPO

1. **`organizations`**:
   * Chave primária: `id` (TEXT).
   * Campos: `name`, `slug`, `legal_document`, `contact_email`, `status`, `created_at`, `updated_at`.
2. **`user_memberships`**:
   * Chave primária: `id` (TEXT).
   * Chaves estrangeiras: `user_id` (`auth.users`), `organization_id` (`organizations`), `team_id` (`teams`, opcional).
   * Campos: `role` (`admin`, `manager`, `coach`, `member`, `athlete`), `status` (`active`, `invited`, `suspended`, `removed`).
   * Constraint de unicidade: `(user_id, organization_id, COALESCE(team_id, 'NONE'))`.
3. **`athletes`**:
   * Identidade canônica para evitar duplicidade de atletas entre equipes e competições.
   * Chave primária: `id` (TEXT).
   * Deduplicação por `document_type` e `document_number` (CPF).
4. **`profiles`**:
   * Preservada a coluna `competition_team_id` como mecanismo de fallback para 100% de compatibilidade legada.

---

## 4. MIGRATIONS EXISTENTES E APLICAÇÃO NO DEV

* As migrações da Fase 11 (`20260915000001_phase_11_identity_foundation.sql`, `20260915120000_phase_11_initial_rls_policies.sql` e `20260916000001_phase_11_canonical_athlete_registration.sql`) foram validadas e consolidadas no banco de desenvolvimento local (`volei_test_db`).
* Foi corrigido o privilégio de acesso (GRANT ALL) às novas tabelas para os roles `anon`, `authenticated` e `service_role` no ambiente DEV.

---

## 5. SERVICES EXISTENTES E CONSOLIDAÇÃO

* **`src/services/dataAccess.ts`**: Camada centralizada de acesso a dados mantida.
* **`src/services/identityService.ts`**: Fornece operações de alto nível para `organizations`, `athletes` e `user_memberships`.
* **`src/services/tenantSecurityService.ts`**: Atualizado para suportar validação de `user_memberships` ativos, verificação de troca de equipe (`canSwitchToTeam`) e acesso à organização (`canAccessOrganization`).
* **`src/services/teamContextService.ts`** *(Novo)*:
  * Fornece `getUserAvailableTeams(profile)`: localiza equipes autorizadas tanto via `user_memberships` (com `status = 'active'`) quanto via fallback no `profile.competition_team_id`.
  * Fornece `getActiveTeamContext(availableTeams)` e `setActiveTeamContext(team)`: gerencia a equipe selecionada em memória/sessão, prevenindo hijacking ou escolha de times não autorizados.

---

## 6. PROBLEMAS ENCONTRADOS

1. **Divergência de Banco no Container**: O container Docker `supabase-db` possuía dois bancos: `postgres` (resíduo Deskcomm CRM com `organizations.id` UUID) e `volei_test_db` (banco real da aplicação com `organizations.id` TEXT). O ambiente DEV foi alinhado para executar e testar contra `volei_test_db`.
2. **Dependência Rígida de `profile.competition_team_id` na UI**:
   * A página `TeamRosterRegistrationPage.tsx` bloqueava acesso se a URL `/equipe/inscricao/:teamId` divergisse de `profile.competition_team_id`. Isso impedia que um usuário com memberships em múltiplas equipes alternasse entre elas.
   * O guard `TeamPortalGuard.tsx` e o layout `TeamPortalLayout.tsx` não proviam contexto nem seletor para alternância de equipe ativa.
3. **Roteamento de `/equipe` sem tratamento para múltiplas equipes**:
   * O componente `TeamContextRedirector.tsx` assumia que o usuário possuía exatamente uma equipe vinculada diretamente ao seu perfil.

---

## 7. DECISÕES TÉCNICAS

1. **Compatibilidade Legada Dual-Track**:
   * Não remover `profiles.competition_team_id`. Se o usuário não tiver registros em `user_memberships`, o sistema utiliza o `competition_team_id` legado como se fosse uma membership implícita.
   * Se o usuário possuir registros em `user_memberships`, suas equipes ativas prevalecem.
2. **Contexto Ativo Explícito e Validado no Backend**:
   * A troca de equipe (`switchTeam`) no `TeamContextService` e no `TeamPortalGuard` revalida se o ID da equipe alvo pertence à lista de equipes retornada por `getUserAvailableTeams`.
   * Bloqueio imediato de manipulação via storage ou parâmetros forjados.
3. **Seletor de Equipe no Portal**:
   * No `TeamPortalLayout.tsx`, caso `availableTeams.length > 1`, é exibido um seletor visual seguindo o padrão estético BaseOS (Zinc `#09090b` / `#18181b` / `#27272a` com destaque Amber).
   * No `TeamContextRedirector.tsx`, se o usuário possuir mais de 1 equipe ativa, é apresentado um modal/seletor claro para que ele escolha em qual portal entrar.
4. **Respeito aos Gates Anteriores**:
   * Nenhuma regra RLS de `is_admin_or_organizer()` ou de referee dos Gates 2A.3 e 2B.2 foi alterada ou enfraquecida.

---

## 8. ALTERAÇÕES REALIZADAS

1. **`src/services/teamContextService.ts`**:
   * Implementação de `getUserAvailableTeams`, `getActiveTeamContext`, `setActiveTeamContext`, `canSwitchToTeam`.
2. **`src/services/tenantSecurityService.ts`**:
   * Integração de verificação de memberships ativos em `canManageRoster`.
   * Adição dos métodos `canSwitchToTeam` e `canAccessOrganization`.
3. **`src/components/auth/TeamContextRedirector.tsx`**:
   * Resolução das equipes autorizadas via `TeamContextService`.
   * Suporte a múltiplos times com modal de seleção BaseOS.
4. **`src/pages/TeamRosterRegistrationPage.tsx`**:
   * Atualização da guarda de cross-team para permitir acesso caso o usuário possua qualquer membership ativo na equipe da URL.
5. **`src/components/portal/useTeamPortal.ts`**:
   * Extensão do hook para incluir `availableTeams`, `activeTeamContext` e `switchTeam`.
6. **`src/components/portal/TeamPortalGuard.tsx`**:
   * Inicialização e sustentação do contexto de equipe ativa.
7. **`src/components/portal/TeamPortalLayout.tsx`**:
   * Adição do seletor dropdown de time ativo quando `availableTeams.length > 1`.

---

## 9. ARQUIVOS CRIADOS E MODIFICADOS

### Arquivos Criados:
* `src/services/teamContextService.ts`
* `src/test/phase11IdentityAndTeamContext.test.ts`
* `docs/walkthroughs/FASE-11-IDENTITY-MEMBERSHIPS-CONSOLIDACAO.md`

### Arquivos Modificados:
* `src/services/tenantSecurityService.ts`
* `src/components/auth/TeamContextRedirector.tsx`
* `src/pages/TeamRosterRegistrationPage.tsx`
* `src/components/portal/useTeamPortal.ts`
* `src/components/portal/TeamPortalGuard.tsx`
* `src/components/portal/TeamPortalLayout.tsx`

---

## 10. MIGRATIONS CRIADAS E APLICADAS

* `supabase/migrations/20260915000001_phase_11_identity_foundation.sql` (aplicada em DEV)
* `supabase/migrations/20260915120000_phase_11_initial_rls_policies.sql` (aplicada em DEV)
* `supabase/migrations/20260916000001_phase_11_canonical_athlete_registration.sql` (aplicada em DEV)

---

## 11. RLS IMPLEMENTADO E REVISADO

* `user_memberships`: Leitura permitida para o próprio usuário (`user_id = auth.uid()`) ou administradores/organizadores (`is_admin_or_organizer()`). Nenhuma inserção/mutação arbitrária por usuários comuns.
* `organizations`: Leitura restrita a membros com status `active` na organização ou administradores globais.
* `athletes`: Leitura de perfil público e proteção de documentos sensíveis; mutations restritas a organizadores e gestores autorizados.
* Sem uso de `USING (true)` para dados de tenant.

---

## 12. TESTES EXECUTADOS

Suíte dedicada criada em `src/test/phase11IdentityAndTeamContext.test.ts` (12 testes):
1. Usuário com membership única: retorna time único e define como ativo.
2. Usuário com múltiplas memberships: retorna todas as equipes com status ativo e ignora removidas/suspensas.
3. Compatibilidade legada: usuário sem membership mas com `competition_team_id` no profile tem acesso preservado.
4. Prevenção cross-team: tentativa de trocar para equipe sem membership é rejeitada.
5. Prevenção cross-organization: tentativa de acessar organização sem vínculo ativo é bloqueada.
6. Não permissão de fabricação de membership: memberships forjadas não autorizam acesso.
7. Não permissão de alteração de role: tentativa de elevação de privilégio de `team` para `admin` é bloqueada.
8. Admin global: consegue gerenciar qualquer equipe e qualquer organização.
9. Organizer: consegue gerenciar equipes nas competições organizadas.
10. Isolamento de sessão entre múltiplas equipes: o contexto ativo é persistido de forma segura e revalidado.
11. Roteamento e redirecionamento: validação de comportamento quando usuário possui 1 equipe vs múltiplas equipes.
12. Limpeza de contexto: `clearActiveTeamContext` remove a seleção e força revalidação.

Além disso, foram re-executados e aprovados:
* `src/test/gate2a3LocalHardening.test.ts` (22 testes)
* `src/test/gate2b2RefereeCompatibility.test.ts` (22 testes)
* `src/test/identityCanonicalAthleteRegistration.test.ts` (19 testes)
* `src/test/identityPhase11SeedAndDataAccess.test.ts` (21 testes)

---

## 13. RESULTADOS

* **Vitest:** 56/56 testes passaram nos testes de segurança e identidade Fase 11 e Gates 2A.3/2B.2.
* **TypeScript:** `npx tsc -p tsconfig.app.json --noEmit` — 0 erros.
* **ESLint:** `npm run lint` — 0 erros.
* **Git Diff Check:** `git diff --check` — limpo, sem conflitos ou whitespace errors.
* **Build:** `npm run build` — compilação de produção com sucesso.

---

## 14. PENDÊNCIAS

* Nenhuma pendência impeditiva para o escopo da Fase 11.
* PENDING ARCHITECTURAL DECISION: Na Fase 12, consolidar telas administrativas de gestão de organizações (criação de novas organizações e convite formal de gestores por e-mail no frontend administrativo).

---

## 15. PRÓXIMOS PASSOS

1. Conclusão formal da Fase 11 no relatório executivo.
2. Planejamento da Fase 12 (CRUD administrativo de Organizações e Gestão de Membros de Organização).
3. Preparação do Gate de Homologação correspondente antes de qualquer promoção para ambiente externo.
