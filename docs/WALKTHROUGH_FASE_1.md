# WALKTHROUGH — BASEOS FASE 1
## Auditoria Técnica e Mapeamento do Fluxo de Competições, Equipes, Inscrições, Acessos e Sorteio

**Data:** 04/09/2026  
**Sistema:** BaseOS (VolleyPro)  
**Versão:** 1.0.0  
**Fase:** Fase 1 — Auditoria, Diagnóstico e Mapeamento de Domínio  
**Status Oficial:** **STATUS: AUDIT COMPLETE**  

---

## 1. OBJETIVO DA FASE 1

Executar uma auditoria técnica completa e adversarial do estado atual do BaseOS para preparar a transição para o novo fluxo operacional unificado de competições, equipes, inscrições, portais e sorteio.

A regra fundamental desta fase foi rigorosamente cumprida:
> **NÃO alterar código de produção, NÃO alterar banco de dados, NÃO criar migrations, NÃO criar novas telas e NÃO realizar refatorações especulativas.**

---

## 2. O FLUXO ALVO DE NEGÓCIO

```text
CRIAR COMPETIÇÃO
        ↓
CONFIGURAR COMPETIÇÃO (CompetitionConfig como Fonte Única)
        ↓
ABRIR INSCRIÇÕES
        ↓
CADASTRAR EQUIPE NA COMPETIÇÃO
        ↓
CRIAR INSCRIÇÃO OFICIAL (Operação Atômica)
        ↓
CRIAR ACESSO DO GESTOR DA EQUIPE
        ↓
GERAR LINK DO PORTAL DA EQUIPE (+ Mensagem WhatsApp)
        ↓
EQUIPE CADASTRADA E ELEGÍVEL
        ↓
FECHAMENTO DAS INSCRIÇÕES
        ↓
CONGELAMENTO DE ELENCO E REGRAS
        ↓
SORTEIO (Carregamento Automático de Equipes Elegíveis)
        ↓
GRUPOS / CHAVES
        ↓
TABELA DE JOGOS
        ↓
JOGOS & SÚMULAS DIGITAIS
        ↓
RESULTADOS OFICIAIS (CanonicalMatchResult)
        ↓
CLASSIFICAÇÃO CANÔNICA
```

---

## 3. RESPOSTAS FACTUAIS ÀS 10 PERGUNTAS FUNDAMENTAIS

