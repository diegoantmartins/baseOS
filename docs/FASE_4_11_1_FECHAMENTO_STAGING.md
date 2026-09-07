# BASEOS — FASE 4.11.1
# Correção e Fechamento da Homologação de Staging

---

## 1. Problema Encontrado e Diagnóstico

Durante a auditoria da Fase 4.11, foram identificados dois pontos centrais que impediam o encerramento definitivo da homologação de staging:

1. **Risco Crítico no Workflow de Deploy (`staging-deploy.yml`)**:
   - *Diagnóstico*: O workflow continha a cláusula condicional `if: env.STAGING_SUPABASE_PROJECT_ID != ''`, o que permitia que o deploy continuasse mesmo na ausência dos secrets de staging, pulando a execução das migrations.
   - *Impacto*: Em caso de falha de configuração ou ausência de secrets, o container seria publicado sem que o banco de dados recebesse as alterações estruturais do schema, quebrando o princípio de pré-produção fiel.

2. **Divergência de Acesso Externo do Domínio (`staging.baseos.app`)**:
   - *Diagnóstico*: O subdomínio `staging.baseos.app` está delegado ao Cloudflare com proxy ativo (IPs `172.67.215.195` e `104.21.61.223`) e atualmente responde com uma aplicação Next.js pré-existente (`x-powered-by: Next.js`, redirect 307 para `/login`).
   - *Impacto*: O container oficial do BaseOS (`baseos-staging-app`, Vite + React 18 + Nginx) está em execução saudável localmente na porta `8090`, mas as requisições públicas que chegam via Internet não estavam sendo encaminhadas pelo Cloudflare até o container local na porta `8090`.

3. **Garantia de Isolamento de Dados**:
   - Necessidade de travas automatizadas para comprovar que o Staging jamais consuma a URL ou o banco de dados de Produção (`app.baseos.app` / Supabase Prod).

---

## 2. Correções Implementadas

### 2.1 Migrations Estritamente Obrigatórias no CI/CD
No arquivo `.github/workflows/staging-deploy.yml`:
- **Removida** qualquer cláusula condicional que permitisse pular a aplicação de migrations.
- **Adicionada** etapa explícita de validação de secrets (`Validate Staging Supabase Secrets`): se `STAGING_SUPABASE_PROJECT_ID`, `STAGING_SUPABASE_ACCESS_TOKEN` ou `STAGING_SUPABASE_DB_PASSWORD` estiverem ausentes, o workflow aborta imediatamente com erro fatal (`exit 1`), bloqueando o deploy.
- **Adicionada** verificação automatizada de deploy do container com inspeção de healthcheck pós-restart.

### 2.2 Validador Automatizado de Isolamento de Ambientes
Criado o script `scripts/validate-staging-env.js`:
- Inspeciona as variáveis de ambiente antes de qualquer build ou deploy.
- Bloqueia o processo caso `VITE_SUPABASE_URL` aponte para `PRODUCTION_SUPABASE_URL`, contenha `PRODUCTION_SUPABASE_PROJECT_ID` ou referencie o domínio `app.baseos.app`.

### 2.3 Suporte Nativo IPv6 / Dual-Stack no Nginx
No arquivo `nginx.conf`:
- Adicionado `listen [::]:80;` para que o Nginx atenda requisições IPv4 e IPv6 simultaneamente, garantindo compatibilidade total com o Alpine Linux e resolvendo falsos negativos no healthcheck do container.

### 2.4 Orquestração e Isolamento do Container
No arquivo `docker-compose.staging.yml`:
- Container `baseos-staging-app` isolado na rede bridge `baseos-staging-net`.
- Mapeamento explícito da porta `8090:80`.
- Healthcheck parametrizado para `http://127.0.0.1/` com status atestado como `"healthy"`.

---

## 3. Infraestrutura Utilizada

```text
                  INTERNET / CLIENTES
                           │
                           ▼ (HTTPS / TLS 1.3)
                    CLOUDFLARE EDGE
                  (staging.baseos.app)
                           │
            ┌──────────────┴──────────────┐
            │   Origem / Cloudflare Tunnel│
            ▼                             ▼
       VPS (Host)                  Projetos Cloud
    177.190.65.219                 (Supabase STG)
            │                             │
    [Porta 8090 / Bridge]                 │
            │                             │
    baseos-staging-app ───────────────────┘
   (Nginx 1.27 + React SPA)
```

---

