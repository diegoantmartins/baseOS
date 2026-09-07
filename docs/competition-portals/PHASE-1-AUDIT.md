# BASEOS — RELATÓRIO OFICIAL DE AUDITORIA TÉCNICA (FASE 1)
## Mapeamento Integral do Fluxo de Competições, Equipes, Inscrições, Acessos, Portais e Sorteio

**Projeto:** BaseOS (VolleyPro)  
**Fase:** Fase 1 — Auditoria Técnica, Diagnóstico e Mapeamento de Domínio  
**Data:** 04/09/2026  
**Auditor:** Antigravity / QA & Architecture Team  
**Status da Fase:** **STATUS: AUDIT COMPLETE**  

---

## 1. OBJETIVO DA AUDITORIA

Esta auditoria técnica foi executada no repositório real do **BaseOS** em estrita observância à regra de ouro:
> **NÃO alterar código de produção, NÃO alterar banco de dados, NÃO criar migrations e NÃO realizar refatorações especulativas.**

O propósito fundamental é mapear a fundo a arquitetura, modelos de dados, serviços de domínio, telas de UI, mecanismos de autenticação/autorização, infraestrutura de banco e suíte de testes para viabilizar a transição do fluxo operacional atual para o novo fluxo canônico:

```text
CRIAR COMPETIÇÃO
        ↓
CONFIGURAR COMPETIÇÃO (CompetitionConfig como Fonte Única)
        ↓
ABRIR INSCRIÇÕES
        ↓
CADASTRAR EQUIPE NA COMPETIÇÃO
        ↓
CRIAR INSCRIÇÃO OFICIAL (Atômica)
        ↓
CRIAR ACESSO DO GESTOR DA EQUIPE
        ↓
GERAR LINK DO PORTAL DA EQUIPE (+ Mensagem WhatsApp)
        ↓
EQUIPE CADASTRADA E ELEGÍVEL
        ↓
FECHAMENTO DAS INSCRIÇÕES
        ↓
CONGELAMENTO DE ELENCOS E REGRAS
        ↓
SORTEIO (Automático a partir das Equipes Elegíveis)
        ↓
GRUPOS / CHAVES
        ↓
TABELA DE JOGOS
        ↓
JOGOS & SÚMULAS DIGITAIS
        ↓
RESULTADOS (CanonicalMatchResult)
        ↓
CLASSIFICAÇÃO CANÔNICA
```

---

## 2. RESPOSTAS ÀS PERGUNTAS FUNDAMENTAIS (COM EVIDÊNCIAS DE CÓDIGO)

