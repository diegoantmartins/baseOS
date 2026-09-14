# BASEOS — FASE 9.7: RELEASE CANDIDATE + PACOTE DE PROMOÇÃO

**Documento:** `docs/walkthroughs/FASE-9.7-RELEASE-CANDIDATE.md`  
**Data de Emissão:** 2026-09-14  
**Responsável:** Engenheiro de Software BaseOS / Antigravity Agent  
**Versão Alvo:** `v2.4.1` (RC: `v2.4.1-rc.1`)  
**Status do Veredito:** **GO** (Release Local Pronta para Promoção)

---

## 1. Estado Inicial

Antes de qualquer ação de staging ou congelamento da release, o estado do repositório foi capturado e auditado:

* **Branch Atual:** `main`
* **Commit Base:** `756e56d` (`feat(release): BaseOS v2.4.0-rc.1 - Homologação Indoor, Auth de Equipes e Pacote de Promoção`)
* **Tags Preexistentes:** `v2.4.0`, `v2.4.0-rc.1`, `v2.3.0`, `v2.2.0`, `v2.1.0`, `v2.0.0`, `v1.1.0`, `v1.0.0`
* **Working Tree:** Modificações identificadas exclusivamente nos 3 arquivos da Fase 9.6:
  - `src/components/registration/AthleteFormModal.tsx`
  - `src/lib/pdf/reportsPdf.ts`
  - `src/pages/TeamRosterRegistrationPage.tsx`
  - E artefatos documentais em `docs/walkthroughs/`.

---

## 2. Auditoria do Release

### Alterações Encontradas e Incluídas
As seguintes alterações pertencem formalmente ao produto e integram a release:
1. `src/components/registration/AthleteFormModal.tsx`:
   - Prop `athlete?: CompetitionAthlete | undefined;` na interface `AthleteFormModalProps`.
2. `src/lib/pdf/reportsPdf.ts`:
   - Campos opcionais compatíveis com `undefined` em `MatchBoletimRow`, `RosterReportAthlete` e `RosterReportTeam`.
3. `src/pages/TeamRosterRegistrationPage.tsx`:
   - Anotações de tipo explícitas nos geradores de PDF da relação nominal e boletim de jogos, além de fallback seguro para `limits` de elenco (`{ min: 6, max: 14 }`).

### Alterações Excluídas
- Arquivos de build transitórios (`tsconfig.app.tsbuildinfo`, `tsconfig.node.tsbuildinfo`) mantidos fora do commit.
- Nenhum artefato de ambiente (`.env`, `.env.*`) incluído.
- Nenhum dump ou dado temporário incluído.

### Auditoria de Segredos (Zero Plaintext Secrets)
Varredura minuciosa executada contra o diff e staged files:
```bash
git diff | grep -iE "password|secret|key|token|service_role"
# Retorno: Vazio (0 ocorrências)
```
Nenhum token, segredo, chave de API ou credencial exposta.

### Auditoria de Migrations
```bash
git status supabase/migrations/
# Retorno: Limpo (0 migrations novas ou alteradas)
```
A release `v2.4.1` baseia-se no schema já consolidado, sem introduzir migrações de banco.

---

## 3. Versionamento

* **Versão Escolhida:** `v2.4.1` (Release Candidate correspondente: `v2.4.1-rc.1`)
* **Justificativa SemVer:**
  - A release `v2.4.0` homologou o fluxo esportivo indoor e a infraestrutura de provisionamento de contas de equipes.
  - A presente release consolida uma correção técnica e cirúrgica de contratos e tipagem TypeScript (`TeamRosterRegistrationPage.tsx`), sem novas funcionalidades de produto e sem breaking changes. Portanto, incrementa o dígito de PATCH de acordo com o padrão SemVer adotado pelo projeto.
* **Tag Criada:** `v2.4.1` (e tag de pré-lançamento `v2.4.1-rc.1`).

---

## 4. Validação de Testes e Qualidade

Todos os gates técnicos de aprovação foram executados no ambiente de desenvolvimento local:

