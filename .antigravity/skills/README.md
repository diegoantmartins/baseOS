# BaseOS — Camada de Inteligência Frontend (Agent Skills)

Este diretório contém a **BaseOS Frontend Intelligence Layer**: o conjunto oficial e estruturado de Agent Skills utilizado para auditar, planejar, desenvolver e redesenhar o frontend do BaseOS no Antigravity IDE.

---

## 1. VISÃO GERAL DAS SKILLS INSTALADAS

| Skill | Tipo | Fonte | Responsabilidade Principal | Prioridade |
| :--- | :--- | :--- | :--- | :---: |
| **baseos-frontend** | BaseOS | Própria | Arquitetura React 18, TypeScript, adapter `dataAccess.ts`, preservação da lógica de negócio. | **P1 (Máxima)** |
| **baseos-uiux** | BaseOS | Própria | UX/UI de SaaS esportivo profissional, ausência de estética gamer, regras de contraste e legibilidade. | **P1 (Máxima)** |
| **baseos-design-system** | BaseOS | Própria | Hierarquia de componentes, design tokens, Tailwind 3.4, temas claro/escuro, cores semânticas. | **P1 (Máxima)** |
| **baseos-navigation** | BaseOS | Própria | Arquitetura de informação, sidebar, rotas `react-router-dom`, agrupamento contextual. | **P1 (Máxima)** |
| **baseos-audit** | BaseOS | Própria | Auditoria completa de UX/UI, acessibilidade WCAG, cobertura de 4 estados, não-regressão. | **P1 (Máxima)** |
| **shadcn** | Oficial | Official shadcn/ui | Regras oficiais de composição, acessibilidade Radix, formulários, alertas e skeletons. | **P2 (Especializada)** |
| **react-best-practices** | Externa | Vercel Engineering | Otimização de performance React, imutabilidade, prevenção de re-renderizações e meoização. | **P3 (Geral)** |
| **ui-ux-pro-max** | Externa | Community / High Quality | Banco de inteligência de design: paletas, tipografias, layouts de dashboards e visual hierarchy. | **P3 (Geral)** |
| **radix-ui-design-system** | Externa | Headless Primitives | Padrões de acessibilidade WAI-ARIA, navegação por teclado e componentes headless. | **P3 (Geral)** |
| **tailwind-design-system** | Externa | Tailwind Community | Boas práticas de Tailwind CSS, responsividade mobile-first e estruturação de tokens. | **P3 (Geral)** |
| **web-design-guidelines** | Externa | Vercel Labs | Diretrizes globais de web interface, contraste visual e responsividade. | **P3 (Geral)** |

---

## 2. HIERARQUIA DE AUTORIDADE EM CASO DE CONFLITO

Quando recomendações de diferentes Skills entrarem em conflito, os modelos de IA devem seguir rigorosamente esta ordem de precedência:

1. 🛡️ **Segurança e Integridade do Sistema** (Preservação de regras de negócio em `src/services`).
2. 📐 **Arquitetura Existente do BaseOS** (Uso do adapter `dataAccess.ts`, snake_case/camelCase).
3. ⚽ **Skills Específicas do BaseOS** (`baseos-frontend`, `baseos-uiux`, `baseos-design-system`, `baseos-navigation`, `baseos-audit`).
4. 🧱 **Skill Oficial shadcn/ui** (`shadcn`).
5. ⚡ **Boas Práticas React / Vercel** (`react-best-practices`).
6. 🎨 **Inteligência Visual Externa** (`ui-ux-pro-max`, `tailwind-design-system`, `web-design-guidelines`).

---

## 3. DEPENDÊNCIAS DO PROJETO

As Skills operam sobre as seguintes dependências instaladas no `package.json` do BaseOS:
- **React**: 18.3.1
- **TypeScript**: 5.8.3
- **Vite**: 5.4.19
- **Tailwind CSS**: 3.4.17
- **UI & Primitivos**: `@radix-ui/react-*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `framer-motion`, `sonner`
- **Formulários**: `react-hook-form`, `@hookform/resolvers`, `zod`
- **Roteamento & Estado**: `react-router-dom`, `@tanstack/react-query`, `@supabase/supabase-js`
- **PDF & Exportação**: `@react-pdf/renderer`, `jspdf`, `pdf-lib`
- **Testes**: `vitest`, `@testing-library/react`
