# BASEOS — FASE 8.6.4: RECUPERAÇÃO DA INTEGRAÇÃO DE AUTH DE EQUIPES

## 1. Objetivo

A missão da Fase 8.6.4 é recuperar e consolidar a arquitetura canônica de autenticação do BaseOS para dirigentes de equipes esportivas, conectando o fluxo de ponta a ponta:
```text
Cadastro de Equipe na Competição
      ↓
Geração de Senha Segura
      ↓
Provisionamento no Supabase Auth (auth.users + auth.identities)
      ↓
Vínculo com public.profiles (role = 'team', competition_team_id)
      ↓
Apresentação de Credenciais / Compartilhamento WhatsApp
      ↓
Login Real via GoTrue (POST /auth/v1/token?grant_type=password)
      ↓
Sessão Autenticada e Acesso Conforme Perfil
```

---

## 2. Estado Inicial

A auditoria Fase 8.6.3 identificou uma falha arquitetural crítica no fluxo de equipes:
- `RegisterTeamInCompetitionDialog` gerava senha temporária em memória via `generateRandomPassword()`.
- O `teamMapper` descartava propositalmente `managerPassword`, `managerEmail` e `managerPhone` porque a tabela esportiva `public.teams` não possui (e não deve possuir) colunas de autenticação.
- O provisionamento de conta no Supabase Auth (`auth.users`) não era disparado.
- `public.profiles` ficava sem registro de dirigente de equipe.
- Ao tentar logar em `/login` com as credenciais exibidas pelo modal de sucesso ou enviadas por WhatsApp, o GoTrue retornava erro de credenciais inválidas.
- A aplicação operava com um falso sucesso ("Equipe cadastrada com sucesso", mas com credenciais inexistentes no Auth).

---

## 3. Causa Raiz

1. **Desconexão do Provisionamento**: O serviço `registerTeamInCompetition` orquestrava a criação da entidade esportiva (`public.teams`) e da inscrição (`public.competition_teams`), mas não invocava a camada de identidade do Supabase Auth.
2. **Separação de Domínios**:
   - `public.teams`: Agremiação esportiva (nome, sigla, modalidade, cidade, escudo).
   - `auth.users`: Identidade criptográfica (id, email, encrypted_password).
   - `public.profiles`: Perfil de acesso do sistema (id = auth.users.id, role = 'team', competition_team_id).
3. **Ausência da RPC de Provisionamento Autenticada no Supabase Local**: Não havia função `SECURITY DEFINER` protegida para permitir que administradores/organizadores provisionassem a conta da equipe diretamente no GoTrue sem expor a chave `service_role` no cliente frontend.

---

## 4. Arquitetura Preservada

A arquitetura oficial do BaseOS foi rigorosamente preservada sem nenhuma redefinição:

```text
auth.users (id, email, encrypted_password)
    ↓ (1:1 via trigger / upsert)
public.profiles (id, email, name, role = 'team', competition_team_id)
    ↓ (N:1)
public.competition_teams (id, competition_id, team_id, access_token)
    ↓ (N:1)
public.teams (id, name, short_name, modality)
```

- **Login de Usuário**: Supabase Auth (`auth.users`) autenticado via GoTrue (`signInWithPassword` ou HTTP `POST /auth/v1/token?grant_type=password`).
- **Inscrição do Elenco por Link Direto**: `competition_teams.access_token` utilizado exclusivamente na rota `/equipe/inscricao/:token`. Nunca transformado em login ou sessão.
- **Nenhuma Senha em `public.teams`** ou `public.profiles`.

---

## 5. Alterações Realizadas

1. **Migration SQL**: `supabase/migrations/20260914000001_provision_team_user.sql`
   - Atualizado trigger `public.handle_new_user()` para ler `role` e `competition_team_id` de `raw_user_meta_data`.
   - Atualizado trigger `public.trg_protect_profile_sensitive_fields()` para permitir atribuição e atualização de campos sensíveis por organizadores/admins ou contexto de sistema (`auth.uid() IS NULL`).
   - Criada a RPC `public.provision_team_user(p_email, p_password, p_name, p_competition_team_id, p_phone)`.
2. **Camada de Dados (`src/services/dataAccess.ts`)**:
   - Adicionada interface `ProvisionTeamUserInput` e `ProvisionTeamUserResult`.
   - Implementado `provisionTeamUser` no `localStorageAdapter` (modo demo com armazenamento de senhas e sincronização com `voleipro.system.users.v1`).
   - Implementado `provisionTeamUser` no `supabaseAdapter` via chamada RPC `provision_team_user`.
3. **Serviço de Inscrição (`src/services/registrationService.ts`)**:
   - Conectado o provisionamento atômico em `registerTeamInCompetition`.
   - Se fornecidos `managerEmail` e `managerPassword`, invoca `dataAccess.provisionTeamUser`.
   - Em caso de falha no provisionamento, o fluxo falha explicitamente (`ok: false`), impedindo falsos sucessos.
