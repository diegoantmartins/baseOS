# AGENTS.md - VolleyPro

Sistema web (React 18 + TypeScript + Vite) de gestão de competições de voleibol de quadra e praia.

## Comandos de verificação

Sempre execute após alterações:

```bash
npx tsc -p tsconfig.app.json --noEmit   # typecheck
npm run lint                            # ESLint (5 erros pré-existentes no template: command.tsx, textarea.tsx, tailwind.config.ts, StatisticsPage.tsx, CreateMatchPage.tsx)
npm test                                # Vitest (src/test/*.test.ts)
npm run build                           # build de produção
```

## Estrutura relevante

- `src/services/dataAccess.ts` — única porta de acesso a dados (adapter LocalStorage/Supabase). Toda a app consome apenas este módulo.
- `src/services/registrationService.ts` — regras de negócio de inscrição online por equipe (prazo, limites de elenco, duplicidade de camisa, 1 capitão/2 líberos).
- `src/services/standingsService.ts` — classificação e desempate (pontos FIVB/CBV, confronto direto, set average, pontos average, saldo, sorteio determinístico).
- `src/lib/pdf/matchSheetPdf.ts` — geração da súmula em PDF (A4 P&B).
- `src/data/seed.ts` — dados de demonstração (competições, equipes, elencos, partidas).
- `src/test/` — testes Vitest (jsdom).

## Convenções

- Padrão "adapter" para dados: nunca acessar localStorage/Supabase fora de `dataAccess.ts`.
- Regras de negócio residem nos serviços (`src/services`), não nos componentes.
- Testes unitários para regras de negócio em `src/test/<serviço>.test.ts`.
- Adicionar atleta: número de camisa 1-99, único por equipe; no seed, elencos já usam camisas (ct-1: 1-17, ct-2: 3-22) — não conflitar ao criar dados de teste.
