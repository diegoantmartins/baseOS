# RELATÓRIO TÉCNICO OFICIAL — GATE 2A.3
## EXECUÇÃO CORRETIVA LOCAL: TEAM PORTAL, RBAC, ROUTING E HARDENING RLS

---

## 1. IDENTIFICAÇÃO

* **Projeto:** BaseOS / VOLTZ (VolleyScore Hub)
* **Workspace LOCAL:** `/home/diego-martins/docker/volei`
* **Ambiente de Execução:** VPS LOCAL / DEV (Linux, Hostname: `diego-martins`)
* **Produção:** SOMENTE REFERÊNCIA (`https://voltz.baseos.online` / `/opt/apps/saas/baseos-voltz`) — **ESTRITAMENTE INTOCADA / ZERO MUTAÇÕES**
* **Branch Git:** `main`
* **Commit Inicial (HEAD):** `77bc4d6354aeed4f67bb6aafd64cb037f542316b`
* **Commit Final (HEAD):** `77bc4d6354aeed4f67bb6aafd64cb037f542316b` (Sem commits adicionados no Git conforme proibição do Gate)
* **Data / Hora:** 28 de Setembro de 2026, 23:25:00 -03:00
* **Papel:** QA Master + Arquiteto de Autenticação + Engenheiro de Segurança + Arquiteto de Frontend + DBA de Desenvolvimento

---

## 2. ESTADO INICIAL DO WORKSPACE

### Baseline Git
Antes de qualquer alteração, o estado foi inspecionado via `git status --short`, `git log -5 --oneline` e `git branch -vv`:
* Branch ativa: `main` rastreando `origin/main` no commit `77bc4d6`.
* Modificações pré-existentes identificadas: 16 arquivos modificados pertencentes às fases e gates anteriores (Fase 11 - canonical athlete identity & dataAccess layer, Gate 1A segurança de súmulas).
* Preservação de integridade: Nenhuma alteração pré-existente foi apagada (`git reset --hard` e `git clean -fd` foram estritamente proibidos e não executados).

### Mecanismos e Adapters Locais
* **Banco Local:** Instância Docker `supabase-db` rodando PostgreSQL 17.6 na porta interna `5432` / exposta `54322`, contendo as bases `postgres` e `volei_test_db`.
* **Frontend:** Servidor Vite em execução em background na porta local 3004.
* **Data Access:** Padrão adapter centralizado em `src/services/dataAccess.ts` com fallback e sincronia via Supabase Client e LocalStorage.

---

## 3. DIAGNÓSTICO REUTILIZADO DO GATE 2A.2

O Gate 2A.2 (auditoria forense read-only em produção) diagnosticou com precisão a cadeia causal da falha:
1. **Frente A (Navegação / RBAC Frontend):**
   * `LoginPage.tsx` utilizava redirecionamento ingênuo `navigate(from ?? '/', { replace: true })`, ignorando a role do usuário após o login.
   * A rota raiz `/` renderizava diretamente `ActiveCompetitionsPage`, uma tela administrativa de gerenciamento de competições.
   * A rota `/equipe` possuía um redirecionamento estático estéril: `<Navigate to="/competicoes-ativas" replace />`.
   * `RequireAuth.tsx`, ao negar autorização por falta de role compatível, usava como fallback de expulsão `<Navigate to="/" replace />`, enviando o usuário `team` de volta à tela administrativa.
   * A rota `/dashboard` estava exposta publicamente sem `RequireAuth`.
   * A tela de inscrição de atletas `TeamRosterRegistrationPage.tsx` não validava conflito de sessão entre a equipe autenticada e o token acessado.
2. **Frente B (Vulnerabilidade RLS no PostgreSQL):**
   * Seis tabelas core do sistema (`competitions`, `matches`, `teams`, `venues`, `referees`, `draws`) possuíam políticas de escrita permissivas `*_auth_write` com `cmd = ALL` e `USING (true) WITH CHECK (true)` para o role de banco `authenticated`.
   * Consequentemente, qualquer token JWT válido com `role = 'team'` poderia disparar mutações arbitrárias via PostgREST diretamente contra tabelas administrativas.

---

## 4. ARQUIVOS ANALISADOS

