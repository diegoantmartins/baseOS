# BASEOS — FRONTEND TRANSFORMATION BLUEPRINT
## 10. Roteiro de Implementação em 14 Fases (Implementation Roadmap)

---

Abaixo está o plano detalhado de execução sequencial dividido em 14 fases estruturadas para garantir **zero regressão funcional e preservação de 100% dos testes unitários**.

---

### FASE 0 — Design Foundation & Token Cleanup
- **Objetivo**: Estabilizar os tokens de design, remover variáveis CSS fantasmas e fixar a escala de border radius.
- **Arquivos**: `src/index.css`, `tailwind.config.ts`, `src/components/ui/button.tsx`.
- **Componentes**: Primitivos de botão, input e tokens semânticos.
- **Dependências**: Nenhuma.
- **Risco**: Baixo.
- **Testes**: `npm run lint` && `npx tsc --noEmit`.

---

### FASE 1 — Navigation & Layout Unification
- **Objetivo**: Unificar a navegação em `MainLayout.tsx`, estruturar os 5 grupos da `Sidebar.tsx`, criar `<BreadcrumbNav />` e resgatar as rotas `/modalidades` e `/documentos/editor`.
- **Arquivos**: `src/components/layout/MainLayout.tsx`, `Header.tsx`, `Sidebar.tsx`, `BreadcrumbNav.tsx`, `src/App.tsx`.
- **Risco**: Médio (Garantir que todas as rotas ativas continuem acessíveis).
- **Testes**: Navegação manual e verificação de rotas com `npm test`.

---

### FASE 2 — Core Universal Components
- **Objetivo**: Implementar os blocos universais de interface: `<StateContainer />` (Loading, Empty, Error), `<PageHeader />` e `<SportsScoreBadge />`.
- **Arquivos**: `src/components/common/StateContainer.tsx`, `PageHeader.tsx`, `SportsScoreBadge.tsx`.
- **Risco**: Baixo.
- **Testes**: Criação de testes unitários para o `StateContainer`.

---

### FASE 3 — Dashboard & Visão Geral
- **Objetivo**: Redesenhar a página `/dashboard` (`Index.tsx`), conectando KPIs reais a `dataAccess` e integrando ao `MainLayout`.
- **Arquivos**: `src/pages/Index.tsx`, `src/components/dashboard/Dashboard.tsx`, desativação segura de `DashboardShell.tsx`.
- **Risco**: Baixo.
- **Testes**: `npm test`.

---

### FASE 4 — Competitions (Ciclo de Vida & Gestão)
- **Objetivo**: Decompor `CompetitionsPage.tsx` em sub-componentes (Stepper de ciclo de vida, abas modulares de chaveamento e regulamento).
- **Arquivos**: `src/pages/CompetitionsPage.tsx`, `src/components/competition/*`.
- **Risco**: Médio (Preservar transição de status em `competitionLifecycleService.ts`).
- **Testes**: Suíte de testes de ciclo de vida de campeonatos.

---

### FASE 5 — Teams & Athletes (Elencos & Transferências)
- **Objetivo**: Aprimorar visualização dual (Grid/Tabela), gestão de camisas únicas (1-99), capitão e líberos e modal de transferência.
- **Arquivos**: `src/pages/TeamsPage.tsx`, `src/pages/AthletesPage.tsx`, `src/components/registration/*`.
- **Risco**: Médio (Preservar regras de duplicidade em `registrationService.ts`).
- **Testes**: `src/test/registrationService.test.ts`.

---

### FASE 6 — Matches (Partidas & Calendário)
- **Objetivo**: Decompor `MatchesPage.tsx`, extraindo diálogos inline (`ScheduleMatchDialog`, `EditResultDialog`) e integrando detecção de conflitos.
- **Arquivos**: `src/pages/MatchesPage.tsx`, `src/components/match/*`.
- **Risco**: Alto (Preservar persistência de sets e chaveamento).
- **Testes**: `src/test/scheduleConflictService.test.ts`.

---

### FASE 7 — Standings & Chaveamento (Mata-Mata)
- **Objetivo**: Padronizar a exibição da tabela de classificação com `tabular-nums` e tooltips dos 8 critérios FIVB/CBV.
- **Arquivos**: `src/components/competition/StandingsTable.tsx`, `TournamentBracket.tsx`.
- **Risco**: Baixo.
- **Testes**: `src/test/standingsService.test.ts`.

---

### FASE 8 — Match Sheets (Súmulas Digitais & Mesa do Apontador)
- **Objetivo**: Refinar a mesa do apontador ao vivo, escalação DND de quadra e unificar os diálogos de emissão de súmulas em PDF.
- **Arquivos**: `src/pages/MatchSheetPage.tsx`, `src/components/match-sheet/*`, `src/components/match/CourtLineupDnd.tsx`.
- **Risco**: Médio (Preservar motor de renderização PDF A4 P&B).
- **Testes**: Testes de geração de súmula oficial.

---

### FASE 9 — Settings & Segurança (RBAC & Auditoria)
- **Objetivo**: Modularizar `SettingsPage.tsx` em abas independentes de Usuários/Permissões, Logs de Auditoria e Backups.
- **Arquivos**: `src/pages/SettingsPage.tsx`, `src/components/settings/*`.
- **Risco**: Baixo.
- **Testes**: `src/test/authService.test.ts`.

---

### FASE 10 — Mobile & Bottom Navigation
- **Objetivo**: Implementar a barra de navegação inferior fixa para smartphones e conversão de tabelas em cards sanfonados.
- **Arquivos**: `src/components/layout/BottomNav.tsx`, ajustes de breakpoints CSS.
- **Risco**: Baixo.
- **Testes**: Validação em viewports de 375px, 414px e 768px.

---

### FASE 11 — Acessibilidade WCAG 2.1 AA
- **Objetivo**: Inserir `aria-label` em todos os botões de ícone, elevar contraste de legendas para 4.5:1 e configurar `aria-live` em placares.
- **Arquivos**: Todos os componentes de UI e páginas.
- **Risco**: Baixo.
- **Testes**: Auditoria com leitor de tela e verificação de foco de teclado.

---

### FASE 12 — Performance & Code-Splitting
- **Objetivo**: Implementar `React.lazy` e `Suspense` em todas as rotas de `App.tsx` e configurar `manualChunks` no Vite, reduzindo o bundle inicial de 4MB para < 350kB.
- **Arquivos**: `src/App.tsx`, `vite.config.ts`.
- **Risco**: Médio (Testar carregamento assíncrono de rotas em staging).
- **Testes**: `npm run build` e análise de tamanho de chunks.

---

### FASE 13 — Final Polish & End-to-End Verification
- **Objetivo**: Ajustes finos de micro-interações (150ms), validação geral de não-regressão e execução da suíte completa de testes.
- **Arquivos**: Todo o projeto.
- **Risco**: Baixo.
- **Testes**: `npx tsc --noEmit && npm run lint && npm test && npm run build`.
