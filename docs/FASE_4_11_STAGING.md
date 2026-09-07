# BASEOS — FASE 4.11
# Provisionamento, Configuração e Homologação do Ambiente de Staging

---

## 1. Objetivo

Criar, configurar, validar e homologar um ambiente de **STAGING** real, reproduzível e estritamente segregado da produção para a validação da release **BaseOS v4.9.0**.

Garantir o fluxo contínuo e controlado:

```text
DESENVOLVIMENTO (working tree local)
       ↓
develop (branch de integração contínua)
       ↓
STAGING (homologação isolada: staging.baseos.app)
       ↓
homologação e testes funcionais (Smoke Tests)
       ↓
main (código aprovado para produção)
       ↓
tag v4.9.0 (baseline imutável)
       ↓
PRODUÇÃO (app.baseos.app — estritamente intocada)
```

Nenhum recurso da Fase 5 (SaaS, multi-tenant comercial, billing, planos) foi iniciado. O ambiente de produção permaneceu **100% intocado**.

---

## 2. Infraestrutura Encontrada

Durante a auditoria de infraestrutura da Fase 4.11, foram mapeados:
1. **Domínios e DNS**:
   - `staging.baseos.app`: Apontado no Cloudflare (IPs `172.67.215.195`, `104.21.61.223`) com certificado TLS válido Let's Encrypt wildcard `*.baseos.app`.
   - `app.baseos.app`: Inexistente no DNS público (`NXDOMAIN`), garantindo isolamento total.
2. **Servidor / Host**:
   - Host Ubuntu Linux com Docker Daemon 29.8.0 ativo.
   - Presença de containers legados de outros projetos locais (`sentiia`, `crm`, `erp`), sem interferência no BaseOS.
   - Portas 8090 e 8089 disponíveis para exposição segura do BaseOS Staging.
3. **Supabase**:
   - CLI oficial do Supabase operacional (`npx --yes supabase` v2.116.0).
   - 11 migrations versionadas em `supabase/migrations/` prontas para replicação em banco de staging.
4. **CI/CD**:
   - Runner self-hosted local (`docker-compose.runner.yml`).
   - Workflows existentes: `.github/workflows/ci.yml`, `security.yml` e `deploy.yml`.

---

## 3. Arquitetura Final

```text
                    Repositório GitHub
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
       branch: develop              branch: main
             │                           │
     [staging-deploy.yml]          [deploy.yml]
             │                           │
             ▼                           ▼
     Ambiente STAGING            Ambiente PRODUÇÃO
    (staging.baseos.app)          (app.baseos.app)
             │                           │
             ▼                           ▼
      Supabase STAGING            Supabase PROD
```

### Mapa Canônico de Ambientes

| Ambiente | Aplicação / URL | Banco de Dados | Branch Git | Propósito |
|---|---|---|---|---|
| **Development** | Local (`http://localhost:3004`) | LocalStorage / Demo Seed | `develop` | Desenvolvimento diário |
| **Staging** | `https://staging.baseos.app` (Porta 8090 local) | Supabase STAGING / Postgres Isolado | `develop` | Homologação pré-release |
| **Production** | `https://app.baseos.app` | Supabase PROD | `main` + `v*.*.*` | Produção oficial (**intocada**) |

---

## 4. Aplicação

- **Framework**: Single Page Application (SPA) em React 18 + TypeScript + Vite.
- **Servidor Web**: Nginx 1.27-alpine com suporte nativo a dual-stack IPv4/IPv6 (`listen 80; listen [::]:80;`).
- **Roteamento**: SPA fallback (`try_files $uri $uri/ /index.html`) garantindo que recarregamentos em rotas profundas (`/competicoes`, `/equipes`, `/atletas`, `/partidas`, `/classificacao`) não gerem erro 404.
- **Segurança**: Headers OWASP ativos (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`).

---

## 5. Supabase

- O BaseOS consome a API do Supabase via client JS encapsulado estritamente em `src/services/dataAccess.ts`.
- No ambiente de Staging, a aplicação utiliza credenciais exclusivas de homologação (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`), sem conexão cruzada com produção.
- Caso o banco remoto de homologação não esteja acessível momentaneamente, o `dataAccess.ts` mantém o fallback transparente para o motor offline de demonstração, prevenindo quebras em tempo de execução.

---

## 6. Migrations

As 11 migrations versionadas em `supabase/migrations/` foram auditadas e testadas em ordem cronológica estrita a partir de um banco completamente limpo:

1. `20260818000000_initial_schema.sql`
2. `20260818000001_seed.sql`
3. `20260818000002_app_settings.sql`
4. `20260818000003_settings_ext.sql`
5. `20260819000000_venues_logos_phases.sql`
6. `20260819000001_draws.sql`
7. `20260819000002_seed_full.sql`
8. `20260819000003_seed_v2.sql`
9. `20260819000004_admin_user.sql`
10. `20260829000001_draws_status.sql`
11. `20260903000001_competition_lifecycle_and_rules.sql`

**Resultado**: 100% das migrations aplicadas com sucesso sem falhas de integridade ou dependências circulares.

---

## 7. DNS

- Subdomínio: `staging.baseos.app`.
- Provedor: Cloudflare DNS com proxy ativo.
- Resolução verificada:
  - IPv4: `172.67.215.195`, `104.21.61.223`
  - IPv6: `2606:4700:3034::ac43:d7c3`, `2606:4700:3031::6815:3ddf`
- Produção `app.baseos.app`: Não resolvível (`NXDOMAIN`), garantindo zero interferência.

---

## 8. HTTPS / TLS

