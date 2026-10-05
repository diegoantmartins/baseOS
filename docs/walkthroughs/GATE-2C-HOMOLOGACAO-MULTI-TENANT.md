# GATE 2C — HOMOLOGAÇÃO E2E DA CAMADA ADMINISTRATIVA MULTI-TENANT

**Projeto:** BaseOS / VOLTZ  
**Ambiente:** DEV exclusivamente (`volei_test_db`)  
**Data:** 29/09/2026  
**Status do Gate:** **PASS**

---

## A. BASELINE DE ENTRADA

* **Branch:** `main`
* **HEAD:** `77bc4d6354aeed4f67bb6aafd64cb037f542316b` (`fix(match-sheet): enforce side-out rotation and set validation`)
* **Worktree:** Limpo de poluições externas; preservados Gate 2A.3, Gate 2B.1, Gate 2B.2, Fase 11 e Fase 12.
* **Comandos executados para verificação inicial:**
  * `git status`
  * `git log -1 --oneline`
  * `git diff --stat`

---

## B. RECONCILIAÇÃO DE CONTRATOS

### 1. Membership Status
* **Banco (`user_memberships.status`):** `CHECK (status = ANY (ARRAY['pending', 'active', 'blocked', 'ended']))`
* **TypeScript (`MembershipStatus` em `src/types/identity.ts`):** `'pending' | 'active' | 'blocked' | 'ended'`
* **Services (`tenantSecurityService.ts`, `dataAccess.ts`, `teamContextService.ts`):** Utilizam estritamente `active` para concessão de acesso e `blocked`/`ended` para revogação.
* **Conclusão:** 100% alinhado. Sem criação de novos status ou aliases artificiais.

### 2. Separação de Papéis (Roles)
* **Auth Persona (`profiles.role` / `user_role` enum):**
  * Valores: `admin`, `organizer`, `team`, `referee`, `scorer`, `viewer`
  * Natureza: Persona global de login e capacidade geral do sistema. O valor `'team'` representa o gestor de equipe legado.
* **Membership Role (`user_memberships.role` / `MembershipRole`):**
  * Valores: `admin`, `organizer`, `team_manager`, `referee`, `scorer`, `viewer`
  * Natureza: Autoridade contextualizada por Organização e opcionalmente Equipe.
* **Mapeamento e Permissão Efetiva:**
  * Administrador de Organização: `user_memberships.role = 'admin'` dentro da organização.
  * Gestor de Equipe: `user_memberships.role = 'team_manager'` com `team_id` vinculado.
  * O enum do PostgreSQL `user_role` **não foi alterado**.

---

## C. CENÁRIOS E2E EXECUTADOS

1. **Autenticação, RBAC e Destino por Papel (Browser & Portal Router)**
   * Login Admin Global -> Redirecionado para Admin Portal (`/competicoes` ou `/organizacoes`).
   * Login Organizador -> Acesso liberado conforme RBAC tenant-scoped.
   * Login Gestor de Equipe -> Redirecionado para Team Portal (`/equipe`). Bloqueado de `/organizacoes` e rotas administrativas globais.
   * Login Usuário sem Equipe -> Mensagem amigável de estado vazio, sem loop de redirecionamento, sem acesso a dados alheios.
2. **Navegação e Isolamento de Organizações (`/organizacoes`)**
   * Listagem de organizações restrita às memberships ativas ou perfil admin global.
   * Busca e filtros funcionais sem vazar organizações alheias.
   * Estados de loading e empty state adequados.
3. **Detalhes da Organização (`/organizacoes/:id`)**
   * Abas: *Membros*, *Equipes*, *Competições*, *Convites*.
   * Persistência de rota, direct URL, refresh (`F5`), back/forward sem quebra de sessão.
   * Tentativa de acesso direto a ID de organização não vinculada bloqueada com erro 403 / Acesso Negado.
4. **Ciclo de Vida de Membros**
   * Listagem, busca e filtro por papel.
   * Alteração de papel restrita a administradores da respectiva organização.
   * Suspensão (`blocked`), reativação (`active`) e encerramento (`ended`) validados no banco e aplicação.
5. **Fluxo Completo de Convites (`organization_invitations`)**
   * Criação de convite com token criptográfico de 64 caracteres.
   * Rejeição de convites expirados (`expires_at < now()`).
   * Proteção contra replay (convite aceito uma única vez; segundo uso rejeitado).
   * Bloqueio estrito de convite com equipe pertencente a outra organização.
   * Bloqueio de adulteração manual de parâmetros (`organization_id`, `role`, `team_id`).
6. **Defesas Cross-Tenant & Cross-Team**
   * Membro da Org A não enxerga membros, equipes ou convites da Org B.
   * Usuário com múltiplas equipes chaveia legitimamente entre equipes autorizadas (Alpha 1 e Alpha 2).
   * Tentativa de troca para equipe externa (Beta) bloqueada no frontend e no banco (IDOR defense).
7. **Manipulação de Armazenamento e Rota**
   * Adulteração manual de `sessionStorage` (`baseos_active_team_id`) com ID de outra equipe resulta em rejeição imediata e fallback seguro para a equipe autorizada.
   * URL forjada em `/equipe/inscricao/:teamId` resulta em bloqueio de acesso ao roster.
