# BASEOS — AUDITORIA FUNCIONAL E DE INTEGRAÇÃO
## FASE 8.6.3 — INVENTÁRIO DO QUE FOI IMPLANTADO E VERIFICAÇÃO REAL

---

## 1. Resumo Executivo

O BaseOS é uma aplicação web avançada (React 18 + TypeScript + Vite) voltada à gestão de competições de voleibol, com uma extensa suíte de testes unitários (120 arquivos de teste, ~1.159 asserções automatizadas). Contudo, a presente auditoria técnica e funcional revelou um **descompasso crítico entre o código existente e a operacionalidade real no navegador com backend real**:

1. **A Ilusão dos Testes Automatizados**: A esmagadora maioria dos testes automatizados foi construída contra o `localStorageAdapter` em memória ou mocks isolados de funções. Sob o backend real Supabase/PostgreSQL, comportamentos vitais falham ou produzem efeitos colaterais silenciosos. A suíte completa Vitest possui **120 arquivos aprovados e 1.160 testes passando (100%)**, mas mascara a desconexão de persistência e autenticação.
2. **O "Gerador de Senha" e a Quebra de Persistência de Credenciais**:
   - O gerador amigável (`generateRandomPassword()`, ex.: `Bloqueio@4821`) foi originalmente concebido na Fase 7 em código local de interface voltado ao LocalStorage (onde campos arbitrários em JSON podiam ser persistidos sem schema).
   - Com a transição para o backend relacional PostgreSQL na Fase 8, a tabela física `public.teams` foi definida estritamente com **9 colunas físicas** (`id`, `name`, `short_name`, `modality`, `coach_name`, `city`, `logo_url`, `created_at`, `updated_at`).
   - Para impedir que o PostgREST abortasse com erro `PGRST204: Could not find the 'manager_password' column of 'teams'`, o mapper canônico `teamMapper.toPersistence()` foi programado para **descartar sumariamente** qualquer campo de senha (`managerPassword`), e-mail (`managerEmail`), telefone (`managerPhone`) e estado (`state`).
   - Nenhuma chamada a `supabase.auth.signUp()` ou inserção na tabela `public.profiles` foi conectada ao cadastro de equipes.
   - **Resultado Real**: A senha e o e-mail exibidos na tela existem **apenas em memória volátil**. No momento em que a página sofre um refresh (F5), a senha, o e-mail e o contato do gestor **desaparecem do sistema**. O gestor da equipe **NUNCA consegue realizar login** em `/login` com essas credenciais (retorna erro `400 Invalid login credentials`), tornando a credencial um dado cosmético/inútil para autenticação no sistema.
3. **Dualidade Confusa de Formulários de Equipe**:
   - Na rota `/equipes`, o formulário global `TeamFormDialog` possui os campos de gestor e senha (porém com scroll vertical `max-h-[90vh]` que oculta a Seção 2 abaixo da dobra inicial).
   - Na rota `/competicoes/:id/inscricoes`, o botão "Convidar Equipe" abre `InviteTeamDialog`, que **não possui** campos de gestor, nem e-mail, nem senha. O botão "Cadastrar Equipe" abre `RegisterTeamInCompetitionDialog`, que até a correção recente não continha os campos de senha sincronizados.
4. **Veredito Oficial**: **NO-GO** — O sistema não está pronto para homologação funcional de ponta a ponta sem o saneamento arquitetural da persistência e autenticação das equipes.

---

## 2. Escopo da Auditoria

- **Ambiente**: Desenvolvimento Local (DEV).
- **Modalidade**: Exclusivamente **Vôlei Indoor** (Vôlei de Praia/Beach está terminantemente fora de escopo).
- **Diretriz**: Modo estritamente investigativo e de auditoria (somente leitura de código, sem alterações estruturais ou maquiagem de dados).

---

## 3. Ambiente Auditado

