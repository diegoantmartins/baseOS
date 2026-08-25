# Estratégia e Guia de Testes — BaseOS

## 1. Pirâmide e Cobertura de Testes

O BaseOS possui uma suíte automatizada abrangente executada com **Vitest**:

```text
┌────────────────────────────────────────────────────────┐
│                      Testes E2E                        │
│            Fluxos de ponta a ponta Playwright          │
├────────────────────────────────────────────────────────┤
│                 Testes de Integração                   │
│         Adapter, Persistência, Súmulas, Mappers        │
├────────────────────────────────────────────────────────┤
│                  Testes Unitários                      │
│   Regras de Voleibol, Desempates, RBAC, Segurança,     │
│       Rate Limiting, Estresse e Throughput             │
└────────────────────────────────────────────────────────┘
```

## 2. Comandos de Execução

```bash
# Executa todos os testes unitários e de integração
npm test

# Executa em modo watch com hot-reload durante desenvolvimento
npm run test:watch

# Verificação estrita de tipagem TypeScript
npx tsc -p tsconfig.app.json --noEmit

# Análise estática com ESLint
npm run lint

# Build de validação para produção
npm run build
```

## 3. Principais Arquivos de Teste

| Arquivo de Teste | Objetivo |
| :--- | :--- |
| `src/test/securityAuth.test.ts` | Autenticação, rate limiting (lockout), força de senha e XSS |
| `src/test/tenantSecurity.test.ts` | Multi-tenancy, proteção IDOR/BOLA e matriz de permissões RBAC |
| `src/test/concurrency.test.ts` | Concorrência e idempotência em finalização de partidas |
| `src/test/scoresheetStress.test.ts` | Estresse do motor de súmulas com 0 a 14 atletas e textos longos |
| `src/test/performanceBenchmark.test.ts` | Benchmark de geração de súmulas com latência < 5ms |
| `src/test/healthCheck.test.ts` | Status de saúde dos serviços e storage |
| `src/test/standingsService.test.ts` | Critérios oficiais de classificação e desempate FIVB/CBV |
| `src/test/registrationService.test.ts` | Validação de elencos, limites de capitão/líberos e prazos |
| `src/test/baseosSumula3.test.ts` | Conformidade visual e geométrica da súmula de 3 sets (A4) |
| `src/test/baseosSumula5.test.ts` | Conformidade visual e geométrica da súmula de 5 sets (A4) |
