# BASEOS — FASE 3.3-F: FINAL SECURITY & INTEGRATION GATE
# CERTIFICAÇÃO TÉCNICA DEFINITIVA

**Data:** 05/09/2026  
**Sistema:** BaseOS  
**Fase:** 3.3-F — Final Security & Integration Gate (Portal Público da Competição, QR Code e Experiência do Espectador)  
**Classificação Final Oficial:** **APPROVED AND VERIFIED**  

---

## 1. Declaração Técnica Oficial de Homologação

> **"A Fase 3.3 foi homologada em nível de código, integração e segurança pública conforme as evidências registradas. A camada pública utiliza exclusivamente fontes canônicas do BaseOS e não expõe campos privados na camada pública."**

---

## 2. Auditoria e Evidências dos 5 Eixos Obrigatórios

```text
                    BASEOS
                       │
          ┌────────────┴────────────┐
          │                         │
       ADMIN                    PORTAIS
          │                         │
          │              ┌──────────┴──────────┐
          │              │                     │
       Gestão         PORTAL EQUIPE        PORTAL PÚBLICO
                           │                     │
                    /equipe/:token           /c/:slug
                           │                     │
                           └──────────┬──────────┘
                                      │
                              DOMÍNIO CANÔNICO
                                      │
                 ┌────────────────────┼───────────────────┐
                 │                    │                   │
          CompetitionConfig       Matches            Standings
                 │                    │                   │
                 └────────────────────┼───────────────────┘
                                      │
                                   Supabase
```

---

