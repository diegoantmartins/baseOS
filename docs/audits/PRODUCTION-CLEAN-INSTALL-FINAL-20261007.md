# BASEOS — RELATÓRIO DE RELEASE FINAL E CLEAN INSTALL DE PRODUÇÃO

**Data:** 07 de Outubro de 2026 — 22:30 CEST  
**Ambiente:** PRODUÇÃO REAL  
**Host:** `vmi3488325` (IP `169.58.129.187`)  
**Workspace:** `/opt/apps/saas/BaseOS`  
**Responsável:** Release Engineer + DevOps + DBA + QA Master  
**Classificação:** 🟢 **PRODUCTION OPERATIONAL**

---

## A. Release

* **SHA Final:** `04e196ae66ace63b2070dd24f56137ea3fe57f66`
* **Branch:** `main` (rastreando `origin/main` no GitHub)
* **Tag Criada:** `v2.5.0` (apontando exatamente para `04e196ae66ace63b2070dd24f56137ea3fe57f66`, publicada em `origin/v2.5.0`)
* **Data/Hora da Release:** 2026-10-07T22:20:00+02:00
* **Resultado TypeScript:** `PASS` (`0 erros`) — comando `npx tsc -p tsconfig.app.json --noEmit`
* **Resultado Lint:** `PASS` (`0 erros, 1 warning` inócuo de react-hooks) — comando `npm run lint`
* **Resultado Build:** `PASS` (`dist/` gerado com sucesso via Vite em 1m 04s) — comando `npm run build`
* **Resultado Testes Unitários:** `PASS` (`123 test files passed`, 1192 testes passed sob adapter padrão sem dependência externa)

---

## B. Ambiente DEV

* **Host:** `vps-local` (`/home/diego-martins/docker/volei`)
* **Workspace DEV:** Integralmente preservado.
* **Integridade do Banco DEV:** 100% INTACTO. Nenhuma operação, comando `docker`, `reset`, ou script foi disparado contra o banco ou containers de desenvolvimento.
* **Volumes de DEV:** Preservados e inalterados.

---

## C. Produção Antiga (Legado Preservado)

* **Container:** `supabase_db_baseOs-voltz`
* **Volume Original:** `supabase_db_baseOs-voltz`
* **Volume Congelado (Rollback):** `supabase_db_baseOs-voltz_legacy_frozen`
* **Quantidade de Dados Legados:**
  * `organizations = 1` (`org-voltz`)
  * `competitions = 2`
  * `teams = 5`
  * `athletes = 45`
  * `matches = 10`
  * `venues = 3`
  * `referees = 4`
  * `profiles = 7`
  * `user_memberships = 7`
* **Backup Físico Real:**
  * Diretório: `/opt/apps/saas/BaseOS/backups/full-reset/`
  * Arquivos:
    * `baseos_pre_clean_install_20261007_210508.dump` (622.610 bytes)
    * `baseos_pre_clean_install_20261007_210508.sql` (849.784 bytes)
    * `baseos_pre_clean_install_20261007_210508.toc` (72.006 bytes)
* **SHA-256 do Dump:**
  `f490c45ae3dd4228259bd3b358e45767a44ad6a1f6d259c7d2fd0ab467583fb2`
* **Validação pg_restore:**
  `pg_restore -l` executado com **Exit Code 0** (TOC entries: 919).

---

## D. Produção Nova (Clean Install)

* **Container:** `supabase_db_baseOs-voltz`
* **Volume Ativo:** `supabase_db_baseOs-voltz`
* **Versão do PostgreSQL:** PostgreSQL 17.6 on x86_64-pc-linux-gnu (`public.ecr.aws/supabase/postgres:17.6.1.159`)
* **Database:** `postgres`
* **Migrations Aplicadas:** 40 migrations oficiais registradas em `supabase_migrations.schema_migrations` (de `20260818000000_initial_schema` até `20261007100000_fix_athletes_normalized_cpf_unique_index`).
* **Análise de Bootstrap (Parte 2):**
  * `20261007095000_reconcile_laura_moraes_cadastral_data.template.sql` foi classificada como template de reconciliação cadastral legada e NÃO executada (conforme regra mandatória).
  * `20260818000001_seed.sql`, `20260819000002_seed_full.sql`, `20260819000003_seed_v2.sql` tiveram seus registros demo omitidos na instalação limpa.
  * `20261003190000_frente8_multi_tenant_backfill.sql` teve suas estruturas DDL aplicadas integralmente, omitindo inserção fake da VOLTZ e mantendo `profiles.organization_id` compatível com multi-tenancy.
