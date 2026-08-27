# BASEOS — MASTER FRONTEND AUDIT
## 06. Auditoria de Acessibilidade & Conformidade WCAG 2.1 AA (Accessibility Audit)

---

## 1. DIAGNÓSTICO GERAL DE ACESSIBILIDADE

O BaseOS utiliza primitivos headless do **Radix UI** em seus componentes de UI (`src/components/ui/`), herdando por padrão conformidade estrutural com as especificações WAI-ARIA (fechamento com tecla `Esc`, armadilha de foco em modais, suporte a `Tab` e setas direcionais em menus).

No entanto, foram detectadas oportunidades críticas de melhoria em contraste, identificação textual de botões de ícone e dimensionamento de alvos de toque.

---

## 2. ANÁLISE DETALHADA POR CRITÉRIO WCAG

### A. Botões Apenas com Ícones sem `aria-label` (P1 — Alto)
- **Critério WCAG**: 4.1.2 Name, Role, Value (Nível A).
- **Ocorrências Identificadas**:
  - `src/components/layout/Header.tsx` (Linha 271): Botão do menu hambúrguer possui `aria-label="Abrir menu"`, porém botões de alternância de tema e ações de tabela em `TeamsPage.tsx` e `AthletesPage.tsx` usam `<Button variant="ghost" size="icon"><MoreVertical /></Button>` sem `aria-label`.
- **Impacto**: Usuários de leitores de tela (NVDA, VoiceOver, TalkBack) ouvem apenas "botão" sem saber a finalidade da ação.
- **Correção Recomendada**: Inserir `aria-label="Opções da equipe"` ou utilizar `<span className="sr-only">Ações</span>`.

### B. Contraste de Cores em Textos Secundários e Badges (P2 — Médio)
- **Critério WCAG**: 1.4.3 Contrast (Minimum) (Nível AA — Mínimo 4.5:1 para texto normal e 3:1 para texto grande).
- **Diagnóstico**:
  - A cor `--muted-foreground` (`zinc-400` / `#a1a1aa`) sobre o fundo `--card` (`zinc-900` / `#18181b`) atinge taxa de contraste de **5.2:1** (Aprovado).
  - Porém, textos auxiliares com classe `text-[10px] text-zinc-500` (ex: rodapés de cards em `ActiveCompetitionsPage.tsx` e `DashboardShell.tsx`) atingem taxa de **3.1:1**, abaixo do limite recomendado para fontes pequenas (menores que 14px).
- **Correção Recomendada**: Elevar textos de apoio terciários de `text-zinc-500` para `text-zinc-400` ou `text-muted-foreground`.

### C. Estrutura de Títulos e Hierarquia de Cabeçalhos (P2 — Médio)
- **Critério WCAG**: 1.3.1 Info and Relationships (Nível A) & 2.4.6 Headings and Labels.
- **Diagnóstico**:
  - A maioria das páginas implementa corretamente um único `<h1>` no topo.
  - Em `HelpCenterPage.tsx` e `MatchSheetPage.tsx`, ocorrem componentes aninhados que utilizam `<h1>` internamente, gerando múltiplos `<h1>` no mesmo DOM.
- **Correção Recomendada**: Padronizar cabeçalhos de páginas com `<h1>` e títulos de cards/seções com `<h2>` ou `<h3>`.

### D. Dimensão dos Alvos de Toque (Touch Targets >= 44x44px) (P2 — Médio)
- **Critério WCAG**: 2.5.5 Target Size (Nível AAA) / 2.5.8 Target Size (Minimum - Nível AA).
- **Diagnóstico**:
  - Na `Sidebar.tsx` e no `Header.tsx`, os botões com `size="sm"` possuem altura de 32px (`h-8`). Para desktop com mouse é satisfatório, mas em smartphones e tablets de quadra, alvos menores que 40px podem provocar toques acidentais durante a operação rápida de partidas.
- **Correção Recomendada**: Aumentar alvos de clique em dispositivos móveis para no mínimo 40px a 44px (`h-10 sm:h-8`).

---

## 3. CLASSIFICAÇÃO DE SEVERIDADE DOS ITENS DE ACESSIBILIDADE

| Código | Severidade | Descrição da Ocorrência | Local |
| :---: | :---: | :--- | :--- |
| **A-01** | **P1 (Alto)** | Botões `size="icon"` sem `aria-label` ou texto alternativo para leitores de tela. | `TeamsPage`, `AthletesPage`, `MatchesPage` |
| **A-02** | **P2 (Médio)** | Textos informativos de tamanho reduzido (`text-[9px]`, `text-[10px]`) com baixo contraste. | `DashboardShell`, `ActiveCompetitionsPage` |
| **A-03** | **P2 (Médio)** | Alvos de toque menores que 40px em interfaces touch de beira de quadra. | `Header` (Mobile), `MatchSheetInterface` |
| **A-04** | **P3 (Baixo)** | Gráficos do Recharts sem transcrição em tabela alternativa para acessibilidade visual. | `StatisticsPage.tsx` |
