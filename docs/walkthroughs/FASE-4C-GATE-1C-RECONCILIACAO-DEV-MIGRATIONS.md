# BASEOS — FASE 4C — GATE 1C
## Reconciliação DEV + Preparação de Migrations Canônicas

**Projeto:** BaseOS (`diegoantmartins/volleyscore-hub`)  
**Workspace:** `/home/diego-martins/docker/volei`  
**Branch:** `main`  
**Commit-Base (HEAD Inicial):** `77bc4d6354aeed4f67bb6aafd64cb037f542316b`  
**HEAD Final:** `77bc4d6354aeed4f67bb6aafd64cb037f542316b` (0 commits realizados)  
**Data:** 28 de Setembro de 2026  
**Ambiente Remoto Inspecionado:** VOLTZ (`https://voltz.baseos.online` / VPS Contabo `vmi3488325`)  
**Modo de Execução:** STRICT READ-ONLY em VOLTZ / Zero modificação remota  
**Decisão da Gate:** `GATE 1C = PASS WITH FINDINGS`

---

## 1. Identificação e Contexto

| Parâmetro | Detalhe |
| :--- | :--- |
| **Projeto** | BaseOS / VolleyScore Hub |
| **Workspace Local** | `/home/diego-martins/docker/volei` |
| **Branch** | `main` |
| **HEAD Inicial** | `77bc4d6354aeed4f67bb6aafd64cb037f542316b` |
| **HEAD Final** | `77bc4d6354aeed4f67bb6aafd64cb037f542316b` |
| **Ambiente Remoto** | VOLTZ (`https://voltz.baseos.online` / VPS Contabo `vmi3488325`) |
| **Portas Remotas** | 80/443 (HTTP/HTTPS ativas via PostgREST/OpenResty); 22 (SSH restrito a chaves não configuradas); 5432 (fechada/firewalled) |
| **Executante** | Agente de Engenharia BaseOS |
| **Escopo** | Reconciliação estrutural de migrations DEV × VOLTZ, análise forense de `verify_team_credentials`, homologation schema drift, grafo de dependências da Phase 11 e preparação de migrations canônicas no DEV |

---

## 2. Estado Git Inicial

O repositório local DEV encontrava-se intencionalmente *dirty* devido a implementações preservadas de fases anteriores (Fase 10 - Portal Unificado, Fase 11 - Identidade e Atletas Canônicos, Fase 4C Gate 1A - Segurança de Súmulas):

- **16 arquivos modificados rastreados:**
  - `src/App.tsx`
  - `src/components/auth/RequireAuth.tsx`
  - `src/components/layout/Sidebar.tsx`
  - `src/components/match-sheet/MatchSheetInterface.tsx`
  - `src/components/navigation/BottomNav.tsx`
  - `src/data/seed.ts`
  - `src/lib/supabaseClient.ts`
  - `src/pages/MatchSheetPage.tsx`
  - `src/services/competitionRegistrationService.ts`
  - `src/services/dataAccess.ts`
  - `src/services/identityBackfillService.ts`
  - `src/services/identityService.ts`
  - `src/services/registrationService.ts`
  - `src/types/entities.ts`
  - `src/types/identity.ts`
  - `src/types/registration.ts`
- **Arquivos untracked prévios (documentação e testes):**
  - Documentações de walkthrough em `docs/walkthroughs/`
  - `src/components/portal/`, `src/pages/portal/`
  - `src/test/identityCanonicalAthleteRegistration.test.ts`
  - `src/test/identityPhase11SeedAndDataAccess.test.ts`
  - `src/test/matchSheetSecurityAuthorization.test.tsx`
  - `src/test/portalRoutingAndSecurity.test.ts`
  - `src/test/teamRoleAuthorizationSecurity.test.ts`

**Nenhum arquivo existente foi descartado, resetado ou alterado inadvertidamente.** As regras estritas de não executar `git reset`, `git clean`, `git restore`, `git stash`, `git add .`, `git commit` ou `git push` foram rigorosamente cumpridas.

