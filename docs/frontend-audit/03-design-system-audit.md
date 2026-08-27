# BASEOS — MASTER FRONTEND AUDIT
## 03. Auditoria do Design System & Tokens Visuais (Design System Audit)

---

## 1. ESTRUTURA ATUAL DE TOKENS (`src/index.css` & `tailwind.config.ts`)

O BaseOS opera sob uma paleta **Enterprise Dark SaaS** baseada na escala neutra de Zinc profundo com acento primário em Âmbar (`amber-500` / `#f59e0b`).

```css
/* Tokens Centrais em src/index.css */
--background: 240 10% 3.9%;     /* zinc-950 sólido */
--foreground: 240 4.8% 95.9%;   /* zinc-100 */
--card: 240 5.9% 10%;           /* zinc-900 */
--card-foreground: 240 4.8% 95.9%;
--primary: 38 92% 50%;          /* amber-500 (marca BaseOS) */
--primary-foreground: 240 10% 3.9%;
--border: 240 3.7% 20%;         /* zinc-800 */
--ring: 38 92% 50%;             /* Foco 2px sólido */
```

---

## 2. INCONSISTÊNCIAS IDENTIFICADAS NO DESIGN SYSTEM

### A. Referências a Tokens CSS Fantasmas / Inexistentes
- **Em `src/pages/StatisticsPage.tsx` (Linha 37)**:
  ```typescript
  const CHART_COLORS = ['hsl(var(--accent))', 'hsl(var(--primary))', 'hsl(var(--beach))', ...];
  ```
  O token `--beach` foi removido do `src/index.css` na padronização do modo escuro. O navegador interpreta valores indefinidos como transparentes/pretos, gerando quebra visual em gráficos do Recharts.
- **Em `src/components/registration/PublicShell.tsx` (Linha 17)**:
  ```tsx
  <span className="p-2 rounded-lg bg-indoor text-indoor-foreground">
  ```
  Utiliza classes de utilitário legadas `bg-indoor` que dependem de variáveis não declaradas no CSS raiz.

### B. Cores Hardcoded e Quebra da Paleta Dark SaaS
- **Em `src/pages/PeoplePage.tsx` (Linhas 28-31)**:
  ```typescript
  const ROLE_CONFIG = {
    manager: { label: 'Gestor', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
    coach: { label: 'Técnico', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
    athlete: { label: 'Atleta', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
    referee: { label: 'Árbitro', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  };
  ```
  Utiliza tons pastel claros com bordas claras (`border-purple-200`), que criam alto contraste estridente e aspecto amador sobre o fundo escuro `zinc-950`.
  - **Recomendação**: Usar badges semânticos neutros com indicador pontual ou tokens `bg-zinc-800 border-zinc-700 text-zinc-300`.

### C. Dispersão de Classes de Arredondamento (Border Radius)
Detectamos 4 padrões concorrentes de `border-radius` aplicados aos mesmos tipos de elementos:
- Botões: variando entre `rounded-sm` (6px), `rounded-md` (8px) e `rounded-lg` (10px) entre telas.
- Cards: variando entre `rounded-md` (8px), `rounded-xl` (12px) e `rounded-2xl` (16px).
- **Regra do BaseOS Design System**:
  - `rounded-md` (8px): Padrão obrigatório para todos os botões, inputs, selects e badges.
  - `rounded-xl` (12px): Padrão obrigatório para todos os cards operacionais e modais (`Dialog`).

### D. Disparidade de Sombras e Elevação
- Várias páginas utilizam `shadow-none`, outras `hover:shadow-lg` (sombra clara inadequada para dark mode) e outras `.card-elevated`.
- **Regra Enterprise Dark**: No dark mode, a percepção de profundidade deve ocorrer por **variação sutil de luminância do fundo** (`bg-zinc-900` sobre `bg-zinc-950` com borda `border-zinc-800`), e não por sombras pretas difusas pesadas.

---

## 3. AUDITORIA DE TIPOGRAFIA & NÚMEROS ESPORTIVOS

- **Família Tipográfica**:
  - Títulos e Display: `Inter` + `Space Grotesk` com tracking negativo (`tracking-tight`).
  - Corpo de Texto: `Inter` com `font-feature-settings: 'cv11', 'ss01'`.
- **Padronização Numérica em Placares e Estatísticas**:
  - Em `ActiveCompetitionsPage.tsx`, `DashboardShell.tsx` e `MatchesPage.tsx`, a classe `tabular-nums` está aplicada corretamente em partes das tabelas.
  - No entanto, nos modais de súmula ao vivo (`MatchSheetInterface.tsx`) e em `StatisticsPage.tsx`, os números ainda utilizam largura proporcional, fazendo com que o placar oscile horizontalmente a cada ponto marcado.

---

## 4. CHECKLIST DE CONFORMIDADE COM A SKILL SHADCN/UI

| Regra Oficial shadcn/ui | Status no BaseOS | Evidência / Diagnóstico |
| :--- | :---: | :--- |
| **Uso de `size-*` para dimensões quadradas** | ⚠️ Parcial | Muitos componentes ainda usam `w-4 h-4` e `w-3.5 h-3.5` em vez de `size-4`. |
| **Proibição de `space-x-*` / `space-y-*`** | ⚠️ Parcial | `MainLayout`, `MatchesPage` e `TeamsPage` ainda utilizam `space-y-6` e `space-y-4` em vez de `flex flex-col gap-4`. |
| **Uso de Skeletons em vez de pulse divs** | ⚠️ Parcial | `ActiveCompetitionsPage` usa `<div className="animate-pulse" />` manual em vez do primitivo `<Skeleton />`. |
| **Uso de `Empty` state padronizado** | ❌ Ausente | Cada tela cria seu próprio `<Card className="text-center p-12">` com markup duplicado. |
| **Uso de `sonner` para Toasts** | ✅ Conforme | Migrado com sucesso para `import { toast } from 'sonner'`. |