- **Frontend**: React 18.3.1, TypeScript 5.5.3, Vite 5.4.2 rodando em `http://localhost:3004` (com proxy de redirecionamento em `:5173`).
- **Backend**: Supabase Local (Docker).
  - **Kong Gateway**: porta `8400`
  - **PostgREST**: porta `8400/rest/v1`
  - **PostgreSQL**: porta `5432` (`supabase-db`, PostgreSQL 17.6)
  - **Auth**: porta `8400/auth/v1` (`supabase-auth`)
- **Git Branch**: `main`
- **Último Commit**: `4e55243 docs: walkthrough oficial de auditoria de release e deploy da Fase 7.9`
- **Tag Base**: `v2.3.0`

---

## 4. Inventário de Funcionalidades Encontradas

### A. COMPETIÇÃO (Indoor)
- **Criação de Competição**: [CompetitionFormDialog.tsx](file:///home/diego-martins/docker/volei/src/components/competition/dialogs/CompetitionFormDialog.tsx)
  - Abas: Dados Gerais, Sistema de Disputa (Templates), Sets & Pontuação, Regras de Inscrição, Identidade Visual e Apoiadores.
  - Persistência: [dataAccess.createCompetition](file:///home/diego-martins/docker/volei/src/services/dataAccess.ts) -> Tabela `public.competitions`.
- **Configuração e Formato de Disputa**:
  - Catálogo de templates: [competitionTemplateService.ts](file:///home/diego-martins/docker/volei/src/services/competitionTemplateService.ts) (`groups-knockout-standard`, etc.).
  - Construtor visual de formato: [CompetitionFormatBuilder.tsx](file:///home/diego-martins/docker/volei/src/components/competition/format-builder/CompetitionFormatBuilder.tsx).
  - Persistência do formato esportivo: Salvo no campo JSONB `config` de `public.competitions`.
- **Status e Ciclo de Vida**: [competitionLifecycleService.ts](file:///home/diego-martins/docker/volei/src/services/competitionLifecycleService.ts)
  - Estados: `draft` -> `registration-open` -> `registration-closed` -> `groups-defined` -> `in-progress` -> `playoffs` -> `finished`.
  - Congelamento de regras: Gera `rules_snapshot` imutável no primeiro jogo.
- **Prazo de Inscrição**:
  - Campo `default_deadline` em `public.competitions`.

### B. EQUIPES E INSCRIÇÕES
- **Cadastro Global de Equipes**: [TeamsPage.tsx](file:///home/diego-martins/docker/volei/src/pages/TeamsPage.tsx) (rota `/equipes`).
  - Permite criar equipe com Nome, Sigla, Cidade, Técnico, Escudo.
- **Inscrição de Equipes na Competição**:
  - Rota `/competicoes/:id/inscricoes`: [CompetitionRegistrationsPage.tsx](file:///home/diego-martins/docker/volei/src/pages/CompetitionRegistrationsPage.tsx).
  - Diálogo 1: `InviteTeamDialog.tsx` (convida equipe existente definindo prazo).
  - Diálogo 2: `RegisterTeamInCompetitionDialog.tsx` (cadastra nova agremiação e inscreve diretamente).
- **Gestão de Prazos e Bloqueio**:
  - Prorrogação individual de prazos por equipe (`updateCompetitionTeam`).
  - Trava de edição de elenco (`is_locked = true`).
- **Elenco e Atletas**:
  - Rota `/equipe/inscricao/:token`: [TeamRosterRegistrationPage.tsx](file:///home/diego-martins/docker/volei/src/pages/TeamRosterRegistrationPage.tsx).
  - Adição de atletas com validação de número de camisa (1-99 único), capitão único e até 2 líberos.
  - Persistência real em `public.competition_athletes`.

### C. ACESSO DA EQUIPE E CREDENCIAIS
- **Portal Público da Equipe**: Acesso exclusivo via URL com token: `/equipe/inscricao/:token`. Não exige login do usuário nem senha.
- **Gerador de Senha**: [security.ts](file:///home/diego-martins/docker/volei/src/lib/security.ts) (`generateRandomPassword()`).
- **Mensageria WhatsApp**: [whatsAppService.ts](file:///home/diego-martins/docker/volei/src/services/whatsAppService.ts) gera URL `https://api.whatsapp.com/send` contendo mensagem formatada com link do portal e credenciais.

---

## 5. Matriz UI × Backend × Persistência

| Funcionalidade | Código existe | UI existe | UI aparece | Ação funciona | Backend existe | Persiste DB | Teste | Status |
|---|---|---|---|---|---|---|---|---|
| **Criação de Competição Indoor** | Sim | Sim | Sim | Sim | Sim | Sim (`competitions`) | Sim | ✅ FUNCIONAL |
| **Edição de Status de Competição** | Sim | Sim | Sim | Sim | Sim | Sim (`competitions.status`) | Sim | ✅ FUNCIONAL |
| **Builder de Formato de Disputa** | Sim | Sim | Sim (na aba config) | Sim | Sim | Sim (`competitions.config`) | Sim | ✅ FUNCIONAL |
| **Cadastro de Equipe (Dados Básicos)** | Sim | Sim | Sim | Sim | Sim | Sim (`teams`) | Sim | ✅ FUNCIONAL |
| **Inscrição de Equipe na Competição** | Sim | Sim | Sim | Sim | Sim | Sim (`competition_teams`) | Sim | ✅ FUNCIONAL |
| **Cadastro de Atletas pela Equipe** | Sim | Sim | Sim (via token) | Sim | Sim | Sim (`competition_athletes`) | Sim | ✅ FUNCIONAL |
| **Geração de Token de Acesso** | Sim | Sim | Sim | Sim | Sim | Sim (`competition_teams.access_token`) | Sim | ✅ FUNCIONAL |
| **Envio de Convite via WhatsApp** | Sim | Sim | Sim | Sim | Sim (Front/URL) | N/A (Disparo externo) | Sim | ✅ FUNCIONAL |
| **Gerador de Senha (Sorteio em UI)** | Sim | Sim | Sim (dentro do modal) | Sim | Não | **NÃO** | Sim | ⚠️ PARCIAL |
| **Persistência da Senha do Gestor** | Não | Sim | Sim (input) | Não | Não | **NÃO** (descartada) | Sim (memória) | ❌ QUEBRADO |
| **Persistência de Contato/E-mail do Gestor** | Não | Sim | Sim (input) | Não | Não | **NÃO** (descartada) | Sim (memória) | ❌ QUEBRADO |
| **Login do Gestor via E-mail e Senha** | Sim (authService) | Sim (/login) | Sim | Não | Sim (Supabase Auth) | **NÃO** (usuário não é criado) | Sim (demo) | 🔌 DESCONECTADO |
| **Emissão de Súmulas Oficiais A4** | Sim | Sim | Sim | Sim | Sim (Client-PDF) | N/A (Gerador PDF) | Sim | ✅ FUNCIONAL |
| **Sorteio das Fases / Chaves** | Sim | Sim | Sim (/sorteio) | Sim | Sim | Sim (`draws`, `slots`) | Sim | ✅ FUNCIONAL |

---

## 6. Diagnóstico Detalhado do Cadastro de Equipe

### A. Fluxo Global (`/equipes` -> `TeamFormDialog`)
- **Campos visíveis**: Nome, Sigla, Modalidade, Cidade, Técnico, Escudo, Gestor, WhatsApp, E-mail, Senha de Acesso, Botão "Gerar Senha".
- **Problema de Usabilidade/Visualização**: O diálogo possui classe `max-h-[90vh] overflow-y-auto`. A seção 2 ("Gestor / Responsável e Acesso") fica localizada abaixo do corte da tela do modal. Usuários em telas convencionais ou notebooks precisam rolar o diálogo para baixo para enxergar o gerador de senha e os campos de contato.
- **Problema de Persistência no PostgreSQL**: Ao clicar em "Salvar Equipe", o payload enviado ao `dataAccess.createTeam()` contém todos os campos. Porém, `teamMapper.toPersistence()` descarta `manager_password`, `manager_name`, `manager_email`, `manager_phone`, `state`.
- **Efeito após refresh**: O backend retorna apenas as 9 colunas de `public.teams`. Ao recarregar a tela, a equipe aparece na listagem com "Sem gestor", "Sem contato" e "Senha de Acesso: —".

### B. Fluxo na Competição (`/competicoes/:id/inscricoes`)
- O botão primário "Cadastrar Equipe" abre `RegisterTeamInCompetitionDialog`.
- O botão secundário "Convidar Equipe" abre `InviteTeamDialog`, que não possui campo de senha nem de gestor (serve apenas para vincular agremiação pré-existente e definir data limite).
- O diálogo `RegisterTeamInCompetitionDialog` possui os campos completos, mas sofre do mesmo descarte de persistência no banco real.

---

## 7. Investigação Profunda do Gerador de Senha (Perguntas A a O)

### A. O gerador existe no código?
**SIM.** A função `generateRandomPassword()` existe e está exportada em [src/lib/security.ts](file:///home/diego-martins/docker/volei/src/lib/security.ts#L365).

### B. Onde está implementado?
Em `src/lib/security.ts` (linhas 365 a 371):
```typescript
export function generateRandomPassword(): string {
  const words = ['Volei', 'Ace', 'Bloqueio', 'Saque', 'Ponto', 'Quadra', 'Manchete', 'Levantamento'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}@${num}`;
}
```

### C. Qual componente deveria renderizá-lo?
1. [TeamsPage.tsx](file:///home/diego-martins/docker/volei/src/pages/TeamsPage.tsx) no diálogo `TeamFormDialog`.
2. [RegisterTeamInCompetitionDialog.tsx](file:///home/diego-martins/docker/volei/src/components/competition/dialogs/RegisterTeamInCompetitionDialog.tsx) na Seção 2 de Responsável.

### D. O componente está sendo importado?
**SIM.** Ambos os componentes importam `{ generateRandomPassword } from '@/lib/security'`.

### E. Está sendo renderizado?
**SIM, mas com ressalvas de visibilidade:**
- Ele está renderizado dentro dos respectivos diálogos.
- Porém, em `TeamsPage.tsx`, ele fica na segunda metade do formulário, exigindo rolagem vertical dentro do modal.
- No `InviteTeamDialog.tsx` (que também é um diálogo de convite de equipe), ele **NÃO** existe.

### F. Está condicionado por alguma variável?
No formulário de edição (`isEdit === true`), a senha inicial não é regenerada automaticamente a menos que o botão "Gerar Senha" seja explicitamente clicado. No cadastro novo, ele é pré-preenchido automaticamente.

### G. Alguma feature flag impede sua exibição?
**NÃO.** Não há feature flag bloqueando o campo.

### H. O formulário atual usa outro componente?
**SIM, existia duplicidade de fluxos:**
- O operador que tentava inscrever uma equipe dentro de uma competição podia clicar em "Convidar Equipe" (abrindo `InviteTeamDialog`, que não tem senha).
- Ou podia clicar em "Cadastrar Equipe" (que abre `RegisterTeamInCompetitionDialog`).

### I. O campo foi criado mas não foi integrado ao fluxo?
Ele foi integrado ao fluxo de tela e ao envio da mensagem do WhatsApp, mas **NÃO foi integrado ao fluxo de autenticação e banco de dados**.

### J. A senha é realmente gerada?
**SIM.** A string (ex: `Bloqueio@4821`) é gerada no estado React do formulário e repassada ao modal de sucesso e ao texto do WhatsApp.

### K. É persistida no Banco de Dados?
**NÃO.** A tabela física `public.teams` no PostgreSQL não possui coluna para senha. O PostgREST rejeita (`PGRST204: Could not find the 'manager_password' column of 'teams'`), forçando o `teamMapper.toPersistence()` a descartá-la antes do salvamento.

### L. É utilizada posteriormente?
**NÃO.** O sistema não armazena a senha em nenhuma tabela relacional, nem no Supabase Auth (`auth.users`). Quando o gestor acessa o sistema pelo link do portal (`/equipe/inscricao/:token`), o acesso é validado pelo token alfanumérico da URL, e o sistema **nunca solicita a senha**. Se o gestor tentar acessar `/login` e usar o e-mail e a senha informada, o Supabase Auth rejeita a autenticação porque o usuário inexiste na tabela `auth.users`.

### M. Existe apenas UI sem backend?
**SIM.** A senha do gestor é uma funcionalidade puramente visual/superficial no estado atual.

### N. Existe backend sem UI?
O Supabase Auth possui suporte nativo para criação de usuários via Admin API (`supabase.auth.admin.createUser`) ou signup, e a tabela `public.profiles` possui a coluna `role = 'team'` e `competition_team_id`. Porém, a UI do cadastro de equipe nunca aciona essa funcionalidade.

### O. Existe código morto/órfão?
- `InviteTeamDialog.tsx` é uma versão reduzida e incompleta de inscrição que concorre com `RegisterTeamInCompetitionDialog.tsx`.
- O campo `managerPassword` no tipo TypeScript `TeamRecord` é um campo fantasma que nunca persiste no backend PostgreSQL.

---

## 8. Funcionalidades Invisíveis no Sistema

1. **Gestão de Usuários do Tipo Equipe em `SettingsPage.tsx`**:
   - Em [SettingsPage.tsx](file:///home/diego-martins/docker/volei/src/pages/SettingsPage.tsx), existe uma aba completa de "Usuários do Sistema" com suporte a `SystemUser`, redefinição de senha e alteração de perfil (`organizer`, `team`, `referee`).
   - Porém, apenas usuários criados manualmente pelo administrador aparecem lá; as equipes cadastradas no torneio nunca são convertidas em `SystemUser`.
2. **Histórico de Auditoria Operacional na UI**:
   - O serviço [operationalAuditService.ts](file:///home/diego-martins/docker/volei/src/services/operationalAuditService.ts) e a tabela `public.audit_logs` gravam logs detalhados de transições de fase e alterações de regras, mas não há tela dedicada no menu principal para o operador consultar o log de auditoria visualmente.
3. **Editor de Documentos (`DocumentEditorPage.tsx`)**:
   - A rota `/documentos/editor` está registrada em `src/App.tsx`, mas não há link visível no menu lateral (Sidebar) para acesso direto pelo operador.

---

## 9. Funcionalidades Quebradas com Evidências

### Falha 1: Descarte de Credenciais e Dados de Contato no PostgreSQL
- **Ação**: Cadastrar equipe informando E-mail (`gestor@equipe.com`), Telefone (`(31) 98765-4321`) e Senha (`Volei@4821`).
- **Resultado Esperado**: Dados salvos no banco e persistidos após refresh.
- **Resultado Real**: `teamMapper.toPersistence()` descarta os campos. No banco `public.teams`:
  ```sql
  SELECT id, name, short_name, modality, coach_name, city, logo_url FROM public.teams WHERE name = 'DIEGO volei';
  ```
  Colunas de gestor e senha não existem. Ao dar F5, o card da equipe exibe "Sem gestor" e "Sem contato".
- **Evidência no PostgREST**: Tentativa de enviar `manager_password` retorna erro `400`:
  `{"code":"PGRST204","message":"Could not find the 'manager_password' column of 'teams' in the schema cache"}`.

### Falha 2: Impossibilidade de Login para o Gestor da Equipe
- **Ação**: O gestor recebe a mensagem do WhatsApp:
  `👤 Usuário / Login: gestor@equipe.com`
  `🔑 Senha de Acesso: Bloqueio@4821`
  E tenta efetuar login na rota `/login`.
- **Resultado Esperado**: Login efetuado com perfil de equipe direcionando ao portal.
- **Resultado Real**: Erro `400 Invalid login credentials`. O usuário nunca foi criado em `auth.users` nem em `public.profiles`.

### Falha 3: Competições sem Prazo Padrão Quebravam a Inscrição Silenciosamente
- **Ação**: Tentar inscrever equipe em competição criada sem `default_deadline`.
- **Resultado Real**: O diálogo bloqueava a submissão porque `competition.defaultDeadline` estava nulo no banco. (Mitigado na Fase 8.6.2 via auto-regularização em `RegisterTeamInCompetitionDialog.tsx`, mas ausente no `InviteTeamDialog.tsx`).

---

## 10. Funcionalidades Parcialmente Implantadas

1. **Auto-Inscrição de Equipes (`/equipe/inscricao/:token`)**:
   - Funciona perfeitamente para adicionar atletas, validar elenco e emitir boletins.
   - Porém, depende exclusivamente do token na URL. Não possui autenticação por senha nem vínculo com sessão de usuário.
2. **Guia de Ação Contextual (`CompetitionActionGuideCard`)**:
   - Sugere os próximos passos da competição (ex: "Cadastrar equipes", "Definir grupos", "Iniciar jogos").
   - Totalmente implementado no código e com testes, mas sua integração em páginas secundárias ainda é parcial.
3. **Súmulas Oficiais A4**:
   - Gerador PDF canônico de 3 e 5 sets totalmente funcional via document-engine.
   - A emissão em lote funciona perfeitamente, mas a visualização individual exige partida com chaveamento gerado.

---

## 11. Análise da Suíte de Testes (1.159 Testes vs Realidade)

| Categoria de Teste | Quantidade Aprox. | Ambiente de Execução | Valida Backend Real? | Observações |
|---|---|---|---|---|
| **Unitários Puros** | ~550 testes | Vitest (Node/jsdom) | ❌ Não | Testam regras de desempate, pontuação FIVB, mappers e strings. Não tocam em rede ou banco. |
| **Integração de Serviços com LocalStorage** | ~400 testes | Vitest (jsdom) | ❌ Não | Testam `registrationService`, `standingsService` e `lifecycle` gravando no mock de `localStorage`. |
| **Componentes de UI** | ~120 testes | Vitest + Testing Library | ❌ Não | Renderizam componentes isolados com mocks do `dataAccess`. |
| **E2E e Homologação de Backend Real** | ~40 testes | Vitest com Supabase Local | ⚠️ Parcial | Arquivos como `fase86E2EHomologation.test.ts` e `fase83OperationalFlow.test.ts` executam chamadas autenticadas reais no PostgreSQL. |

**Conclusão sobre os Testes**: Ter 1.159 testes passando transmite uma **falsa sensação de prontidão operacional**. Os testes unitários comprovam a lógica algorítmica do voleibol (sets, desempate, súmula), mas não cobrem a integração entre formulários reais, PostgREST, RLS e autenticação Supabase.

---

## 12. Classificação dos Problemas por Prioridade

### P0 — BLOQUEADOR
- **Nenhum P0 no momento para o fluxo de visualização básica**: O sistema carrega, navega, permite criar competição, gerar chaves e emitir súmulas no ambiente local.

### P1 — CRÍTICO (Quebras de Integração e Autenticação)
- **P1.1 — Descarte de credenciais do gestor**: As senhas geradas e dados de contato informados nos cadastros de equipe não são salvos em nenhuma tabela do PostgreSQL e são descartados por `teamMapper.toPersistence()`.
- **P1.2 — Inexistência de conta de usuário para equipes**: As mensagens de WhatsApp instruem o gestor a fazer login com Usuário e Senha, mas o usuário não é registrado no Supabase Auth (`auth.users`), tornando o login impossível.

### P2 — ALTO (Inconsistência de Fluxo e Usabilidade)
- **P2.1 — Duplicidade de diálogos de inscrição**: Existência simultânea de `InviteTeamDialog` (sem senha nem dados de gestor) e `RegisterTeamInCompetitionDialog` (com dados de gestor).
- **P2.2 — Rolagem oculta no modal de criação de equipes**: Em `TeamsPage.tsx`, a Seção 2 de credenciais fica escondida abaixo da dobra da tela do modal sem indicação visual evidente para operadores novatos.

### P3 — MÉDIO (Consistência de Dados e Limpeza)
- **P3.1 — Seed do banco local sem atletas para equipes padrão**: As agremiações `team-1` a `team-8` em `comp-toledo-2026` possuem 0 atletas no banco PostgreSQL real, embora no Modo Demo houvesse 14 atletas por equipe.
- **P3.2 — Modalities 404**: Endpoint legado `/rest/v1/modalities` não deve ser chamado pelo frontend (mitigado no código, mas precisa de monitoramento).

### P4 — BAIXO (Polimento e Documentação)
- **P4.1 — Links de rotas de documentação**: Falta de atalho na sidebar para o editor de documentos.

---

## 13. Causa Provável dos Problemas

A causa raiz de todos os problemas identificados foi o **desenvolvimento em Modo Demo (LocalStorage) sem validação contra o schema físico do PostgreSQL**:
1. No LocalStorage, objetos JavaScript aceitam qualquer chave dinâmica (`managerPassword`, `managerEmail`, `managerPhone`).
2. O código de UI e os testes foram construídos assumindo essa flexibilidade.
3. Ao ligar o Supabase real, o PostgREST barrou as colunas inexistentes com erro `PGRST204`.
4. A solução imediata aplicada anteriormente foi filtrar as colunas no mapper (`teamMapper.toPersistence()`), o que eliminou o erro 400, mas gerou o efeito colateral de **perder todos os dados de credenciais e contato silenciosamente**.

---

## 14. Plano de Correção Recomendado (Apenas Planejamento — Não Implementar)

A correção deve ser realizada estritamente na seguinte ordem sequencial em fases futuras:

1. **Decisão Arquitetural de Acesso da Equipe**:
   - *Opção A (Recomendada para agilidade operacional)*: Assumir oficialmente que o acesso da equipe é **exclusivamente por Token Seguro via Link (/equipe/inscricao/:token)**. Remover campos fictícios de senha da UI de equipes e atualizar as mensagens de WhatsApp para enviar o link direto com token (que já funciona 100% no banco real).
   - *Opção B (Autenticação Completa com Login)*: Criar migration adicionando função RPC/Edge Function que cria o usuário em `auth.users`, insere o perfil correspondente em `public.profiles` com `role = 'team'` e vincula o `competition_team_id`.
2. **Unificação dos Diálogos de Inscrição**:
   - Descontinuar o `InviteTeamDialog.tsx` e padronizar toda inscrição de equipes via `RegisterTeamInCompetitionDialog.tsx`.
3. **Seed Real de Atletas no Banco de Homologação**:
   - Executar script SQL no PostgreSQL inserindo os elencos reais para `team-1` a `team-8` na competição `comp-toledo-2026`.

---

## 15. Veredito Oficial

### **NO-GO — O sistema não está pronto para homologação funcional de ponta a ponta.**

**Justificativa Técnica**:
Embora o motor de competições, regras FIVB, construtor de formatos e emissão de súmulas estejam matematicamente corretos e com testes aprovados, o fluxo de credenciais de acesso de equipes é ilusório: as senhas geradas não são persistidas no banco e o login prometido nas mensagens de WhatsApp falha categoricamente. O sistema só poderá receber o status **GO** após a consolidação definitiva da arquitetura de acesso das equipes (Token Único vs Supabase Auth).

---
*Relatório emitido pela Auditoria Técnica BaseOS — Fase 8.6.3.*
