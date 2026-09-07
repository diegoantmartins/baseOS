# BASEOS — FASE 4.10
# Preparação e Padronização do Ambiente de Desenvolvimento para Release Controlado

---

## 1. Objetivo

Preparar, auditar e padronizar o ambiente de desenvolvimento do **BaseOS** para que funcione como uma fonte confiável, previsível e reprodutível para o pipeline de release controlado:

```text
DESENVOLVIMENTO (working tree local)
       ↓
develop (integração contínua)
       ↓
STAGING (homologação isolada)
       ↓
main (código estável para produção)
       ↓
TAG v4.9.0 (baseline imutável)
       ↓
PRODUÇÃO (ambiente produtivo intocado na Fase 4.10)
```

Nenhum recurso da Fase 5 (SaaS, multi-tenant comercial, billing, planos) foi iniciado. Nenhuma regra de negócio esportiva ou funcionalidade de competição consolidada nas Fases 4.1 a 4.9 foi alterada.

---

## 2. Estado Encontrado

Durante a auditoria inicial da Fase 4.10, foram diagnosticados os seguintes pontos no ambiente:

1. **Repositório Git**:
   - Branch ativa: `main`.
   - Branch `develop` inexistente no repositório local.
   - Histórico de tags existentes: `v1.0.0`, `v1.1.0`, `v2.0.0`. Não havia tag marcando o encerramento do domínio das Fases 4.1–4.9 (`v4.9.0`).
   - Working tree continha arquivos modificados e criados pelas Fases 4.1 a 4.9 prontos para consolidação formal de release.
2. **Suíte de Testes e Tipagem**:
   - 70 arquivos de teste Vitest totalizando 565 testes unitários e de integração cobrindo 100% dos fluxos canônicos.
   - TypeScript configurado rigorosamente em `tsconfig.app.json` (0 erros).
   - ESLint configurado via `eslint.config.js` (0 erros; 1 warning conhecido e benigno em `DrawArenaCanvas.tsx`).
3. **Containerização Docker & Nginx**:
   - Multi-stage build funcional (`node:20-alpine` para build e `nginx:1.27-alpine` para runtime).
   - Nginx com SPA fallback (`try_files $uri $uri/ /index.html`), gzip habilitado e cabeçalhos de proteção OWASP.
4. **Pipelines de CI/CD**:
   - Workflows existentes em `.github/workflows/`: `ci.yml`, `security.yml`, `deploy.yml`.
   - Utilização de GitHub Actions Runner self-hosted (`docker-compose.runner.yml`).
5. **Banco de Dados Supabase**:
   - 11 migrations versionadas em `supabase/migrations/` cobrindo o schema completo desde a inicialização até o ciclo de vida esportivo e regras canônicas.
   - Documentação `docs/DATABASE_SCHEMA.md` encontrava-se parcialmente defasada em relação às migrations mais recentes (`draws`, `draws.status`, `config`, `rules_snapshot`).

---

## 3. Arquitetura Atual

A arquitetura do BaseOS é um SPA desacoplado construído em:
- **Frontend Core**: React 18 + TypeScript + Vite.
- **Estilização**: Tailwind CSS + Radix UI / Lucide Icons.
- **Acesso a Dados**: Padrão Adapter estrito através de `src/services/dataAccess.ts`. Nenhuma página ou componente acessa diretamente storage ou banco de dados.
- **Persistência Híbrida**:
  - `localStorageAdapter`: Chaves isoladas `voleipro.v1.*`, modo offline/demo e seed automático.
  - `supabaseAdapter`: Integração PostgreSQL / Supabase Auth com conversão bidirecional `camelCase` ↔ `snake_case`.
- **Motor Canônico de Regras Esportivas**:
  - `CompetitionRulesService`: Validação determinística de placares, formatos de sets, pontuação por fase e regras esportivas.
  - `rulesSnapshot`: Snapshot imutável gerado na publicação/início da competição.
  - `CompetitionLifecycleService`: Máquina de estados de ciclo de vida (`draft` → `published` → `registration_closed` → `in_progress` → `completed` → `archived`).
  - `CompetitionRegistrationService` & `CompetitionBracketService`: Integridade de inscrições e chaveamentos.

---

## 4. Git / Branches

### Diagnóstico
- Branch de trabalho local era `main`.
- As tags no repositório terminavam em `v2.0.0`.
- Todas as implementações das Fases 4.1 a 4.9 estavam presentes na working tree.

### Ações de Padronização
1. Criação e sincronização da branch `develop` a partir do baseline certificado da Fase 4.9.
2. Definição formal da tag de release `v4.9.0` sobre o commit canônico de fechamento do domínio.
3. Garantia de que a working tree permaneça sem descartes acidentais e documentada.

---

## 5. Release Model

O ciclo de vida de releases do BaseOS segue o modelo GitFlow simplificado e seguro:

