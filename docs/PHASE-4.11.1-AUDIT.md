# BASEOS — FASE 4.11.1 — AUDITORIA AMBIENTAL E DE BROWSER E2E

**Projeto:** BaseOS / VolleyPro  
**Fase:** 4.11.1 — Browser E2E Closure, Production Smoke Test & Final Regression  
**Data:** 2026-09-07  
**Responsável:** Antigravity / Gemini Core  
**Baseline:** Fase 4.11 homologada sistemicamente (9.7/10) com bloqueio ambiental no browser subagent.

---

## 1. ESCOPO DA AUDITORIA

A Seção 3 do Prompt Mestre estabelece a obrigatoriedade de executar uma auditoria estrita antes de qualquer modificação:
> *"Antes de alterar qualquer arquivo: AUDIT ONLY. Inspecione: package.json, package-lock.json, configuração de testes, configuração Vite, configuração TypeScript, configuração de Playwright se existir, versões instaladas, browsers instalados, cache local do Playwright, diretórios de browser, possibilidade de usar Chromium/Chrome já instalado, scripts npm, estrutura de testes, testes E2E existentes, src/test/e2eSystemLifecycle.test.ts, documentação da Fase 4.11, scripts PostgreSQL da Fase 4.11. Não implementar nada antes de registrar o diagnóstico."*

---

## 2. INVENTÁRIO DO AMBIENTE E CONFIGURAÇÕES

### 2.1 Dependências e Scripts (`package.json`)
- **Node.js:** v20.19.6 (`/home/diego-martins/.nvm/versions/node/v20.19.6/bin/node`)
- **NPM:** 10.8.2 (`/home/diego-martins/.nvm/versions/node/v20.19.6/bin/npm`)
- **Playwright no Projeto:** `"playwright": "^1.62.1"` (declarado em `dependencies`).
- **Vitest:** `"vitest": "^3.2.4"` (declarado em `devDependencies`).
- **TypeScript:** `"typescript": "^5.8.3"` (declarado em `devDependencies`).
- **Vite:** `"vite": "^5.4.19"` (declarado em `devDependencies`).
- **React:** `"react": "^18.3.1"`, `"react-dom": "^18.3.1"`.
- **Scripts:**
  - `npm run dev` -> `vite`
  - `npm run build` -> `vite build`
  - `npm run lint` -> `eslint .`
  - `npm test` -> `vitest run`

### 2.2 Configuração do Servidor (`vite.config.ts`)
- Servidor configurado com `strictPort: true`, suporte a `assetsInclude: ["**/*.pdf"]` e `alias: { "@": path.resolve(__dirname, "./src") }`.
- Servidor de desenvolvimento atualmente em execução ativa na porta `5173`:
  - `npx vite --port 5173 --host`
  - Resposta HTTP: `HTTP/1.1 200 OK` confirmado via `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/`.

### 2.3 Configuração de Testes (`vitest.config.ts`)
- Ambiente: `jsdom`.
- Arquivos de teste: `src/**/*.{test,spec}.{ts,tsx}`.
- Setup: `src/test/setup.ts`.
- Suíte atual: 92 arquivos de teste, 806 testes unitários e de integração passing (0 falhas).

### 2.4 Configuração TypeScript (`tsconfig.app.json`)
- Target: `ES2020`, Módulo: `ESNext`, `noEmit: true`, `jsx: react-jsx`.
- Resolução limpa com `npx tsc -p tsconfig.app.json --noEmit` (**0 erros**).

---

## 3. DIAGNÓSTICO DO BLOQUEIO DE BROWSER E2E

### 3.1 Causa Raiz do Erro Original
Na Fase 4.11, a tentativa de inicialização de sessão via ferramenta de automação do IDE (`open_browser_url`) falhou com o seguinte erro retornado pelo runtime do subagente:
```text
failed to create browser context: failed to run playwright manager: failed to install playwright: 
could not install driver: could not install driver: error: got non 200 status code: 404 (404 Not Found) 
from https://playwright.azureedge.net/builds/driver/playwright-1.57.0-linux.zip
```
A URL solicitada apontava para uma versão inexistente (`playwright-1.57.0-linux.zip`) nos CDNs externos (`azureedge.net`, `playwright-akamai`, `playwright-verizon`).