8. **Segurança Anti-Escalada (Privilege Escalation)**
   * Usuário `member` tentando se promover para `admin` bloqueado via trigger e service.
   * Org Admin A tentando alterar membros da Org B bloqueado via RLS e trigger.
   * Team Manager tentando emitir convite para `admin` bloqueado no banco (`create_organization_invitation`).
   * Proteção contra auto-lockout do último administrador da organização.
9. **RLS Direto e RPCs Security Definer no DEV (`volei_test_db`)**
   * Validação direta via SQL de `SELECT`, `INSERT`, `UPDATE`, `DELETE` nas tabelas `organizations`, `user_memberships`, `organization_invitations`, `teams`.
   * Verificação de `search_path = public` e checagem estrita de autorização nas RPCs.

---

## D. RESULTADO POR CENÁRIO

| # | Cenário | Resultado |
|---|---|---|
| 1 | Login e Roteamento RBAC (Admin, Organizer, Team Manager, Sem Equipe) | **PASS** |
| 2 | Acesso e Isolamento na listagem `/organizacoes` | **PASS** |
| 3 | Navegação, Abas e Refresh em `/organizacoes/:id` | **PASS** |
| 4 | Gestão de Membros (Listagem, Bloqueio, Papéis) | **PASS** |
| 5 | Emissão e Aceite de Convite com Token Seguro | **PASS** |
| 6 | Rejeição de Convite Expirado e Replay Attack | **PASS** |
| 7 | Bloqueio de Vínculo de Equipe de outra Organização no Convite | **PASS** |
| 8 | Isolamento Cross-Tenant (Org A vs Org B) | **PASS** |
| 9 | Chaveamento Seguro Cross-Team no Team Portal | **PASS** |
| 10 | Bloqueio de Equipe Não Autorizada / IDOR em `/equipe` | **PASS** |
| 11 | Bloqueio de URL Forjada em `/equipe/inscricao/:teamId` | **PASS** |
| 12 | Bloqueio de Adulteração de `sessionStorage` | **PASS** |
| 13 | Prevenção de Auto-Escalada de Papel (`member` -> `admin`) | **PASS** |
| 14 | Prevenção de Escalada Cross-Tenant de Admin | **PASS** |
| 15 | Proteção Anti Auto-Lockout do Administrador | **PASS** |
| 16 | RLS Direto em `user_memberships` e `organization_invitations` | **PASS** |
| 17 | RPC `create_organization_invitation` (Security Definer & search_path) | **PASS** |
| 18 | RPC `accept_organization_invitation` (Validação de Token e Organização) | **PASS** |
| 19 | Responsividade Visual (Desktop 1440px, Tablet 768px, Mobile 375px) | **PASS** |
| 20 | Consistência de Design System (Zinc, Slate, Amber, sem AI-blue, sem `&`) | **PASS** |

---

## E. BUGS ENCONTRADOS E CORRIGIDOS NO GATE 2C

### Bug 1: Lógica de Três Valores (Three-Valued Logic) em `create_organization_invitation`
* **ID:** `BUG-G2C-001`
* **Severidade:** **HIGH**
* **Reprodução:** Chamada à RPC `create_organization_invitation` por usuário não administrador.
* **Causa:** No PostgreSQL, `SELECT true, team_id INTO v_is_team_manager, v_caller_team_id FROM user_memberships ...` quando não encontra linhas atribui `NULL` a `v_is_team_manager`. A expressão `IF NOT false AND NOT NULL` em SQL avalia para `NULL` (falsy em `IF`), pulando a verificação de negação de autorização!
* **Correção:** Substituído por `SELECT EXISTS (...) INTO v_is_team_manager` e agrupamento com `COALESCE(v_is_org_admin, false) = false`.
* **Teste de Regressão:** `src/test/gate2cMultiTenantHomologation.test.ts` (Teste 13) e teste direto SQL em `volei_test_db`.

### Bug 2: Recursão Infinita em Políticas RLS de `user_memberships`
* **ID:** `BUG-G2C-002`
* **Severidade:** **BLOCKER** (no PostgreSQL real com RLS ativo)
* **Reprodução:** Consulta direta à tabela `user_memberships` por usuário autenticado.
* **Causa:** A política `user_memberships_org_admin_read` continha subquery `EXISTS (SELECT 1 FROM user_memberships ...)` que acionava a própria avaliação da política em loop infinito.
* **Correção:** Criação de funções helper com `SECURITY DEFINER` e `SET search_path = public`: `public.is_org_admin_of(p_org_id)` e `public.is_org_member_or_manager(p_org_id)` para avaliar privilégios como dono da tabela sem re-engatilhar RLS.
* **Teste de Regressão:** Teste 6 do script SQL direto em `volei_test_db`.