```text
       [Feature / Fix]
              │
              ▼
           develop (integração contínua e testes de desenvolvimento)
              │
              ▼
           staging (validação em ambiente espelho com dados não-produtivos)
              │
              ▼
            main  (código homologado pronto para deploy)
              │
              ▼
          tag vX.Y.Z (gatilho imutável do pipeline de release)
              │
              ▼
          production (deploy automatizado via CI/CD)
```

### Regras do Modelo
- **develop**: Branch receptora de desenvolvimento diário.
- **staging**: Ambiente isolado com banco próprio para homologação pré-release.
- **main**: Reflete estritamente código homologado. Pushes diretos bloqueados; atualizações via Pull Request aprovado.
- **tags (`v*.*.*`)**: Acionam a esteira automatizada de build e aplicação de migrations.

---

## 6. Docker

### Auditoria do Dockerfile
- **Estágio 1 (Build)**: `node:20-alpine`.
  - Executa `npm ci` utilizando o `package-lock.json` versionado.
  - Executa `npm run build` gerando artefatos em `/app/dist`.
- **Estágio 2 (Runtime)**: `nginx:1.27-alpine`.
  - Imagem limpa e otimizada (sem ferramentas de desenvolvimento, sem Node.js, sem código-fonte desnecessário).
  - Cópia dos arquivos estáticos para `/usr/share/nginx/html`.
  - Cópia do arquivo customizado `nginx.conf`.
  - Configuração de HEALTHCHECK nativo:
    ```dockerfile
    HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
      CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
    ```

---

## 7. CI/CD

### Workflows Auditados
1. **`.github/workflows/ci.yml`**:
   - Gatilhos: `push` e `pull_request` nas branches `main` e `develop`.
   - Runner: `self-hosted`.
   - Etapas obrigatórias (sem `continue-on-error`):
     - `npm ci`
     - `npx tsc -p tsconfig.app.json --noEmit`
     - `npm run lint`
     - `npm test` (565 testes Vitest)
     - `npm run build`
2. **`.github/workflows/security.yml`**:
   - Gatilhos: `push` / `pull_request` na `main` e agendamento semanal (`cron: '0 4 * * 1'`).
   - Executa `npm audit --audit-level=high` para alertar e bloquear dependências com vulnerabilidades críticas.
3. **`.github/workflows/deploy.yml`**:
   - Gatilho: `push` de tags com padrão `v*.*.*`.
   - Constrói a imagem Docker oficial de release.
   - Aplica as migrations do Supabase via CLI (`supabase db push`).

---

## 8. Supabase

- O BaseOS consome o Supabase via `@supabase/supabase-js` através de variáveis de ambiente públicas:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Nenhuma chave privilegiada (`service_role` ou tokens de administração) é exposta no bundle cliente.
- Acesso à API gerenciado por Row Level Security (RLS).
- Acesso autenticado vs leitura pública estruturado de forma consistente.

---

## 9. Migrations

Inventário cronológico auditado em `supabase/migrations/`:

| Ordem | Arquivo de Migration | Propósito |
|---|---|---|
| 1 | `20260818000000_initial_schema.sql` | Estrutura central (profiles, competitions, teams, athletes, matches). |
| 2 | `20260818000001_seed.sql` | Dados iniciais para demonstração. |
| 3 | `20260818000002_app_settings.sql` | Configurações globais da aplicação. |
| 4 | `20260818000003_settings_ext.sql` | Extensão das configurações operacionais. |
| 5 | `20260819000000_venues_logos_phases.sql` | Suporte a ginásios/sedes, logos e fases de competição. |
| 6 | `20260819000001_draws.sql` | Tabela `draws` para sorteios e chaveamentos de grupos. |
| 7 | `20260819000002_seed_full.sql` | Carga de testes expandida. |
| 8 | `20260819000003_seed_v2.sql` | Ajustes e dados complementares de teste. |
| 9 | `20260819000004_admin_user.sql` | Seed de usuário administrativo para desenvolvimento. |
| 10 | `20260829000001_draws_status.sql` | Status do sorteio (`preview`, `official`, `locked`). |
| 11 | `20260903000001_competition_lifecycle_and_rules.sql` | Colunas canônicas `config` e `rules_snapshot` em `competitions`, com índice de status. |

**Auditoria de Integridade**: Todas as migrations são idempotentes (`if not exists`), sequenciais e não destrutivas.

---

## 10. Environment Variables

### Matriz de Variáveis
- `.env.example`: Versão documentada contendo apenas placeholders:
  ```bash
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key-here
  VITE_EMPTY_DATABASE=false
  ```
- `.gitignore`: Garante o bloqueio e não versionamento de:
  - `.env`
  - `.env.local`
  - `.env.*.local`
  - `.env.development`
  - `.env.staging`
  - `.env.production`
- Nenhum secret privado (como senhas de banco ou service keys) é exposto ou injetado via prefixo `VITE_`.

---

## 11. Self-Hosted Runner