### EIXO 1: Banco de Dados, Views e RLS
**Evidência:** Arquivo [`supabase/migrations/20260905000005_competition_slug_and_views.sql`](file:///home/diego-martins/docker/volei/supabase/migrations/20260905000005_competition_slug_and_views.sql)

- **View `public_competitions`:**
  Projeta estritamente metadados esportivos e um sub-JSON `public_config` com `format`, `scoring` e `standings`. O sub-objeto `registration` (com regras internas de documentação/limites de cadastro) e notas privadas são omitidos.
- **View `public_competition_teams`:**
  O `access_token` é **categoricamente omitido** da projeção. O `registration_deadline`, notas customizadas e flag de lock também são omitidos.
- **Isolamento de `profiles` e Atletas:**
  Não existe View pública de `profiles` nem de `competition_athletes`.
- **Permissões do Role `anon`:**
  - `GRANT SELECT ON public.public_competitions TO anon, authenticated;`
  - `GRANT SELECT ON public.public_competition_teams TO anon, authenticated;`
  - O role `anon` **NÃO possui** permissão de `SELECT` nas tabelas base `competition_teams`, `competition_athletes` ou `profiles`.
  - O role `anon` **NÃO possui** permissão de `INSERT`, `UPDATE` ou `DELETE` em nenhuma tabela do sistema.
- **Conformidade:** A frase técnica é cumprida na íntegra: *"A camada pública não seleciona nem retorna campos privados"*.

---

### EIXO 2: Slug e Imutabilidade Estrita no Domínio
**Evidência:** Arquivos [`src/services/dataAccess.ts`](file:///home/diego-martins/docker/volei/src/services/dataAccess.ts) e [`src/test/publicCompetitionPortal.test.ts`](file:///home/diego-martins/docker/volei/src/test/publicCompetitionPortal.test.ts)

- **Geração Determinística:**
  Função `generateCompetitionSlug()` normaliza acentos (`á` → `a`), remove caracteres especiais, pontuações, converte para minúsculas e remove hífens redundantes. Nomes sem caracteres alfanuméricos válidos (ex: `@@@`) recebem o fallback seguro `'competicao'`.
- **Imutabilidade em Renomeações:**
  Tanto no `localStorageAdapter` quanto no `supabaseAdapter` em `updateCompetition()`:
  ```ts
  if (existing?.slug) {
    safeUpdates.slug = existing.slug;
  }
  ```
  Se a competição `"Copa Regional 2026"` (`copa-regional-2026`) for renomeada para `"Copa Regional do Paraná 2026"`, o slug persistido **não muda**. A URL pública permanece `/c/copa-regional-2026`.
- **Resolução de Colisões:**
  Colisões no storage e na migration de legados utilizam sufixo numérico progressivo (`-2`, `-3`).
- **Registros Legados Sem Slug:**
  A rotina `normalizeCompetitionRecord()` garante que competições antigas lidas do banco sem slug recebam um slug canônico determinístico em memória imediatamente.

---

### EIXO 3 & 4: Cadeia Canônica de Classificação e Resultados (SSOT)
**Evidência:** Arquivos [`src/services/publicCompetitionService.ts`](file:///home/diego-martins/docker/volei/src/services/publicCompetitionService.ts) e [`src/pages/PublicCompetitionPage.tsx`](file:///home/diego-martins/docker/volei/src/pages/PublicCompetitionPage.tsx)

- **Cadeia de Resultados:**
  ```text
  MatchRecord
      ↓
  CompetitionRulesService.getCanonicalMatchResult(competition, match)
      ↓
  PublicMatchDTO (setsWonA, setsWonB, setScores, winnerSide, isWo, isCompleted, isHomologated)
      ↓
  PublicCompetitionPage (MatchDetailedCard)
  ```
  O portal não recalcula placares nem possui interpretação própria de pontuação de set.
- **Cadeia de Classificação:**
  ```text
  StandingInput[]
      ↓
  standingsService.computeStandingsByGroup(teams, matches, { criteria, competition })
      ↓
  StandingsTable (Enterprise Dark, mono tabular, top-3 e avanço oficial)
      ↓
  Portal Público (Aba Classificação)
  ```
  O cálculo da tabela é rigorosamente o mesmo utilizado no painel administrativo do BaseOS, contemplando pontuação FIVB/CBV (3x0/3x1 = 3pts, 3x2 = 2pts, 2x3 = 1pt, 0x3/1x3 = 0pts) e desempate oficial por confrontos, sets average e pontos average.

---

### EIXO 5: QR Code, Origin Dinâmico e Regressão de Rename
**Evidência:** Componente [`src/components/public/CompetitionQRCodeModal.tsx`](file:///home/diego-martins/docker/volei/src/components/public/CompetitionQRCodeModal.tsx) e testes unitários

- **Origem Dinâmica:**
  A URL é derivada em runtime de `window.location.origin`:
  - Dev: `http://localhost:5173/c/:slug`
  - Prod: `https://dominio.com/c/:slug`
  - Sem nenhum domínio hardcoded.
- **Renderização Gráfica e Quiet Zone:**
  Renderizado via biblioteca `qrcode` com margem silenciosa de 4 módulos e nível de correção de erro M/H.
- **Exportação PNG 1024x1024 px:**
  Botão *"Baixar PNG 1024px"* gera e faz download direto de arquivo `.png` com resolução exata de 1024x1024 pixels para impressão em alta definição em gráficas.
- **Teste de Regressão Comprovado:**
  Se a competição for renomeada após a confecção do banner ou cartaz com o QR Code, a URL do QR Code antigo continua correspondendo perfeitamente ao slug oficial da competição, sem quebrar o acesso do espectador.

---

## 3. Matriz Completa de Verificação Automatizada

| Teste / Verificador | Comando Executado | Resultado | Status |
|---|---|---|---|
| **Vitest (Portal & Segurança)** | `npx vitest run src/test/publicCompetitionPortal.test.ts` | **13 passed (13)** em 1.44s | **APROVADO** |
| **Vitest (Domínio Canônico)** | `npx vitest run src/test/canonicalMatchResult.test.ts src/test/competitionDomainFinalAudit.test.ts` | **31 passed (31)** | **APROVADO** |
| **TypeScript Typecheck** | `npx tsc -p tsconfig.app.json --noEmit` | **0 erros** (`TSC_CLEAN`) | **APROVADO** |
| **ESLint Linter** | `npm run lint` | **0 erros** (1 warning useMemo pré-existente) | **APROVADO** |
| **Vite Production Build** | `npm run build` | **Concluído em 1m 7s** (`dist/` gerado) | **APROVADO** |

---

## 4. Conclusão da Fase 3.3

Com o fechamento formal do **Gate 3.3-F**, o BaseOS consolida sua arquitetura com separação total entre o painel administrativo, o portal privado de autogestão de elencos das equipes e a camada pública de leitura para o espectador, preservando a integridade das fontes de verdade esportivas.