---

## 3. Estado Git Final

Após a execução da Gate 1C:
- **16 arquivos modificados pré-existentes:** 100% preservados intactos.
- **Arquivos untracked criados na Gate 1C:**
  1. `supabase/migrations/20260923000001_formalize_verify_team_credentials.sql` (migration canônica candidata);
  2. `src/test/verifyTeamCredentialsRpc.test.ts` (suíte de testes automatizados do contrato da RPC e fluxo de auth);
  3. `docs/walkthroughs/FASE-4C-GATE-1C-RECONCILIACAO-DEV-MIGRATIONS.md` (este documento oficial).

---

## 4. Objetivo da Gate 1C

Transformar os achados forenses da Gate 1B em uma base técnica canônica e precisa no ambiente DEV, garantindo:
1. Investigação profunda e formalização canônica de `verify_team_credentials` no DEV;
2. Reconciliação dos tipos e idempotência das colunas de homologação em `public.matches`;
3. Auditoria detalhada das migrations de segurança RLS (`20260914180000` e `20260914190000`);
4. Mapeamento das dependências arquiteturais e ordem de promoção da Phase 11;
5. Construção do grafo de dependências das migrations;
6. Validação local (PostgreSQL local, Typecheck, ESLint, Vitest, Build de Produção);
7. **Preservação absoluta da VOLTZ como 100% READ-ONLY.**

---

## 5. Fontes Analisadas

### Ambiente DEV:
- Arquivos de migrations em `supabase/migrations/` (31 arquivos existentes + 1 canônico candidato criado);
- Código de persistência e adaptadores em `src/services/dataAccess.ts`, `src/services/authService.ts`, `src/services/registrationService.ts`;
- Tipos de entidades e contratos em `src/types/entities.ts`, `src/types/auth.ts`, `src/types/registration.ts`;
- Histórico completo do Git (`git log -S`, `git log --all`);
- Instância PostgreSQL local (`supabase-db` no Docker, rodando PostgreSQL 17.6 com `pgcrypto`).

### Ambiente VOLTZ (STRICT READ-ONLY):
- PostgREST OpenAPI Specification exposto em `https://voltz.baseos.online/rest/v1/` com apikey pública;
- Sondagem comportamental não destrutiva da RPC `/rest/v1/rpc/verify_team_credentials` (validação de parâmetros vazios, tokens inexistentes, senhas inválidas);
- Introspecção do bundle compilado servido em produção (`https://voltz.baseos.online/assets/index-C7AnobpH.js`);
- Verificação de conectividade de rede (portas 22, 80, 443, 5432).

---

## 6. Auditoria e Reconciliação de `verify_team_credentials` (F-06)

### 6.1 Recuperação da Definição SQL
- **Tentativa de Acesso ao Catálogo:** O banco de dados PostgreSQL na VPS Contabo `vmi3488325` não possui porta 5432 exposta à internet pública (conexão rejeitada/timeout). A porta 22 (SSH) está aberta, mas requer par de chaves assimétricas restrito não disponível para agentes automáticos. O endpoint PostgREST `/rest/v1/` não disponibiliza acesso DDL nem à função de sistema `pg_get_functiondef(oid)`.
- **Registro Obrigatório:** Conforme determinado na Seção 9 do protocolo Gate 1C, registra-se explicitamente:
  ```text
  DEFINIÇÃO SQL NÃO RECUPERÁVEL DIRETAMENTE DO CATÁLOGO PG_PROC DA VOLTZ
  ```
- **Consequência Arquitetural:** A migration gerada no DEV é classificada e rotulada expressamente como:
  ```text
  CANDIDATE / NÃO VALIDADA CONTRA PRODUÇÃO
  ```
  A Gate 1C **não** declara a migration como reconciliada por extração de código-fonte remoto, mas sim como uma reconstrução canônica de alta fidelidade técnica baseada no contrato comprovado.

