# BASEOS — FRONTEND TRANSFORMATION BLUEPRINT
## 01. Sistema Visual, Tokens, Tipografia & Espaçamentos (Visual System)

---

## 1. ESTRATÉGIA DE CORES: ENTERPRISE DARK SAAS

A identidade visual do BaseOS baseia-se na escala **Zinc profunda com contraste balanceado**, utilizando o **Âmbar (`amber-500`)** como única cor de acento de marca para direcionar o foco visual para a ação prioritária de cada contexto.

```text
PALETA SEMÂNTICA OFICIAL DO BASEOS
├── Fundos e Superfícies
│   ├── --background:       hsl(240 10% 3.9%)   /* zinc-950 (#09090b) - Fundo mestre da aplicação */
│   ├── --card:             hsl(240 5.9% 10%)   /* zinc-900 (#18181b) - Superfície de cards e modais */
│   ├── --popover:          hsl(240 5.9% 10%)   /* zinc-900 (#18181b) - Menus suspensos e dropdowns */
│   └── --muted:            hsl(240 3.7% 15.9%) /* zinc-800 (#27272a) - Fundos secundários/desabilitados */
│
├── Ações e Acentos
│   ├── --primary:          hsl(38 92% 50%)     /* amber-500 (#f59e0b) - Ação primária da marca (máx 1 por tela) */
│   ├── --primary-foreground: hsl(240 10% 3.9%) /* zinc-950 (#09090b) - Texto sobre botão primário */
│   ├── --secondary:        hsl(240 3.7% 15.9%) /* zinc-800 (#27272a) - Ações secundárias neutras */
│   ├── --secondary-foreground: hsl(240 4.8% 95.9%) /* zinc-100 (#f4f4f5) - Texto sobre botão secundário */
│   └── --accent:           hsl(38 92% 50%)     /* amber-500 (#f59e0b) - Indicadores de foco e status ao vivo */
│
├── Estados Semânticos Esportivos (Contidos)
│   ├── --success:          hsl(152 60% 42%)    /* emerald-600 - Partida finalizada / Homologada / Inscrição aprovada */
│   ├── --warning:          hsl(38 92% 50%)     /* amber-500 - Jogo ao vivo / Sorteio pendente / Atenção */
│   ├── --destructive:      hsl(0 72% 51%)      /* red-600 - Ações destrutivas / Exclusão / Cancelamento / W.O. */
│   └── --info:             hsl(220 9% 65%)     /* zinc-400 - Informativos neutros / Anexos / Links de apoio */
│
└── Estrutura, Texto e Bordas
    ├── --foreground:       hsl(240 4.8% 95.9%) /* zinc-100 (#f4f4f5) - Texto principal de alto contraste (14.2:1) */
    ├── --muted-foreground: hsl(240 5% 64.9%)   /* zinc-400 (#a1a1aa) - Rótulos secundários e legendas (5.2:1) */
    ├── --border:           hsl(240 3.7% 20%)   /* zinc-800 (#27272a) - Divisores e contornos de cards */
    ├── --input:            hsl(240 3.7% 20%)   /* zinc-800 (#27272a) - Bordas de formulários */
    └── --ring:             hsl(38 92% 50%)     /* amber-500 - Anel de foco visível acessível (2px sólido) */
```

### Regras de Ouro de Cores:
1. **Zero Cores Hardcoded**: Proibido o uso de classes como `bg-purple-500/10`, `text-blue-600` ou hexadecimais soltos. Todos os componentes devem utilizar tokens semânticos (`bg-card`, `text-foreground`, `border-border`).
2. **Eliminação dos Tokens Fantasmas**: Variáveis legadas como `--beach` e `--indoor` são descontinuadas, unificando a experiência sob a paleta Enterprise Dark.

---

## 2. SISTEMA TIPOGRÁFICO & ESCALA DE TEXTO

A tipografia do BaseOS utiliza **Inter** para interface e dados densos, complementada por **Space Grotesk** para cabeçalhos e números de grande impacto.

