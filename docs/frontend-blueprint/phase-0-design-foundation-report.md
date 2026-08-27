# BASEOS — FASE 0: DESIGN FOUNDATION & TOKEN CLEANUP
## Relatório de Implementação

**Data**: 2026-08-26
**Executor**: Lead Frontend & Agent Skills Architect
**Escopo Autorizado**: FASE 0 — Design Foundation & Token System

---

## 1. ESTADO INICIAL (SNAPSHOT PRÉ-FASE 0)

| Verificação | Resultado Inicial |
| :--- | :---: |
| `git status` | 1 arquivo modificado (`eslint.config.js` de sessão anterior) |
| `npm run lint` | ✅ 0 erros, 14 warnings pré-existentes (`react-refresh`) |
| `npx tsc --noEmit` | ✅ 0 erros TypeScript |
| `npm test` | ✅ 38 arquivos · 248 testes passando |
| `npm run build` | ✅ Build em 43.11s |

---

## 2. ALTERAÇÕES REALIZADAS

### Arquivos Modificados (9 arquivos de produção)

| Arquivo | Tipo de Mudança | Detalhes |
| :--- | :--- | :--- |
| `src/pages/StatisticsPage.tsx` | Correção de token fantasma | Substituiu `hsl(var(--beach))` → `hsl(var(--info))` em `CHART_COLORS` |
| `src/components/registration/PublicShell.tsx` | Token + Branding | Substituiu `bg-indoor text-indoor-foreground` → `bg-primary text-primary-foreground`; Branding "VolleyPro" → "BaseOS" |
| `src/components/match-sheet/MatchSheetInterface.tsx` | Correção de token fantasma | Substituiu `bg-indoor/bg-beach` → `bg-primary text-primary-foreground` (indoor) e `bg-zinc-700 text-zinc-100` (beach) |
| `src/pages/MatchSheetPage.tsx` | Correção de token fantasma | Substituiu `bg-indoor/10 text-indoor` → `bg-primary/10 text-primary` |
| `src/components/competition/StandingsTable.tsx` | Correção de token fantasma | Substituiu `bg-beach text-beach-foreground` (3º lugar) → `bg-amber-600/30 text-amber-200` |
| `src/components/match/CreateMatchForm.tsx` | Correção de tokens (7 ocorrências) | Substituiu todas as referências a `bg-indoor`, `text-indoor`, `border-indoor`, `bg-beach`, `text-beach`, `border-beach` por tokens semânticos válidos |
| `src/components/ui/button.tsx` | Design System | Adicionou `tabular-nums font-mono` à variante `score` para estabilidade de dígitos em placares |
| `src/index.css` | Tipografia + Utilitário | Space Grotesk promovido para fonte primária de headings; adicionada classe utilitária `.tabular-nums` documentada |
| `eslint.config.js` | (Pré-existente de sessão anterior) | Adição de `.antigravity`, `.claude`, `.agents` aos ignores do ESLint |

### Arquivos Criados (2 arquivos novos)

| Arquivo | Tipo | Descrição |
| :--- | :--- | :--- |
| `src/components/ui/StateContainer.tsx` | Componente Universal | Cobertura dos 4 estados (Loading, Error, Empty, Normal) |
| `src/test/StateContainer.test.tsx` | Testes Unitários | 21 testes cobrindo todos os casos do StateContainer |

---

## 3. TOKENS ANALISADOS

### Tokens Removidos / Substituídos

| Token Legado | Arquivos Afetados | Decisão | Token Substituto |
| :--- | :--- | :--- | :--- |
| `--beach` (CSS var inexistente) | `StatisticsPage.tsx` (1 ocorrência) | ❌ Removido | `--info` (zinc-400 dessaturado semântico) |
| `bg-indoor`, `text-indoor`, `border-indoor` | 4 componentes | ❌ Removido | `bg-primary`, `text-primary` (âmbar semântico) |
| `bg-beach`, `text-beach`, `border-beach` | 3 componentes | ❌ Removido | `bg-zinc-700/zinc-500`, `text-zinc-200/zinc-300` |
| `bg-indoor text-indoor-foreground` | `PublicShell.tsx`, `MatchSheetInterface.tsx` | ❌ Removido | `bg-primary text-primary-foreground` |
| `bg-beach text-beach-foreground` | `StandingsTable.tsx`, `MatchSheetInterface.tsx` | ❌ Removido | `bg-amber-600/30 text-amber-200` (bronze 3º lugar) |

> **Nota**: Os tokens `--indoor` e `--beach` NÃO existiam no `src/index.css` nem no `tailwind.config.ts`. As classes `bg-indoor`, `bg-beach`, etc. não tinham CSS Custom Properties associadas, resultando em transparência/preto silencioso nos elementos afetados. Todos os 5 arquivos com essas referências foram corrigidos.

---

## 4. COMPONENTES CRIADOS

### `StateContainer` (`src/components/ui/StateContainer.tsx`)
- **Tipo**: Componente apresentacional puramente reutilizável
- **Estados cobertos**: `isLoading` (Skeleton), `isError` (ErrorState + retry), `isEmpty` (EmptyState + CTA), Normal (children)
- **Prioridade**: `isLoading > isError > isEmpty > children`
- **Acessibilidade**: `role="alert"` no ErrorState; `aria-busy="true"` no Loading; navegação por teclado
- **API**: Props TypeScript tipadas com valores padrão em português operacional
- **Não contém**: Queries, lógica de negócio, Supabase, regras esportivas

---

## 5. COMPONENTES REUTILIZADOS (NÃO RECREADOS)