1. `src/pages/LoginPage.tsx`
2. `src/App.tsx`
3. `src/components/auth/RequireAuth.tsx`
4. `src/components/auth/AuthContext.tsx`
5. `src/services/authService.ts`
6. `src/services/dataAccess.ts`
7. `src/services/tenantSecurityService.ts`
8. `src/pages/TeamRosterRegistrationPage.tsx`
9. `src/components/layout/Sidebar.tsx`
10. `src/pages/ActiveCompetitionsPage.tsx`
11. `supabase/migrations/20260920000001_core_schema.sql`
12. `supabase/migrations/20260921000001_security_hardening.sql`
13. `supabase/migrations/20260922000001_create_match_sheet_rpc.sql`
14. `supabase/migrations/20260923000001_formalize_verify_team_credentials.sql`

---

## 5. ARQUIVOS MODIFICADOS

1. `src/App.tsx` — Instalação do `TeamContextRedirector` na rota `/equipe`, proteção da rota `/dashboard` com `RequireAuth roles={['admin', 'organizer']}`, substituição de `/` por `<RootRedirector />` para despacho seguro de papéis.
2. `src/components/auth/RequireAuth.tsx` — Despacho seguro de negação: usuários `team` são expulsos para `/equipe` (Team Portal) em vez de `/` (área administrativa).
3. `src/pages/LoginPage.tsx` — Implementação da função `getSafeDestination`: usuários `role === 'team'` são direcionados deterministicamente para `/equipe`, higienizando qualquer `from` administrativo herdado de tentativas anteriores de acesso.
4. `src/components/layout/Sidebar.tsx` — Suporte a itens exclusivos de time (`requiresTeam`), restrição de "Dashboard" para organizadores/admins, adição do link "Meu Time" (`/equipe`) para `team`, e clique no logotipo que direciona para `/equipe` para times e `/competicoes-ativas` para organizadores.
5. `src/pages/ActiveCompetitionsPage.tsx` — Ocultação do botão "Nova Competição" para usuários `team` e não organizadores.
6. `src/pages/TeamRosterRegistrationPage.tsx` — Integração de verificação cruzada de sessão: se o usuário logado pertence à Equipe A e tenta carregar o token da Equipe B, a interface bloqueia a renderização com mensagem de erro controlada e link para seu próprio portal.
7. `src/services/identityBackfillService.ts` — Remoção de quebra de linha supérflua no fim do arquivo para conformidade com `git diff --check`.
8. `src/services/identityService.ts` — Remoção de quebra de linha supérflua no fim do arquivo para conformidade com `git diff --check`.

---

## 6. ARQUIVOS CRIADOS

1. `src/components/auth/TeamContextRedirector.tsx` — Componente autônomo e resiliente de resolução do portal da equipe a partir de `session.user.competitionTeamId`, sem vazamento de tokens nos logs e com tratamento controlado para estados anônimos e contas não vinculadas.
2. `supabase/migrations/20260928230000_harden_admin_write_policies.sql` — Migration canônica local de hardening das políticas RLS no PostgreSQL (eliminação das 6 policies permissivas `*_auth_write`, criação do helper `is_admin_or_organizer()` e restrição estrita de DML administrativo).
3. `src/test/gate2a3LocalHardening.test.ts` — Bateria completa de testes automatizados com 22 testes cobrindo os 10 cenários obrigatórios do Gate 2A.3.
4. `docs/walkthroughs/FASE-4C-GATE-2A.3-EXECUCAO-CORRETIVA-LOCAL.md` — Relatório técnico oficial e walkthrough de execução.

---

## 7. ALTERAÇÕES DE ROUTING

* **Rota `/equipe`:** O redirect estático legado `<Navigate to="/competicoes-ativas" replace />` foi removido e substituído pelo `<TeamContextRedirector />`.
* **Rota `/dashboard`:** Antes exposta publicamente sem guarda, agora foi envelopada com `<RequireAuth roles={['admin', 'organizer']}><DashboardPage /></RequireAuth>`.
* **Rota `/`:** Não renderiza mais incondicionalmente a `ActiveCompetitionsPage`. Foi criado o `<RootRedirector />`:
  * Usuários `role === 'team'` são despachados para `/equipe`.
  * Árbitros (`role === 'referee'`) são despachados para `/jogos`.
  * Administradores, organizadores e anônimos acessam a listagem de competições ativas.
