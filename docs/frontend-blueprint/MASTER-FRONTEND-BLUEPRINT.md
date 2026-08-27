# BASEOS — MASTER FRONTEND TRANSFORMATION BLUEPRINT
## Documento Mestre de Arquitetura, Design System, UX & Roadmap

---

## 1. SUMÁRIO EXECUTIVO

O **BaseOS Frontend Transformation Blueprint** é o documento arquitetural definitivo para a modernização e refinamento visual e de experiência do usuário do BaseOS no Antigravity IDE.

Construído a partir dos achados da **Master Frontend Audit** (`docs/frontend-audit/`) e estruturado sob os princípios das Agent Skills (`baseos-frontend`, `baseos-uiux`, `baseos-design-system`, `baseos-navigation`, `baseos-audit`, `shadcn`, `react-best-practices`), este blueprint estabelece todas as diretrizes para transformar o BaseOS em um **SaaS Esportivo de Alta Performance**.

---

## 2. PILARES ARQUITETURAIS DA TRANSFORMAÇÃO

```text
                                  BASEOS
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    IDENTIDADE ENTERPRISE DARK              ARQUITETURA DE NAVEGAÇÃO
    - Fundo zinc-950 (#09090b)              - MainLayout como container único
    - Acento primário âmbar (#f59e0b)       - Sidebar em 5 grupos operacionais
    - Tipografia Inter + Space Grotesk      - Trilha universal de Breadcrumbs
    - Números tabulares (tabular-nums)      - Bottom Navigation Bar para mobile
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     │
                                     ▼
                      CAMADA DE COMPONENTES MODULARES
                      - 25 componentes padronizados via CVA
                      - StateContainer universal (4 estados)
                      - Decomposição de monólitos (> 1.000 linhas)
                      - Resgate de rotas órfãs (/documentos/editor)
                                     │
                                     ▼
                      OPERAÇÃO ESPORTIVA DE ELITE
                      - Mesa do apontador ao vivo e placares
                      - Súmula oficial A4 P&B (3 e 5 sets)
                      - Motor de classificação FIVB/CBV
                      - Code-splitting com React.lazy (< 350kB)
```

---

## 3. MAPA DOS DOCUMENTOS ESPECÍFICOS DO BLUEPRINT

Para aprofundamento em cada área técnica, consulte os 10 cadernos temáticos criados em `docs/frontend-blueprint/`:

1. [`00-design-vision.md`](file:///home/diego-martins/docker/volei/docs/frontend-blueprint/00-design-vision.md): Filosofia de design, perfis de usuário (organizador, apontador, árbitro, dirigente) e o que o BaseOS é vs o que não é.
2. [`01-visual-system.md`](file:///home/diego-martins/docker/volei/docs/frontend-blueprint/01-visual-system.md): Paleta semântica completa, escala tipográfica com `tabular-nums`, espaçamentos e escala oficial de `border-radius`.
3. [`02-navigation-blueprint.md`](file:///home/diego-martins/docker/volei/docs/frontend-blueprint/02-navigation-blueprint.md): Unificação do `MainLayout`, 5 grupos da Sidebar, Bottom Nav mobile, Breadcrumbs e resgate de rotas órfãs.
4. [`03-component-blueprint.md`](file:///home/diego-martins/docker/volei/docs/frontend-blueprint/03-component-blueprint.md): Catálogo e especificação formal dos 25 componentes centrais de UI.
5. [`04-page-blueprint.md`](file:///home/diego-martins/docker/volei/docs/frontend-blueprint/04-page-blueprint.md): Plano de redesenho e desacoplamento tela a tela das 22 páginas da aplicação.
6. [`05-sports-operation-blueprint.md`](file:///home/diego-martins/docker/volei/docs/frontend-blueprint/05-sports-operation-blueprint.md): Mesa do apontador ao vivo, escalação DND de quadra 1-6, regras FIVB/CBV e limites de elenco.
7. [`06-responsive-blueprint.md`](file:///home/diego-martins/docker/volei/docs/frontend-blueprint/06-responsive-blueprint.md): Estratégia adaptativa de 375px a 1440px+ e conversão de tabelas em cards sanfonados.
8. [`07-accessibility-blueprint.md`](file:///home/diego-martins/docker/volei/docs/frontend-blueprint/07-accessibility-blueprint.md): Conformidade WCAG 2.1 AA, navegação completa por teclado e anúncios `aria-live` em placares.
9. [`08-motion-blueprint.md`](file:///home/diego-martins/docker/volei/docs/frontend-blueprint/08-motion-blueprint.md): Orçamento de micro-interações de 150ms com Framer Motion e respeito a `prefers-reduced-motion`.
10. [`09-component-architecture.md`](file:///home/diego-martins/docker/volei/docs/frontend-blueprint/09-component-architecture.md): Estrutura em camadas de diretórios e as 8 Regras de Ouro Anti-Inconsistência.
11. [`10-implementation-roadmap.md`](file:///home/diego-martins/docker/volei/docs/frontend-blueprint/10-implementation-roadmap.md): Roteiro sequencial de implementação dividido em 14 fases estruturadas.

---

## 4. DIRETRIZES FUNDAMENTAIS PARA A PRÓXIMA ETAPA

> **GARANTIA DE NÃO-REGRESSÃO**: Nenhuma etapa de implementação poderá alterar regras de negócio em `src/services/` nem violar os 248 testes unitários existentes. Toda refatoração será conduzida em pequenos lotes modulares validados a cada passo por:
> ```bash
> npx tsc -p tsconfig.app.json --noEmit && npm run lint && npm test && npm run build
> ```