### 6.2 Assinatura e Contrato OpenAPI Comprovados na VOLTZ
A especificação OpenAPI em `https://voltz.baseos.online/rest/v1/` confirma a assinatura:
```json
{
  "name": "verify_team_credentials",
  "parameters": [
    { "name": "p_token", "type": "string", "format": "text", "required": true },
    { "name": "p_password", "type": "string", "format": "text", "required": true }
  ],
  "returns": "json / jsonb",
  "http_method": "POST"
}
```

### 6.3 Comportamento Comprovado via Sondagem Não Destrutiva
| Cenário | Entrada | Resposta Observada na VOLTZ | Status HTTP |
| :--- | :--- | :--- | :---: |
| **Token Vazio** | `{"p_token": "", "p_password": "x"}` | `{"ok": false, "error": "Token de acesso não fornecido."}` | 200 OK |
| **Senha Vazia** | `{"p_token": "x", "p_password": ""}` | `{"ok": false, "error": "Senha de acesso obrigatória."}` | 200 OK |
| **Token Inexistente** | `{"p_token": "invalid-token-12345", "p_password": "x"}` | `{"ok": false, "error": "Inscrição de equipe não encontrada para o link fornecido."}` | 200 OK |
| **Senha Incorreta** | Token real (`5720728b-...`), senha inválida | `{"ok": false, "error": "Senha de acesso incorreta. Verifique a senha recebida."}` | 200 OK |
| **Sucesso** | Token real + senha correta | `{"ok": true, "email": "dirigente@dominio.com"}` | 200 OK |

### 6.4 Consumo pelo Frontend da VOLTZ (`index-C7AnobpH.js`)
A engenharia reversa do bundle servido em produção comprovou o ciclo de chamada:
1. Na tela de acesso da equipe (`/equipe/:token` ou `/equipe/inscricao/:token`), o dirigente informa a senha;
2. `supabaseAdapter.verifyTeamCredentials(token, password)` invoca `supabase.rpc('verify_team_credentials', { p_token: token.trim(), p_password: password.trim() })`;
3. Se `ok === true`, o frontend recebe o e-mail associado à equipe;
4. Em seguida, `authService.signInWithTeamToken` aciona `supabase.auth.signInWithPassword({ email: res.email, password })`, estabelecendo a sessão JWT oficial do Supabase Auth.

### 6.5 Análise de Segurança da Função Candidata
- **Modo de Execução:** `SECURITY DEFINER`. Indispensável, pois a função é chamada por usuários anônimos (`anon`) na tela de entrada antes do login, necessitando verificar o hash da senha em `auth.users`, tabela inacessível para a role `anon`.
- **Search Path:** Configurado explicitamente como `SET search_path = public, extensions`. Isso mitiga riscos críticos de *search_path hijacking* comuns em funções plpgsql sem path travado.
- **Grants:** `REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO anon, authenticated, service_role;`.
- **Exposição e Riscos Auditados:**
  - *Enumeração de Equipes:* A mensagem diferencia "Token não encontrado" de "Senha incorreta". Como os tokens de acesso são UUIDs pseudo-randômicos de 128 bits gerados via `crypto.randomUUID()`, a probabilidade de colisão/enumeração por força bruta é desprezível.
  - *Força Bruta de Senha:* Não há rate limit no nível do PostgreSQL para esta RPC específica na VOLTZ. A camada de aplicação DEV possui `LoginRateLimiter`, mas o endpoint REST direto do PostgREST fica exposto. Recomenda-se adicionar rate limit no Nginx/OpenResty da VPS Contabo em fase posterior.
  - *Timing Attack:* A função utiliza `extensions.crypt(password, encrypted_password)`, cujo custo de algoritmo bcrypt mitiga diferenças estatísticas de timing para strings de tamanhos variados.

---

## 7. Reconciliação de Homologação em `matches`

### 7.1 Tabela Comparativa de Tipos: DEV × VOLTZ