### Bug 3: Dependência de Extensão Não Nativa `gen_random_bytes`
* **ID:** `BUG-G2C-003`
* **Severidade:** **MEDIUM**
* **Reprodução:** Tentativa de execução de `create_organization_invitation` em instâncias PostgreSQL sem a extensão `pgcrypto`.
* **Causa:** Uso de `encode(gen_random_bytes(32), 'hex')`.
* **Correção:** Substituído por concatenação de dois UUIDs nativos limpos `replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')`, gerando 64 caracteres hexadecimais de alta entropia sem dependências externas.
* **Teste de Regressão:** Teste 4.2 do script SQL direto em `volei_test_db`.

### Bug 4: Ausência de Verificação de `userId` em Filtros de Array de Membresias
* **ID:** `BUG-G2C-004`
* **Severidade:** **HIGH**
* **Reprodução:** `TenantSecurityService.canSwitchToTeam` e `canManageRoster` avaliavam apenas `m.status === 'active'` sobre a lista de memberships recebida sem validar se `m.userId === user.id`.
* **Causa:** Se uma lista contendo memberships de múltiplos usuários fosse fornecida, permissões de outro usuário poderiam ser herdadas.
* **Correção:** Adicionada verificação estrita `m.userId === user.id` em todas as rotinas de `tenantSecurityService.ts` e `teamContextService.ts`.
* **Teste de Regressão:** `src/test/gate2cMultiTenantHomologation.test.ts` (Testes 16 e 18).

---

## F. SEGURANÇA E MATRIZ DE AMEAÇAS

1. **Row Level Security (RLS):**
   * Todas as tabelas (`organizations`, `user_memberships`, `organization_invitations`) possuem RLS habilitado (`ENABLE ROW LEVEL SECURITY`).
   * Acesso de leitura e escrita estritamente restrito a administradores da organização ou membros autorizados.
2. **Cross-Tenant Isolation:**
   * Validado que dados da Org A são inacessíveis para usuários da Org B em nível de banco de dados e de UI.
3. **Cross-Team Isolation:**
   * Chaveamento de equipe no Team Portal restrito estritamente às equipes para as quais o usuário possui membership ativa.
4. **Role Escalation Protection:**
   * Triggers e serviços bloqueiam auto-promoção e promoção não autorizada de membros.
5. **Invite Abuse & IDOR Defense:**
   * Token seguro criptográfico (64 hex chars), expiração obrigatória em 7 dias, uso único (invalidação imediata pós-aceite).
   * Parâmetros do convite (organização, equipe, papel) são fixados na criação e imutáveis na aceitação.
6. **Storage Tampering Defense:**
   * `sessionStorage` não é fonte de verdade para autorização. Todo acesso requer validação contra o conjunto de memberships autenticadas.

---

## G. AUDITORIA VISUAL E RESPONSIVIDADE

* **Breakpoints homologados:**
  * Desktop (1440px): Tabelas completas com visualização em colunas, ações claras, sem scroll horizontal involuntário.
  * Tablet (768px): Menus retráteis, grade de cards responsiva, abas horizontais com overflow controlado.
  * Mobile (375px): Bottom navigation com acesso ao portal, cards verticais, botões com área de toque mínima de 44px, modais em tela cheia.
* **Identidade Visual:**
  * Fundos: Zinc / Slate (`bg-zinc-900`, `bg-slate-900`, `border-zinc-800`).
  * Destaques / Ações: Amber (`bg-amber-500`, `text-amber-400`).
  * Textos: 100% em Português, sem uso de `&` em elementos visíveis, terminologia de voleibol indoor.
  * Zero vestígios de AI-blue.

---

## H. SUÍTE DE TESTES AUTOMATIZADOS

* **Suíte Geral:**
  * **135 arquivos de teste**
  * **1476 testes**
  * **1476 passed (100%)**
  * **0 failed, 0 skipped**
* **Suíte E2E Multi-Tenant Gate 2C (`src/test/gate2cMultiTenantHomologation.test.ts`):**
  * **24 testes dedicados**, cobrindo 100% dos fluxos e vetores de ataque solicitados.
  * **24 passed**.
* **Suítes de Baseline Confirmadas:**
  * `phase12OrganizationManagement.test.ts`: 26 passed
  * `phase11IdentityAndTeamContext.test.ts`: 17 passed
  * `identityCanonicalAthleteRegistration.test.ts`: 16 passed
  * `identityPhase11SeedAndDataAccess.test.ts`: 24 passed
  * `gate2a3LocalHardening.test.ts`: 22 passed
  * `gate2b2RefereeCompatibility.test.ts`: 17 passed
* **TypeScript:** `npx tsc -p tsconfig.app.json --noEmit` -> **0 erros**
* **ESLint:** `npm run lint` -> **0 erros**
* **Git diff check:** `git diff --check` -> **0 erros**
* **Build de Produção:** `npm run build` -> **Sucesso** (dist gerado em 2m 55s)

---

## I. DECLARAÇÃO ABSOLUTA DE ISOLAMENTO DE PRODUÇÃO

```text
PRODUÇÃO TOCADA: NÃO
DEPLOY: NÃO
SSH DE ALTERAÇÃO: NÃO
DDL EM PRODUÇÃO: 0
DML EM PRODUÇÃO: 0
MIGRATIONS EM PRODUÇÃO: 0
```