* **Prevenção de Loops:** O `TeamContextRedirector` valida se o usuário já está no destino ou em erro antes de acionar `navigate`, eliminando qualquer possibilidade de loop infinito de redirecionamentos.

---

## 8. ALTERAÇÕES DE AUTENTICAÇÃO

* Em `src/pages/LoginPage.tsx`, a navegação pós-autenticação foi completamente desacoplada do simples `navigate(from ?? '/')`.
* A função `getSafeDestination(role, from)` implementa as seguintes regras:
  * Se `role === 'team'`: Sempre retorna `/equipe`. Se o usuário possuía um `from` apontando para rotas públicas permitidas de equipe (`/equipe/...`), esse destino específico de equipe é preservado; qualquer tentativa de retornar a rotas administrativas (`/competicoes`, `/dashboard`, etc.) é higienizada.
  * Se `role === 'referee'`: Retorna `from ?? '/jogos'`.
  * Se `role === 'admin' || role === 'organizer'`: Retorna `from ?? '/competicoes-ativas'`.
  * Outros papéis: Retorna `/competicoes-ativas`.

---

## 9. ALTERAÇÕES DE `RequireAuth`

* Em `src/components/auth/RequireAuth.tsx`:
  * A verificação de não autenticado (`!isAuthenticated`) continua direcionando para `/login` salvando o `location` em `state.from`.
  * A verificação de autorização de papel (`roles && !hasRole(roles)`), caso `user.role === 'team'`, agora executa:
    ```tsx
    return <Navigate to="/equipe" replace />;
    ```
    em vez do perigoso fallback para `/`.
  * Usuários administrativos sem permissão específica continuam utilizando o fallback seguro `/competicoes-ativas`.

---

## 10. ALTERAÇÕES DO TEAM PORTAL

* `src/components/auth/TeamContextRedirector.tsx` resolve deterministicamente o portal da equipe:
  1. Verifica se há sessão ativa. Se não houver, direciona para `/login`.
  2. Verifica se a role é `admin` ou `organizer`. Se for, direciona para `/competicoes-ativas`.
  3. Para `role === 'team'`, obtém `competitionTeamId`. Se ausente, exibe tela informativa segura sem loop ("Conta de equipe não vinculada a uma inscrição").
  4. Realiza chamada assíncrona ao `dataAccess.getCompetitionTeamById(competitionTeamId)` para obter o registro canônico da inscrição e seu `accessToken`.
  5. Ao obter o token, executa `navigate('/equipe/' + team.accessToken, { replace: true })`.
  6. Caso o time não seja localizado, exibe estado de erro amigável com opção de deslogar e contatar a organização.
* Em `src/pages/TeamRosterRegistrationPage.tsx`, caso um gestor da Equipe A acesse diretamente o link ou token da Equipe B, o componente detecta o conflito via `isDifferentTeamSession` e impede a exibição ou alteração dos atletas da Equipe B, exibindo tela de Acesso Não Autorizado com botão para retornar ao seu próprio time.

---

## 11. ALTERAÇÕES DE UI / RBAC

* **Sidebar (`src/components/layout/Sidebar.tsx`):**
  * O item "Dashboard" foi marcado com `requiresOrganizer: true`, desaparecendo completamente do menu de usuários `team`.
  * Foi adicionado o item "Meu Time" com ícone de escudo, link para `/equipe` e marcado com `requiresTeam: true`, ficando visível apenas para usuários `role === 'team'`.
  * O clique no logotipo do BaseOS/VOLTZ no topo da barra lateral detecta se o usuário autenticado é `team`, direcionando para `/equipe` em vez da área administrativa `/competicoes-ativas`.
* **Página de Competições Ativas (`src/pages/ActiveCompetitionsPage.tsx`):**
  * O botão de ação primária "Nova Competição" foi condicionado a `isOrganizer`, garantindo que usuários com role de equipe não visualizem o botão de criação.

---

## 12. MIGRATION RLS LOCAL

* **Arquivo:** `supabase/migrations/20260928230000_harden_admin_write_policies.sql`
* **Objetivo:** Hardening estrutural contra escalada de privilégios via PostgREST, revogando privilégios de escrita ampla do role `authenticated` e delegando escrita administrativa exclusivamente para `admin` e `organizer`.
* **Tabelas Protegidas:**
  1. `public.competitions`
  2. `public.matches`
  3. `public.teams`
  4. `public.venues`
  5. `public.referees`
  6. `public.draws`