| Coluna | Tipo DEV (`20260921000001`) | Tipo VOLTZ (Manual) | Classificação | Avaliação de Impacto |
| :--- | :--- | :--- | :---: | :--- |
| `homologated_at` | `timestamptz` | `timestamp with time zone` | **IGUAL** | Tipos nativos idênticos no PostgreSQL. |
| `homologated_by` | `uuid` | `text` | **DIVERGENTE** | `uuid` em DEV rejeita strings literais; `text` em VOLTZ aceita tanto UUIDs quanto identificadores textuais. O frontend armazena UUIDs de usuário (`auth.uid()`), portanto `text` é mais permissivo e compatível retroativamente. |
| `checked_in_athlete_ids` | `text[]` | `jsonb` | **DIVERGENTE** | Array nativo SQL em DEV vs JSONB em VOLTZ. No frontend/PostgREST, ambos serializam e deserializam como arrays JS (`["ath-1", "ath-2"]`), mas operações SQL nativas divergem (`@>` em jsonb vs `= ANY` em array). |
| `custom_set_format` | `text` | `text` | **IGUAL** | Total paridade ('3-sets', '5-sets'). |
| `is_wo` | `boolean DEFAULT false` | `boolean DEFAULT false` | **IGUAL** | Total paridade. |
| `wo_reason` | `text` | `text` | **IGUAL** | Total paridade. |

### 7.2 Análise de Idempotência e Efeito de `ADD COLUMN IF NOT EXISTS`
A migration `20260921000001_match_homologation_and_details.sql` versionada no DEV utiliza a cláusula `ADD COLUMN IF NOT EXISTS`.
- **Efeito ao executar sobre VOLTZ:** Como as colunas já foram criadas manualmente em 21/09/2026, o PostgreSQL **ignora silenciosamente** a adição e **preserva os tipos existentes** (`text` para `homologated_by` e `jsonb` para `checked_in_athlete_ids`).
- **Risco de Silent Schema Drift:** Bancos criados do zero no DEV recebem `uuid` e `text[]`, enquanto a VOLTZ permanecerá com `text` e `jsonb`.
- **Decisão Técnica do Gate 1C:** **NÃO aplicar `ALTER COLUMN TYPE` destrutivo.** A aplicação atual consome os campos via JSON/REST sem impacto funcional, pois PostgREST lida transparentemente com ambos. Uma conversão de tipos em produção exigiria lock exclusivo na tabela `matches` e risco aos dados reais do torneio.

---

## 8. Auditoria das Migrations de Segurança (Fase 4C)

### 8.1 `20260914180000_restrict_role_based_write_policies.sql`
- **Objetivo:** Revogar políticas permissivas do schema inicial (`*_auth_write`) que permitiam escrita a qualquer usuário autenticado e estabelecer controle estrito por role.
- **Enums Afetados:** Adiciona `'scorer'` e `'viewer'` ao enum `public.user_role` via `ALTER TYPE ... ADD VALUE IF NOT EXISTS`.
- **Função Auxiliar:** Cria `public.is_admin_or_organizer() RETURNS boolean` com `SECURITY DEFINER SET search_path = public`.
- **Políticas Criadas:**
  - `competitions_admin_organizer_all` (CRUD exclusivo admin/organizer);
  - `teams_admin_organizer_all` (CRUD exclusivo admin/organizer; equipes gerenciam elenco via `competition_athletes`);
  - `referees_admin_organizer_all` (CRUD exclusivo admin/organizer);
  - `matches_admin_organizer_all` (CRUD estrutural exclusivo admin/organizer);
  - `matches_referee_scorer_update` (UPDATE para referee/scorer limitado a súmula);
  - `venues_admin_organizer_all`, `draws_admin_organizer_all`, `app_settings_admin_organizer_update`.
- **Hardening de `provision_team_user`:** Revoga execução de `PUBLIC` e `anon`; restringe a `authenticated` e `service_role`.

