# FASE 12 — RELATÓRIO TÉCNICO & WALKTHROUGH

## ORGANIZAÇÕES, MEMBROS, CONVITES E VÍNCULOS MULTI-TENANT

**Projeto:** BaseOS / VOLTZ  
**Ambiente:** DEV Exclusivamente (`volei_test_db`)  
**Data:** 29 de Setembro de 2026  
**Workspace:** `/home/diego-martins/docker/volei`  
**Branch:** `main`  
**HEAD Inicial:** `77bc4d6354aeed4f67bb6aafd64cb037f542316b`  
**Status de Execução:** **PASS TOTAL**  

---

## 1. ESTADO INICIAL E RECONCILIAÇÃO DO BASELINE

### 1.1 Verificação de Integridade e Git
- **Branch:** `main`
- **HEAD:** `77bc4d6354aeed4f67bb6aafd64cb037f542316b`
- **Preservação:** Gates 2A.3, 2B.1, 2B.2 e Fase 11 100% preservados intactos.
- **Nenhum comando destrutivo** (`git reset --hard`, `git clean -fd`, `git restore .`) foi executado.

### 1.2 Reconciliação da Divergência de Contagem de Testes da Fase 11
O relatório anterior da Fase 11 continha uma aparente inconsistência na contagem de testes:
- O sumário final mencionava `56/56`, enquanto listagens detalhadas citavam números como 12, 19, 21, 22 testes.
- **Auditoria Forense dos Testes Reais:**
  - A execução que resultou em `56/56` cobriu apenas 3 arquivos de teste:
    1. `src/test/phase11IdentityAndTeamContext.test.ts` (17 testes)
    2. `src/test/gate2a3LocalHardening.test.ts` (22 testes)
    3. `src/test/gate2b2RefereeCompatibility.test.ts` (17 testes)
    - Subtotal = 17 + 22 + 17 = **56 testes**.
  - No entanto, a Fase 11 também implementou outras duas suítes cruciais:
    4. `src/test/identityCanonicalAthleteRegistration.test.ts` (16 testes)
    5. `src/test/identityPhase11SeedAndDataAccess.test.ts` (24 testes)
  - Quando todas as 5 suítes de identidade e hardening são executadas em conjunto, o total real da Fase 11 + Gates é de **96 testes (96 passed)**.
  - Com a adição da nova suíte da Fase 12 (`src/test/phase12OrganizationManagement.test.ts` com **26 testes**), o total consolidado do conjunto é de **122 testes (122 passed, 0 failed, 0 skipped)**.
  - A suíte completa do repositório (`npm test`) totaliza **134 arquivos de teste e 1.452 testes**, todos **100% PASS**.

---

## 2. ARQUITETURA MULTI-TENANT E MODELO DE DADOS

A Fase 12 implementou a evolução canônica da hierarquia administrativa do BaseOS:

```text
auth.users
   ↓
user_memberships (role, status)
   ↓
organizations (inquilino/organização)
   ↓
teams (equipes associadas à organização)
   ↓
competitions (torneios onde as equipes competem)
```

### 2.1 Semântica de Membresias (`user_memberships`)
1. **Membro em nível de organização:**
   - `organization_id = 'org-alpha'`
   - `team_id = NULL`
   - Usuário possui escopo institucional/administrativo na organização.
2. **Membro vinculado a equipe da organização:**
   - `organization_id = 'org-alpha'`
   - `team_id = 'team-alpha-1'`
   - Usuário atua como gestor/membro de equipe no contexto daquela organização.
   - **Regra de Integridade Forçada no Banco (Trigger):** É terminantemente proibido associar uma equipe cujo `organization_id` divirja da organização da membership.

### 2.2 Tabela de Convites (`public.organization_invitations`)
Criada para suportar o fluxo seguro, single-use e auditável de convites de organizações:
- `id` (UUID, PK)
- `organization_id` (UUID, FK `organizations(id)` ON DELETE CASCADE)
- `email` (TEXT, normalizado)
- `role` (TEXT, padrão `viewer`)
- `team_id` (UUID opcional, FK `teams(id)`)
- `token` (TEXT UNIQUE)
- `status` (`pending`, `accepted`, `canceled`, `expired`)
- `invited_by` (UUID opcional, FK `profiles(id)`)
- `created_at` (TIMESTAMPTZ)
- `expires_at` (TIMESTAMPTZ, padrão 7 dias)
- `used_at` (TIMESTAMPTZ opcional)

---

## 3. BANCO DE DADOS (DEV: `volei_test_db`)

### 3.1 Migration Aplicada
- Arquivo: `supabase/migrations/20260929140000_phase_12_organization_memberships_and_invitations.sql`
- Executada no container local `supabase-db`, database `volei_test_db`.

### 3.2 Triggers de Integridade e Defesa Multi-Tenant
1. `trg_validate_membership_team_organization`:
   - Intercepta `BEFORE INSERT OR UPDATE` em `user_memberships`.
   - Se `team_id` for informado, valida via SQL que `teams.organization_id = user_memberships.organization_id`. Rejeita qualquer tentativa de IDOR ou cross-tenant team binding.