| Verificação | Comando | Resultado | Status |
|---|---|---|:---:|
| **TypeScript** | `npx tsc -p tsconfig.app.json --noEmit` | **0 erros** | **PASS** |
| **ESLint** | `npm run lint` | **0 erros** (1 warning conhecido no canvas 3D) | **PASS** |
| **Testes Direcionados** | `npx vitest run src/test/teamRegistrationFlow.test.ts src/test/registrationService.test.ts` | **26/26 aprovados** | **PASS** |
| **Suíte Completa Vitest** | `npm test -- --run` | **120/120 arquivos, 1.161/1.161 testes aprovados** | **PASS** |
| **Build de Produção** | `npm run build` | **Sucesso (Vite dist/ gerado em 4m 57s, código 0)** | **PASS** |

---

## 5. Segurança e Conformidade

Registramos categoricamente que os seguintes componentes e fluxos permaneceram **100% preservados e intocados**:
- **Supabase Auth & GoTrue:** Autenticação, emissão e validação de tokens JWT inalterados.
- **RPCs de Provisionamento:** A função `public.provision_team_user` permanece ativa conforme definida na release anterior.
- **Row Level Security (RLS):** Isolamento total entre agremiações esportivas ativo e verificado.
- **Links de Inscrição:** Mecanismo seguro de link nominal `/equipe/inscricao/:token` preservado.
- **Produção:** Zero chamadas destrutivas contra a infraestrutura remota.

---

## 6. Documentação Criada

Os seguintes documentos oficiais foram confeccionados e versionados nesta fase:

1. [docs/releases/BASEOS-v2.4.1.md](file:///home/diego-martins/docker/volei/docs/releases/BASEOS-v2.4.1.md): Release notes completas da versão.
2. [docs/releases/BASEOS-v2.4.1-PROMOTION-CHECKLIST.md](file:///home/diego-martins/docker/volei/docs/releases/BASEOS-v2.4.1-PROMOTION-CHECKLIST.md): Guia operacional pré e pós-deploy para a infraestrutura de produção.
3. [docs/walkthroughs/FASE-9.7-RELEASE-CANDIDATE.md](file:///home/diego-martins/docker/volei/docs/walkthroughs/FASE-9.7-RELEASE-CANDIDATE.md): Este relatório de engenharia de release.

---

## 7. Commit e Tag Oficiais

* **Padrão de Commit:** `chore(release): BaseOS v2.4.1 - Estabilização TypeScript do Portal da Equipe e Pacote de Promoção`
* **Tag Oficial:** `v2.4.1`
* **Release Candidate:** `v2.4.1-rc.1`
* **Status do Push:** Mantido exclusivamente local conforme determinação da Seção 18 (push remoto não automático).

---

## 8. Estado da Instância VOLTZ

> ### **VOLTZ NÃO FOI ALTERADA NESTA FASE.**
> 
> A instância de produção `https://voltz.baseos.online` permaneceu absolutamente intocada durante toda a execução da Fase 9.7. Nenhuma migration, build, deploy, comando Docker ou alteração de banco foi executado remotamente.

---

## 9. Pendências

- **Débitos Ativos:** Zero.
- **Warnings:** Permanece documentado o warning de `useMemo` no componente cinemático [DrawArenaCanvas.tsx](file:///home/diego-martins/docker/volei/src/components/draw/cinematic/DrawArenaCanvas.tsx#L438) (não bloqueante para release).

---

## 10. Veredito Final

```text
================================================================================
                               VEREDITO: GO
================================================================================
  [✓] Fase 9.6 conferida e auditada (0 erros TypeScript)
  [✓] Linting aprovado (0 erros ESLint)
  [✓] Suíte de testes aprovada (1.161/1.161 testes em 120 arquivos)
  [✓] Build de produção concluído com código de saída 0
  [✓] Diff estritamente cirúrgico e livre de secrets
  [✓] Zero migrations de banco de dados
  [✓] Release notes e checklist de promoção documentados
  [✓] Instância VOLTZ preservada 100% intacta
================================================================================
```
