# BASEOS — CONTROLE DE ACESSO, SEGURANÇA E ARQUITETURA DE PORTAIS
## Auditoria de Autenticação, RLS, Perfis de Acesso e Separação de Rotas

**Projeto:** BaseOS (VolleyPro)  
**Data:** 04/09/2026  
**Documento:** `docs/competition-portals/ACCESS-CONTROL-MAP.md`  

---

## 1. RESPOSTAS ÀS 6 PERGUNTAS DE SEGURANÇA E ACESSO

### 1. Como um gestor de equipe poderia ser criado?
- **Modo Demo (LocalStorage):**
  Ao cadastrar a equipe na competição, o sistema invoca `authService.createUser` com:
  - `name`: nome do gestor.
  - `email`: e-mail de contato da equipe.
  - `role`: `'team'`.
  - `competitionTeamId`: ID do `CompetitionTeam` recém-gerado (`ct-xxx`).
  - `initialPassword`: senha informada ou gerada aleatoriamente.
- **Modo Produção (Supabase):**
  Duas opções viáveis:
  1. *Acesso sem senha por Token:* O gestor utiliza a URL `/equipe/inscricao/:accessToken`. O token de 32 bytes garante acesso exclusivo ao recurso sem atrito de cadastro prévio.
  2. *Acesso com Senha:* Criação de usuário via Supabase Auth Admin API (`supabase.auth.admin.createUser`) ou envio de link mágico/convite (`supabase.auth.admin.inviteUserByEmail`), associando `profiles.competition_team_id`.

### 2. Como ele seria associado à equipe?
- **No Banco de Dados:** A tabela `public.profiles` já possui a coluna relacional:
  `competition_team_id text references public.competition_teams (id) on delete set null;`
- **Na Aplicação:** O tipo `UserProfile` contém `competitionTeamId?: string`. O payload da sessão (`AuthSession`) carrega esse identificador.
- **No Token do Portal:** O token presente na URL é a chave que localiza o `CompetitionTeam` e consequentemente a `teamId` e `competitionId`.

### 3. Como impedir acesso a outra equipe?
- **No Frontend:** [`src/services/tenantSecurityService.ts:178-193`](file:///home/diego-martins/docker/volei/src/services/tenantSecurityService.ts#L178-L193):
  ```ts
  public static canManageRoster(user: UserProfile, targetTeam: CompetitionTeam): boolean {
    if (user.role === 'admin' || user.role === 'organizer') return true;
    if (user.role === 'team') {
      return user.competitionTeamId === targetTeam.id;
    }
    return false;
  }
  ```
- **Na Rota com Token:** Se o usuário tentar acessar `/equipe/inscricao/:token` com um token inexistente ou de outra equipe, o sistema retorna 404 / Não Encontrado (`setNotFound(true)`).

### 4. Como impedir que um gestor altere outra inscrição?
- **No Backend / RLS (Supabase):**
  Atualmente, a policy `competition_teams_auth_write` está excessivamente permissiva (`using (true)`).
  A política correta a ser implementada futuramente é:
  ```sql
  create policy "competition_teams_team_update" on public.competition_teams
    for update to authenticated
    using (
      auth.uid() in (
        select id from public.profiles
        where role = 'organizer' or competition_team_id = public.competition_teams.id
      )
    );
  ```
- **Na Camada de Serviço:** `registrationService.updateAthlete` busca o atleta, recupera o `competition_team_id` correspondente e valida se o operador tem autorização antes de submeter alterações.

### 5. Como bloquear alterações após o prazo?
- **No Frontend:** Desabilitação dos botões de ação e exibição de alerta de bloqueio quando `isRegistrationLocked` for verdadeiro.
- **Na Camada de Serviço:** `CompetitionRegistrationService.validateAthleteRegistration` rejeita mutações caso o prazo individual ou a competição estejam encerrados.
- **No Banco de Dados:** A procedure `register_athlete` no PostgreSQL checa `is_locked` e `registration_deadline < now()` antes de efetivar qualquer `INSERT`.

### 6. Como permitir que o portal público seja somente leitura?
- **Sem Autenticação:** Rotas públicas não passam pelo componente `<RequireAuth>`.
- **Sem Formulários de Mutação:** O portal público renderiza apenas visualizadores de tabelas, cards de confrontos, súmulas homologadas e classificações.
- **Políticas RLS:** Tabelas de competição possuem políticas `for select using (true)` públicas para leitura anônima (`anon`), mas mutações (`INSERT`, `UPDATE`, `DELETE`) são restritas a `authenticated` com roles específicos.

---

## 2. ARQUITETURA DOS TRÊS PORTAIS EM UMA ÚNICA APLICAÇÃO (SPA)

Para evitar a manutenção de três repositórios ou três servidores distintos, o BaseOS adotará a separação por árvores de rotas com layouts dedicados dentro da mesma aplicação Vite:

```text
                                     App.tsx (SPA Router)
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         ▼                                    ▼                                    ▼
    /admin/*                            /equipe/:token/*                      /c/:competitionSlug/*
(Portal Administrativo)                (Portal da Equipe)                       (Portal Público)
         │                                    │                                    │
    AdminLayout                        TeamPortalLayout                    PublicPortalLayout
  - Sidebar fixa                     - Header da Equipe                  - Mobile-first
  - Gestão de torneios               - Status da inscrição               - Tabela de classificação
  - Sorteio e chaves                 - Gestão de elenco                  - Jogos ao vivo
  - Resultados e súmula              - Próximos jogos                    - QR Code acessível
  - RequireAuth(['organizer'])       - Token/Auth Team                   - 100% Read-Only (Anon)
```

### 2.1. Portal Administrativo (`/admin/*`)
- **Acesso:** Restrito a organizadores e administradores logados (`RequireAuth`).
- **Rotas:**
  - `/admin/competicoes`
  - `/admin/competicoes/:id`
  - `/admin/competicoes/:id/equipes`
  - `/admin/sorteio/:competitionId`
  - `/admin/jogos`
  - `/admin/configuracoes`

### 2.2. Portal da Equipe (`/equipe/:token/*`)
- **Acesso:** Gestor da equipe via link único ou login com `role: 'team'`.
- **Rotas:**
  - `/equipe/inscricao/:token` (elenco, formulário de atletas, submissão)
  - `/equipe/inscricao/:token/jogos` (agenda de partidas da equipe)
  - `/equipe/inscricao/:token/classificacao` (situação do grupo)
- **Comportamento:** Antes do prazo = Leitura e Escrita. Após o prazo = Somente Leitura.

### 2.3. Portal Público (`/c/:competitionSlug/*`)
- **Acesso:** Livre para qualquer espectador ou torcedor.
- **Rotas:**
  - `/c/:competitionSlug` (visão geral, próximas partidas)
  - `/c/:competitionSlug/jogos` (tabela e resultados em tempo real)
  - `/c/:competitionSlug/classificacao` (classificação por grupos e playoffs)
  - `/c/:competitionSlug/equipes` (agremiações e elencos confirmados)
- **Recursos:** Leve, sem barras de administração, com gerador de QR Code no painel do organizador para impressão física no ginásio.