```text
ESCALA TIPOGRÁFICA OFICIAL DO BASEOS
├── Display (Títulos de Destaque / Telão de Ginásio)
│   └── Tamanho: 32px (2rem) | Peso: 700 (Bold) | Line-Height: 1.15 | Tracking: -0.025em | Fonte: Space Grotesk
│
├── H1 (Cabeçalho Principal de Página)
│   └── Tamanho: 24px (1.5rem) | Peso: 600 (Semibold) | Line-Height: 1.25 | Tracking: -0.02em | Fonte: Inter
│
├── H2 (Títulos de Seção / Abas de Competição)
│   └── Tamanho: 18px (1.125rem) | Peso: 600 (Semibold) | Line-Height: 1.3 | Tracking: -0.015em | Fonte: Inter
│
├── H3 / Subtítulos de Cards
│   └── Tamanho: 15px (0.9375rem) | Peso: 600 (Semibold) | Line-Height: 1.35 | Tracking: -0.01em | Fonte: Inter
│
├── Body (Texto Principal de Leitura)
│   └── Tamanho: 14px (0.875rem) | Peso: 400 (Regular) | Line-Height: 1.5 | Tracking: normal | Fonte: Inter
│
├── Body Small / Formulários / Tabelas
│   └── Tamanho: 13px (0.8125rem) | Peso: 500 (Medium) | Line-Height: 1.4 | Tracking: normal | Fonte: Inter
│
├── Caption / Legendas / Badges
│   └── Tamanho: 11px (0.6875rem) | Peso: 500 (Medium) | Line-Height: 1.3 | Tracking: 0.02em | Caixa Alta Opcional
│
└── Sports Score Display (Placares de Jogos e Súmula)
    └── Tamanho: 24px a 48px | Peso: 700 (Bold) | Fonte: Inter | font-variant-numeric: tabular-nums
```

---

## 3. ESCALA OFICIAL DE BORDER RADIUS

```text
┌──────────────┬───────────────┬────────────────────────────────────────────────────────┐
│ Token        │ Medida (px)   │ Uso Exclusivo Padronizado                              │
├──────────────┼───────────────┼────────────────────────────────────────────────────────┤
│ rounded-none │ 0px           │ Divisores de linha, bordas de tabela e separadores     │
│ rounded-sm   │ 6px           │ Tooltips, sub-itens de menus dropdown e tags compactas │
│ rounded-md   │ 8px           │ Botões, Inputs, Selects, Switches e Badges             │
│ rounded-lg   │ 10px          │ Cards secundários, painéis internos e dropdowns        │
│ rounded-xl   │ 12px          │ Cards de topo, Modais (Dialog), Drawer e Súmula        │
│ rounded-2xl  │ 16px          │ Containers mestre e caixas hero de destaque           │
│ rounded-full │ 9999px        │ Avatares e indicadores pontuais de status (dots)       │
└──────────────┴───────────────┴────────────────────────────────────────────────────────┘
```

---

## 4. ESCALA DE ESPAÇAMENTOS (SPACING SYSTEM)

- **Padding de Página (`MainLayout`)**:
  - Desktop (>= 1024px): `px-8 py-6` (Espaço amplo para visualização de dados).
  - Tablet (768px - 1023px): `px-6 py-5`.
  - Mobile (< 768px): `px-3 py-4` (Aproveitamento máximo da largura da tela).
- **Espaçamento entre Seções Principais**: `gap-6` (24px).
- **Padding Interno de Cards**:
  - Cards Operacionais: `p-4 sm:p-5`.
  - Cards Compactos (KPIs): `p-3.5 sm:p-4`.
- **Espaçamento entre Campos de Formulário**: `gap-4` (16px) com `gap-1.5` entre label e input.

---

## 5. SOMBRAS, ELEVAÇÃO & PROFUNDIDADE EM DARK MODE

No BaseOS, a sensação de elevação e profundidade é criada por **contraste de superfícies e bordas refinadas**, eliminando sombras pretas borradas ou brilhos pesados:

1. **Nível 0 (Fundo)**: `bg-zinc-950` (fundo mestre).
2. **Nível 1 (Superfície Base)**: `bg-zinc-900 border border-zinc-800` (Cards e Tabelas).
3. **Nível 2 (Superfície Elevada)**: `bg-zinc-900 border border-zinc-700/80 shadow-sm` (Modais e Dropdowns).
4. **Nível 3 (Hover / Interação)**: `hover:bg-zinc-800/60 transition-colors duration-150` (Linhas clicáveis e botões secundários).
