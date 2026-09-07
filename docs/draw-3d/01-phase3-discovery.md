# BASEOS — FASE 3.1: Discovery

> **STATUS: LEGADO / SUPERADO**
> Documento histórico da Fase 3.1 (discovery). Descreve o estado do projeto antes
> da implementação do Draw Arena Cinematográfico. A arquitetura atual está
> documentada em `17-cinematic-integration.md` e `44-phase-3.4-etapa-12-cleanup-report.md`.
> Componentes citados aqui (`DrawPresentation.tsx`, `LiveDrawModal` como wrapper)
> foram removidos/consolidados.

## 1. Objetivo

Investigar o estado atual do projeto BASEOS para fundamentar a arquitetura de uma futura camada de apresentação 3D do sorteio, sem implementar a cena 3D.

## 2. Escopo da Investigação

- Stack de renderização existente
- Arquitetura de componentes de sorteio
- Sistema de animação
- Persistência e tipos
- Bundler e configuracao de build

## 3. Stack de Renderizacao

### 3.1 Animacoes

**Framer Motion** (v12.29.0) ja presente no `package.json`.

Usado em `DrawPresentation.tsx` para:
- Entrada/saida de equipes sorteadas com `AnimatePresence`
- Transicoes `spring` para revelacao
- Fade com blur para item atual
- `motion.div` com `scale`, `opacity`, `y`, `rotate`
- Gradientes radiais e backdrop-blur CSS

Nao ha uso de canvas, WebGL nem bibliotecas 3D.

### 3.2 Bundler

**Vite 5.4** com plugin React SWC. `vite.config.ts` ja tem `manualChunks` para isolar:
- `vendor-pdf`: @react-pdf, pdf-lib, jspdf, html2canvas
- `vendor-icons`: lucide-react
- `vendor-core`: react, react-dom, react-router-dom, @tanstack/react-query

Nenhum chunk para 3D/canvas configurado.

### 3.3 Estilizacao

**Tailwind CSS 3.4** com:
- Variaveis CSS para cores (CSS custom properties via HSL)
- `tailwindcss-animate` (derivado de Radix UI + Framer Motion)
- `tailwind-merge` + `clsx` para composicao de classes
- Dark mode por `class`
- Sem variavel `--accent` nativa do Tailwind padrao (e sim via CSS custom properties)

### 3.4 UI Components

**Radix UI** (varias bibliotecas) via `@radix-ui/react-*`:
- Dialog, AlertDialog, Toast (via Sonner), Select, Checkbox, RadioGroup
- **Vaul** (v0.9.9) para drawers responsivos

Componentes custom em `src/components/ui/`:
- `button`, `badge`, `card`, `input`, `label`, `skeleton`, etc.
- `PageHeader`, `StateContainer`, `ContextualHelpButton`
- Layout: `MainLayout` com sidebar de navegacao

### 3.5 Icones

**Lucide React** (v0.462.0) — apenas SVG inline. Nenhuma lib de iconografia 3D.

### 3.6 3D / Canvas / Particles

**Nenhuma biblioteca 3D** esta instalada:
- `three` — NAO
- `@react-three/fiber` — NAO
- `@react-three/drei` — NAO
- `canvas-confetti` — NAO

Busca por `three`, `@react-three`, `webgl`, `canvas-confetti` no codebase retorna apenas referencias em documentacao (docs/draw-audit) e um ID de template em `src/document-engine/baseos/geometry/layouts.ts` (nao relacionado ao sorteio).

## 4. Arquitetura de Componentes de Sorteio

### 4.1 Camadas

```
DrawPage.tsx (pagina principal)
  └─ LiveDrawModal.tsx (wrapper de compatibilidade)
       └─ DrawPresentation.tsx (componente de apresentacao 2D)
```

**DrawPage.tsx** (696 linhas):
- Selecao de competencia e equipes
- Configuracao de seed, headSeeds, modo
- Validacao via `drawValidator.ts`
- Execucao via `drawService.ts` (runDraw)
- Preview com drag-and-drop (@dnd-kit)
- Persistencia via `dataAccess.ts`