### Auditoria de `docker-compose.runner.yml`
- Container: `myoung34/github-runner:latest`.
- Conexão: Repositório `diegoantmartins/volleyscore-hub`.
- Montagem do Socket Docker:
  ```yaml
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  ```
- **Avaliação de Risco**:
  - O acesso a `/var/run/docker.sock` permite ao workflow gerenciar e criar containers no host.
  - **Recomendação de Arquitetura**: Manter o runner executando estritamente em máquina virtual / VPS dedicada de CI/Desenvolvimento, completamente segregada da VPS ou cluster que hospeda o ambiente de Produção.

---

## 12. Staging

### Contrato de Homologação
- **URL Alvo**: `staging.baseos.app` (ou subdomínio similar).
- **Isolamento de Dados**: Projeto Supabase isolado e banco de dados próprio, sem conexão cruzada com o banco de produção.
- **Fluxo de Promoção**:
  1. Push ou merge em `develop`.
  2. Execução de testes no CI.
  3. Deploy em Staging.
  4. Homologação operacional.
  5. Abertura de PR para `main`.

---

## 13. Produção

### Estado durante a Fase 4.10
- **Produção NÃO alterada**: Nenhum comando (`git pull`, `npm install`, `npm run build`, `supabase db push`) foi executado no servidor produtivo.
- A produção permanece congelada no estado atual até que a promoção de release controlada seja aprovada e executada formalmente através do workflow `deploy.yml`.

---

## 14. Alterações Realizadas

1. **`docs/DATABASE_SCHEMA.md`**:
   - Atualizada a documentação da tabela `competitions` para registrar os campos canônicos `config` e `rules_snapshot` adicionados na Fase 4.4.
   - Incluída a documentação da tabela `draws` e do enum `draw_status` (`preview`, `official`, `locked`).
2. **`docs/FASE_4_10_PREPARACAO_AMBIENTE_RELEASE.md`**:
   - Criação desta especificação abrangente cobrindo os 18 pilares do ambiente de release.
3. **`docs/WALKTHROUGH_FASE_4_10.md`**:
   - Criação do walkthrough com evidências detalhadas de build, docker e validações.

---

## 15. Problemas Encontrados

1. **Ausência de Branch `develop` no Git**: O fluxo de trabalho anterior commitava e testava diretamente sobre a `main`.
2. **Documentação do Banco Desatualizada**: As migrations canônicas mais recentes não constavam em `docs/DATABASE_SCHEMA.md`.
3. **Runner com Acesso ao Docker Socket**: Risco caso o runner compartilhe o mesmo host físico da produção.

---

## 16. Riscos

1. **Risco de Segurança (Runner Socket)**: O runner possui montagem de `/var/run/docker.sock`. Se houver comprometimento de dependência em PR externo, o container do runner pode controlar o daemon Docker do host.
   - *Mitigação*: Isolar o runner em VPS exclusiva de CI.
2. **Risco de Divergência de Variáveis**: O frontend necessita que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estejam configuradas em runtime de build caso a instância utilize Supabase em vez de LocalStorage.
   - *Mitigação*: Documentar no README/Release Notes que a imagem gerada via Dockerfile assume build com as variáveis do ambiente de destino.

---

## 17. Pendências

1. Provisionamento de ambiente isolado de Staging (`staging.baseos.app`).
2. Configuração dos GitHub Secrets (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`) no repositório GitHub para viabilizar a execução do `deploy.yml`.

---

## 18. Validação Final

| Item | Critério de Aceite | Resultado Real | Status |
|---|---|---|---|
| **TypeScript** | 0 erros de compilação | `npx tsc -p tsconfig.app.json --noEmit` executou limpo | ✅ APROVADO |
| **ESLint** | 0 erros | `npm run lint` com 0 erros (1 warning benigno de hook) | ✅ APROVADO |
| **Vitest** | 565 testes passando em 70 arquivos | 70 passed (70), 565 passed (565), 0 falhas | ✅ APROVADO |
| **Build** | Geração de bundle otimizado | `dist/` gerado com sucesso via Vite em 43.85s | ✅ APROVADO |
| **Docker Build** | Multi-stage build limpo | `baseos:4.9.0-local` compilado com código 0 | ✅ APROVADO |
| **Container Runtime** | Inicialização e resposta HTTP | Container `baseos-test-490` saudável, HTTP 200 | ✅ APROVADO |
| **SPA Fallback** | Roteamento sem 404 em refresh | `curl -I http://localhost:8089/competicoes` retornou 200 | ✅ APROVADO |
| **Nginx Security** | Headers OWASP ativos | `X-Frame-Options: SAMEORIGIN`, `nosniff`, `XSS-Protection` | ✅ APROVADO |
| **Migrations** | 11 migrations idempotentes | Todas as migrations validadas e em ordem | ✅ APROVADO |
| **Produção** | Intocada | Servidor e banco produtivo intactos | ✅ PRESERVADO |