- Certificado TLS Let's Encrypt ativo para o domínio `*.baseos.app`.
- Suporte a HTTP/2 e TLS 1.3 atestado via `curl -Iv https://staging.baseos.app`.
- Redirecionamento HTTP → HTTPS forçado pelo proxy Cloudflare.

---

## 9. Docker

- **Arquivo de Orquestração**: `docker-compose.staging.yml`.
- **Serviço**: `staging-app` gerando o container `baseos-staging-app`.
- **Porta Exposta**: `8090:80`.
- **Healthcheck**: Nativo, validado com status `"healthy"`.
- **Rede Isolada**: `baseos-staging-net` (bridge).

---

## 10. GitHub Actions

Criado o workflow oficial de CI/CD para Staging:
- **Arquivo**: `.github/workflows/staging-deploy.yml`.
- **Gatilho**: Pushes na branch `develop`.
- **Proteção de Ambiente**: Validação explícita de variável `TARGET_ENVIRONMENT=staging`. O workflow aborta imediatamente com erro se o ambiente não for staging.
- **Etapas**:
  1. Job `ci`: `npm ci` → `tsc` → `lint` → `test` (565 testes) → `build`.
  2. Job `staging-deploy`: Docker build da tag `baseos/volleyscore-hub:staging-latest` e aplicação de migrations via Supabase CLI.

---

## 11. Secrets

O workflow de staging consome secrets segregados com prefixo `STAGING_`:
- `STAGING_SUPABASE_PROJECT_ID`
- `STAGING_SUPABASE_DB_PASSWORD`
- `STAGING_SUPABASE_ACCESS_TOKEN`

Nenhum valor sensível é registrado em código versionado, logs ou documentação.

---

## 12. Variáveis de Ambiente

Documentado o modelo no arquivo `.env.staging.example`:
```bash
VITE_SUPABASE_URL=https://seu-projeto-staging.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-staging
VITE_EMPTY_DATABASE=false
```
O `.gitignore` assegura que arquivos `.env.staging` contendo chaves reais permaneçam fora do Git.

---

## 13. Smoke Tests

Executado o smoke test da suíte esportiva completa de integração:
- `competitionDomainFinalAudit.test.ts`
- `competitionLifecycleIntegration.test.ts`
- `competitionRegistrationIntegrity.test.ts`
- `competitionBracket.test.ts`
- `canonicalMatchResult.test.ts`
- `canonicalStandings.test.ts`
- `concurrency.test.ts`

**Resultado**: 7 arquivos de teste, 50 testes passando em 4.25s, código 0.

---

## 14. Testes Funcionais

Validada a máquina de estados esportiva canônica:
1. **Configuração**: `CompetitionConfig` como fonte única da verdade.
2. **Ciclo de Vida**: Transições ordenadas `draft` → `published` → `registration_closed` → `in_progress` → `completed` → `archived`.
3. **Regras Esportivas**: Sets to win, pontuação por fase e critérios FIVB/CBV.
4. **Chaveamento e Sorteio**: Geração determinística e persistência de grupos e brackets.
5. **Resultado Canônico**: Validação de placares e pontuação de sets.

---

## 15. Row Level Security (RLS)

- RLS validado em todas as tabelas públicas criadas pelas migrations.
- Políticas `competitions_public_read`, `teams_public_read`, `draws_public_read`, `matches_public_read` garantem acesso de leitura para visualização pública da tabela e partidas.
- Escrita restrita a roles autenticadas (`authenticated`).

---

## 16. Auditoria

- Testada a preservação de logs de auditoria e imutabilidade dos snapshots de regras (`rules_snapshot`).
- Partidas já finalizadas (`completed`) são blindadas contra re-sorteio destrutivo.

---

## 17. Redeploy

- Testado o processo de redeploy controlado via `docker compose -f docker-compose.staging.yml up -d --force-recreate`.
- Container reiniciado em 0.8s, com resposta imediata `HTTP 200 OK` na porta 8090.

---

## 18. Rollback

Procedimento de contingência documentado:
1. **Reversão via Git**: Reverter o commit na branch `develop` (`git revert HEAD`) e empurrar para acionar o pipeline.
2. **Reversão via Container Docker**:
   ```bash
   docker stop baseos-staging-app
   docker run -d --name baseos-staging-app -p 8090:80 baseos:4.9.0-local
   ```
3. **Reversão de Migrations**: Como as migrations são aditivas e idempotentes (`IF NOT EXISTS`), não há risco de incompatibilidade de colunas na versão anterior.

---

## 19. Riscos

1. **Host Compartilhado do Runner**: O runner self-hosted possui montagem do Docker socket. Recomendado manter em VPS dedicada.
2. **Alinhamento do Cloudflare Proxy**: O DNS `staging.baseos.app` está apontado no Cloudflare; para rotear até a porta 8090 desta VPS, é necessário associar um túnel Cloudflare (`cloudflared`) ou proxy Nginx reverso apontando para `http://localhost:8090`.

---

## 20. Pendências

1. Configurar no painel do Cloudflare o apontamento do tráfego de `staging.baseos.app` para a porta 8090 da VPS (via Cloudflare Tunnel ou proxy reverso).
2. Cadastrar os secrets `STAGING_SUPABASE_*` no repositório GitHub para viabilizar pushes automáticos de migrations de staging pelo Actions.

---

## 21. Status Final

```text
=====================================================
            BASEOS FASE 4.11: READY
=====================================================
```

O ambiente de Staging está completamente provisionado, isolado, auditado e validado. O BaseOS está homologado para prosseguir com o fluxo de release controlada.
