# Walkthrough — Fase 10: Portal Unificado por Perfil (`/portal`) e Portal da Equipe

## 1. Visão Geral e Objetivo

A **Fase 10** introduziu a porta de entrada única `/portal` e o **Portal da Equipe** (`/portal/equipe`), garantindo que gestores de equipe (`role = 'team'`) tenham uma experiência totalmente dedicada, isolada do painel administrativo, sem menus globais, sem vazamento de dados de outras equipes e sem duplicidade de regras de negócio.

A implementação foi realizada **estritamente no ambiente de desenvolvimento local**, sem qualquer acesso SSH, deploy, migrations remotas ou alteração na VPS de produção VOLTZ (`voltz.baseos.online`).

---

## 2. Princípios e Ajustes Críticos Implementados

Em conformidade direta com a revisão arquitetural aprovada, três ajustes fundamentais foram rigorosamente observados:

### 2.1. Redirecionamento Direto aos Sistemas Existentes (Sem Duplicar Admin/Arbitragem)
- Não foram criadas rotas ou páginas paralelas como `/portal/admin` ou `/portal/arbitragem`.
- A rota `/portal` inspeciona o perfil autenticado (`session.user.role`) e despacha:
  - `team` $\rightarrow$ `/portal/equipe`
  - `admin` | `organizer` $\rightarrow$ `/dashboard` (sistema administrativo existente)
  - `referee` | `scorer` $\rightarrow$ `/jogos` (sistema de arbitragem e súmula existente)
  - Não autenticado $\rightarrow$ `/login?from=/portal` (preserva intenção de navegação)

### 2.2. Preservação de `/equipe/:token` e Convites Legados
- A rota `/equipe/:token` (e `/equipe/inscricao/:token`) continua funcionando como a porta de entrada original para convites e cadastro de elenco da equipe.
- O fluxo de inscrição por convite foi integralmente preservado em `TeamRosterRegistrationPage`. Uma vez que o gestor se autentica e possui sessão ativa vinculada ao seu `competitionTeamId`, ele opera pelo `/portal/equipe`.

### 2.3. Não Duplicação de Lógica ou Dados ("Single Source of Truth")
- **Elenco e Inscrição:** Reutiliza `AthleteFormModal`, validações do `registrationService` e chamadas a `dataAccess` (`listCompetitionAthletes`, `createCompetitionAthlete`, `updateCompetitionAthlete`, `deleteCompetitionAthlete`).
- **Jogos e Resultados:** Reutiliza `listMatches` via `dataAccess` e `generateMatchesBoletimPdf`.
- **Classificação:** Reutiliza o motor oficial `computeStandingsByGroup` de `standingsService.ts`.
- **Emissão de Documentos:** Reutiliza `generateTeamRosterReportPdf` para súmulas/relatórios oficiais da equipe em PDF.
- O portal de equipe opera sob um layout de visualizações integradas (`TeamPortalLayout` $\rightarrow$ `TeamPortalPage` com abas), consumindo o contexto seguro derivado de `competitionTeamId`.

---

## 3. Arquitetura de Componentes Criada

```
                                /portal
                                   │
                         PortalRouter (Auth)
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
              team          admin/organizer     referee/scorer
                │                  │                  │
                ▼                  ▼                  ▼
          /portal/equipe       /dashboard           /jogos
                │
         TeamPortalGuard (valida role === 'team' + competitionTeamId)
                │
         TeamPortalLayout (TopBar exclusiva: logotipo, badge da equipe, abas)
                │
                ├── Início (Resumo, métricas rápidas, atalhos)
                ├── Meu Elenco (Gestão de atletas, camisas, líberos, PDF oficial)
                ├── Jogos (Partidas da equipe, placares, boletim em PDF)
                ├── Classificação (Tabela oficial do grupo da equipe via standingsService)
                └── Avisos (Comunicados gerais da competição)
```

### 3.1. Arquivos Desenvolvidos

1. **`src/components/portal/PortalRouter.tsx`:**
   - Componente de despacho inteligente.
   - Resolve o role do usuário autenticado e efetua redirecionamento com `replace: true`.

2. **`src/components/portal/useTeamPortal.ts`:**
   - Define a interface `TeamContextValue` e o hook `useTeamPortal()`.
   - Isola o estado da equipe selecionada a partir da sessão (`competitionTeamId`).

3. **`src/components/portal/TeamPortalGuard.tsx`:**
   - Protege a árvore `/portal/equipe/*`.
   - Bloqueia acessos sem sessão (redireciona para `/login?from=/portal/equipe`).
   - Bloqueia outros papéis: redireciona `admin`/`organizer` para `/dashboard`, e `referee`/`scorer` para `/jogos`.
   - Se `session.user.role === 'team'`, valida `competitionTeamId`. Se ausente, exibe tela informativa segura sem vazar dados.
   - Carrega `competitionTeam` e `competition` via `dataAccess`.

4. **`src/components/portal/TeamPortalLayout.tsx`:**
   - Layout Dark SaaS dedicado para o Gestor de Equipe.
   - Cabeçalho minimalista sem menus administrativos globais (sem link para competições, ginásios, usuários, etc.).
   - Badges visuais: Nome da Equipe, Organização/Competição e Perfil do Usuário.
   - Navegação por abas: *Início*, *Meu Elenco*, *Jogos*, *Classificação*, *Avisos*.
   - Botão de logout seguro com encerramento de sessão.