| # | Pergunta Canônica | Resposta Técnica com Evidência no Código |
|---|---|---|
| 1 | **Como uma competição é criada?** | Em [`CompetitionsPage.tsx:299-313`](file:///home/diego-martins/docker/volei/src/pages/CompetitionsPage.tsx#L299-L313) via modal [`CompetitionFormDialog.tsx:62-109`](file:///home/diego-martins/docker/volei/src/components/competition/dialogs/CompetitionFormDialog.tsx#L62-L109). Coleta formato, modalidade e sets; invoca `CompetitionRulesService.normalizeLegacyToConfig` e grava `dataAccess.createCompetition` com `status: 'planning'`. Registra auditoria via `OperationalAuditService.recordCompetitionCreation`. |
| 2 | **Como uma equipe é cadastrada?** | Em [`TeamsPage.tsx:166-188`](file:///home/diego-martins/docker/volei/src/pages/TeamsPage.tsx#L166-L188) via `dataAccess.createTeam`. O cadastro é **global e independente de competição**. Gera `registrationToken` e opcionalmente um `PersonRecord` para o gestor. Não possui vínculo com nenhuma competição nesse momento. |
| 3 | **Como uma equipe é vinculada à competição?** | Em uma **segunda etapa manual** em [`CompetitionRegistrationsPage.tsx:147-168`](file:///home/diego-martins/docker/volei/src/pages/CompetitionRegistrationsPage.tsx#L147-L168). O organizador seleciona a agremiação existente na lista suspensa, estipula o prazo (`deadlineIso`) e invoca `dataAccess.createCompetitionTeam`, criando um registro `CompetitionTeam` com `accessToken` próprio. |
| 4 | **Como a inscrição é representada?** | Pela entidade `CompetitionTeam` ([`src/types/registration.ts:35-48`](file:///home/diego-martins/docker/volei/src/types/registration.ts#L35-L48)) e tabela `public.competition_teams` ([`initial_schema.sql:67-81`](file:///home/diego-martins/docker/volei/supabase/migrations/20260818000000_initial_schema.sql#L67-L81)). Possui `competitionId`, `teamId`, `accessToken`, `registrationDeadline`, `isLocked` e `status` (`'invited'` a `'approved'`). Atletas ficam em `competition_athletes`. |
| 5 | **Como o responsável da equipe terá acesso?** | Via link público com token na URL: `/equipe/inscricao/:token` ([`TeamRosterRegistrationPage.tsx:76-123`](file:///home/diego-martins/docker/volei/src/pages/TeamRosterRegistrationPage.tsx#L76-L123)). O backend e a tabela `profiles` suportam `competition_team_id`, mas não há tela ou rotina que gere um usuário em `auth.users` automaticamente no cadastro. |
| 6 | **Como o prazo de inscrição é controlado?** | Pela função `isRegistrationLocked` ([`registrationService.ts:17-23`](file:///home/diego-martins/docker/volei/src/services/registrationService.ts#L17-L23)), que verifica `isLocked || now > registrationDeadline`. Se travado, a UI desabilita edição e a camada de serviço (`validateAthleteRegistration`) bloqueia novas mutações. |
| 7 | **Como a equipe entra no sorteio?** | Na tela [`DrawPage.tsx:151-157`](file:///home/diego-martins/docker/volei/src/pages/DrawPage.tsx#L151-L157), que filtra `competitionTeams.filter(ct => ct.competitionId === selected.id && ct.status !== 'rejected')` e recupera os `TeamRecord` correspondentes. |
| 8 | **Como o sorteio sabe quais equipes são elegíveis?** | **Atualmente o sorteio NÃO possui critério de elegibilidade.** Ele aceita qualquer status que não seja `'rejected'` (`ct.status !== 'rejected'`), permitindo que equipes sem atletas ou `'invited'` entrem no sorteio. |
| 9 | **Como impedir alterações após o fechamento?** | O motor de regras congela (`canEditRules = false`) ao iniciar os jogos. Partidas jogadas impedem regeração do sorteio (`dataAccess.saveDrawWithMatches`). Porém, falta travar o portal da equipe quando o status da competição for `'registration-closed'`. |
| 10 | **Como os três portais poderão utilizar o mesmo núcleo?** | Através de uma única SPA em [`src/App.tsx`](file:///home/diego-martins/docker/volei/src/App.tsx) dividida em 3 árvores de rotas com layouts específicos (`/admin/*`, `/equipe/:token/*`, `/c/:competitionSlug/*`), compartilhando 100% dos serviços de regras, pontuação e dados. |

---

## 4. RELATÓRIO ESTRUTURADO DE DIAGNÓSTICO (SEÇÕES A A L)

### A. O que já existe
- **Motor Canônico de Regras Esportivas:** `CompetitionConfig` em [`src/types/competitionConfig.ts`](file:///home/diego-martins/docker/volei/src/types/competitionConfig.ts) controlando sets, pontuações de tabela, desempate e limites de elenco.
- **Normalização e Congelamento:** `CompetitionRulesService` normaliza formatos e congela `rulesSnapshot` imutável.
- **Controle de Ciclo de Vida:** `CompetitionLifecycleService` com máquina de estados e validações de transição.
- **Integridade de Inscrições:** `CompetitionRegistrationService` validando limites de elenco, capitães, líberos, camisas 1-99 e unicidade de atleta no torneio.
- **Motor de Sorteio e Confrontos:** `DrawService` com PRNG mulberry32, balanceamento guloso e tabela Berger round-robin.
- **Cálculo Matemático de Resultados:** `CanonicalMatchResult` puro e `standingsService` com critérios CBV/FIVB.
- **Trilha de Auditoria Canônica:** `OperationalAuditService` e migração `20260904000001_audit_logs.sql`.
- **Geração de Súmulas Oficiais em PDF:** Súmulas de 3 e 5 sets, ordem de saque e relatórios via `@react-pdf/renderer`.
- **Visualizador do Portal da Equipe:** `TeamRosterRegistrationPage.tsx` exibindo elenco, jogos, classificação e boletins.
- **Mensagem Pré-Formatada do WhatsApp:** `TeamCreatedShareDialog.tsx` com template e abertura do WhatsApp Web.

### B. O que está parcialmente implementado
- **Prazos de Inscrição:** Existe `defaultDeadline` na competição e `registrationDeadline` na equipe, mas a equipe não herda automaticamente e a trava não olha o status macro do torneio.
- **Sorteio:** Funciona com `competition_teams`, mas não valida se a equipe está aprovada ou tem o número mínimo de atletas.
- **Autenticação da Equipe:** Tipagem e banco possuem `competition_team_id`, mas a criação do usuário `auth.users` não está automatizada.
- **WhatsApp:** Existe no cadastro global de equipes (`TeamsPage`), mas ausente na tela de inscrições por competição (`CompetitionRegistrationsPage`).

### C. O que precisa ser criado
1. **Modal / Fluxo Unificado de Inscrição:** Cadastro atômico: Agremiação + Inscrição + Credenciais + Link + WhatsApp em um único clique no botão Salvar.
2. **Serviço Reaproveitável de WhatsApp (`src/services/whatsAppService.ts`):** Higienização de DDI/DDD, formatação de templates e disparo seguro.
3. **Serviço de Elegibilidade para Sorteio (`src/services/drawEligibilityService.ts`):** Filtro rígido para garantir que apenas equipes confirmadas com elenco mínimo entrem no sorteio.
4. **Gerador de QR Code:** Utilitário para o organizador gerar QR Code para o portal público `/c/:competitionSlug`.
5. **Divisão de Rotas dos Três Portais:** Organização das rotas em `/admin/*`, `/equipe/:token/*` e `/c/:competitionSlug/*`.

### D. O que precisa ser corrigido
1. **Filtro de Equipes no Sorteio:** Substituir `ct.status !== 'rejected'` em `DrawPage.tsx:153` por critério estrito de elegibilidade.
2. **Trava de Inscrição na Competição:** Expandir `isRegistrationLocked` para travar quando a competição estiver em `registration-closed`, `groups-defined` ou `in-progress`.
3. **Avanço de Status no Sorteio:** Ao salvar o sorteio, transicionar a competição pai para `'groups-defined'`.
4. **Procedure Supabase Hardcoded:** Remover o limite fixo de 14 atletas em `register_athlete` no banco PostgreSQL.
5. **Políticas RLS Excessivamente Abertas:** Corrigir `competition_teams_auth_write using (true)` no Supabase para isolar mutações por equipe.

### E. O que deve ser preservado
- `CompetitionConfig` como única fonte da verdade de regras esportivas.
- Imutabilidade e isolamento do `rulesSnapshot`.
- `CanonicalMatchResult` como única fonte de cálculo de placar e parciais.
- Padrão adapter de dados via `dataAccess.ts`.
- Auditoria operacional obrigatória via `OperationalAuditService`.

### F. Riscos Técnicos
- Concorrência de preenchimento no encerramento de inscrições (mitigado por travas em lote).
- Dessincronização de campos entre LocalStorage e Supabase (mitigado pelos mappers de `dataAccess.ts`).

### G. Riscos de Segurança
- Vazamento de link de acesso por token (mitigado por expiração e autenticação por senha opcional).
- RLS permissivo no Supabase permitindo chamadas diretas com tokens autenticados de outra equipe.

### H. Riscos de Integridade de Competição
- Equipe sem número mínimo de atletas entrando no sorteio e gerando W.O. involuntário.
- Alteração de atletas após a divulgação oficial dos grupos e início das disputas.

### I. Dependências Entre Fases
```text
Fase 1 (Auditoria e Mapeamento) [CONCLUÍDA]
                ↓
Fase 2 (Novo Fluxo de Cadastro e Inscrição Atômica + WhatsApp)
                ↓
Fase 3 (Sorteio Elegível e Travas de Ciclo de Vida)
                ↓
Fase 4 (Estruturação dos Três Portais e QR Code Público)
                ↓
Fase 5 (Hardening de RLS e Homologação E2E)
```

### J. Arquivos que Serão Alterados nas Próximas Fases
- `src/pages/CompetitionRegistrationsPage.tsx`
- `src/pages/TeamsPage.tsx`
- `src/pages/DrawPage.tsx`
- `src/services/registrationService.ts`
- `src/services/competitionRegistrationService.ts`
- `src/services/drawValidator.ts`
- `src/services/dataAccess.ts`
- `src/App.tsx`

### K. Migrations Necessárias Futuramente (Planejamento)
- Extensão do enum `public.user_role` para incluir `'admin'`, `'scorer'`, `'viewer'`.
- Refinamento de RLS em `competition_teams` e `competition_athletes` filtrando por `auth.uid() = profile.id`.
- Parametrização dinâmica de limite de atletas na procedure `register_athlete`.

### L. Plano Recomendado de Implementação
1. **Fase 2:** Implementar cadastro unificado e atômico da equipe na competição com geração de credenciais e botão WhatsApp Web.
2. **Fase 3:** Implementar validação estrita de elegibilidade no sorteio, trava de ciclo de vida e avanço para `'groups-defined'`.
3. **Fase 4:** Criar layouts dos 3 portais (`/admin`, `/equipe`, `/c`), páginas públicas somente-leitura e emissão de QR Code.
4. **Fase 5:** Aplicar migrations de RLS no Supabase e executar bateria de testes automatizados e homologação no Docker.

---

## 5. DOCUMENTOS GERADOS NA PASTA `docs/competition-portals/`

- [`docs/competition-portals/PHASE-1-AUDIT.md`](file:///home/diego-martins/docker/volei/docs/competition-portals/PHASE-1-AUDIT.md)
- [`docs/competition-portals/CURRENT-ARCHITECTURE.md`](file:///home/diego-martins/docker/volei/docs/competition-portals/CURRENT-ARCHITECTURE.md)
- [`docs/competition-portals/DOMAIN-MAP.md`](file:///home/diego-martins/docker/volei/docs/competition-portals/DOMAIN-MAP.md)
- [`docs/competition-portals/REGISTRATION-FLOW.md`](file:///home/diego-martins/docker/volei/docs/competition-portals/REGISTRATION-FLOW.md)
- [`docs/competition-portals/ACCESS-CONTROL-MAP.md`](file:///home/diego-martins/docker/volei/docs/competition-portals/ACCESS-CONTROL-MAP.md)
- [`docs/competition-portals/DRAW-INTEGRATION-MAP.md`](file:///home/diego-martins/docker/volei/docs/competition-portals/DRAW-INTEGRATION-MAP.md)

---

**STATUS: AUDIT COMPLETE**