4. **Testes Unitários e de Regressão (`src/test/teamRegistrationFlow.test.ts`)**:
   - Teste de provisionamento de usuário Auth e validação de login via `authService.signIn`.

---

## 6. Migrations

- `supabase/migrations/20260914000001_provision_team_user.sql`:
  - Aplicada e homologada com sucesso no container `supabase-db` do Supabase Local.

---

## 7. RPC de Provisionamento (`public.provision_team_user`)

- **Assinatura**:
  ```sql
  public.provision_team_user(
    p_email text,
    p_password text,
    p_name text,
    p_competition_team_id text,
    p_phone text DEFAULT NULL
  ) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
  ```
- **Autorização**: Apenas chamadores com `role` 'admin' ou 'organizer' em `public.profiles` (ou `auth.uid() IS NULL` para migrações/scripts de sistema) podem executar.
- **GoTrue Scanner Compatibility**:
  - `encrypted_password = crypt(trim(p_password), gen_salt('bf'))`.
  - Tokens de confirmação e recuperação preenchidos como string vazia `''` (não `NULL`), evitando erro 500 do scanner Go do GoTrue.
- **Identidade**: Inserção correspondente em `auth.identities` (`provider = 'email'`, `provider_id = user_id::text`, `identity_data = { sub, email }`).
- **Profile**: Upsert em `public.profiles` com `role = 'team'` e `competition_team_id = p_competition_team_id`.
- **Atomicidade**: Se qualquer etapa interna falhar, o PostgreSQL faz rollback da transação plpgsql.

---

## 8. Cadastro de Equipe — Fluxo Completo

1. Operador preenche nome, sigla, responsável, e-mail do gestor.
2. Frontend gera senha aleatória forte com `generateRandomPassword()` (exibida e editável).
3. `handleSubmit` chama `registerTeamInCompetition`.
4. Equipe é persistida em `public.teams`.
5. Inscrição é persistida em `public.competition_teams` com `access_token` único.
6. Conta é provisionada via RPC `provision_team_user`.
7. `public.profiles` é vinculado a `competition_teams.id`.
8. Modal de Sucesso exibe as credenciais completas e gera link de WhatsApp formatado.

---

## 9. Tratamento da Senha

- **Onde é gerada**: `src/lib/security.ts` -> `generateRandomPassword()`.
- **Como chega ao Auth**: Enviada como parâmetro criptografado por TLS/HTTPS para a RPC `provision_team_user`, que calcula o hash bcrypt com salt dinâmico (`gen_salt('bf')`) dentro do PostgreSQL.
- **Como chega à UI**: Retornada no estado local do diálogo para exibição imediata ao operador.
- **Como chega ao WhatsApp**: Mensagem preenchida na URL de redirecionamento `https://wa.me/?text=...` contendo e-mail e senha inicial para primeiro acesso da equipe.
- **Persistência Segura**: NUNCA salva em `public.teams`, NUNCA salva em `public.profiles`, NUNCA salva em LocalStorage (no modo Supabase), NUNCA logada em console ou audit logs.

---

## 10. Evidência do Supabase Auth

Teste executado diretamente no PostgreSQL (`e2e_indoor_homologation.mjs`):
- `auth.users`: 4 usuários criados, cada um com UUID único e `encrypted_password` bcrypt.
- `auth.identities`: 4 identidades vinculadas (1 para cada usuário com `provider = 'email'`).
- `public.profiles`: 4 perfis criados com `role = 'team'` e `competition_team_id` correspondente à inscrição.

---

## 11. Evidência de Login Real GoTrue

Teste HTTP direto no endpoint GoTrue local (`http://localhost:8400/auth/v1/token?grant_type=password`):
- Sada Cruzeiro (`gestor.cruzeiro@release.volei`): HTTP 200, JWT emitido.
- Itambé Minas (`gestor.minas@release.volei`): HTTP 200, JWT emitido.
- Vôlei Renata (`gestor.renata@release.volei`): HTTP 200, JWT emitido.
- Suzano Vôlei (`gestor.suzano@release.volei`): HTTP 200, JWT emitido.

---

## 12. Isolamento Multi-Tenant

- Consulta via PostgREST autenticada com token JWT da Equipe A retorna exclusivamente o perfil da Equipe A.
- Tentativa da Equipe A de alterar o perfil da Equipe B para `role = 'admin'` bloqueada pela política RLS: perfil da Equipe B permaneceu íntegro (`role = 'team'`).

---

## 13. Veredito da Fase 8.6.4

**STATUS: SUCESSO (100% OPERACIONAL)**
O fluxo de provisionamento, autenticação GoTrue, vinculação de perfil e isolamento de dirigentes de equipes está plenamente recuperado, testado e validado no ambiente DEV.
