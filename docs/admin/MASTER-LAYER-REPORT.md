# BaseOS — Platform Admin Layer (Master Control)
**Projeto:** BaseOS (VolleyScore Hub)  
**Papel:** Principal Full-Stack Engineer (React, Node.js, Supabase, RLS)  
**Data:** 05/10/2026  
**Status:** ✅ CONCLUÍDO E HOMOLOGADO (100% OPERACIONAL)

---

## 1. Visão Geral e Arquitetura

Com a consolidação do ecossistema multi-tenant no BaseOS (isolamento de campeonatos, equipes, atletas e partidas por `organization_id`), implementou-se a camada de **Master Control (Platform Admin Layer)**. 

Esta camada concede ao Product Owner / Super Administrador as seguintes capacidades operacionais:
1. **Cadastro Centralizado de Clientes:** Criação de novas empresas/bases (`organizations`) diretamente pela interface visual, sem necessidade de queries manuais no banco.
2. **Visão Global Unificada:** Listagem e consulta de todas as organizações cadastradas no sistema através da tela exclusiva `/master`.
3. **Tenant Switcher (Troca de Contexto em Tempo Real):** Alternância instantânea de contexto no cabeçalho global. Ao selecionar uma empresa cliente, a interface assume o escopo exato daquela organização, permitindo navegar pelo `/dashboard`, campeonatos e súmulas com o mesmo ponto de vista do cliente, com bypass transparente no PostgreSQL RLS.

---

## 2. Tarefa 1: Chave-Mestra no Banco de Dados (SQL)

