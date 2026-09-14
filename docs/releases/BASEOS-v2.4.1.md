# BaseOS Release Notes — v2.4.1

**Versão:** `v2.4.1`  
**Release Candidate:** `v2.4.1-rc.1`  
**Data:** 2026-09-14  
**Ambiente de Homologação:** DEV (PostgreSQL / Supabase Local / React 18 + Vite)  
**Status:** Validado e Pronto para Promoção  

---

## 1. Objetivo da Release

A release **BaseOS v2.4.1** consolida a estabilização técnica definitiva do **Portal Online da Equipe** (`/equipe/inscricao/:token`), eliminando os 3 erros de tipagem TypeScript em conformidade com checagens estritas de propriedades opcionais (`exactOptionalPropertyTypes`) e alinhando os contratos de geração de relatórios oficiais em PDF com o modelo de dados canônico.

---

## 2. Alterações Incluídas

### Portal da Equipe & Inscrição de Atletas
- **Correção de Tipagem em `TeamRosterRegistrationPage.tsx`:**
  - Anotação explícita de tipos nos callbacks de exportação da relação nominal (`RosterReportAthlete`) e do boletim de jogos (`MatchBoletimRow`).
  - Blindagem de limites de elenco (`limits`) com fallback defensivo seguro `{ min: 6, max: 14 }`, prevenindo inferências indesejadas de `undefined`.

### Contratos Editoriais em PDF (`reportsPdf.ts`)
- **Suporte Canônico a Propriedades Opcionais com `undefined`:**
  - `MatchBoletimRow`: Atualização de campos opcionais (`phase`, `groupName`, `court`, `scoreA`, `scoreB`, `teamAShort`, `teamBShort`, etc.) para admitir `| undefined`.
  - `RosterReportAthlete`: Suporte a `jerseyNumber?: number | undefined;` (atletas sem número confirmado antecipadamente) e `documentNumber?: string | undefined;`.
  - `RosterReportTeam`: Suporte a `coach?: string | undefined;`, `logoUrl?: string | undefined;`, etc.

### Diálogo de Cadastro de Atleta (`AthleteFormModal.tsx`)
- **Compatibilidade de Props com Componentes Pai:**
  - Atualização da interface `AthleteFormModalProps` para admitir `athlete?: CompetitionAthlete | undefined;`, harmonizando perfeitamente com o estado `useState<CompetitionAthlete | undefined>()` do formulário.

---

## 3. Validação de Qualidade

| Verificação | Comando | Resultado | Status |
|---|---|---|:---:|
| **TypeScript** | `npx tsc -p tsconfig.app.json --noEmit` | **0 erros** | **PASS** |
| **ESLint** | `npm run lint` | **0 erros** (1 warning conhecido no canvas 3D) | **PASS** |
| **Testes Direcionados** | `npx vitest run src/test/teamRegistrationFlow.test.ts src/test/registrationService.test.ts` | **26/26 aprovados** | **PASS** |
| **Suíte Completa** | `npm test -- --run` | **120/120 arquivos, 1.161/1.161 testes aprovados** | **PASS** |
| **Build de Produção** | `npm run build` | **Sucesso (Vite dist/ gerado em 4m 57s)** | **PASS** |

---

## 4. Segurança e Integridade

- **Autenticação GoTrue & Supabase Auth:** Preservados integralmente sem qualquer alteração.
- **Isolamento Multi-Tenant & RLS:** Políticas row-level security e integridade referencial mantidas.
- **Credenciais:** Nenhuma senha em texto puro, sem exposição de tokens ou segredos.
- **Zero Casts Inseguros:** Nenhum uso de `any`, `@ts-ignore` ou `@ts-expect-error`.

---

## 5. Auditoria de Banco de Dados

> **Nenhuma alteração de schema ou migration nesta release.**
> 
> A migration de provisionamento de usuários de equipes (`20260914000001_provision_team_user.sql`) permanece congelada da release `v2.4.0`.

---

## 6. Situação de Produção (VOLTZ)

> **AVISO IMPORTANTE:**  
> **Esta release ainda NÃO foi promovida para a instância de produção VOLTZ (`https://voltz.baseos.online`).**  
> A promoção deve seguir estritamente o roteiro contido em `docs/releases/BASEOS-v2.4.1-PROMOTION-CHECKLIST.md`.