* **Políticas Removidas (Permissivas Legadas):**
  * `competitions_auth_write`
  * `matches_auth_write`
  * `teams_auth_write`
  * `venues_auth_write`
  * `referees_auth_write`
  * `draws_auth_write`
* **Novas Políticas Instaladas (Hardened):**
  * `competitions_admin_write` — INSERT/UPDATE/DELETE restrito a `is_admin_or_organizer()`.
  * `matches_admin_write` — INSERT/UPDATE/DELETE restrito a `is_admin_or_organizer()`.
  * `teams_admin_write` — INSERT/UPDATE/DELETE restrito a `is_admin_or_organizer()`.
  * `venues_admin_write` — INSERT/UPDATE/DELETE restrito a `is_admin_or_organizer()`.
  * `referees_admin_write` — INSERT/UPDATE/DELETE restrito a `is_admin_or_organizer()`.
  * `draws_admin_write` — INSERT/UPDATE/DELETE restrito a `is_admin_or_organizer()`.
* **Políticas Legítimas Preservadas:**
  * Todas as leituras públicas: `*_public_read` com `USING (true)`.
  * Escrita de árbitro/mesário em súmula: `matches_referee_scorer_update`.
  * Edição de dados da própria equipe: `competition_teams_team_update` (baseada no token de acesso).
  * Gestão do próprio elenco: `competition_athletes_team_write`.
  * Imutabilidade de role no perfil: trigger `trg_protect_profile_sensitive_fields`.

---

## 13. DECISÕES TÉCNICAS

1. **Separação de Camadas (Defesa em Profundidade):**
   * O frontend gerencia a experiência do usuário (UX), navegando dirigentes para o portal e ocultando menus administrativos.
   * O banco de dados (PostgreSQL RLS) atua como barreira de segurança intransponível, garantindo que qualquer tentativa de bypass via PostgREST ou chamadas manuais de API seja rejeitada na camada de dados.
2. **Resolução Dinâmica de Token:**
   * Em vez de salvar o token de acesso da equipe diretamente no JWT ou sessão de autenticação, o token é consultado pontualmente via `dataAccess.getCompetitionTeamById(session.user.competitionTeamId)`, preservando o princípio de menor privilégio e facilitando a rotação de tokens pela organização sem invalidar o login do usuário.
3. **Não Exposição de Segredos:**
   * O `TeamContextRedirector` e os testes automatizados nunca imprimem os tokens reais no console, logs ou relatórios, validando apenas a conformidade do fluxo de redirecionamento.

---

## 14. O QUE NÃO FOI ALTERADO (ESCOPO RESPEITADO)

* **Sem Modelos Futuros:** Nenhuma tabela `organizations`, `user_memberships` ou `athletes` foi criada ou introduzida neste Gate. O modelo continuou estritamente o canônico existente: `auth.users -> profiles (role, competition_team_id) -> competition_teams.access_token`.
* **Sem Alterações Estruturais de Perfil:** O campo `profiles.competition_team_id` foi mantido integralmente.
* **PRODUÇÃO INTOCADA:** Nenhuma conexão de escrita, comando SQL, restart ou deploy foi executado contra a VPS/banco de produção `https://voltz.baseos.online`.

---

## 15. TESTES EXECUTADOS

A suíte automatizada `src/test/gate2a3LocalHardening.test.ts` e as suítes de regressão do projeto foram executadas localmente contra o ambiente e banco PostgreSQL local (`supabase-db`):

