---
name: baseos-frontend
description: Frontend architecture, React 18, TypeScript, component hierarchy, page composition, performance, reusability, code organization, and logic preservation for BaseOS.
---

# BaseOS — Arquitetura e Engenharia Frontend

## Identidade da Skill

- **Nome**: baseos-frontend
- **Escopo**: Desenvolvimento, composição de componentes, organização de código, performance e arquitetura React no BaseOS.
- **Tecnologias**: React 18, TypeScript 5.8, Vite 5, React Router v6, TanStack Query v5, Supabase JS, TailwindCSS 3.4.

---

# 1. REGRA REGIONAL DA FONTE DA VERDADE

> **REGRA IMPERATIVA**: Nunca reconstruir uma funcionalidade existente sem primeiro entender sua implementação atual.

Antes de modificar ou criar qualquer código no frontend do BaseOS:
1. Mapeie os arquivos existentes relacionados em `src/pages`, `src/components`, `src/services` e `src/hooks`.
2. Verifique os tipos de dados em `src/types`.
3. Verifique o contrato de acesso a dados em `src/services/dataAccess.ts`.
4. Identifique o estado global ou local utilizado.

---

# 2. PADRÃO ADAPTER DE DADOS (`dataAccess.ts`)

O BaseOS utiliza o padrão **Adapter** centralizado para persistência e manipulação de dados:
- **Toda comunicação com banco/storage deve passar por `src/services/dataAccess.ts`**.
- **NUNCA** acesse `localStorage` ou `@supabase/supabase-js` diretamente dentro de componentes React ou páginas.
- O adaptador cuida da conversão automática entre as convenções de nome:
  - Banco de Dados (Supabase): `snake_case`
  - Aplicação Frontend: `camelCase` (usando utilitários `toSnake` / `toCamel`).

---

# 3. COMPOSIÇÃO E ESTRUTURA DE COMPONENTES

Seguir rigorosamente a organização de diretórios:

```text
src/
├── components/          # Componentes reutilizáveis do domínio do BaseOS
│   ├── ui/              # Primitivos shadcn/ui (Radix + Tailwind)
│   ├── match/           # Componentes específicos de partidas e súmula
│   ├── team/            # Componentes de gestão de equipes e elencos
│   ├── competition/     # Componentes de gestão de campeonatos
│   └── shared/          # Componentes compartilhados genéricos
├── pages/               # Páginas roteadas da aplicação (Views)
├── services/            # Serviços de regras de negócio (auth, standings, registration)
├── hooks/               # Custom React Hooks
├── types/               # Definições de tipos TypeScript
├── lib/                 # Utilitários, exportações PDF, configurações de terceiros
└── data/                # Dados mock/seed de demonstração
```

### Regras de Componentização:
1. **Separação de Responsabilidade (Presentational vs. Container)**:
   - Componentes em `src/components/ui/` e `src/components/shared/` devem ser puramente apresentacionais.
   - Regras de negócio residem nos serviços (`src/services/`), chamadas por custom hooks ou containers nas páginas.
2. **Tipagem Estrita com TypeScript**:
   - Todas as Props devem ter interfaces ou tipos explicitamente exportados e tipados.
   - Proibido o uso de `any`. Utilize genéricos ou `unknown` com guardas de tipo quando necessário.
3. **Imutabilidade e Reerderings**:
   - Utilize `useCallback` e `useMemo` com moderação e contexto real para otimizar renderizações de tabelas e súmulas ao vivo.
   - Evite mutação de objetos em arrays de estado local; sempre crie cópias imutáveis.

---

# 4. MANUTENÇÃO E PRESERVAÇÃO DA LÓGICA DE NEGÓCIO

Ao adicionar ou modificar funcionalidades no frontend:
- Preserve todas as validações existentes em `src/services/registrationService.ts` (limite de inscritos, duplicidade de camisa, 1 capitão, até 2 líberos).
- Preserve o cálculo e critérios de desempate em `src/services/standingsService.ts` (pontos FIVB/CBV, confronto direto, set average, pontos average).
- Preserve as regras da súmula em `src/lib/pdf/matchSheetPdf.ts` (formato A4 P&B, suporte a 3 e 5 sets).

---

# 5. CHECKLIST DE ENGENHARIA DE CÓDIGO

Antes de concluir qualquer tarefa frontend:
- [ ] O código passa no typecheck sem erros (`npx tsc -p tsconfig.app.json --noEmit`).
- [ ] O linter é satisfeito sem avisos graves (`npm run lint`).
- [ ] Os testes unitários existentes continuam passando (`npm test`).
- [ ] A build de produção é concluída com sucesso (`npm run build`).
- [ ] Nenhuma camada fora de `dataAccess.ts` acessa storage/API diretamente.