* **Schema de Produção:**
  * Tabelas de Domínio criadas e verificadas:
    `organizations`, `profiles`, `user_memberships`, `organization_invitations`, `competitions`, `teams`, `athletes`, `competition_athletes`, `matches`, `venues`, `referees`.
  * Coluna `organization_id`: presente com NOT NULL em todas as entidades tenant-bound.
  * RLS (Row Level Security): Ativo (`t`) em 100% das 11 tabelas de domínio.
  * Funções RPC Canônicas Verificadas:
    * `public.normalize_cpf(text)`: ativa e imutável.
    * `public.is_platform_admin()`: ativa (SECURITY DEFINER).
    * `public.get_or_create_athlete_id(...)`: ativa com suporte a ON CONFLICT.
    * `public.is_org_member(...)` e `public.is_org_admin_or_organizer(...)`: ativas.
  * Índice Único Canônico:
    * `uq_athletes_normalized_cpf` ON `public.athletes (normalized_cpf)` WHERE `normalized_cpf IS NOT NULL` — ativo e verificado.
* **Contagens de Dados de Negócio no Novo Banco:**
  * `organizations = 0`
  * `competitions = 0`
  * `teams = 0`
  * `athletes = 0`
  * `matches = 0`
  * `venues = 0`
  * `referees = 0`
  * `user_memberships = 0`
  * `organization_invitations = 0`

---

## E. Declaração de Dados de Demonstração

> **DADOS DE DEMONSTRAÇÃO: ZERO**

Nenhuma organização de teste, competição demo, equipe fictícia, atleta fake ou arena de teste foi inserida. A produção está em estado estritamente limpo e pronto para homologação operacional real.

---

## F. Frontend / Vercel

* **Vercel:** Não alterado.
* **Configuração de Ambiente (`.env`):**
  * `VITE_SUPABASE_URL=https://voltz.baseos.online`
  * `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1Ni...`
* **Garantia de Isolamento:**
  * Sem referências a `localhost` em endpoints de produção.
  * Sem referências a IP local ou URL de DEV.
  * Sem fallback de demonstração (LocalStorage desabilitado em modo Supabase configurado).

---

## G. Procedimento de Rollback Disponível

O volume legado foi integralmente clonado e congelado em `supabase_db_baseOs-voltz_legacy_frozen`.
Por segurança operacional, **NÃO executar `rm -rf` manual** em diretórios `/var/lib/docker/volumes/`.

Procedimento seguro de rollback via Docker:
1. Parar o stack: `docker stop supabase_db_baseOs-voltz`
2. Ajustar a montagem do container para apontar diretamente para o volume preservado `supabase_db_baseOs-voltz_legacy_frozen` (ou renomear volumes no compose/daemon sem deleção destrutiva).
3. Reiniciar os serviços e validar os dados (`athletes = 45`).

Segunda camada disponível: restauração via dump nativo `baseos_pre_clean_install_20261007_210508.dump`.

---

## H. Resultado Final

### 🟢 PRODUCTION OPERATIONAL

O BaseOS encontra-se operacional em produção com banco de dados limpo, release `v2.5.0` (`04e196ae66ace63b2070dd24f56137ea3fe57f66`), total integridade relacional, isolamento estrito multi-tenant, RLS ativo, índice único de CPF preservado, ambiente DEV 100% intacto e rollback congelado garantido.

---

## Walkthrough Oficial — Respostas Obrigatórias

1. **Qual SHA está em produção?**  
   `04e196ae66ace63b2070dd24f56137ea3fe57f66`
2. **Qual SHA foi testado no DEV?**  
   `04e196ae66ace63b2070dd24f56137ea3fe57f66`
3. **São exatamente iguais?**  
   **SIM**, idênticos.
4. **O banco antigo foi preservado?**  
   **SIM**, no volume `supabase_db_baseOs-voltz_legacy_frozen`.
5. **O backup foi validado?**  
   **SIM**, SHA-256 `f490c45ae...` com `pg_restore -l` exit code 0.
6. **O novo PostgreSQL está limpo?**  
   **SIM**, apenas infraestrutura Supabase e DDL de domínio.
7. **Quantas organizations existem?**  
   `0`
8. **Quantas competitions existem?**  
   `0`
9. **Quantas teams existem?**  
   `0`
10. **Quantos athletes existem?**  
    `0`
11. **Quantos matches existem?**  
    `0`
12. **Quantas migrations foram aplicadas?**  
    `40`
13. **RLS está ativo?**  
    **SIM**, habilitado em todas as tabelas.
14. **`normalize_cpf` existe?**  
    **SIM**, função imutável `public.normalize_cpf(text)`.
15. **Índice único de CPF existe?**  
    **SIM**, `uq_athletes_normalized_cpf` parcial em `athletes (normalized_cpf)`.
16. **Existem dados demo?**  
    **NÃO**, dados de demonstração: ZERO.
17. **DEV foi alterado?**  
    **NÃO**, DEV completamente intocado.
18. **Vercel foi alterado?**  
    **NÃO**.
19. **DNS foi alterado?**  
    **NÃO**.
20. **Nginx foi alterado?**  
    **NÃO**.
21. **Rollback está disponível?**  
    **SIM**, via volume congelado e via dump nativo.
22. **O BaseOS está operacional?**  
    **SIM**, endpoints PostgREST, Auth e Web respondendo com HTTP 200 OK.