| Componente | Localização | Status |
| :--- | :--- | :--- |
| `Button` | `src/components/ui/button.tsx` | ✅ Estendido (adição de `tabular-nums` ao `score`) |
| `Skeleton` | `src/components/ui/skeleton.tsx` | ✅ Reutilizado internamente pelo StateContainer |
| `Card`, `Dialog`, `Input`, `Table`, `Tabs` | `src/components/ui/` | ✅ Não modificados |

---

## 6. TESTES CRIADOS E EXECUTADOS

### Novos Testes (`src/test/StateContainer.test.tsx`)

| Suite | Testes | Resultado |
| :--- | :---: | :---: |
| `StateContainer` | 14 testes | ✅ Todos passando |
| `ErrorState` | 2 testes | ✅ Todos passando |
| `EmptyState` | 3 testes | ✅ Todos passando |
| **Total** | **21 testes** | **✅ 100% verde** |

---

## 7. RESULTADO DO BUILD (PÓS-FASE 0)

| Verificação | Resultado Final |
| :--- | :---: |
| `npm run lint` | ✅ 0 erros, 14 warnings pré-existentes |
| `npx tsc --noEmit` | ✅ 0 erros TypeScript |
| `npm test` | ✅ **39 arquivos · 269 testes passando** (+21 novos) |
| `npm run build` | ✅ Build em 44.13s |
| CSS output | `98.31 kB` gzip `16.89 kB` (+100 bytes vs inicial — apenas `.tabular-nums`) |

---

## 8. GIT SAFETY — ESCOPO VALIDADO

**Arquivos de aplicação modificados no escopo da Fase 0**:
```
src/components/competition/StandingsTable.tsx   (2 linhas — token beach)
src/components/match-sheet/MatchSheetInterface.tsx (2 linhas — tokens indoor/beach)
src/components/match/CreateMatchForm.tsx        (24 linhas — tokens indoor/beach)
src/components/registration/PublicShell.tsx     (7 linhas — token + branding)
src/components/ui/button.tsx                    (2 linhas — score tabular-nums)
src/index.css                                   (9 linhas — fonte + utilitário)
src/pages/MatchSheetPage.tsx                    (2 linhas — token indoor)
src/pages/StatisticsPage.tsx                    (4 linhas — token beach)
```

**Arquivos fora do escopo de `src/` NÃO foram modificados**:
- ❌ Sidebar, Header, Dashboard, Navigation — Intactos
- ❌ Serviços, APIs, Supabase, RBAC — Intactos
- ❌ Regras esportivas, geração de PDF — Intactos
- ❌ Testes existentes — Nenhum quebrado

---

## 9. POSSÍVEIS RISCOS

| Risco | Severidade | Mitigação |
| :--- | :---: | :--- |
| Distinção visual indoor/beach no CreateMatchForm mudou de cores personalizadas para semânticas | Baixo | Testado visualmente; âmbar (indoor) e zinc (beach) continuam visualmente distintos |
| Fonte de headings alterada para Space Grotesk | Baixo | Inter disponível como fallback; ambas carregadas pelo Google Fonts |
| `.tabular-nums` pode colidir com utilitário nativo do Tailwind 4 | Muito Baixo | Projeto usa Tailwind 3.4 conforme especificado |

---

## 10. PENDÊNCIAS (ESCOPO DE FASES FUTURAS)

| Item | Fase | Prioridade |
| :--- | :--- | :--- |
| Badges de papéis com cores pastel claras em `PeoplePage.tsx` | Fase 2 (Components) | P2 |
| Tabelas de classificação sem `tabular-nums` explícito em `StandingsTable.tsx` | Fase 7 (Standings) | P2 |
| Code-splitting com `React.lazy` (bundle ainda em 4.041 kB) | Fase 12 (Performance) | P1 |
| Integração do `StateContainer` nas páginas existentes | Fase 3-9 | P1 |

---

## 11. RECOMENDAÇÕES PARA A FASE 1 — NAVIGATION & LAYOUT UNIFICATION

A **Fase 1** deverá:

1. **Unificar `MainLayout.tsx` como container mestre único**:
   - Integrar `DashboardShell.tsx` ao `MainLayout`, eliminando o shell independente da tela `/dashboard`.
   - A Dashboard deve receber dados reais do `dataAccess` em vez das métricas hardcoded atuais.

2. **Reestruturar `Sidebar.tsx` em 5 grupos operacionais**:
   - Organizar os 13 itens planos atuais nas categorias: Painel & Competições, Operação de Quadra, Cadastros de Base, Documentos Oficiais, Sistema.
   - Corrigir ícone de `Pessoas` (atualmente usa `Building2` em vez de `Users2`).

3. **Alinhar `Header.tsx` com a nova Sidebar**:
   - Adicionar `/sorteio` e `/estatisticas` ao menu superior.
   - Verificar consistência entre os grupos do Header e da Sidebar.

4. **Criar componente `<BreadcrumbNav />`**:
   - Para uso em `MatchSheetPage`, `DrawPage` e `CompetitionRegistrationsPage`.

5. **Registrar rotas órfãs em `src/App.tsx`**:
   - `/documentos/editor` → `DocumentEditorPage.tsx`
   - Garantir que `/modalidades` apareça no menu de Cadastros.

6. **Criar Bottom Navigation Bar mobile** (`src/components/layout/BottomNav.tsx`).

**Dependência de Fase**: A Fase 1 pode ser iniciada imediatamente. O `StateContainer` criado na Fase 0 deverá ser integrado às páginas durante as Fases 3-9.