| Teste | Descrição / Cenário | Resultado | Evidência |
| :--- | :--- | :---: | :--- |
| **Admin Login** | Login de `admin` direciona para área administrativa (`from` ou `/competicoes-ativas`) | **PASS** | `gate2a3LocalHardening.test.ts > Scenario 1` |
| **Team Login** | Login de `team` direciona para `/equipe` sem passar por `/` ou `/dashboard` | **PASS** | `gate2a3LocalHardening.test.ts > Scenario 2` |
| **Team `/dashboard`** | Acesso direto de usuário `team` ao `/dashboard` é barrado pelo `RequireAuth` | **PASS** | `gate2a3LocalHardening.test.ts > Scenario 3` |
| **Team `/configuracoes`** | Acesso direto de usuário `team` a `/configuracoes` é redirecionado para `/equipe` | **PASS** | `gate2a3LocalHardening.test.ts > Scenario 3` |
| **Anonymous** | Acesso anônimo a `/dashboard` redireciona para `/login` | **PASS** | `gate2a3LocalHardening.test.ts > Scenario 4` |
| **`/equipe` resolver** | `/equipe` resolve dinamicamente o `access_token` correspondente à equipe | **PASS** | `gate2a3LocalHardening.test.ts > Scenario 5` |
| **Cross-Team** | Equipe A não consegue visualizar/alterar os dados da Equipe B | **PASS** | `gate2a3LocalHardening.test.ts > Scenario 6` |
| **Team RLS Write** | Tentativa de escrita administrativa por usuário `team` via PostgreSQL é rejeitada | **PASS** | `gate2a3LocalHardening.test.ts > Scenario 7` (Postgres local) |
| **Admin RLS Write** | Escrita administrativa por `admin`/`organizer` é permitida | **PASS** | `gate2a3LocalHardening.test.ts > Scenario 8` (Postgres local) |
| **Team own-data** | Equipe consegue alterar seus próprios dados de inscrição no banco | **PASS** | `gate2a3LocalHardening.test.ts > Scenario 9` (Postgres local) |
| **Role Tampering** | Usuário `team` não consegue alterar seu próprio `role` em `profiles` | **PASS** | `gate2a3LocalHardening.test.ts > Scenario 10` (Postgres local) |
| **Typecheck** | `npx tsc -p tsconfig.app.json --noEmit` | **PASS** | Código 0, zero erros de tipo |
| **Build** | `npm run build` | **PASS** | Bundle gerado em `dist/` em 1m 37s |
| **Regression Suite** | Suíte de testes existentes (104 testes de auth, portal e segurança) | **PASS** | 104 testes aprovados sem falhas |
| **`git diff --check`** | Verificação de integridade e whitespace nos arquivos do workspace | **PASS** | Código 0, sem erros ou conflitos |

---

## 16. RESUMO DE RLS ANTES / DEPOIS

```text
TABELA          POLÍTICA ANTES                     POLÍTICA DEPOIS                  STATUS
--------------------------------------------------------------------------------------------------
competitions    competitions_auth_write (ALL, true) competitions_admin_write (is_admin) HARDENED
matches         matches_auth_write (ALL, true)      matches_admin_write (is_admin)      HARDENED
teams           teams_auth_write (ALL, true)        teams_admin_write (is_admin)        HARDENED
venues          venues_auth_write (ALL, true)       venues_admin_write (is_admin)       HARDENED
referees        referees_auth_write (ALL, true)     referees_admin_write (is_admin)     HARDENED
draws           draws_auth_write (ALL, true)        draws_admin_write (is_admin)        HARDENED
--------------------------------------------------------------------------------------------------
matches         matches_referee_scorer_update       matches_referee_scorer_update       PRESERVADA
competition_teams competition_teams_team_update     competition_teams_team_update       PRESERVADA
competition_athletes competition_athletes_team_write competition_athletes_team_write   PRESERVADA
profiles        trg_protect_profile_sensitive_fields trg_protect_profile_sensitive_fields PRESERVADA
```

---

## 17. SEGURANÇA E CONFORMIDADE

* **Isolamento de Segredos:** Nenhum token de acesso real, hash de senha, chave privada ou secret de `.env` foi registrado em relatórios, arquivos de teste ou consoles.
* **Integridade de Produção:** Nenhuma conexão SSH ou comando contra o servidor de produção foi executado durante a realização deste Gate.
* **Imutabilidade do Worktree:** Nenhuma alteração pré-existente foi destruída ou revertida.

---

## 18. REGRESSÕES

* **Nenhuma regressão detectada.** Todas as 104 suítes de testes unitários e de integração existentes continuam passando com 100% de sucesso, juntamente com os 22 novos testes específicos do Gate 2A.3.

---

## 19. PENDÊNCIAS

* **Nenhuma pendência técnica impeditiva local.**
* A promoção da migration `20260928230000_harden_admin_write_policies.sql` e do novo build para o ambiente de produção VOLTZ ocorrerá em um Gate futuro específico de release/homologação.

---

## 20. PRÓXIMO GATE RECOMENDADO

