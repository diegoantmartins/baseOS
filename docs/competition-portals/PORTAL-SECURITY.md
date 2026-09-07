# BASEOS — SEGURANÇA DO PORTAL E CONTROLE DE ACESSO

**Data:** 05/09/2026  
**Sistema:** BaseOS  
**Módulo:** Autorização, RLS e RPCs do Portal de Inscrições  

---

## 1. Cadeia de Autorização e Ownership

A integridade do portal da equipe fundamenta-se na cadeia estrita de identificação do usuário autenticado no banco de dados:

```text
auth.users (auth.uid())
      ↓
public.profiles
      ↓ [role, competition_team_id]
public.competition_teams
      ↓ [competition_id, is_locked, registration_deadline]
public.competition_athletes
```

---

## 2. Blindagem de Profiles

- **Vetor de Ataque Mitigado:** Um usuário autenticado com perfil de equipe não pode alterar sua própria `role` (ex: auto-promover-se para `organizer` ou `admin`) nem alterar seu `competition_team_id` para assumir o controle da inscrição de outra agremiação.
- **Implementação RLS:**
  - `profiles_user_update`: Usuários comuns só podem alterar campos pessoais cosméticos (`display_name`, `avatar_url`).
  - Atualizações em `role` e `competition_team_id` exigem permissões administrativas (`role IN ('organizer', 'admin')`).

---

## 3. Políticas RLS de `competition_teams`

- **Vetor de Ataque Mitigado:** Modificação arbitrária de vínculos ou reabertura forçada de prazos via `USING (true) WITH CHECK (true)`.
- **Implementação RLS:**
  - `competition_teams_organizer_all`: Organizadores e administradores possuem controle integral para gestão do evento.
  - `competition_teams_team_select`: Usuários de equipe só possuem permissão de leitura sobre o registro de equipe explicitamente apontado por seu `profiles.competition_team_id`.
  - `competition_teams_team_update`: Usuários de equipe só podem atualizar informações permitidas de contato. É expressamente bloqueada a alteração de:
    - `competition_id`
    - `team_id`
    - `access_token`
    - `registration_deadline`
    - `is_locked`

---

## 4. Políticas RLS de `competition_athletes`

- **Vetor de Ataque Mitigado:** Inscrição indevida de atletas por terceiros, submissão após o encerramento do prazo ou após lock administrativo.
- **Implementação RLS:**
  - `competition_athletes_team_insert` / `update` / `delete`:
    1. **Vínculo:** O atleta deve pertencer ao `competition_team_id` do perfil do usuário.
    2. **Lock:** A inscrição da equipe deve possuir `is_locked = false`.
    3. **Deadline:** O prazo `registration_deadline` deve ser estritamente superior ao momento atual (`now()`).
    4. **Lifecycle:** A competição deve estar no status `registration-open` (ou legado `registration`).

---

## 5. Blindagem da RPC `register_athlete` (v2)

Para clientes que submetem atletas via token de acesso da equipe ou chamada RPC direta, a função `public.register_athlete` atua como camada de segurança independente (`SECURITY DEFINER` com `SET search_path = public`):

### Ordem de Validação Sequencial:
1. **Entrada:** Validação de formato e parâmetros obrigatórios (`p_token`, `p_name`).
2. **Token de Acesso:** Busca exata do registro `competition_teams` correspondente ao token. Rejeição se não existir.
3. **Bloqueio Administrativo:** Rejeição imediata se `competition_teams.is_locked = true`.
4. **Deadline:** Rejeição imediata se `registration_deadline <= now()`.
5. **Lifecycle da Competição:** Rejeição caso a competição não esteja em status ativo de inscrição (`registration-open` ou `registration`).
6. **Resolução de Regras (CompetitionConfig):**
   - Extração do limite `maxAthletes` a partir de `competition.config->'registration'->>'maxAthletes'` ou snapshot regulamentar.
   - **Proibição de Fallback:** Rejeição com erro `Configuração da competição incompleta ou inválida.` caso o limite não esteja definido.
7. **Verificação de Limite de Elenco:** Rejeição caso o número atual de atletas ativos atinja ou exceda o teto configurado.
8. **Unicidade de Camisa:** Verificação de duplicidade de número de camisa dentro da mesma equipe (caso o número seja informado).
9. **Inserção Segura:** Escrita direta com timestamp e retorno do ID e dados do atleta persistido.
