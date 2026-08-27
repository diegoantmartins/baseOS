# BASEOS — FRONTEND TRANSFORMATION BLUEPRINT
## 03. Catálogo & Especificação de Componentes (Component Blueprint)

---

Abaixo está a especificação formal dos 25 componentes centrais da interface do BaseOS, construídos sobre **shadcn/ui**, **Radix UI**, **Tailwind CSS 3.4** e **Class Variance Authority (CVA)**.

---

### 1. `Button` (`src/components/ui/button.tsx`)
- **Aparência**: Superfície sólida com tipografia média (`font-medium` ou `font-semibold`), sem sombras brilhantes, raio de 8px (`rounded-md`).
- **Variantes Oficiais**:
  - `default`: Fundo âmbar (`bg-primary text-primary-foreground font-semibold hover:bg-amber-400`). Máximo 1 por contexto de tela.
  - `secondary`: Fundo neutro zinc-800 (`bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700/60`).
  - `outline`: Transparente com borda sutil (`border border-zinc-700 text-zinc-200 hover:bg-zinc-800`).
  - `ghost`: Sem borda (`text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60`).
  - `destructive`: Vermelho contido (`bg-destructive text-destructive-foreground hover:bg-red-700`).
  - `score`: Botão tátil para placares esportivos (`font-mono text-2xl h-14 min-w-[60px] bg-zinc-900 border border-zinc-700`).
- **Tamanhos**: `sm` (h-8 px-3 text-xs), `default` (h-9 px-4 text-sm), `lg` (h-11 px-6 text-base), `icon` (h-8 w-8).
- **Estados**: Normal, Hover (150ms), Focus (`ring-2 ring-primary ring-offset-2`), Disabled (`opacity-50 pointer-events-none`), Loading (`<Spinner className="size-4 animate-spin" />`).
- **Uso Correto**: Usar `variant="default"` para o botão de ação primária (ex: "Salvar Partida", "Criar Competição").
- **Uso Incorreto**: Usar múltiplos botões primários âmbar empilhados no mesmo card.

---

### 2. `Input` & `Textarea` (`src/components/ui/input.tsx`)
- **Aparência**: Fundo `bg-zinc-900`, borda `border-zinc-800`, texto `text-zinc-100`, placeholder `text-zinc-500`, raio de 8px (`rounded-md`), altura `h-9`.
- **Estados**: Normal, Focus (`border-primary ring-1 ring-primary`), Error (`border-destructive ring-1 ring-destructive`), Disabled (`bg-zinc-950 opacity-60`).

---

### 3. `Select` & `Combobox` (`src/components/ui/select.tsx`)
- **Aparência**: Botão de acionamento idêntico ao `Input`, com menu flutuante em `bg-zinc-900 border-zinc-800 rounded-lg shadow-md`.
- **Comportamento**: Itens com hover em `bg-zinc-800 text-zinc-100` e ícone de check indicador de seleção.

---

### 4. `Card` (`src/components/ui/card.tsx`)
- **Aparência**: Superfície sólida `bg-zinc-900`, contorno sutil `border-zinc-800`, raio de 12px (`rounded-xl`), sem sombras pesadas.
- **Composição**: `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, `<CardContent>`, `<CardFooter>`.
- **Variante Interativa (`.hover-raise`)**: Transição suave de fundo para `hover:bg-zinc-800/50` em cards clicáveis de partidas e campeonatos.

---

### 5. `Dialog`, `Drawer` & `AlertDialog`
- **Aparência**: Modal centralizado com backdrop escuro (`bg-black/80 backdrop-blur-xs`), superfície `bg-zinc-900 border-zinc-800 rounded-xl max-w-lg`.
- **Regra de Rolagem**: Altura máxima limitada a `max-h-[85vh]` com container interno encapsulado em `<ScrollArea>` para suporte a teclados móveis.

---

### 6. `Badge` (`src/components/ui/badge.tsx`)
- **Aparência**: Pílula compacta de identificação (`text-[10px] py-0.5 px-2 font-medium rounded-md`).
- **Variantes Semânticas Esportivas**:
  - `live`: `bg-amber-950 text-amber-300 border border-amber-800/60` (Partida em andamento).
  - `completed`: `bg-emerald-950 text-emerald-300 border border-emerald-800/60` (Finalizada / Homologada).
  - `scheduled`: `bg-zinc-800 text-zinc-300 border border-zinc-700/60` (Agendada).
  - `outline`: `bg-transparent text-zinc-300 border border-zinc-700` (Informativo).

---

### 7. `StateContainer` (`src/components/common/StateContainer.tsx`)
- **Função**: Componente universal para tratamento consistente dos 4 estados de tela:
  - `isLoading`: Renderiza Skeletons estruturados na geometria exata do conteúdo.
  - `isError`: Renderiza card com mensagem de erro em português e botão "Tentar Novamente".
  - `isEmpty`: Renderiza ícone ilustrativo, mensagem clara e botão de CTA primário.
  - `isSuccess`: Renderiza o conteúdo filho normal (`children`).

---

### 8. `Table` (`src/components/ui/table.tsx`)
- **Aparência**: Cabeçalho `bg-zinc-950/60 text-zinc-400 text-xs font-semibold uppercase tracking-wider`, linhas em `border-b border-zinc-800/80 hover:bg-zinc-800/40`.
- **Colunas Numéricas**: Alinhamento à direita com classe obrigatória `tabular-nums font-mono`.

---

### 9. `BreadcrumbNav` (`src/components/layout/BreadcrumbNav.tsx`)
- **Aparência**: Trilha de texto `text-xs text-zinc-400` com divisores em chevron (`/` ou `ChevronRight`).
- **Comportamento**: Links clicáveis para níveis pais com o último nível ativo em `text-zinc-100 font-medium`.

---

### 10. `SportsScoreBadge` (`src/components/common/SportsScoreBadge.tsx`)
- **Aparência**: Placar esportivo estável com `font-mono text-sm sm:text-base font-bold tabular-nums`.
- **Formatação de Sets**: Exibição compacta das parciais oficiais (ex: `25-22, 23-25, 15-11`).