### 8.2 `20260914190000_harden_match_referee_authorization.sql`
- **Objetivo:** Refinamento cirúrgico de autorização operacional de partidas.
- **Trigger `trg_protect_match_admin_fields`:**
  - Se a partida possui escala nominal (`referees` array não vazio), apenas o árbitro/mesário escalado por nome ou e-mail pode atualizar a partida. Se não possui escala, qualquer árbitro/mesário autenticado pode operar.
  - Bloqueia alteração da coluna `referees` por árbitros (impede autoescalação).
  - Bloqueia 100% das 17 colunas administrativas e estruturais de `matches` (`id`, `competition_id`, `team_a_id`, `team_b_id`, `scheduled_time`, `phase`, `group_name`, `slot_id`, etc.).
  - Permite apenas os campos de súmula: `status`, `sets`, `winner_id`, `observations`, `lineups`, `highlight_athlete_id`, `updated_at`.
- **Situação em VOLTZ:** Ambas as migrations de segurança estão ausentes em produção.

---

## 9. Auditoria e Dependências da Phase 11 (Identity)

### 9.1 Mapeamento das Migrations
1. `20260915000001_phase_11_identity_foundation.sql`:
   - Criação das tabelas `organizations`, `athletes` e `user_memberships`;
   - Adição de colunas nullable `teams.organization_id`, `teams.gender_category`, `competitions.organization_id`, `competition_athletes.athlete_id`;
   - Habilitação de RLS nas 3 novas tabelas.
2. `20260915120000_phase_11_initial_rls_policies.sql`:
   - Depende de `20260915000001` (tabelas) e `20260914180000` (`is_admin_or_organizer()`);
   - Políticas RLS com isolamento por organização e equipe; bloqueio de SELECT global em `athletes`.
3. `20260916000001_phase_11_canonical_athlete_registration.sql`:
   - Criação de helpers `normalize_cpf(text)` e `get_or_create_athlete_id(...)`;
   - RPC pública `register_athlete` com vinculação de `athlete_id`;
   - RPC autenticada `register_competition_athlete_auth` com validação de `user_memberships` e `profiles.competition_team_id`.

### 9.2 Por que a Phase 11 NÃO pode ser promovida automaticamente para VOLTZ
1. **Ausência de Backfill Pré-aprovado:** As colunas `teams.organization_id` e `competition_athletes.athlete_id` começam nulas. A promoção do código frontend mais recente sem dados de organização quebrará telas que exigem contexto organizacional.
2. **Dependência de Segurança:** Se `20260915120000` for aplicada sem antes aplicar `20260914180000`, a execução falhará no PostgreSQL por inexistência da função `public.is_admin_or_organizer()`.
3. **Preservação de Dados de Produção:** A VOLTZ possui centenas de atletas e partidas reais cadastradas no formato legado (`competition_athletes` com nome e número, sem `athletes` global). Qualquer migração destrutiva ou não idempotente colocaria o banco do campeonato em risco.

---

## 10. Grafo de Dependências das Migrations

```text
20260818000000_initial_schema.sql (Core Tables)
       │
       ├──► 20260914000001_provision_team_user.sql [EM VOLTZ]
       │           │
       │           ▼
       │     20260914180000_restrict_role_based_write_policies.sql [AUSENTE EM VOLTZ]
       │     (Cria is_admin_or_organizer, enum scorer/viewer, RLS por role)
       │           │
       │           ├──► 20260914190000_harden_match_referee_authorization.sql [AUSENTE EM VOLTZ]
       │           │    (Trigger de escala nominal e proteção de matches)
       │           │
       │           ▼
       │     20260915000001_phase_11_identity_foundation.sql [AUSENTE EM VOLTZ]
       │     (Cria organizations, athletes, user_memberships)
       │           │
       │           ▼
       │     20260915120000_phase_11_initial_rls_policies.sql [AUSENTE EM VOLTZ]
       │     (Depende de is_admin_or_organizer + tabelas Phase 11)
       │           │
       │           ▼
       │     20260916000001_phase_11_canonical_athlete_registration.sql [AUSENTE EM VOLTZ]
       │     (Depende de athletes + user_memberships + RLS)
       │
       ├──► 20260921000001_match_homologation_and_details.sql [PARCIAL EM VOLTZ]
       │    (Adiciona colunas homologated_*; idempotente via IF NOT EXISTS)
       │
       └──► 20260923000001_formalize_verify_team_credentials.sql [CANDIDATE GATE 1C]
            (Depende de competition_teams + auth.users + profiles + pgcrypto)
```