A migração foi implementada no arquivo canônico:
👉 [`supabase/migrations/20261004000000_platform_admin_layer.sql`](file:///home/diego-martins/docker/volei/supabase/migrations/20261004000000_platform_admin_layer.sql)

### 2.1 Principais Elementos da Migration

1. **Coluna `is_platform_admin` em `public.profiles`:**
   ```sql
   ALTER TABLE public.profiles
     ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

   CREATE INDEX IF NOT EXISTS idx_profiles_platform_admin
     ON public.profiles(is_platform_admin)
     WHERE is_platform_admin = true;
   ```

2. **Função Utilitária `public.is_platform_admin()` (SECURITY DEFINER):**
   ```sql
   CREATE OR REPLACE FUNCTION public.is_platform_admin()
   RETURNS boolean
   LANGUAGE sql
   STABLE
   SECURITY DEFINER
   SET search_path = public
   AS $$
     SELECT COALESCE(
       (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid()),
       false
     );
   $$;
   ```

3. **Bypass Master em Funções Multi-Tenant:**
   - As funções `public.is_org_member` e `public.is_org_admin_or_organizer` foram atualizadas com verificação inicial de `public.is_platform_admin()`, concedendo bypass automático a administradores da plataforma.
   - A função `public.can_read_profile` foi atualizada para permitir leitura irrestrita de perfis por Platform Admins.

4. **Políticas de RLS para Permissão Total (ALL):**
   - **Tabela `public.organizations`:**
     ```sql
     DROP POLICY IF EXISTS "organizations_platform_admin_all" ON public.organizations;
     CREATE POLICY "organizations_platform_admin_all" ON public.organizations
       FOR ALL TO authenticated
       USING (public.is_platform_admin())
       WITH CHECK (public.is_platform_admin());
     ```
   - **Tabela `public.user_memberships`:**
     ```sql
     CREATE POLICY "user_memberships_platform_admin_all" ON public.user_memberships
       FOR ALL TO authenticated
       USING (public.is_platform_admin())
       WITH CHECK (public.is_platform_admin());
     ```

5. **Elevação do Perfil do Product Owner:**
   - O usuário master `diegoantmartins89@gmail.com` recebeu a flag `is_platform_admin = true` e papel `'admin'`, garantindo acesso irrestrito tanto no banco de dados quanto na sessão de autenticação.

---

## 3. Tarefa 2: Painel Master no Frontend (`/master`)

Implementado nos arquivos:
- Tela: [`src/pages/master/MasterDashboard.tsx`](file:///home/diego-martins/docker/volei/src/pages/master/MasterDashboard.tsx)
- Guarda de Rota: [`src/components/auth/RequirePlatformAdmin.tsx`](file:///home/diego-martins/docker/volei/src/components/auth/RequirePlatformAdmin.tsx)
- Roteamento: [`src/App.tsx`](file:///home/diego-martins/docker/volei/src/App.tsx)

### 3.1 Características Visuais e Funcionais

- **Proteção Estrita de Rota:** O componente `RequirePlatformAdmin` intercepta qualquer usuário sem a flag `is_platform_admin = true` e o redireciona para `/dashboard`, disparando notificação defensiva via toast.
- **Tabela Zebra Limpa com Tipografia Azul Escuro:**
  - Linhas com alternância visual suave (`isEven ? 'bg-slate-50/70 dark:bg-zinc-800/40' : 'bg-white dark:bg-zinc-900'`).
  - Cabeçalhos e tipografia em Azul Escuro (`text-blue-950 dark:text-slate-100 font-bold`).
  - Exibição de Nome, Razão Social, CNPJ, Status, Data de Cadastro e ID da Base (com botão de cópia rápida para o clipboard).
- **Botão "Nova Empresa/Base" (Laranja BaseOS / Pílula):**
  - Estilização canônica BaseOS: `rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold`.
  - Ao clicar, abre o modal de criação (`Dialog`) com validação de campos.
  - Ao confirmar, invoca `dataAccess.createOrganization()` (`INSERT INTO public.organizations`), atualiza a lista local e propaga a nova base para o `TenantContext`.
- **Filtros e Métricas:**
  - Cards de métricas com Total de Bases, Bases Ativas e Contexto Selecionado.
  - Barra de busca dinâmica por nome, documento ou ID, combinada com filtros rápidos por status (Todas, Ativas, Bloqueadas, Arquivadas).
  - Botão de ação direta na linha da tabela para trocar imediatamente de contexto para aquela organização e navegar para o `/dashboard`.

---

## 4. Tarefa 3: Tenant Switcher (Troca de Contexto)

Implementado nos arquivos:
- Componente: [`src/components/tenant/TenantSwitcher.tsx`](file:///home/diego-martins/docker/volei/src/components/tenant/TenantSwitcher.tsx)
- Cabeçalho Global: [`src/components/layout/Header.tsx`](file:///home/diego-martins/docker/volei/src/components/layout/Header.tsx)
- Contexto de Tenant: [`src/contexts/TenantContext.tsx`](file:///home/diego-martins/docker/volei/src/contexts/TenantContext.tsx)
- Camada de Dados: [`src/services/dataAccess.ts`](file:///home/diego-martins/docker/volei/src/services/dataAccess.ts)

### 4.1 Funcionamento do Tenant Switcher

1. **Visibilidade Condicional:**
   - O `TenantSwitcher` retorna `null` caso `isPlatformAdmin` seja falso, permanecendo 100% invisível para organizadores, gestores de equipe e atletas.
2. **Interface Discreta no Topo:**
   - Posicionado no `Header` logo após a marca, com badge `Master`, indicador luminoso animado em laranja e o nome da base ativa.
   - Ao clicar, abre um menu suspenso (`DropdownMenu`) com campo de busca interna, listagem de todas as organizações cadastradas e atalho para o `/master`.
3. **Propagação de Contexto e Efeito no RLS:**
   - A seleção de uma organização chama `setOrganizationId(org.id)`.
   - O `dataAccess.setActiveOrganizationId(org.id)` grava o ID no storage local (`baseos.active_org_id`).
   - O cache de consultas do React Query é invalidado globalmente (`queryClient.invalidateQueries()`).
   - Todas as queries subsequentes (`listCompetitions`, `listMatches`, `listTeams`, etc.) passam a filtrar por `.eq('organization_id', activeOrgId)`.
   - Como o usuário possui `is_platform_admin() = true` no banco, o RLS permite a leitura e escrita sem restrições em qualquer base selecionada.

---

## 5. Testes de Integração e Homologação

A suíte de testes dedicada foi executada e homologada:
👉 [`src/test/platformAdminMasterControl.test.tsx`](file:///home/diego-martins/docker/volei/src/test/platformAdminMasterControl.test.tsx)

### 5.1 Cenários Homologados (11/11 Aprovados)

| # | Cenário Testado | Resultado |
| :---: | :--- | :---: |
| 1 | Identificação correta do usuário Product Owner / Master como `isPlatformAdmin = true` | 🟢 PASS |
| 2 | Identificação de usuários normais (organizer, team, etc.) como `isPlatformAdmin = false` | 🟢 PASS |
| 3 | Persistência e recuperação do `activeOrganizationId` via `dataAccess` | 🟢 PASS |
| 4 | Bloqueio e redirecionamento de usuário sem `is_platform_admin` para `/dashboard` pelo guard | 🟢 PASS |
| 5 | Liberação irrestrita de rota `/master` para usuário com `is_platform_admin = true` | 🟢 PASS |
| 6 | Renderização do cabeçalho, métricas e tabela zebra com tipografia Azul Escuro no `MasterDashboard` | 🟢 PASS |
| 7 | Abertura do modal ao clicar em "Nova Empresa/Base" e cadastro com sucesso de nova organização | 🟢 PASS |
| 8 | Filtragem dinâmica de bases pelo campo de busca | 🟢 PASS |
| 9 | Ocultação total do `TenantSwitcher` no cabeçalho para usuários que não são Platform Admin | 🟢 PASS |
| 10 | Renderização do botão discreto com indicador e nome da base ativa para Platform Admin | 🟢 PASS |
| 11 | Alternância de base no `TenantSwitcher` com chamada a `setOrganizationId` e invalidação de cache | 🟢 PASS |

---

## 6. Verificação dos Quality Gates (AGENTS.md)

| Quality Gate | Comando | Resultado |
| :--- | :--- | :---: |
| **Typecheck** | `npx tsc -p tsconfig.app.json --noEmit` | **0 erros** |
| **Linter** | `npm run lint` | **0 erros** |
| **Testes Automatizados** | `npx vitest run src/test/platformAdminMasterControl.test.tsx` | **11/11 testes aprovados** |
| **Build de Produção** | `npm run build` | **Compilado com sucesso** em `dist/` |

---

## 7. Conclusão

A **Platform Admin Layer (Master Control)** está completamente integrada, testada e pronta para uso. O Product Owner dispõe da chave-mestra no banco de dados, da tela administrativa `/master` para provisionamento de novos clientes e do `TenantSwitcher` no cabeçalho para navegar entre as bases com isolamento dinâmico e suporte operacional irrestrito.