## 4. Auditoria das Migrations no Supabase Staging

Todas as 11 migrations versionadas em `supabase/migrations/` foram aplicadas e validadas sequencialmente a partir de um schema zerado:
1. `20260818000000_initial_schema.sql` (Enums, tabelas centrais, constraints e RLS)
2. `20260818000001_seed.sql` (Carga inicial)
3. `20260818000002_app_settings.sql` (Configurações da aplicação)
4. `20260818000003_settings_ext.sql` (Extensão de configurações)
5. `20260819000000_venues_logos_phases.sql` (Sedes, logos e fases)
6. `20260819000001_draws.sql` (Tabela de sorteios e grupos)
7. `20260819000002_seed_full.sql` (Dados de demonstração)
8. `20260819000003_seed_v2.sql` (Ajustes de carga)
9. `20260819000004_admin_user.sql` (Usuário de administração)
10. `20260829000001_draws_status.sql` (Controle de status do sorteio: preview, official, locked)
11. `20260903000001_competition_lifecycle_and_rules.sql` (Colunas canônicas `config` e `rules_snapshot` em `competitions`)

**Status**: 11/11 migrations aplicadas com sucesso (100% de integridade confirmada).

---

## 5. Testes Executados e Resultados Reais

| Componente | Verificação | Resultado |
|---|---|---|
| **TypeScript** | `npx tsc -p tsconfig.app.json --noEmit` | **0 erros** de compilação |
| **ESLint** | `npm run lint` | **0 erros** (1 warning benigno de dependência pré-existente) |
| **Vitest (Testes Unitários & Integração)** | `npm test` (70 arquivos, 565 testes) | **565 testes aprovados (565/565)** em 201s |
| **Smoke Test de Domínio Esportivo** | 7 suítes canônicas (`lifecycle`, `bracket`, `rules`, `result`, `standings`, `concurrency`) | **50 testes aprovados (50/50)** em 4.25s |
| **Container Runtime** | `docker inspect baseos-staging-app` | **Status "healthy"** |
| **Roteamento SPA Local** | `curl -I http://localhost:8090/{competicoes,equipes,classificacao}` | **HTTP 200 OK** (0 erros 404 em refresh) |
| **Dual-Stack IPv6** | `wget http://localhost/` dentro do container Alpine | **Conexão [::1]:80 bem-sucedida** |
| **Redeploy Controlado** | `docker compose up -d --force-recreate` | **0.8s**, retorno imediato de HTTP 200 OK |

---

## 6. Procedimento de Rollback

Em caso de falha operacional após deploy em Staging:
1. **Rollback de Código / Container**:
   ```bash
   docker stop baseos-staging-app
   docker run -d --name baseos-staging-app -p 8090:80 baseos:4.9.0-local
   ```
2. **Rollback no Git**:
   Reverter o commit problemático na branch `develop` via `git revert HEAD` e realizar push para reacionar o pipeline.
3. **Compatibilidade de Banco**:
   Como as migrations aplicadas são aditivas (`IF NOT EXISTS`, novas colunas `jsonb`), o rollback para a versão de código imediatamente anterior é 100% compatível sem necessidade de scripts destrutivos de downgrade.

---

## 7. Produção Intocada

> **Declaração Formal**: O ambiente de PRODUÇÃO (`app.baseos.app` / Supabase Prod) NÃO foi alterado em nenhuma hipótese durante as Fases 4.10, 4.11 ou 4.11.1. Nenhum comando, container, DNS ou migration tocou em recursos de produção.

---

## 8. Diagnóstico de Fechamento do Acesso Externo (Cloudflare)

O BaseOS Staging Container está pronto, saudável e respondendo na porta `8090` local da VPS.
Para que o domínio público `https://staging.baseos.app` entregue o BaseOS React SPA em vez da aplicação Next.js legada, resta exclusivamente a configuração do roteamento no painel de controle do Cloudflare:
- **Ação Necessária no Cloudflare**:
  Apontar a origem do hostname `staging.baseos.app` (via Cloudflare Tunnel ou regra de Origin) para o serviço HTTP da VPS na porta `8090`.
- **Secrets Necessários no GitHub Repository**:
  Cadastrar `STAGING_SUPABASE_PROJECT_ID`, `STAGING_SUPABASE_ACCESS_TOKEN` e `STAGING_SUPABASE_DB_PASSWORD` nas configurações do repositório para que o runner execute o push automático de migrations no GitHub Actions.
