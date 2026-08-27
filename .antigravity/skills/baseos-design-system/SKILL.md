---
name: baseos-design-system
description: Design tokens, colors, typography, spacing, border radius, shadows, themes, component variants, and visual consistency rules for BaseOS using Tailwind CSS and shadcn/ui.
---

# BaseOS — Sistema de Design e Biblioteca de Componentes

## Identidade da Skill

- **Nome**: baseos-design-system
- **Escopo**: Tokens de design, padrões de estilização, componentes primitivos (shadcn/ui), variáveis CSS, temas claro/escuro e padronização visual.
- **Base Técnica**: Tailwind CSS 3.4, Radix UI, Class Variance Authority (`cva`), `clsx`, `tailwind-merge`.

---

# 1. HIERARQUIA DE REUTILIZAÇÃO DE COMPONENTES

Antes de escrever qualquer linha de CSS ou criar um novo arquivo em `src/components`:

```text
1. Procurar componente existente no projeto (`src/components/`)
                      ↓ (se não existir)
2. Verificar componente shadcn/ui equivalente (`src/components/ui/` ou Radix UI)
                      ↓ (se não existir)
3. Estender / Compor componentes existentes reutilizando tokens do Tailwind
                      ↓ (se não for suficiente)
4. Criar novo componente modular com variantes padronizadas via CVA
```

> **REGRA CRÍTICA**: Nunca criar estilos inline isolados ou classes utilitárias arbitrárias (ex: `w-[327px]` ou `bg-[#1a2b3c]`) sem justificativa técnica documentada.

---

# 2. TOKENS E VARIÁVEIS DE DESIGN (`tailwind.config.ts` & `src/index.css`)

O BaseOS utiliza o sistema de variáveis CSS compatível com shadcn/ui e Tailwind CSS.

### Paleta Semântica Base:
- **Background**: `hsl(var(--background))`
- **Foreground / Texto**: `hsl(var(--foreground))`
- **Card**: `hsl(var(--card))` / `hsl(var(--card-foreground))`
- **Primary (Ações Principais)**: `hsl(var(--primary))` / `hsl(var(--primary-foreground))`
- **Secondary (Ações Apoio)**: `hsl(var(--secondary))` / `hsl(var(--secondary-foreground))`
- **Muted (Subtítulo / Bordas fraco)**: `hsl(var(--muted))` / `hsl(var(--muted-foreground))`
- **Accent (Destaque e Hover)**: `hsl(var(--accent))` / `hsl(var(--accent-foreground))`
- **Destructive (Ações de Exclusão)**: `hsl(var(--destructive))` / `hsl(var(--destructive-foreground))`
- **Border**: `hsl(var(--border))`
- **Input**: `hsl(var(--input))`
- **Ring (Foco)**: `hsl(var(--ring))`

---

# 3. PADRÃO DE CONSTRUÇÃO DE VARIANTES (CVA)

Todo componente reutilizável que possuir variações visuais (tamanhos, cores, estados) deve utilizar `class-variance-authority`:

```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

---

# 4. ÍCONES E ILUSTRAÇÕES

- Utilitário de Ícones Exclusivo: `lucide-react`.
- O tamanho dos ícones deve ser proporcional ao texto ao redor:
  - Textos `text-xs` / `text-sm`: ícones `h-4 w-4`.
  - Textos `text-base` / `text-lg`: ícones `h-5 w-5`.
  - Títulos `text-xl` ou cartões hero: ícones `h-6 w-6`.
- Sempre utilizar `aria-hidden="true"` em ícones decorativos acompanhados de rótulo textual.

---

# 5. GERENCIAMENTO DE TEMAS (DARK / LIGHT)

- O suporte a temas utiliza `next-themes` com a classe `dark` no elemento HTML raiz.
- Todo componente novo deve ser testado visualmente tanto no Modo Claro quanto no Modo Escuro.
- Evitar hardcoding de cores como `bg-white` ou `text-black`. Use sempre `bg-background`, `bg-card`, `text-foreground` e `text-muted-foreground`.
