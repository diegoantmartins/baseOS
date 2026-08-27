# BASEOS — MASTER FRONTEND AUDIT
## 08. Auditoria de Performance Frontend (Performance Audit)

---

## 1. ANÁLISE DO BUNDLE DE PRODUÇÃO (VITE BUILD OUTPUT)

O build de produção gerado pelo Vite (`vite build`) revelou a seguinte distribuição de arquivos em `dist/`:

```text
dist/index.html                              2.52 kB │ gzip:     1.13 kB
dist/assets/index-DeRnZucD.css              98.21 kB │ gzip:    16.87 kB
dist/assets/purify.es-BnINGy_Y.js           28.93 kB │ gzip:    11.14 kB
dist/assets/index.es-BoCobgOa.js           150.47 kB │ gzip:    51.44 kB
dist/assets/html2canvas.esm-CBrSDip1.js    201.42 kB │ gzip:    48.03 kB
dist/assets/index-BZHMc_KB.js              214.88 kB │ gzip:    55.69 kB
dist/assets/index-C4CFl2cQ.js            4,041.01 kB │ gzip: 1,304.18 kB   <-- ALERTA CRÍTICO
```

### Diagnóstico do Bundle:
- **Tamanho do Chunks Principal**: **4.041 kB** (1.304 kB gzip).
- **Causa Raiz**: Todas as 22 páginas são importadas estaticamente no topo do `src/App.tsx`. Isso faz com que bibliotecas pesadas de geração de documentos e gráficos (`pdf-lib`, `jspdf`, `@react-pdf/renderer`, `recharts`, `framer-motion`) sejam baixadas integralmente pelo usuário mesmo que ele acesse apenas a tela inicial de competições ativas.

---

## 2. OPORTUNIDADES SEGUNDO A SKILL `REACT-BEST-PRACTICES` (VERCEL)

### A. Implementação de Code-Splitting por Rota com `React.lazy` (Impacto Alto)
Substituir as importações estáticas em `App.tsx` por carregamento sob demanda:

```typescript
// Padrão Recomendado:
import { lazy, Suspense } from 'react';

const CompetitionsPage = lazy(() => import('./pages/CompetitionsPage'));
const MatchesPage = lazy(() => import('./pages/MatchesPage'));
const MatchSheetPage = lazy(() => import('./pages/MatchSheetPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
```

- **Ganho Esperado**: Redução do payload inicial de **4MB para ~280kB**, acelerando drasticamente o First Contentful Paint (FCP) em redes móveis de ginásio.

### B. Separação de Chunks no Rollup (`vite.config.ts`)
Configurar `manualChunks` em `vite.config.ts` para isolar dependências pesadas em arquivos independentes:
- `vendor-pdf`: `@react-pdf/renderer`, `pdf-lib`, `jspdf`, `html2canvas`
- `vendor-charts`: `recharts`
- `vendor-dnd`: `@dnd-kit/core`, `@dnd-kit/utilities`

### C. Otimização de Renderizações no Sorteio e na Súmula Eletrônica
- **Na Súmula Interativa (`MatchSheetInterface.tsx`)**: O estado de pontuação é salvo a cada incremento. A cada ponto marcado, todos os componentes de preview e tabelas recalculavam a renderização.
- **Na Página de Jogos (`MatchesPage.tsx`)**: O uso de `useMemo` em filtros (`activeCompetitions`, `conflicts`) já previne cálculos repetidos, mas a extração dos 5 modais inline para componentes com estado local isolado evitará o re-render de toda a lista de 50+ partidas.

---

## 3. CHECKLIST DE PERFORMANCE PERCEBIDA

| Aspecto | Status Atual | Meta Pós-Otimização |
| :--- | :---: | :---: |
| **Tamanho do Bundle Inicial** | 4.041 kB | < 350 kB |
| **Tempo de Carregamento Inicial (3G Móvel)** | ~4.8s | < 1.2s |
| **Transições entre Rotas** | Síncronas (pesadas) | Fluídas com Suspense Skeletons |
| **Geração de PDF** | Síncrona client-side | Web Worker / Carregamento assíncrono isolado |
