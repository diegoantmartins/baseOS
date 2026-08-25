# Política de Segurança — BaseOS

## 1. Relato de Vulnerabilidades
Se você descobrir uma vulnerabilidade de segurança no BaseOS, por favor envie um e-mail confidencial para:
`security@baseos.com` ou `diegoantmartins89@gmail.com`.

Não abra issues públicas para relatar falhas de segurança antes que um patch seja lançado.

---

## 2. Padrões de Segurança Implementados

### Autenticação & Sessões
- Senhas validadas com força mínima (8+ caracteres, alfanumérico).
- Bloqueio de tentativas de força bruta (Lockout automático de 5 minutos após 5 tentativas incorretas).
- Sessões protegidas no Supabase Auth com tokens JWT seguros e expiração controlada.
- Nenhuma senha ou segredo em texto puro no frontend ou no repositório.

### Autorização, RBAC & Multi-Tenancy (BOLA/IDOR)
- Toda operação de leitura/gravação é validada por perfil (`TenantSecurityService`).
- Usuários de equipes possuem escopo estrito ao seu respectivo `competitionTeamId`, impedindo manipulação de dados de adversários.

### Sanitização & Prevenção de XSS
- Todas as entradas livres passam por sanitização (`sanitizeInput` / `stripUnsafeHtml`).
- React DOM com escape nativo de strings.

### Headers de Segurança HTTP (OWASP)
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