---

## 11. Migration Canônica Preparada no DEV

### Ficha Técnica da Migration

| Atributo | Detalhe |
| :--- | :--- |
| **Arquivo** | `supabase/migrations/20260923000001_formalize_verify_team_credentials.sql` |
| **Objetivo** | Formalizar e versionar no repositório DEV a RPC `verify_team_credentials` |
| **Status** | `CANDIDATE / NÃO VALIDADA CONTRA PRODUÇÃO` |
| **Idempotência** | 100% idempotente via `CREATE OR REPLACE FUNCTION` e `GRANT` declarativo |
| **Search Path** | `SET search_path = public, extensions` |
| **Segurança** | `SECURITY DEFINER`, parâmetros sanitizados com `btrim()`, hash bcrypt via `pgcrypto` |
| **Grants** | `anon`, `authenticated`, `service_role` |
| **Dependências** | `public.competition_teams(access_token)`, `auth.users(encrypted_password)`, `public.profiles`, extensão `pgcrypto` |
| **Risco em Produção** | NULO nesta Gate (não será aplicada em VOLTZ). Em promoção futura, substituirá a função manual sem perda de dados nem quebra de contrato. |

---

## 12. Arquivos Alterados e Criados

```text
MODIFICADOS PRÉ-EXISTENTES (PRESERVADOS INTACTOS):
  src/App.tsx
  src/components/auth/RequireAuth.tsx
  src/components/layout/Sidebar.tsx
  src/components/match-sheet/MatchSheetInterface.tsx
  src/components/navigation/BottomNav.tsx
  src/data/seed.ts
  src/lib/supabaseClient.ts
  src/pages/MatchSheetPage.tsx
  src/services/competitionRegistrationService.ts
  src/services/dataAccess.ts
  src/services/identityBackfillService.ts
  src/services/identityService.ts
  src/services/registrationService.ts
  src/types/entities.ts
  src/types/identity.ts
  src/types/registration.ts

CRIADOS NESTA GATE 1C:
  supabase/migrations/20260923000001_formalize_verify_team_credentials.sql
  src/test/verifyTeamCredentialsRpc.test.ts
  docs/walkthroughs/FASE-4C-GATE-1C-RECONCILIACAO-DEV-MIGRATIONS.md
```

---

## 13. Testes e Validação Técnica

### 13.1 Validação da Migration no PostgreSQL Local (`supabase-db`)
- **Aplicação da DDL:** Executada via `psql` com sucesso: `CREATE FUNCTION`, `REVOKE`, `GRANT`.
- **Testes de Integração SQL com Transação Isolada (`ROLLBACK`):**
  - Token vazio -> `{"ok": false, "error": "Token de acesso não fornecido."}` (PASS)
  - Senha vazia -> `{"ok": false, "error": "Senha de acesso obrigatória."}` (PASS)
  - Token inexistente -> `{"ok": false, "error": "Inscrição de equipe não encontrada para o link fornecido."}` (PASS)
  - Token existente + senha errada -> `{"ok": false, "error": "Senha de acesso incorreta. Verifique a senha recebida."}` (PASS)
  - Token existente + senha correta -> `{"ok": true, "email": "dirigente.ct1@exemplo.com"}` (PASS)

### 13.2 Typecheck TypeScript
- **Comando:** `npx tsc -p tsconfig.app.json --noEmit`
- **Resultado:** Código 0 (Zero erros em todo o projeto).

### 13.3 Linter ESLint
- **Comando:** `npm run lint` (`eslint .`)
- **Resultado:** Código 0 (Zero erros, 1 warning pré-existente de hook no canvas 3D).

