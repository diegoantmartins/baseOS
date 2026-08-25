# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.2.0] - 2026-08-24

### Adicionado
- **Motor Documental de Súmulas BaseOS**:
  - Súmula Oficial de 3 Sets em A4 Paisagem (1 página exata).
  - Súmula Oficial de 5 Sets em A4/A3 Paisagem com cards uniformes de 130pt e tie-break com troca de lado.
  - Rodada de saques sequencial `1-2 / 3-4 / 5-6 / 7-8` no padrão CBV / Federação Paranaense.
- **Segurança & Multi-Tenancy**:
  - Implementação de `TenantSecurityService` para proteção IDOR / BOLA e RBAC.
  - Rate limiting com bloqueio temporário (5 minutos após 5 falhas) contra ataques de força bruta.
  - Sanitização de inputs para prevenção de XSS e injeção de HTML.
  - Headers de segurança OWASP no Nginx (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, etc.).
- **DevOps & CI/CD**:
  - Workflows GitHub Actions para CI (`ci.yml`), Auditoria de Segurança (`security.yml`) e Deploy (`deploy.yml`).
  - Health check endpoint e observabilidade (`HealthCheckService`).
  - Procedimento de backup e restauração automatizado.

### Modificado
- Visualizador de Súmula ampliado para tela cheia (`max-w-7xl w-[95vw] h-[92vh]`) com botões de Imprimir, Baixar PDF e Nova Aba.
- Atualização de dependências vulneráveis via `npm audit fix`.

## [1.1.0] - 2026-08-19
- Inclusão de suporte a modalidades de Vôlei de Praia e Quadra.
- Gestão de quadras, tabelas de classificação e critérios de desempate ordenáveis.

## [1.0.0] - 2026-08-18
- Versão inicial do VolleyPro / BaseOS com gestão de competições, equipes, partidas e chaveamento.
