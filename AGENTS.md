# AGENTS.md - VolleyPro

Sistema web (React 18 + TypeScript + Vite) de gestão de competições de voleibol de quadra e praia.

## Comandos de verificação

Sempre execute após alterações:

```bash
npx tsc -p tsconfig.app.json --noEmit   # typecheck
npm run lint                            # ESLint (0 erros; avisos react-refresh podem existir)
npm test                                # Vitest (src/test/*.test.ts, 47 testes)
npm run build                           # build de produção
```

## Estrutura relevante

- `src/services/authService.ts` — autenticação por perfis (modo demo local + Supabase Auth).
- `src/services/dataAccess.ts` — única porta de acesso a dados (adapter LocalStorage/Supabase). Toda a app consome apenas este módulo; `toSnake`/`toCamel` convertem colunas do banco (snake_case) para a forma da aplicação (camelCase).
- `src/services/registrationService.ts` — regras de negócio de inscrição online por equipe (prazo, limites de elenco, duplicidade de camisa, 1 capitão/2 líberos).
- `src/services/standingsService.ts` — classificação e desempate (pontos FIVB/CBV, confronto direto, set average, pontos average, saldo, sorteio determinístico).
- `src/lib/pdf/matchSheetPdf.ts` — geração da súmula em PDF (A4 P&B).
- `src/data/seed.ts` — dados de demonstração (competições, equipes, elencos, partidas).
- `src/test/` — testes Vitest (jsdom).

## Convenções

- Padrão "adapter" para dados: nunca acessar localStorage/Supabase fora de `dataAccess.ts`.
- Regras de negócio residem nos serviços (`src/services`), não nos componentes.
- Testes unitários para regras de negócio em `src/test/<serviço>.test.ts`.
- Atleta: número de camisa 1-99 **opcional** (confirmado no dia da competição); se informado, deve ser único na equipe. No seed, elencos já usam camisas (ct-1: 1-17, ct-2: 3-22) — não conflitar ao criar dados de teste.
