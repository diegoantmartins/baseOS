# WALKTHROUGH OFICIAL — FASE 8.2
# PARTE 1: ESCOPO, DIAGNÓSTICO, ARQUITETURA, DECISÕES FUNCIONAIS E REJEIÇÕES
*(Itens 1 a 9 do Walkthrough do Modelo Funcional da Competição)*

> **Documento complementar:** Consulte a [Parte 2 (Itens 10 a 17)](file:///home/diego-martins/docker/volei/docs/walkthroughs/FASE-8.2-MODELO-FUNCIONAL-COMPETICAO-INSCRICAO-PARTE-2.md) para Verificações, Testes, Riscos, Gaps, Contrato Fase 8.3 e Status Final.
> **Relatório Técnico Completo:** Consulte também o relatório de auditoria em [Parte 1](file:///home/diego-martins/docker/volei/docs/audits/FASE-8.2-MODELO-FUNCIONAL-COMPETICAO-INSCRICAO-PARTE-1.md) e [Parte 2](file:///home/diego-martins/docker/volei/docs/audits/FASE-8.2-MODELO-FUNCIONAL-COMPETICAO-INSCRICAO-PARTE-2.md).
> **Diretriz Mandatória:** NO CODE BEFORE CONTRACT
> **Status da Fase 8.2:** `STATUS: FUNCTIONAL MODEL DEFINED`

---

## 1. O QUE FOI ANALISADO

Nesta Fase 8.2 do BaseOS, foi conduzida uma análise funcional e arquitetural aprofundada para fechar o **modelo do produto** em torno da jornada real do organizador esportivo.

O escopo da análise compreendeu:
- A experiência de criação de uma competição de voleibol (quadra e praia) e o momento em que ela se torna apta a receber inscrições.
- O ciclo de vida interno (11 estados físicos de `public.competition_status`) e sua tradução para 5 fases operacionais simples para o organizador.
- A distinção estrutural entre a agremiação permanente (`Team`) e a sua inscrição no torneio específico (`CompetitionTeam`).
- O fluxo de convite e ativação remota via link seguro com token exclusivo (`/equipe/inscricao/:token`), acessível pelo WhatsApp sem senha inicial.
- O fluxo de pré-candidatura, preenchimento de elenco, envio (`submitted`) e aprovação formal (`approved`).
- A identificação do gargalo operacional da tela de inscrições (`CompetitionRegistrationsPage.tsx`), que não possuía botões de aprovação/confirmação de equipes.
- O modelo de capacidade máxima de equipes (`capacity`/`maxTeams`), ocupação de vagas e fila de espera.
- O controle de taxa de inscrição e confirmação financeira sem dependência de gateway externo ou quebra de schema.
- O critério sagrado de elegibilidade para o sorteio de chaves (exigência restrita de equipes em status `approved` com elenco mínimo).
- A eliminação definitiva de armazenamento de senhas em entidades de domínio esportivo.

---

## 2. ARQUIVOS E DOCUMENTOS ANALISADOS

### Documentação Prévia:
- `docs/audits/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA.md` (e suas Partes 1 e 2)
- `docs/walkthroughs/FASE-8.1-CONTRATO-REAL-DE-PERSISTENCIA.md` (e suas Partes 1 e 2)
- `docs/walkthroughs/FASE-8-FUNCTIONAL-AUDIT-V2.3.0.md`

### Código-Fonte da Aplicação:
- `src/pages/CompetitionsPage.tsx` (orquestração da tela de competições)
- `src/components/competition/dialogs/CompetitionFormDialog.tsx` (diálogo de criação)
- `src/components/competition/CompetitionHeader.tsx` (cabeçalho e badges de status)
- `src/components/competition/tabs/CompetitionOverviewTab.tsx` (controle do ciclo de vida)
- `src/components/competition/tabs/CompetitionTeamsTab.tsx` (visualização de equipes)
- `src/pages/TeamsPage.tsx` (gestão global de equipes e tentativa legada de senha)
- `src/pages/CompetitionRegistrationsPage.tsx` (painel de inscrições do organizador)
- `src/components/competition/dialogs/RegisterTeamInCompetitionDialog.tsx` (cadastro direto)
- `src/pages/TeamRosterRegistrationPage.tsx` (portal público do gestor da equipe)
- `src/pages/DrawPage.tsx` (módulo de sorteio de grupos e chaves)
- `src/data/helpArticles.ts` (central de ajuda e jornada do organizador)

### Serviços e Tipos de Domínio:
- `src/services/competitionLifecycleService.ts`
- `src/services/registrationService.ts`
- `src/services/competitionRegistrationService.ts`
- `src/services/competitionDrawEligibilityService.ts`
- `src/services/competitionRulesService.ts`
- `src/services/dataAccess.ts`
- `src/services/authService.ts`
- `src/services/operationalAuditService.ts`
- `src/types/entities.ts`
- `src/types/registration.ts`
- `src/types/competitionConfig.ts`
- `src/types/auth.ts`
- `src/types/readiness.ts`

---

## 3. SCHEMA POSTGRESQL E MIGRAÇÕES CONSULTADAS

A inspeção confirmou as estruturas reais ativas no PostgreSQL 17.6 (`volei_test_db`):
- **Tabela `public.competitions`:** colunas `id`, `name`, `modality`, `format`, `player_format`, `set_format`, `gender_category`, `status`, `config` (JSONB), `rules_snapshot` (JSONB), `venue`, `start_date`, `end_date`, `default_deadline`, etc.
- **Tabela `public.teams`:** colunas `id`, `name`, `short_name`, `modality`, `coach_name`, `city`, `logo_url`, `created_at`, `updated_at`.
- **Tabela `public.competition_teams`:** colunas `id`, `competition_id`, `team_id`, `team_name`, `team_short_name`, `access_token`, `registration_deadline`, `is_locked`, `status`, `custom_notes`, `created_at`, `updated_at`.
- **Tabela `public.competition_athletes`:** colunas `id`, `competition_team_id`, `name`, `jersey_number`, `position`, `document_number`, `birth_date`, `is_captain`, `is_libero`, `gender`.
- **Enums Nativos:** `public.competition_status` (11 valores), `public.registration_status` (5 valores: `invited`, `in_progress`, `submitted`, `approved`, `rejected`), `public.modality` (`indoor`, `beach`).
- **Tabelas Inexistentes:** `public.persons` e `public.modalities` (confirmadas como inexistentes no banco).

---

## 4. COMPORTAMENTO ATUAL ENCONTRADO (DIAGNÓSTICO REAL)

1. **Criação de Competição Bloqueada:** A UI envia propriedades de primeiro nível (`groupsCount`, `advancingPerGroup`, etc.) que não são colunas em `competitions`, causando HTTP 400 (`PGRST204`).
2. **Cadastro de Equipe Bloqueado:** A UI tenta salvar `managerPassword` e `state` na tabela `teams`, além de tentar gravar na tabela inexistente `persons`.
3. **Ausência de Botão de Confirmação:** Em `CompetitionRegistrationsPage.tsx`, o organizador vê a lista de inscrições com seus status, mas **não possui nenhum botão para alterar uma equipe para `approved` ou `rejected`**. O fluxo de aprovação estava incompleto na interface!
4. **Sorteio Excessivamente Permissivo:** O `CompetitionDrawEligibilityService.ts` aceita equipes em status `invited` ou `in_progress` que possuam mock de atletas, sem exigir que tenham sido formalmente confirmadas pela organização.
5. **Barra de Botões Rígida:** `CompetitionOverviewTab.tsx` apresenta 6 botões técnicos numerados de transição de fase, forçando o usuário a pensar na mecânica interna de enums.

---

## 5. DECISÕES FUNCIONAIS ADOTADAS

1. **Adotar o Princípio "No Code Before Contract":** Não alterar código na Fase 8.2; formalizar toda a especificação antes da implementação na Fase 8.3.
2. **Simplificar o Lifecycle para o Usuário:** Encapsular os 11 enums técnicos em 5 Macrofases do Organizador (Criação/Inscrições → Gestão de Vagas/Confirmação → Sorteio → Em Andamento → Finalização).
3. **Snapshot Imutável de Nomenclatura:** Manter `team_name` e `team_short_name` congelados em `competition_teams` no momento da inscrição.
4. **Vagas Vinculadas a Status `approved`:** Somente a confirmação formal deduz vagas disponíveis da competição.
5. **Sorteio Restrito a Equipes Confirmadas:** O motor de sorteio exigirá que a inscrição possua `status === 'approved'` e o elenco mínimo regulamentar.
6. **Autonomia do Organizador:**
   - Possibilidade de convidar via WhatsApp/link;
   - Possibilidade de cadastrar equipe manualmente e já confirmá-la caso a ficha seja física;
   - Prorrogação de prazos individualmente por equipe;
   - Reabertura excepcional de inscrições antes do início das partidas com alerta e auditoria.
7. **Controle Financeiro Sem Quebra de Schema:** Na Fase 8.3, dados de confirmação de taxa serão registrados como JSON estruturado dentro de `custom_notes`, eliminando a necessidade de migration emergencial.
8. **Segurança de Acesso do Gestor:** Desacoplar credenciais da tabela `teams`. O acesso via link público utiliza o `access_token` exclusivo; o acesso administrativo pleno utiliza `auth.users` e `profiles`.

---

## 6. DECISÕES REJEITADAS E JUSTIFICATIVAS TÉCNICAS

1. **Rejeitado: Criar novas migrations na Fase 8.2.**
   - *Por que:* A regra fundamental da Fase 8.2 é a não-modificação de código e banco. Todos os estados necessários (`invited`, `in_progress`, `submitted`, `approved`, `rejected`) já existem como enum nativo no PostgreSQL.
2. **Rejeitado: Manter a senha do gestor em `teams.managerPassword`.**
   - *Por que:* Grave vulnerabilidade de segurança e violação de LGPD. A tabela `teams` é pública e representa a agremiação, não credenciais pessoais.
3. **Rejeitado: Permitir equipes não-confirmadas no sorteio de chaves.**
   - *Por que:* Gera risco de partidas agendadas para equipes desistentes ou que não cumpriram os requisitos regulamentares/financeiros.
4. **Rejeitado: Exigir que o organizador clique em "1. Abrir Inscrições" após criar a competição.**
   - *Por que:* Atrito desnecessário de UX. Se o organizador preencheu o prazo e as regras no formulário de criação, a competição já pode nascer pronta para receber agremiações.
5. **Rejeitado: Remover campos da UI para mascarar os erros do PostgREST.**
   - *Por que:* Causaria perda funcional de parâmetros esportivos que devem residir no JSONB `config`.

---

## 7. GAPS IDENTIFICADOS E CLASSIFICADOS

- **Gap 1 (Persistência PostgREST):** Incompatibilidade de payload em `createCompetition` e `createTeam` (`PGRST204`). -> *Classificação:* `SUPPORTED (Resolver via Mapper na Fase 8.3)`.
- **Gap 2 (Ação na UI):** Falta de botões "Confirmar" e "Recusar" na tela de inscrições. -> *Classificação:* `SUPPORTED (Implementar na Fase 8.3)`.
- **Gap 3 (Regra de Sorteio):** Elegibilidade de sorteio não checa `status === 'approved'`. -> *Classificação:* `SUPPORTED (Ajustar serviço na Fase 8.3)`.
- **Gap 4 (Financeiro):** Inexistência de colunas SQL de pagamento em `competition_teams`. -> *Classificação:* `GAP — RESOLVIDO NA APLICAÇÃO (custom_notes)`.
- **Gap 5 (Capacidade de Torneio):** Inexistência de coluna `max_teams` em `competitions`. -> *Classificação:* `GAP — RESOLVIDO NA APLICAÇÃO (config.registration / format)`.
- **Gap 6 (Tabelas Fantasmas):** Referências a `public.persons` e `public.modalities`. -> *Classificação:* `LEGACY (Eliminar chamadas na Fase 8.3)`.

---

## 8. ALTERAÇÕES REALIZADAS

1. **Elaboração do Relatório Técnico Oficial de Auditoria Funcional (28 Seções):**
   - `docs/audits/FASE-8.2-MODELO-FUNCIONAL-COMPETICAO-INSCRICAO.md`
   - `docs/audits/FASE-8.2-MODELO-FUNCIONAL-COMPETICAO-INSCRICAO-PARTE-1.md` (Seções 1 a 13)
   - `docs/audits/FASE-8.2-MODELO-FUNCIONAL-COMPETICAO-INSCRICAO-PARTE-2.md` (Seções 14 a 28)
2. **Elaboração deste Walkthrough Oficial (17 Itens):**
   - `docs/walkthroughs/FASE-8.2-MODELO-FUNCIONAL-COMPETICAO-INSCRICAO.md`
   - `docs/walkthroughs/FASE-8.2-MODELO-FUNCIONAL-COMPETICAO-INSCRICAO-PARTE-1.md`
   - `docs/walkthroughs/FASE-8.2-MODELO-FUNCIONAL-COMPETICAO-INSCRICAO-PARTE-2.md`
3. **Navegação e Links Cruzados:** Todos os documentos foram indexados com links GitHub Markdown recíprocos.

---

## 9. ALTERAÇÕES DELIBERADAMENTE NÃO REALIZADAS

Em cumprimento estrito às regras da Fase 8.2:
- ❌ Nenhum código de produção (`src/pages`, `src/services`, `src/components`) foi alterado.
- ❌ Nenhum arquivo de migração SQL foi criado ou modificado.
- ❌ Nenhuma alteração foi realizada no banco de dados ativo (PostgreSQL / Supabase).
- ❌ Nenhum deploy foi realizado.
- ❌ A instância de produção VOLTZ não foi tocada.
- ❌ Nenhum commit, tag ou push Git foi executado.

---
*(Continua na [Parte 2 (Itens 10 a 17)](file:///home/diego-martins/docker/volei/docs/walkthroughs/FASE-8.2-MODELO-FUNCIONAL-COMPETICAO-INSCRICAO-PARTE-2.md) com Verificações, Testes, Riscos, Contrato Fase 8.3 e Status Final)*