### 3.2 Descoberta Crucial de Browsers no Ambiente Host
A varredura minuciosa do sistema de arquivos identificou que o ambiente Linux host **já possui navegadores instalados e perfeitamente funcionais em cache**:
1. **Playwright Chromium:**
   - Caminho: `/home/diego-martins/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`
   - Versão: `Google Chrome for Testing 151.0.7922.34`
   - Status: Executável nativo íntegro, com todas as bibliotecas dinâmicas satisfeitas (`DEPENDENCIES_VALIDATED` presente).
2. **Puppeteer Chrome:**
   - Caminho: `/home/diego-martins/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome`
   - Versão: `Google Chrome for Testing 148.0.7778.97`
   - Status: Totalmente operacional.

### 3.3 Teste de Sanidade e Conectividade do Playwright Local
Executamos uma sondagem via Node.js utilizando o pacote Playwright nativo do repositório:
```bash
node -e "const { chromium } = require('playwright'); (async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/');
  console.log('Page title:', await page.title());
  await browser.close();
})();"
```
**Resultado Obtido:**
```text
Page title: BaseOS — Sistema de Gestão de Competições Esportivas
Código de saída: 0
```
O Playwright local utiliza o binário já cacheado em `/home/diego-martins/.cache/ms-playwright/chromium-1234/` sem tentar qualquer download externo, carregando a aplicação React 18 e renderizando a página principal instantaneamente.

---

## 4. ESTRUTURA DE TESTES E SCRIPTS EXISTENTES

1. **Testes de Domínio e Ciclo de Vida:**
   - `src/test/e2eSystemLifecycle.test.ts` (1169 linhas, 7 cenários cobrindo o ciclo completo de 33 passos, Voltz, Bo5, formatos customizados com BYE, validações inválidas e concorrência lógica).
2. **Homologação no PostgreSQL Real:**
   - `scripts/test-phase-4-11-postgres.sh` (8 provas executadas com 100% de sucesso no banco `volei_test_db` do container `supabase-db`).

---

## 5. ESTRATÉGIA DE EXECUÇÃO DA FASE 4.11.1

Para homologar o Browser E2E sem alterar a aplicação BaseOS e sem violar o princípio de não-regressão:
1. Criar um script dedicado de Browser E2E em Node.js (`scripts/e2e-browser-test.js`) consumindo o `playwright` nativo do projeto.
2. O script executará de forma sequencial, com validação visual (screenshots salvos em `artifacts/e2e-screenshots/`) e checagem de DOM real:
   - **Jornada A:** Criação e parametrização de competição no Format Builder.
   - **Jornada B:** Cadastro e gestão de elencos/inscrições de equipes.
   - **Jornada C:** Sorteio (Draw Arena) com equipes elegíveis e ausência de fake teams.
   - **Jornada D:** Exibição do StageGraph e MatchSlots.
   - **Jornada E/F:** Abertura e materialização de partidas.
   - **Jornada G:** Geração e conferência da Súmula Oficial (3 sets e 5 sets).
   - **Jornada H/I/J:** Lançamento de resultados, classificação e desempates.
   - **Jornada K/L/M:** Overall ranking, progressão de finalistas e bracket.
   - **Jornada N:** Portal da Equipe (`/portal/equipe/:token`) read-only e ausência de ordem de saque.
   - **Jornada O:** Portal Público (`/c/:slug`) anônimo sem dados restritos.
   - **Jornada P:** Relatórios oficiais em PDF.
   - **Cenários Especiais:** Voltz declarativo, Best of 5 e formato customizado com BYE.
3. Executar o Smoke Test de Produção.
4. Reexecutar a regressão completa (Vitest 806 testes, TypeScript, ESLint, Build, PostgreSQL 8 provas).
5. Documentar todos os achados com honestidade técnica e emitir a certificação final.