### 2.1. Como uma competição é criada?
- **Evidência no Código:** [`src/pages/CompetitionsPage.tsx#L299-L313`](file:///home/diego-martins/docker/volei/src/pages/CompetitionsPage.tsx#L299-L313) e [`src/components/competition/dialogs/CompetitionFormDialog.tsx#L62-L109`](file:///home/diego-martins/docker/volei/src/components/competition/dialogs/CompetitionFormDialog.tsx#L62-L109).
- **Mecanismo Real:** O organizador aciona o botão "Nova Competição" na `CompetitionsPage`. O modal `CompetitionFormDialog` coleta nome, modalidade (`indoor` ou `beach`), gênero (`male`, `female`, `mixed`), formato de jogo (`6x6`, `4x4`, `2x2`), formato de sets (`3-sets` ou `5-sets`), quantidade de grupos (`groupsCount`), classificados por grupo (`advancingPerGroup`), ginásio (`venue`) e datas.
- **Normalização:** Invoca `CompetitionRulesService.normalizeLegacyToConfig(baseRecord)` para estruturar o objeto canônico `CompetitionConfig` (versão 1) e executa `dataAccess.createCompetition({ ...baseRecord, status: 'planning', config: canonicalConfig })`.
- **Auditoria:** Grava log operacional via `OperationalAuditService.recordCompetitionCreation`.

### 2.2. Como uma equipe é cadastrada?
- **Evidência no Código:** [`src/pages/TeamsPage.tsx#L166-L188`](file:///home/diego-martins/docker/volei/src/pages/TeamsPage.tsx#L166-L188) e [`src/services/dataAccess.ts#L225-L238`](file:///home/diego-martins/docker/volei/src/services/dataAccess.ts#L225-L238).
- **Mecanismo Real:** Atualmente, equipes são cadastradas **globalmente**, de forma independente de qualquer competição, na página `/equipes`.
- O administrador informa nome, sigla, modalidade, cidade, estado, dados do gestor (nome, email, telefone, senha provisória) e comissão técnica.
- `dataAccess.createTeam` gera um ID (`tm-xxx`) e um `registrationToken` de 32 caracteres hexadecimais.
- Um `PersonRecord` para o gestor com papel `roles: ['manager']` é opcionalmente criado em `persons`.
- Abre o modal `TeamCreatedShareDialog`, que gera um link `/equipe/inscricao/${token}` e formata mensagem para o WhatsApp.
- **Limitação Crítica:** O cadastro em `TeamsPage` **não vincula a equipe a nenhuma competição**.

### 2.3. Como uma equipe é vinculada à competição?
- **Evidência no Código:** [`src/pages/CompetitionRegistrationsPage.tsx#L147-L168`](file:///home/diego-martins/docker/volei/src/pages/CompetitionRegistrationsPage.tsx#L147-L168).
- **Mecanismo Real:** Atualmente, o vínculo ocorre em uma **segunda etapa manual e apartada** na rota `/competicoes/:id/inscricoes`.
- O organizador clica em "Convidar Equipe", seleciona uma equipe previamente criada na lista suspensa `teams.filter(t => !invitedTeamIds.has(t.id))`, estipula um prazo limite específico para aquela equipe (`deadlineIso`) e invoca:
  ```ts
  await dataAccess.createCompetitionTeam({
    competitionId: competition.id,
    teamId,
    teamName: team?.name ?? '',
    teamShortName: team?.shortName ?? '',
    registrationDeadline: deadlineIso,
    isLocked: false,
    status: 'invited',
  });
  ```
- **Consequência:** O link gerado em `TeamsPage` (`/equipe/inscricao/${team.registrationToken}`) e o link gerado em `CompetitionRegistrationsPage` (`/equipe/inscricao/${competitionTeam.accessToken}`) usam tokens distintos, gerando bifurcação no acesso.

### 2.4. Como a inscrição é representada?
- **Evidência no Código:** [`src/types/registration.ts#L35-L48`](file:///home/diego-martins/docker/volei/src/types/registration.ts#L35-L48) e tabela `public.competition_teams` em [`supabase/migrations/20260818000000_initial_schema.sql#L67-L81`](file:///home/diego-martins/docker/volei/supabase/migrations/20260818000000_initial_schema.sql#L67-L81).
- **Estrutura:** Entidade `CompetitionTeam`:
  - `id`: chave primária (`ct-xxx`).
  - `competitionId`: referência à competição.
  - `teamId`: referência à agremiação global.
  - `teamName` e `teamShortName`: desnormalização para performance.
  - `accessToken`: token secreto de acesso ao portal da equipe.
  - `registrationDeadline`: timestamp ISO do prazo de encerramento do elenco.
  - `isLocked`: booleano de bloqueio administrativo forçado.
  - `status`: enum `RegistrationStatus` (`'invited' | 'in_progress' | 'submitted' | 'approved' | 'rejected'`).
  - Atletas inscritos residem em `competition_athletes` (`CompetitionAthlete`), vinculados por `competitionTeamId`.

### 2.5. Como o responsável da equipe terá acesso?
- **Evidência no Código:** [`src/pages/TeamRosterRegistrationPage.tsx#L76-L123`](file:///home/diego-martins/docker/volei/src/pages/TeamRosterRegistrationPage.tsx#L76-L123) e [`src/services/registrationService.ts#L109-L115`](file:///home/diego-martins/docker/volei/src/services/registrationService.ts#L109-L115).
- **Mecanismo Real:** O responsável acessa a URL pública sem necessidade de login prévio: `/equipe/inscricao/:token`.
- O hook `useEffect` invoca `getCompetitionTeamByToken(token)`.
- `dataAccess.getCompetitionTeamByToken` busca no banco/localStorage pelo `accessToken`.
- Se encontrado, carrega o `CompetitionTeam`, a `CompetitionRecord`, os atletas (`listRoster`), os jogos da equipe e a classificação.
- **Acesso via Login Formal:** O tipo `UserProfile` possui `competitionTeamId?: string` e a tabela `profiles` possui a coluna `competition_team_id`. No entanto, **não há tela nem fluxo automatizado** que crie uma credencial de `auth.users` vinculada a este `competition_team_id` no momento do cadastro da equipe.

### 2.6. Como o prazo de inscrição é controlado?
- **Evidência no Código:** [`src/services/registrationService.ts#L17-L23`](file:///home/diego-martins/docker/volei/src/services/registrationService.ts#L17-L23):
  ```ts
  export function isDeadlineExpired(competitionTeam: CompetitionTeam, now: Date = new Date()): boolean {
    return now.getTime() > new Date(competitionTeam.registrationDeadline).getTime();
  }
  export function isRegistrationLocked(competitionTeam: CompetitionTeam, now: Date = new Date()): boolean {
    return competitionTeam.isLocked || isDeadlineExpired(competitionTeam, now);
  }
  ```
- **Comportamento na UI:** Em `TeamRosterRegistrationPage.tsx:135`:
  `const locked = team ? isRegistrationLocked(team, new Date(now)) : true;`
  Quando bloqueado:
  - Os botões "Adicionar Atleta", "Editar" e "Remover" são desabilitados.
  - Um alerta amarelo/vermelho é exibido indicando encerramento do prazo.
  - As abas "Jogos", "Classificação" e "Boletins" permanecem disponíveis em modo somente-leitura.
- **Na Camada de Serviço:** `addAthlete`, `updateAthlete` e `removeAthlete` invocam `CompetitionRegistrationService.validateAthleteRegistration`, que rejeita a operação caso `isRegistrationLocked` retorne `true`.
- **No Banco de Dados (Supabase RPC):** A procedure `public.register_athlete` verifica `if v_team.is_locked or v_team.registration_deadline < now() then return error;`.

### 2.7. Como a equipe entra no sorteio?
- **Evidência no Código:** [`src/pages/DrawPage.tsx#L151-L157`](file:///home/diego-martins/docker/volei/src/pages/DrawPage.tsx#L151-L157):
  ```ts
  const registeredTeams = useMemo(() => {
    if (!selected) return [];
    const cts = competitionTeams.filter(ct => ct.competitionId === selected.id && ct.status !== 'rejected');
    return cts
      .map(ct => teams.find(t => t.id === ct.teamId))
      .filter((t): t is TeamRecord => Boolean(t));
  }, [selected, competitionTeams, teams]);
  ```
- **Mapeamento:** O sorteio consome `dataAccess.listCompetitionTeams()` e localiza as equipes da competição selecionada cuja inscrição não tenha status `'rejected'`.

### 2.8. Como o sorteio sabe quais equipes são elegíveis?
- **Diagnóstico Crítico:** O sorteio **NÃO possui critério rígido de elegibilidade** atualmente.
- O único filtro em vigor é `ct.status !== 'rejected'`.
- Isso significa que equipes nos estados `'invited'` (convite recém-criado, sem nenhum atleta cadastrado), `'in_progress'` ou `'submitted'` entram indiscriminadamente no sorteio junto com equipes `'approved'`.
- O validador de sorteio (`src/services/drawValidator.ts`) checa apenas se `teams.length >= 2` e se `groupsCount <= teams.length`. Ele **não valida** se a equipe possui o elenco mínimo (`minAthletes` da `CompetitionConfig`), nem se o prazo de inscrição foi formalmente encerrado.

### 2.9. Como impedir alterações após o fechamento?
- **Mecanismos Existentes:**
  1. `CompetitionLifecycleService.canEditRules`: quando a competição atinge `'in-progress'`, as regras congelam e não podem ser alteradas.
  2. `isRegistrationLocked`: bloqueia edição de elenco por equipe quando `registrationDeadline` expira ou `isLocked` é marcado.
  3. `dataAccess.saveDrawWithMatches`: se houver jogos de grupo iniciados ou jogados, impede a regeração do sorteio.
  4. `CompetitionRegistrationService.canRemoveRegistration`: impede a exclusão de inscrição se a equipe já possuir partidas geradas.
- **Lacuna Identificada:** Se a competição transitar para `'registration-closed'` ou `'groups-defined'`, mas o registro individual da equipe (`competition_teams.registration_deadline`) tiver uma data futura ou `is_locked === false`, o portal da equipe ainda permite inserção de atletas porque `isRegistrationLocked` avalia apenas o objeto da equipe e não o status macro da competição.

### 2.10. Como os três portais poderão utilizar o mesmo núcleo?
- **Estratégia Arquitetural:** O BaseOS é um SPA Vite + React Router montado em uma única base de código. Não há necessidade de construir três deploys ou três backends separados.
- **Separação de Rotas com Núcleo Unificado:**
  1. `/admin/*` — **Portal Administrativo**:
     - Protegido por `<RequireAuth roles={['organizer', 'admin']}>`.
     - Layout com Sidebar administrativa completa, alternador de competições, métricas e controles operacionais.
  2. `/equipe/:token/*` (ou `/equipe/:teamSlug/*`) — **Portal da Equipe**:
     - Autenticado por token assinado/hash de acesso OU sessão de `role: 'team'`.
     - Layout mobile-first, focado na agremiação (logo, elenco, status de inscrição, próximos confrontos, sumuladores).
     - Componentes consomem os mesmos serviços (`competitionRulesService`, `registrationService`).
  3. `/c/:competitionSlug/*` — **Portal Público**:
     - Totalmente público (sem auth), estático/read-only, ultraleve e otimizado para mobile e escaneamento de QR Code.
     - Visualização de chaves, jogos ao vivo, parciais de sets e tabela de classificação geradas diretamente pelo `standingsService`.

---

## 3. MATRIZ DE RISCOS E APONTAMENTOS ENCONTRADOS

| ID | Área | Gravidade | Descrição do Risco / Apontamento |
|---|---|---|---|
| **GAP-01** | **Cadastro Desconectado** | **ALTO** | `TeamsPage` cria agremiações globais sem vínculo com competição, gerando um token que resolve para uma competição fantasma (`'geral'`), enquanto `CompetitionRegistrationsPage` exige vincular a equipe em uma segunda etapa manual. |
| **GAP-02** | **Elegibilidade no Sorteio** | **ALTO** | `DrawPage` inclui qualquer equipe cujo status não seja `rejected`. Equipes sem atletas (`status: 'invited'`) entram no sorteio, violando a regra de elenco mínimo da `CompetitionConfig`. |
| **GAP-03** | **Trava de Inscrição Descentralizada** | **ALTO** | `isRegistrationLocked` verifica apenas o prazo individual da equipe em `competition_teams`, sem verificar se a competição como um todo já está em `registration-closed`, `groups-defined` ou `in-progress`. |
| **GAP-04** | **Políticas RLS Permissivas no Supabase** | **MÉDIO** | A migração `20260818000000_initial_schema.sql` define `create policy "competition_teams_auth_write" ... to authenticated using (true) with check (true)`. Qualquer usuário autenticado pode alterar inscrições de outras equipes via API direta. |
| **GAP-05** | **Duplicidade de Tokens de Acesso** | **MÉDIO** | Existem dois campos de token: `teams.registration_token` e `competition_teams.access_token`. A UI ora utiliza um, ora outro, gerando confusão e potenciais links inválidos. |
| **GAP-06** | **Mensageria WhatsApp Embutida na View** | **BAIXO** | A função `buildWhatsAppMessage` e a abertura da API do WhatsApp Web estão hardcoded em `TeamCreatedShareDialog.tsx`, sem um serviço reaproveitável (`whatsAppService`). |
| **GAP-07** | **Inexistência de QR Code Generator** | **BAIXO** | O projeto não possui utilitário ou biblioteca para renderizar QR Code para o portal público do torneio. |

---

## 4. DOCUMENTOS INTEGRANTES DA AUDITORIA

A documentação detalhada desta Fase 1 foi estruturada e armazenada nos seguintes relatórios complementares em `docs/competition-portals/`:

1. [`docs/competition-portals/PHASE-1-AUDIT.md`](file:///home/diego-martins/docker/volei/docs/competition-portals/PHASE-1-AUDIT.md) — *Este relatório executivo geral.*
2. [`docs/competition-portals/CURRENT-ARCHITECTURE.md`](file:///home/diego-martins/docker/volei/docs/competition-portals/CURRENT-ARCHITECTURE.md) — *Arquitetura detalhada, CompetitionConfig, dataAccess e fluxo de dados.*
3. [`docs/competition-portals/DOMAIN-MAP.md`](file:///home/diego-martins/docker/volei/docs/competition-portals/DOMAIN-MAP.md) — *Mapeamento minucioso das 13 entidades de domínio, schemas e tabelas.*
4. [`docs/competition-portals/REGISTRATION-FLOW.md`](file:///home/diego-martins/docker/volei/docs/competition-portals/REGISTRATION-FLOW.md) — *Fluxo atual vs Fluxo alvo de cadastro, prazos e integridade de elenco.*
5. [`docs/competition-portals/ACCESS-CONTROL-MAP.md`](file:///home/diego-martins/docker/volei/docs/competition-portals/ACCESS-CONTROL-MAP.md) — *Matriz RBAC, RLS, segurança de acessos e arquitetura de 3 portais.*
6. [`docs/competition-portals/DRAW-INTEGRATION-MAP.md`](file:///home/diego-martins/docker/volei/docs/competition-portals/DRAW-INTEGRATION-MAP.md) — *Integração do sorteio com inscrições elegíveis e proteção de chaves.*

---

## 5. CONCLUSÃO DA FASE 1

Todas as evidências no código-fonte, migrations, tipos e serviços foram levantadas sem alteração de arquivos de produção ou infraestrutura.

**STATUS: AUDIT COMPLETE**