2. `trg_validate_invitation_team_organization`:
   - Intercepta `BEFORE INSERT OR UPDATE` em `organization_invitations`.
   - Valida que qualquer equipe convidada pertença à organização do convite.
3. `trg_protect_user_membership_escalation`:
   - Intercepta alterações de papel em `user_memberships`.
   - Impede que um usuário altere seu próprio papel (anti self-escalation e lockout).
   - Bloqueia que usuários sem prerrogativa de admin de organização promovam terceiros a `admin`.

### 3.3 RPCs com `SECURITY DEFINER` e Search Path Estrito
1. `create_organization_invitation(...)`:
   - `SECURITY DEFINER` com `SET search_path = public, pg_temp;`
   - Valida autorização do invocador (`auth.uid()`).
   - Verifica se o autor é admin global ou org admin com status `active`.
   - Bloqueia escalada de privilégios.
2. `accept_organization_invitation(...)`:
   - `SECURITY DEFINER` com `SET search_path = public, pg_temp;`
   - Valida token, status `pending` e expiração (`expires_at > now()`).
   - Registra transacionalmente a nova membership em `user_memberships` com status `active`.
   - Marca o convite como `accepted`, definindo `used_at = now()`.

### 3.4 Políticas RLS (Row Level Security)
- Habilitado RLS em `public.organization_invitations`.
- Leitura restrita: admins globais, organizadores ou membros ativos da organização com papel administrativo.
- Em `public.user_memberships`:
  - `user_memberships_org_admin_read`: Permite que admins da organização leiam todos os membros do seu inquilino.
  - Bloqueio rígido de escrita direta; mutações controladas via triggers e RPCs auditadas.

---

## 4. SERVIÇOS E CAMADA DE DADOS

### 4.1 `src/services/tenantSecurityService.ts`
Implementou as proteções de autorização de aplicação:
- `canViewOrganization(user, organizationId, memberships)`:
  - Admin global e organizador acessam globalmente.
  - Membro ativo com membership na organização acessa.
  - Bloqueia membros suspensos (`blocked`), finalizados (`ended`) ou de outras organizações.
- `canManageOrganizationMembers(user, organizationId, memberships)`:
  - Exige papel `admin` na organização ou global admin.
- `canInviteMember(user, organizationId, targetRole, memberships, targetTeamId, teams)`:
  - Bloqueia usuários comuns.
  - Bloqueia gerentes de equipe tentando convidar admin/organizador.
  - Bloqueia atribuição de equipes de outras organizações (cross-tenant).
- `canUpdateMemberRole(user, organizationId, targetUserId, newRole, memberships)`:
  - Impede terminantemente a alteração do próprio papel (`user.id === targetUserId`).
- `canChangeMemberStatus(user, organizationId, targetUserId, memberships)`:
  - Impede auto-suspensão e exige prerrogativa administrativa.

### 4.2 `src/services/dataAccess.ts`
Estendido para suportar `localStorageAdapter` e `supabaseAdapter` em paridade funcional:
- `updateOrganization(id, updates)`
- `listOrganizationMembers(organizationId)` (incluindo join de perfis e equipes)
- `updateUserMembership(id, updates)`
- `deleteUserMembership(id)`
- `listOrganizationTeams(organizationId)`
- `listOrganizationCompetitions(organizationId)`
- `listOrganizationInvitations(organizationId)`
- `createOrganizationInvitation(input)`
- `cancelOrganizationInvitation(invitationId)`
- `acceptOrganizationInvitation(token, userId)`

### 4.3 `src/services/teamContextService.ts`
- Mapeamento robusto de memberships para contextos de equipe.
- Suporte a equipes institucionais sem inscrição prévia em competição.
- Sobrecargas tipadas sem `any` para `getActiveTeamContext`, `setActiveTeamContext` e `canSwitchToTeam`.
- Limpeza sanitizada de contexto (`clearActiveTeamContext`).

---

## 5. INTERFACE DE USUÁRIO (UI BASEOS)

Desenvolvida com o design system canônico do BaseOS:
- Paleta Zinc/Slate (`#09090b`, `#18181b`, `#27272a`), bordas sutis e tipografia moderna.
- Amber apenas para CTA primário.
- Proibição de caracteres `&` em textos visíveis (substituído por `e`).
- Rótulos em Português e escopo Indoor exclusivamente.

### 5.1 Rotas Criadas / Configuradas
- `/organizacoes`: Lista de organizações cadastradas, estatísticas rápidas, busca por nome/CNPJ, filtro por status, modal de criação de organização.
- `/organizacoes/:organizationId`: Visão unificada com 4 abas estruturadas:
  1. **Membros:** Tabela de membros, papéis, equipes vinculadas, badges de status, botões de ação (alterar papel, suspender/reativar, remover) e modal de convite.
  2. **Equipes:** Lista das equipes vinculadas à organização.
  3. **Competições:** Torneios sob gestão ou participação da organização.
  4. **Convites:** Gestão de convites pendentes, tokens de acesso, expiração e cancelamento.
