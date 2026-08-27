# BASEOS — MASTER FRONTEND AUDIT
## 07. Auditoria da Camada de Componentes (Component Audit)

---

## 1. INVENTÁRIO DA CAMADA DE COMPONENTES DO BASEOS

A estrutura de componentes em `src/components/` está dividida em 14 pastas por domínio:

```text
src/components/
├── ui/              # 49 primitivos shadcn/ui (Radix UI + CVA + Tailwind)
├── competition/     # 6 componentes (Header, Progress, Readiness, StandingsTable, Bracket, PendingTasks)
├── match/           # 10 componentes (BlankSheet, MatchSheetEmit, CourtLineupDnd, LiveScorer, Scoreboard, etc.)
├── match-sheet/     # 1 componente (MatchSheetInterface - súmula interativa de 717 linhas)
├── draw/            # 1 componente (LiveDrawModal)
├── help/            # 3 componentes (ContextualHelpButton, HelpArticleModal, HelpArticleViewer)
├── layout/          # 5 componentes (Header, Sidebar, MainLayout, DashboardShell, DemoModeBanner)
├── registration/    # 4 componentes (AthleteFormModal, InviteTeamDialog, PublicShell, TeamCreatedShareDialog)
├── report/          # 1 componente (ReportPreviewDialog)
├── auth/            # 3 componentes (AuthContext, RequireAuth, InactivityTimeoutModal)
├── common/          # 2 componentes (BaseOsLogo, ConfirmActionDialog)
├── pwa/             # 2 componentes (NotificationsMenu, PwaInstallButton)
└── theme/           # 1 componente (ThemeProvider)
```

---

## 2. ANÁLISE DE COMPONENTES MONOLÍTICOS

Foram identificados 4 arquivos que acumulam responsabilidades excessivas, ultrapassando 700 a 1.300 linhas de código:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. src/pages/SettingsPage.tsx (1.340 linhas)                           │
│    - Gestão de RBAC, CRUD de usuários, logs de segurança, exportação   │
│      de backup e formulários de personalização no mesmo arquivo.       │
├────────────────────────────────────────────────────────────────────────┤
│ 2. src/pages/MatchesPage.tsx (1.278 linhas)                            │
│    - Filtros múltiplos, 5 modais inline, regras de avanço de playoffs,│
│      tabela de classificação embutida e verificação de conflitos.      │
├────────────────────────────────────────────────────────────────────────┤
│ 3. src/pages/CompetitionsPage.tsx (1.194 linhas)                       │
│    - Ciclo de vida completo, chaveamento, formulário de regulamento,   │
│      cálculo de 8 critérios de desempate e pódio na mesma página.      │
├────────────────────────────────────────────────────────────────────────┤
│ 4. src/components/match-sheet/MatchSheetInterface.tsx (717 linhas)     │
│    - Cronômetro de tempo técnico, rotações de quadra 1-6, histórico de │
│      pontos e geração de dados do PDF num único componente.            │
└────────────────────────────────────────────────────────────────────────┘
```

> **Recomendação**: Decompor esses arquivos em sub-componentes modulares organizados por pastas de domínio (ex: `src/components/settings/RbacManager.tsx`, `src/components/match/ScheduleMatchDialog.tsx`).

---

## 3. COMPONENTES DUPLICADOS OU COM SOBREPOSIÇÃO

| Domínio / Função | Componente A | Componente B | Diagnóstico & Oportunidade |
| :--- | :--- | :--- | :--- |
| **Emissão de Súmulas** | `BlankSheetEmitDialog.tsx` | `MatchSheetEmitDialog.tsx` | Ambos abrem diálogos para emitir súmulas (em branco vs preenchida com equipes). Devem ser unificados num único componente `ScoresheetEmitModal` com opção de alternar modo. |
| **Diálogos de Confirmação** | `ConfirmActionDialog.tsx` | `AlertDialog` cru nas páginas | `ConfirmActionDialog` é excelente e reutilizável, mas páginas como `TeamsPage` e `VenuesPage` reescrevem o `AlertDialog` do zero. |
| **Tabela de Classificação** | `StandingsTable.tsx` | Tabelas inline em `MatchesPage` e `TeamRosterRegistrationPage` | A lógica de exibição de classificação é reescrita inline em duas telas em vez de reaproveitar o componente oficial `StandingsTable`. |
| **Cadastro de Oficiais** | `PeoplePage.tsx` | `RefereesPage.tsx` | Ambas telas gerenciam pessoas com perfil de árbitro. Devem ser consolidadas na interface unificada de Recursos Humanos de `PeoplePage.tsx`. |

---

## 4. OPORTUNIDADE: COMPONENTES UNIVERSAIS COMPARTILHADOS

Para atender às regras de ouro da skill `baseos-frontend` e `baseos-design-system`, recomenda-se a criação de 3 componentes universais compartilhados:

1. **`<StateContainer />` (Universal State Pattern)**:
   - Componente que recebe `loading`, `error`, `empty` (booleano ou array vazio) e renderiza de forma consistente:
     - `loading`: `<Skeleton className="h-64 rounded-xl" />`
     - `error`: Card de erro com mensagem amigável e botão "Tentar Novamente".
     - `empty`: Mensagem customizada e botão de ação primária (CTA).
2. **`<PageHeader />`**:
   - Cabeçalho padronizado contendo Título, Subtítulo, Trilha de Breadcrumbs e Ações Primárias/Secundárias à direita.
3. **`<SportsScoreBadge />`**:
   - Badge com `tabular-nums`, borda semântica e suporte a parciais de sets no formato oficial FIVB (ex: `25-21, 22-25, 15-12`).