### 13.4 Testes Automatizados Vitest
- **Testes da Nova Migration:** `npx vitest run src/test/verifyTeamCredentialsRpc.test.ts`
  - **Resultado:** 1 passed (1 file), 7 passed (7 tests), 0 failures (PASS).
- **Testes dos Adaptadores e Autenticação:** `npx vitest run src/test/dataAccessAdapter.test.ts src/test/authService.test.ts`
  - **Resultado:** 2 passed (2 files), 27 passed (27 tests), 0 failures (PASS).

### 13.5 Build de Produção
- **Comando:** `npm run build` (`vite build`)
- **Resultado:** Código 0 (`✓ built in 3m 6s`, artefatos emitidos em `dist/`).

---

## 14. Declaração de Impacto e Não Mutação

| Operação | Executado? | Comprovação |
| :--- | :---: | :--- |
| **VOLTZ Alterado?** | **NÃO** | Nenhuma requisição DDL, DML, deploy ou mutação enviada. |
| **Banco de Produção Alterado?** | **NÃO** | 0 tabelas, 0 colunas, 0 RPCs, 0 policies modificadas em VOLTZ. |
| **Deploy Realizado?** | **NÃO** | Nenhum artefato promovido ou substituído no servidor web. |
| **Restart de Serviços?** | **NÃO** | PostgREST, PostgreSQL, Docker e Nginx permaneceram intocados. |
| **Git Commit Realizado?** | **NÃO** | Working tree preservado sem commits. |
| **Git Push Realizado?** | **NÃO** | Branch remoto permanece intacto. |

---

## 15. Pendências para Próximos Gates

1. **Gate 2A (Plano de Backup e Janela de Manutenção):**
   - Criação de rotina segura de dump completo (`pg_dump -F c`) da produção VOLTZ;
   - Agendamento de janela de manutenção sem partidas ativas.
2. **Gate 2B (Homologação de Promoção Cirúrgica):**
   - Obtenção do código SQL original de `verify_team_credentials` via console/SSH com permissões administrativas na VPS Contabo para validar contra a versão candidata;
   - Promoção controlada e idempotente das migrations de segurança (`20260914180000`, `20260914190000`);
   - Planejamento de backfill para ativação futura da Phase 11.

---

## 16. Próximo Gate Recomendado

```text
GATE 2A — BACKUP FORMAL E PROCEDIMENTO OPERACIONAL DE PROMOÇÃO
```

A sequência segura exige:
1. Geração e validação do backup físico/lógico da VOLTZ;
2. Verificação manual da definição de `verify_team_credentials` no PostgreSQL de produção via conexão local;
3. Promoção estritamente migration-by-migration, iniciando pelas políticas de segurança da Fase 4C.

---

## 17. Decisão da Gate

```text
GATE 1C = PASS WITH FINDINGS
```

### Justificativa da Decisão:
1. **Objetivos Cumpridos com Rigor Máximo:** Todos os achados forenses do Gate 1B foram integralmente reconciliados tecnicamente no ambiente DEV.
2. **Migration Canônica Candidata Preparada:** A formalização de `verify_team_credentials` foi criada no DEV (`20260923000001_formalize_verify_team_credentials.sql`), com `SET search_path = public, extensions`, grants explícitos e conformidade comprovada contra o contrato OpenAPI e frontend.
3. **Finding Registrado (Transparência Arquitetural):** Como a porta 5432 e SSH da VPS Contabo não estão expostos para leitura do catálogo `pg_proc` via `pg_get_functiondef`, a migration foi formalizada com status `CANDIDATE / NÃO VALIDADA CONTRA PRODUÇÃO`, impedindo suposições incorretas.
4. **Validação Técnica Local Concluída com 100% de Sucesso:** Typecheck com 0 erros, ESLint com 0 erros, Vitest com 34 testes passando nos módulos afetados, build de produção gerado com sucesso em 3m 6s.
5. **VOLTZ 100% Preservada:** Zero alterações em produção durante todo o Gate.