5. **`src/pages/portal/TeamPortalPage.tsx`:**
   - View unificada que alterna o conteúdo de acordo com a aba ativa (`?tab=inicio|elenco|jogos|classificacao|avisos`).
   - Operações de elenco utilizam diretamente `AthleteFormModal`.
   - Operações de leitura consomem `dataAccess` filtrado pelo `competitionTeamId`.

6. **`src/components/auth/RequireAuth.tsx` (Atualizado):**
   - Atualizado para redirecionar usuários `role = 'team'` que tentarem acessar rotas administrativas (`/dashboard`, `/jogos`, etc.) diretamente para `/portal/equipe`.
   - Redireciona árbitros/mesários não autorizados em rotas admin para `/jogos`.

7. **`src/App.tsx` (Atualizado):**
   - Registradas as rotas `/portal`, `/portal/equipe`, `/portal/equipe/*`.
   - Registrada a rota `/equipe/:token` ao lado de `/equipe/inscricao/:token` para retrocompatibilidade total com convites.

---

## 4. Garantias de Segurança e Isolamento

### 4.1. Imunidade à Manipulação de URL (Anti-IDOR)
O contexto de equipe **não** é extraído de parâmetros da URL (`params.teamId`). Ele é estritamente obtido de `session.user.competitionTeamId`, que por sua vez foi injetado pelo Supabase Auth / JWT e validado pelas policies RLS da base de dados (`competition_teams_team_select_own`, `competition_athletes_team_all`). Qualquer tentativa de digitar `/portal/equipe?id=outro` não surte efeito sobre os dados renderizados.

### 4.2. Isolamento de Estado e Cache na Troca de Usuários
Quando o Gestor A faz logout e o Gestor B faz login:
- O estado em memória do `TeamPortalGuard` é redefinido pelo `key={session?.user?.id}` e pelo ciclo de vida do `useAuth`.
- Nenhuma informação de atletas, jogos ou pontuação da Equipe A persiste na sessão da Equipe B.
- Testado especificamente na suíte automatizada.

---

## 5. Suíte de Testes Automatizados

Foi criada a suíte dedicada `src/test/portalRoutingAndSecurity.test.ts` com **42 testes unitários e de integração** cobrindo:

1. **Roteamento do Portal Central (`/portal`):**
   - Redirecionamento de `team` para `/portal/equipe`.
   - Redirecionamento de `admin` e `organizer` para `/dashboard`.
   - Redirecionamento de `referee` e `scorer` para `/jogos`.
   - Redirecionamento de usuário não autenticado para `/login?from=/portal`.
2. **Guarda do Portal da Equipe (`TeamPortalGuard`):**
   - Bloqueio de usuário deslogado com redirecionamento preservando rota.
   - Redirecionamento profilático de administradores para `/dashboard`.
   - Redirecionamento de árbitros para `/jogos`.
   - Bloqueio amigável para usuário `team` sem `competitionTeamId` vinculado.
   - Carregamento e renderização com sucesso quando `team` e `competitionTeamId` válidos.
3. **Barreira `RequireAuth` Administrativa:**
   - Bloqueio de `team` em `/dashboard` $\rightarrow$ redireciona para `/portal/equipe`.
   - Bloqueio de `team` em `/jogos` $\rightarrow$ redireciona para `/portal/equipe`.
   - Redirecionamento de `referee` em rotas exclusivamente admin $\rightarrow$ `/jogos`.
4. **Preservação de Rotas Públicas e Convites:**
   - `/equipe/:token` e `/equipe/inscricao/:token` acessíveis publicamente.
   - Rotas de tabela e súmula pública permanecem inalteradas.
5. **Prevenção de IDOR e Troca de Contas:**
   - Validação de que parâmetros estranhos na URL não alteram o `competitionTeamId` do contexto.
   - Teste de troca de contas (Team A $\rightarrow$ logout $\rightarrow$ Team B login) garantindo contexto e estado isolados.

---

## 6. Resultados da Validação de Qualidade

Todas as verificações oficiais do projeto foram executadas e aprovadas com sucesso:

| Verificação | Comando | Resultado | Status |
| :--- | :--- | :--- | :---: |
| **Typecheck** | `npx tsc -p tsconfig.app.json --noEmit` | 0 erros | 🟢 APROVADO |
| **Linting** | `npm run lint` | 0 erros (1 warning preexistente) | 🟢 APROVADO |
| **Testes Unitários** | `npm test` | **122/122 arquivos, 1.256/1.256 testes passando** | 🟢 APROVADO |
| **Build de Produção** | `npm run build` | Bundles Vite compilados com sucesso | 🟢 APROVADO |

---

## 7. Declaração Formal de Segurança e Não Intervenção em Produção

Atesta-se formalmente que:
1. **Zero acesso à infraestrutura VOLTZ:** Nenhuma conexão SSH, requisição administrativa ou manipulação remota foi realizada na VPS ou no domínio `voltz.baseos.online`.
2. **Zero migrations em produção:** Todas as alterações desta fase são puramente a nível de aplicação frontend e testes no ambiente de desenvolvimento local.
3. **Zero impacto no Portal Público:** Nenhuma rota pública ou fluxo de consulta de campeonatos/tabelas foi afetado.