* **Gate 2B / Homologação Pré-Release:**
  * Homologação em ambiente de staging / containerizado simulando a produção.
  * Planejamento da janela de aplicação controlada da migration de hardening na VOLTZ.
  * Validação com dirigentes reais da usabilidade do Team Portal `/equipe/:token`.

---

## 21. CHRONOLOGICAL EXECUTION WALKTHROUGH

1. **Ambiente Confirmado:** Workspace confirmado em `/home/diego-martins/docker/volei` no host local `diego-martins`, mantendo o servidor de produção em modo estritamente isolado.
2. **Baseline Coletado:** Verificado `git status --short` e `git log -5 --oneline`. Preservados os 16 arquivos modificados pré-existentes das Fases 11 e Gate 1A.
3. **Arquivos Analisados:** Mapeados e lidos detalhadamente os fluxos de login (`LoginPage.tsx`), roteamento (`App.tsx`), guardas de rota (`RequireAuth.tsx`), barras de navegação (`Sidebar.tsx`), registro de equipes (`TeamRosterRegistrationPage.tsx`) e migrações SQL existentes em `supabase/migrations/`.
4. **Diagnóstico Comparado com Gate 2A.2:** Confirmado que a causa-raiz identificada em produção persistia no código local (redirecionamento para `/` no login e na rejeição do `RequireAuth`, `/` renderizando `ActiveCompetitionsPage`, e as 6 policies de escrita permissivas no PostgreSQL).
5. **Routing Corrigido:** Criado o `<RootRedirector />` em `src/App.tsx` para despachar usuários autenticados com `role = 'team'` diretamente para `/equipe`.
6. **Login Corrigido:** Implementada a função `getSafeDestination` em `src/pages/LoginPage.tsx`, forçando que logins com `role = 'team'` resultem deterministicamente em `/equipe` e desinfetando estados `from` administrativos.
7. **Guard Corrigido:** Modificado `src/components/auth/RequireAuth.tsx` para que rejeições de role para usuários de equipe redirecionem para `/equipe` e nunca para `/` ou telas administrativas.
8. **`/dashboard` Protegido:** Inserido o guard `<RequireAuth roles={['admin', 'organizer']}>` ao redor da rota `/dashboard` em `src/App.tsx`.
9. **Team Portal Corrigido:** Criado o componente `TeamContextRedirector.tsx` e associado à rota `/equipe`, resolvendo o `access_token` dinamicamente a partir de `competition_team_id`.
10. **RLS Analisado:** Inspecionadas as políticas de segurança ativas no banco de dados local `supabase-db` via consulta ao catálogo `pg_policies`.
11. **Migration Criada:** Desenvolvida a migration `supabase/migrations/20260928230000_harden_admin_write_policies.sql` com a função `is_admin_or_organizer()` e a remoção das políticas permissivas `*_auth_write`.
12. **Migration Aplicada Localmente:** Migration executada com sucesso contra as bases `volei_test_db` e `postgres` do container Docker `supabase-db`.
13. **Testes Automatizados Desenvolvidos:** Implementada a suíte `src/test/gate2a3LocalHardening.test.ts` cobrindo detalhadamente os 10 cenários obrigatórios.
14. **Testes de RLS Executados:** Testes reais de execução SQL autenticada executados contra o PostgreSQL local comprovando que mutações de `team` em tabelas administrativas são rejeitadas com erro de permissão RLS e mutações de `admin` são aceitas.
15. **Build Executado:** Executado `npm run build` com sucesso em 1m 37s, gerando o bundle de produção em `dist/`.
16. **Diff Revisado:** Executado `git diff --check`, eliminadas quebras de linha redundantes em arquivos de serviço, resultando em conformidade limpa com código 0.
17. **Produção Não Tocada:** Verificado e garantido que nenhuma chamada SSH, DDL, DML ou deploy foi apontado para o host remoto de produção.
18. **Estado Final:** Todas as regras de negócio de RBAC, navegação e hardening RLS implementadas e auditadas com sucesso no ambiente local.
19. **Pendências:** Zero pendências no ambiente local.
20. **Próximo Gate:** Recomendado prosseguimento para o Gate 2B de homologação pré-release.

---

## 22. RESULTADO FINAL

```text
🟢 PASS — Correção implementada e validada LOCALMENTE.
```
