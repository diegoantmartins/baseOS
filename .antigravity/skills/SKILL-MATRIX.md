# BaseOS — Matriz de Responsabilidade de Skills (Skill Responsibility Matrix)

Este documento orienta os agentes e desenvolvedores sobre **qual Skill acionar para cada tipo de tarefa** no frontend do BaseOS.

---

## MATRIZ DE ACIONAMENTO DE SKILLS

| Tarefa / Objetivo | Skill Principal | Skills Auxiliares | Validador Final |
| :--- | :--- | :--- | :--- |
| **Auditar Interface ou UX** | `baseos-audit` | `baseos-uiux`, `web-design-guidelines` | `baseos-audit` |
| **Criar ou Alterar Página / View** | `baseos-frontend` | `baseos-uiux`, `baseos-navigation`, `react-best-practices` | `baseos-audit` |
| **Criar ou Alterar Componente UI** | `baseos-design-system` | `shadcn`, `radix-ui-design-system`, `tailwind-design-system` | `npx tsc` + `npm run lint` |
| **Reorganizar Sidebar / Menu / Navegação** | `baseos-navigation` | `baseos-uiux`, `baseos-frontend` | `baseos-audit` |
| **Implementar Formulário ou Modal** | `baseos-frontend` | `shadcn`, `baseos-design-system` | `npm test` |
| **Otimizar Performance / Re-renderizações** | `react-best-practices` | `baseos-frontend` | `npm run build` |
| **Definir Cores, Fontes ou Temas** | `baseos-design-system` | `baseos-uiux`, `ui-ux-pro-max` | `baseos-audit` |
| **Desenvolver Funcionalidade com Súmula ou PDF** | `baseos-frontend` | `baseos-audit` | `npm test` |

---

## FLUXO EXECUTIVO PARA FUTUROS REDESIGNS

Para qualquer tarefa de refatoração ou redesign de telas no BaseOS:

```text
1. AUDITAR   ➜  Executar `baseos-audit` no MODO 1 (investigativo/somente leitura).
2. MAPEAR    ➜  Mapear rotas, componentes e contratos via `baseos-navigation` e `baseos-frontend`.
3. ENTENDER  ➜  Analisar a regra de negócio existente e o adapter `dataAccess.ts`.
4. PLANEJAR  ➜  Montar plano detalhado reutilizando componentes `shadcn` e `baseos-design-system`.
5. PROPOR    ➜  Apresentar plano sem código destrutivo para aprovação.
6. APLICAR   ➜  Implementar alterações mantendo 100% de retrocompatibilidade.
7. TESTAR    ➜  Executar `npx tsc`, `npm run lint`, `npm test`, `npm run build`.
8. RE-AUDITAR➜  Re-auditar via `baseos-audit` para validar zero regressão visual e funcional.
```