**LiveDrawModal.tsx** (27 linhas):
- Apenas wrapper que retorna `null` se `isOpen === false`
- Passa `result` construido in-place para `DrawPresentation`

**DrawPresentation.tsx** (239 linhas):
- Recebe `DrawResult` + `teams` + `competition`
- Gera sequencia de revelacao: `buildRevealSequence(groups)`
- Revelacao manual por botao ("Sortear Proximo")
- Framer Motion para animacoes de entrada/saida
- `revealDurationMs` (padrao 2500ms) para timing

### 4.2 Interfaces de Reveal (existentes)

```typescript
// DrawPresentation.tsx:20
export interface DrawRevealEvent {
  teamId: string;
  groupName: string;
  order: number;
}

// DrawPresentation.tsx:40
export function buildRevealSequence(groups: DrawGroup[]): DrawRevealEvent[]
```

Sequencia: coluna por coluna (todas posicao 0, depois posicao 1, etc.).

## 5. Motor de Sorteio (Inalterado)

### 5.1 Arquivos

- `src/services/drawService.ts` (198 linhas)
- `src/services/drawValidator.ts` (validador)
- `src/hooks/useDrawOperation.ts` (hook de operacao)
- `src/services/dataAccess.ts` (persistencia LocalStorage + Supabase)

### 5.2 Algoritmos Preservados

- **PRNG**: `mulberry32(seed)` — determinisco, 32 bits
- **Distribuicao**: algoritimo guloso por capacidade (nao "serpentina" como antes)
- **Balanceamento**: capacidade inicializada com `floor(total/groupsCount)` + resto distribuido
- **Berger Table**: metodo do circulo para round-robin
- **Head seeds**: uma por grupo no modo 'seeded', embaralhadas no 'random'

### 5.3 Tipos

`src/types/draw.ts`:
- `DrawSeedingMode` = 'random' | 'seeded'
- `DrawConfig` = { groupsCount, seedingMode, seed, headSeeds }
- `DrawTeamEntry` = { teamId, seed }
- `DrawGroup` = { name, teams: DrawTeamEntry[] }
- `DrawMatchProposal` = { round, matchNumber, teamAId, teamBId, groupName, phase }
- `DrawStatus` = 'preview' | 'official' | 'locked'
- `DrawResult` = { competitionId, config, groups, matches, status? }
- `DrawRecord` = DrawResult + { id, createdAt, updatedAt }

`src/types/entities.ts`:
- `DrawStatus` definido

## 6. Persistencia

`src/services/dataAccess.ts`:
- **LocalStorage**: `draws`, `matches` (chave composite: `${competitionId}-${drawId}`)
- **Supabase**: `draws` + `matches`, com migracao `20260829000001_draws_status.sql`
- Metodos: `saveDrawWithMatches`, `updateDrawStatus`
- Protecao: `status === 'locked'` impede modificacao

## 7. Testes

- `src/test/drawValidator.test.ts`: 22 testes
- `src/test/drawService.test.ts`: 27 testes
- **Total**: 49 testes passando
- Executados com **Vitest** (v3.2.4) + jsdom

## 8. Resumo de Deteccao

| Aspecto | Estado | Acao |
|---------|--------|------|
| Biblioteca 3D | Nenhuma instalada | Proposta de instalacao futura |
| Canvas/WebGL | Nao utilizado | Investigar suporte de browser |
| Framer Motion | v12.29.0 presente | Manter; possivel complementar |
| Bundler | Vite 5.4 | Ja preparado para chunks |
| Tailwind | v3.4 | Manter |
| Radix UI | Multipapos presente | Reutilizar primitivas |
| Tipos de reveal | `DrawRevealEvent` existente | Reutilizar/estender |
| Motor de sorteio | Estavel (49 testes) | Nao modificar |
| Sistema de temas | CSS custom properties | Manter compatibilidade |
