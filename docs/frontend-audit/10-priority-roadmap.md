# BASEOS — MASTER FRONTEND AUDIT
## 10. Roteiro Estratégico de Implementação & Roadmap (Priority Roadmap)

---

## 1. PRINCÍPIO DE EXECUÇÃO EM LOTES (NÃO-REGRESSÃO)

Conforme estabelecido nas diretrizes das skills `baseos-frontend` e `baseos-audit`, qualquer trabalho futuro de refatoração ou redesign no BaseOS **NÃO deve refazer o sistema do zero**, mas sim executar transformações graduais em lotes incrementais com validação automatizada contínua:

```bash
# Comandos de Validação Obrigatórios a Cada Etapa:
npx tsc -p tsconfig.app.json --noEmit   # 0 erros de TypeScript
npm run lint                            # 0 erros de ESLint
npm test                                # 248 testes Vitest passando
npm run build                           # Build Vite de produção concluído
```

---

## 2. ROADMAP ESTRATÉGICO DE 5 FASES

```text
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 1: FUNDAMENTOS & DESIGN SYSTEM                                    │
│ Tokens semânticos, limpeza de variáveis legadas, componentes de estado │
├────────────────────────────────────────────────────────────────────────┤
│ FASE 2: ARQUITETURA DE NAVEGAÇÃO                                       │
│ Unificação Header/Sidebar, breadcrumbs, bottom nav e resgate de rotas  │
├────────────────────────────────────────────────────────────────────────┤
│ FASE 3: DESACOPLAMENTO DE PÁGINAS CORE                                  │
│ Modularização de MatchesPage, CompetitionsPage, TeamsPage e Atletas    │
├────────────────────────────────────────────────────────────────────────┤
│ FASE 4: OPERAÇÃO ESPORTIVA & SÚMULAS                                   │
│ Mesa do apontador ao vivo, unificação de emissão e editor de templates │
├────────────────────────────────────────────────────────────────────────┤
│ FASE 5: PERFORMANCE, ACESSIBILIDADE & POLISH                           │
│ Code-splitting com React.lazy, conformidade WCAG AA e microinterações  │
└────────────────────────────────────────────────────────────────────────┘
```

---

### FASE 1 — FUNDAMENTOS & DESIGN SYSTEM
- **Objetivo**: Estabilizar os alicerces visuais e tokens de interface.
- **Entregas**:
  1. `[P1]` **Limpeza de Tokens Legados**: Remover referências fantasmas a `--beach` e `--indoor` em `StatisticsPage.tsx` e `PublicShell.tsx`.
  2. `[P1]` **Criação do `<StateContainer />` Universal**: Padronizar os 4 estados obrigatórios (Normal, Skeleton Loading, Empty State com CTA e Error State com retry amigável).
  3. `[P2]` **Padronização de Border Radius**: Unificar `rounded-md` (8px) para botões/inputs e `rounded-xl` (12px) para cards e modais.
  4. `[P2]` **Padronização de Variantes de Botão**: Alinhar variantes no `button.tsx` eliminando estilos manuais soltos nas telas.

---

### FASE 2 — ARQUITETURA DE NAVEGAÇÃO & LAYOUT
- **Objetivo**: Garantir que o usuário nunca se perca e acesse todas as funcionalidades com rapidez.
- **Entregas**:
  1. `[P1]` **Unificação dos Menus**: Alinhar itens entre `Header.tsx` e `Sidebar.tsx`, corrigindo o ícone de Pessoas e adicionando `/sorteio` e `/estatisticas` no menu superior.
  2. `[P1]` **Resgate de Rotas Órfãs**:
     - Registrar `/documentos/editor` em `App.tsx` apontando para `DocumentEditorPage.tsx`.
     - Inserir link para `/modalidades` no submenu de Cadastros.
  3. `[P2]` **Implementação de Breadcrumbs**: Adicionar componente `<BreadcrumbNav />` no topo de todas as páginas filhas (`/sumulas/:id`, `/sorteio/:id`, `/competicoes/:id/inscricoes`).
  4. `[P2]` **Bottom Navigation Bar em Mobile**: Criar barra de navegação inferior fixa para smartphones.

---

### FASE 3 — DESACOPLAMENTO E REFATORAÇÃO DE PÁGINAS CORE
- **Objetivo**: Decompor arquivos monolíticos de mais de 1.000 linhas em módulos reutilizáveis e testáveis.
- **Entregas**:
  1. `[P1]` **Modularização de `MatchesPage.tsx`**: Extrair `ScheduleMatchDialog`, `EditResultDialog` e filtros para `src/components/match/`.
  2. `[P1]` **Modularização de `CompetitionsPage.tsx`**: Isolar modais de regulamento e chaveamento em sub-componentes.
  3. `[P2]` **Modularização de `SettingsPage.tsx`**: Separar abas em `RbacSettings`, `AuditLogsTable` e `BackupManager`.
  4. `[P2]` **Reutilização de `StandingsTable.tsx`**: Substituir tabelas inline em `MatchesPage` e `TeamRosterRegistrationPage` pelo componente oficial.

---

### FASE 4 — OPERAÇÃO ESPORTIVA & SÚMULAS
- **Objetivo**: Elevar a experiência do apontador e dos operadores de mesa de quadra.
- **Entregas**:
  1. `[P1]` **Unificação de Diálogos de Súmula**: Integrar `BlankSheetEmitDialog` e `MatchSheetEmitDialog` em um modal coeso com alternância de tipo.
  2. `[P2]` **Números Tabulares em Placares**: Aplicar `tabular-nums` e classes de placar esportivo estável no `MatchSheetInterface.tsx` e telões ao vivo.
  3. `[P2]` **Refinamento do Drag and Drop Tático**: Aprimorar visualização de posições 1-6 no `CourtLineupDnd.tsx` com indicadores visuais táteis.

---

### FASE 5 — PERFORMANCE, ACESSIBILIDADE & POLISH
- **Objetivo**: Otimizar tempos de carregamento e atingir 100% de conformidade com padrões de acessibilidade.
- **Entregas**:
  1. `[P1]` **Code-Splitting com `React.lazy` e `Suspense`**: Reduzir o bundle inicial de 4.041 kB para menos de 350 kB em `App.tsx`.
  2. `[P1]` **Configuração de `manualChunks` no Vite**: Isolar dependências pesadas de PDF (`jspdf`, `pdf-lib`) e gráficos (`recharts`).
  3. `[P2]` **Adequação de Acessibilidade (WCAG 2.1 AA)**: Inserir `aria-label` em todos os botões de ícone e elevar contraste de textos terciários de `text-zinc-500` para `text-zinc-400`.
  4. `[P3]` **Refinamento de Micro-interações**: Transições suaves de 150ms em hover e estados de carregamento elegantes.

---

## 3. MATRIZ DE PRIORIZAÇÃO (ESFORÇO X IMPACTO)

```text
               ALTO IMPACTO
                   ▲
                   │   [Fase 1: StateContainer]       [Fase 2: Unificar Navegação]
                   │   [Fase 5: Code-Splitting 4MB]   [Fase 3: Decompor Monólitos]
                   │   [Fase 1: Limpeza Tokens]       [Fase 4: Súmula Unificada]
                   │
  BAIXO ESFORÇO ───┼──────────────────────────────────────────────► ALTO ESFORÇO
                   │
                   │   [Fase 2: Breadcrumbs]          [Fase 2: Bottom Nav Mobile]
                   │   [Fase 4: Tabular Nums]         [Fase 5: Acessibilidade WCAG]
                   │   [Fase 1: Border Radius]
                   ▼
               MÉDIO IMPACTO
```