- `/organizacoes/:organizationId/membros`: Redireciona/foca diretamente na aba de membros.
- Atualizado `src/components/layout/Sidebar.tsx` incluindo item "Organizações" (ícone `Landmark`) em "Cadastros de Base".

---

## 6. COBERTURA E RESULTADOS DE TESTES

### 6.1 Suíte Específica da Fase 12 (`phase12OrganizationManagement.test.ts`)
Total de **26 testes**, todos **PASS**:
1. Membro ativo acessa a própria organização (PASS)
2. Usuário sem membership na organização tem acesso negado (PASS)
3. Organização Alpha não vaza dados nem permite acesso para membro da Organização Beta (PASS)
4. Administrador global e organizador acessam qualquer organização conforme regra global (PASS)
5. Membership com status "active" autoriza gestão de membros se for Org Admin (PASS)
6. Membership com status "blocked" (suspensa) bloqueia qualquer autorização (PASS)
7. Membership com status "ended" (removida) bloqueia acesso (PASS)
8. Usuário comum/não-admin não pode gerenciar ou criar memberships arbitrárias (PASS)
9. Usuário é expressamente impedido de alterar o próprio papel (anti-escalada/lockout) (PASS)
10. Org Admin da Organização Alpha não consegue alterar membros da Organização Beta (PASS)
11. Equipe vinculada deve pertencer estritamente à organização correta (PASS)
12. Tentativa de associar equipe de outra organização (cross-tenant) é bloqueada (PASS)
13. Team ID forjado ou inexistente na organização é bloqueado na autorização de troca (PASS)
14. Troca de equipe autorizada para membro com membership ativa (PASS)
15. Troca de equipe para time de outra organização não vinculada é bloqueada (PASS)
16. Criação e aceitação de convite válido cria vínculo com status "active" (PASS)
17. Convite com data expirada é rejeitado na aceitação (PASS)
18. Convite já utilizado não pode ser aceito uma segunda vez (single-use) (PASS)
19. Convite emitido para Org Alpha não concede acesso nem membership na Org Beta (PASS)
20. Gerente de equipe (team_manager) não pode convidar administradores ou organizadores (PASS)
21. Tentativa de escalada: usuário sem papel administrativo tentando convidar é bloqueado (PASS)
22. Usuário com exatamente uma equipe ativa resolve equipe diretamente sem ambiguidade (PASS)
23. Usuário com múltiplas equipes lista todas as equipes ativas e permite seleção explícita (PASS)
24. Usuário sem nenhuma equipe retorna lista vazia (PASS)
25. Usuário com membership suspensa não tem acesso à equipe no portal (PASS)
26. Limpeza de contexto (clearActiveTeamContext) remove o contexto ativo e exige nova seleção (PASS)

### 6.2 Regressão Consolidada (Identidade + Hardening)
- `src/test/phase12OrganizationManagement.test.ts`: **26/26 PASS**
- `src/test/phase11IdentityAndTeamContext.test.ts`: **17/17 PASS**
- `src/test/identityCanonicalAthleteRegistration.test.ts`: **16/16 PASS**
- `src/test/identityPhase11SeedAndDataAccess.test.ts`: **24/24 PASS**
- `src/test/gate2a3LocalHardening.test.ts`: **22/22 PASS**
- `src/test/gate2b2RefereeCompatibility.test.ts`: **17/17 PASS**
- **Subtotal Consolidado:** **122 / 122 testes PASS (100%)**

### 6.3 Testes Globais do Repositório (`npm test`)
- **134 arquivos de teste PASS (134/134)**
- **1.452 testes PASS (1.452/1.452)**

---

## 7. VALIDAÇÃO DE QUALIDADE E CONFORMIDADE

| Verificação | Comando | Resultado | Observações |
| :--- | :--- | :--- | :--- |
| **Typecheck** | `npx tsc -p tsconfig.app.json --noEmit` | **PASS (0 erros)** | Tipagem estrita completa |
| **Linter** | `npm run lint` | **PASS (0 erros)** | 1 aviso pré-existente fora de escopo |
| **Formatação/Diff** | `git diff --check` | **PASS (0 erros)** | Whitespace sanitizado |
| **Build de Produção** | `npm run build` | **PASS** | Bundle gerado em 2m 56s |

---

## 8. ISOLAMENTO DE PRODUÇÃO

- **PRODUÇÃO TOCADA:** NÃO
- **DEPLOY:** NÃO
- **SSH DE ALTERAÇÃO:** NÃO
- **DDL EM PRODUÇÃO:** 0
- **DML EM PRODUÇÃO:** 0
- **MIGRATIONS EM PRODUÇÃO:** 0
- O diretório `/opt/apps/saas/baseOs-voltz` permaneceu intocado.

---

## 9. PRÓXIMOS PASSOS RECOMENDADOS

1. **Gate 2C (Pré-Release da Camada Administrativa Multi-Tenant):** Auditoria de segurança adversarial para testes de ponta a ponta via Playwright/Browser Subagent das telas `/organizacoes` e fluxos de convites.
2. **Remoção Programada do Fallback Legado:** Em fase futura dedicada, após migração de todos os vínculos em produção, depreciar e remover `profiles.competition_team_id`.
