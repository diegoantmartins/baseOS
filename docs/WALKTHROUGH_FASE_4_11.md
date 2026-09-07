# WALKTHROUGH — BASEOS FASE 4.11
# Provisionamento, Configuração e Homologação do Ambiente de Staging

---

## 1. Estado Inicial

Após o encerramento da Fase 4.10, o ambiente de desenvolvimento do BaseOS contava com suíte de 565 testes aprovados, build de produção atestado e branch `develop` criada.
Contudo, o ambiente de **Staging** não contava com uma esteira dedicada nem com container de homologação formalmente orquestrado e testado de ponta a ponta com banco de dados isolado.

---

## 2. Infraestrutura Encontrada

- **DNS**: `staging.baseos.app` ativo no Cloudflare com certificado SSL wildcard `*.baseos.app`.
- **Produção**: `app.baseos.app` com status `NXDOMAIN`, preservando 100% o isolamento do ambiente produtivo.
- **Docker Host**: VPS Ubuntu Linux com Docker 29.8.0.
- **Supabase CLI**: Operacional via `npx --yes supabase` v2.116.0.
- **Portas de Rede**: Portas 8089 e 8090 livres para exposição de containers do BaseOS.

---

## 3. O que foi Criado

1. **Workflow de Staging**: [.github/workflows/staging-deploy.yml](file:///home/diego-martins/docker/volei/.github/workflows/staging-deploy.yml) disparado por pushes na branch `develop`, com validação explícita de `TARGET_ENVIRONMENT=staging` e separação rigorosa de secrets.
2. **Orquestração Docker Staging**: [docker-compose.staging.yml](file:///home/diego-martins/docker/volei/docker-compose.staging.yml) configurando o container `baseos-staging-app` na porta 8090 com rede bridge isolada e healthcheck nativo.
3. **Exemplo de Variáveis de Staging**: [.env.staging.example](file:///home/diego-martins/docker/volei/.env.staging.example) documentando a parametrização do ambiente de homologação.
4. **Documentação Mestre da Fase 4.11**: [docs/FASE_4_11_STAGING.md](file:///home/diego-martins/docker/volei/docs/FASE_4_11_STAGING.md) contendo os 21 capítulos exigidos pelo processo de certificação.

---

## 4. O que foi Alterado

1. **[nginx.conf](file:///home/diego-martins/docker/volei/nginx.conf)**:
   - Adicionado suporte nativo a IPv6 dual-stack (`listen [::]:80;`) para compatibilidade plena com healthchecks modernos e resolução de `localhost` no Alpine Linux.

---

## 5. Arquivos Modificados / Criados

| Arquivo | Ação | Descrição |
|---|---|---|
| `.github/workflows/staging-deploy.yml` | **NOVO** | Pipeline automatizado de CI/CD para a branch `develop`. |
| `docker-compose.staging.yml` | **NOVO** | Orquestração do container de homologação `baseos-staging-app`. |
| `.env.staging.example` | **NOVO** | Especificação das variáveis de ambiente de Staging. |
| `nginx.conf` | **ALTERADO** | Inclusão de `listen [::]:80;` para suporte dual-stack IPv4/IPv6. |
| `docs/FASE_4_11_STAGING.md` | **NOVO** | Documento oficial de homologação de Staging. |
| `docs/WALKTHROUGH_FASE_4_11.md` | **NOVO** | Relatório de auditoria e validação desta fase. |

---

## 6. Migrations Aplicadas e Validadas

Todas as 11 migrations de `supabase/migrations/` foram executadas e validadas em ordem cronológica a partir do zero em container PostgreSQL isolado:
- `20260818000000_initial_schema.sql` ✅
- `20260818000001_seed.sql` ✅
- `20260818000002_app_settings.sql` ✅
- `20260818000003_settings_ext.sql` ✅
- `20260819000000_venues_logos_phases.sql` ✅
- `20260819000001_draws.sql` ✅
- `20260819000002_seed_full.sql` ✅
- `20260819000003_seed_v2.sql` ✅
- `20260819000004_admin_user.sql` ✅
- `20260829000001_draws_status.sql` ✅
- `20260903000001_competition_lifecycle_and_rules.sql` ✅

Todas as tabelas (`competitions`, `draws`, `teams`, `competition_athletes`, etc.), colunas canônicas (`config`, `rules_snapshot`, `status`), constraints e RLS foram confirmadas ativas.

---

## 7. Configurações

- Container: `baseos-staging-app` ouvindo em `0.0.0.0:8090->80/tcp`.
- Rede Docker: `baseos-staging-net` (bridge isolada).
- Healthcheck: Validado com status `"healthy"`.

---

## 8. Testes Executados e Resultados Reais

### 8.1 Teste de Container e Roteamento SPA
```bash
curl -I http://localhost:8090/             -> HTTP/1.1 200 OK
curl -I http://localhost:8090/competicoes -> HTTP/1.1 200 OK
curl -I http://localhost:8090/equipes     -> HTTP/1.1 200 OK
curl -I http://localhost:8090/classificacao -> HTTP/1.1 200 OK
```
*Zero erros 404 em recarregamento de rotas.*

### 8.2 Security Headers OWASP
```text
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 8.3 Healthcheck
```bash
docker inspect --format='{{json .State.Health.Status}}' baseos-staging-app
# Resultado: "healthy"
```

### 8.4 Smoke Test da Suíte Esportiva Canônica
```bash
npx vitest run src/test/competitionDomainFinalAudit.test.ts \
               src/test/competitionLifecycleIntegration.test.ts \
               src/test/competitionRegistrationIntegrity.test.ts \
               src/test/competitionBracket.test.ts \
               src/test/canonicalMatchResult.test.ts \
               src/test/canonicalStandings.test.ts \
               src/test/concurrency.test.ts
# Resultado:
# Test Files  7 passed (7)
#      Tests  50 passed (50)
#   Duration  4.25s
```

### 8.5 Teste de Redeploy Controlado
```bash
docker compose -f docker-compose.staging.yml up -d --force-recreate
# Resultado: Container reiniciado em 0.8s, serviço respondendo HTTP 200 OK imediatamente.
```

---

## 9. Problemas Encontrados e Corrigidos

1. **Healthcheck IPv6 no Alpine**: O Alpine Linux resolvia `localhost` para `[::1]:80`, causando recusa de conexão inicial pelo Nginx que escutava apenas IPv4.
   - *Correção*: Adicionado `listen [::]:80;` em `nginx.conf` e ajustado healthcheck para `http://127.0.0.1/` em `docker-compose.staging.yml`. Container agora atinge status `"healthy"` com sucesso.
2. **Ausência de Pipeline de Staging**: Não havia workflow para disparar deploy ao receber push na branch `develop`.
   - *Correção*: Criado [.github/workflows/staging-deploy.yml](file:///home/diego-martins/docker/volei/.github/workflows/staging-deploy.yml) com validação de segurança `TARGET_ENVIRONMENT=staging`.

---

## 10. Riscos

1. **Roteamento Cloudflare -> Porta 8090**: O domínio `staging.baseos.app` está apontado no Cloudflare; para que o tráfego externo chegue à porta 8090 da VPS, é necessário configurar o Cloudflare Tunnel ou proxy reverso local.
2. **Secrets no GitHub Actions**: Caso os secrets `STAGING_SUPABASE_*` não estejam cadastrados, o step de migrations do workflow é ignorado com segurança (`if: env.STAGING_SUPABASE_PROJECT_ID != ''`), evitando falhas no deploy.

---

## 11. O que NÃO foi Alterado

Em conformidade estrita com o princípio da Fase 4.11:
- **Produção**: Servidor e banco de dados de produção permaneceram **estritamente intocados**.
- **Domínio Esportivo**: Nenhuma regra de pontuação, formato ou desempate foi alterada.
- **Sorteio e Chaveamento**: Lógica canônica de brackets e chaveamentos 100% preservada.
- **Ciclo de Vida e Inscrições**: Máquina de estados e integridade cadastral inalteradas.
- **Fase 5**: Nenhuma linha de código referente a SaaS, billing ou planos foi introduzida.

---

## 12. Status Final

```text
=====================================================
            BASEOS FASE 4.11: READY
=====================================================
```
