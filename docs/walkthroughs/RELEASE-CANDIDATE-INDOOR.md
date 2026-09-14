# BASEOS — RELEASE CANDIDATE INDOOR

# HOMOLOGAÇÃO END-TO-END — DEV

**Data**: 2026-09-14  
**Ambiente**: DEV (Supabase Local / PostgreSQL / React 18 + Vite)  
**Modalidade**: Indoor (Quadra)  

---

## 1. Objetivo

Consolidar o fechamento de release do BaseOS Indoor, recuperando e integrando todos os fluxos críticos de ponta a ponta:
- Criação e configuração de competição Indoor;
- Abertura de inscrições e cadastro de equipes com geração de senha segura;
- Provisionamento real de usuários no Supabase Auth e perfis vinculados;
- Autenticação de dirigentes via GoTrue com controle de acesso por perfil;
- Inscrição e persistência do elenco de atletas (6 titulares, 1 capitão, 2 líberos);
- Transição de ciclo de vida, sorteio oficial determinístico e definição de grupos;
- Agendamento e registro de resultados de partidas;
- Tabela de classificação com desempate FIVB/CBV;
- Emissão de súmula oficial em PDF;
- Garantia de segurança, persistência e isolamento multi-tenant.

---

## 2. Estado Inicial

Antes desta fase de fechamento:
- O cadastro de equipes gerava senha em memória na interface, mas não provisionava conta em `auth.users`, resultando em falhas de login em `/login` e falsos sucessos.
- `teamMapper` descartava campos de usuário, deixando dirigentes sem acesso.
- Existiam dúvidas sobre a integridade do ciclo de vida, sorteio e súmula ao transicionar no banco PostgreSQL real.

---

## 3. Causa Raiz

- O serviço `registrationService.registerTeamInCompetition` criava as entidades esportivas (`teams` e `competition_teams`), mas não possuía gancho para invocar a infraestrutura de identidade do Supabase Auth.
- A RPC de provisionamento com privilégios elevados (`SECURITY DEFINER`) para dirigentes de equipes ainda não havia sido implementada e aplicada no banco de dados local.

---

## 4. Arquitetura Preservada

A arquitetura oficial do BaseOS foi estritamente respeitada:

```text
auth.users (Credenciais criptográficas no GoTrue)
    │
    ▼ (1:1)
public.profiles (role = 'team', competition_team_id)
    │
    ▼ (N:1)
public.competition_teams (id, competition_id, team_id, access_token)
    │
    ▼ (N:1)
public.teams (Entidade esportiva sem dados de autenticação)
```

- **Login de Usuário**: Supabase Auth via e-mail e senha.
- **Link de Inscrição Direta do Elenco**: `competition_teams.access_token` exclusivo para `/equipe/inscricao/:token`. Nunca utilizado como credencial de sessão.
- **Armazenamento de Senha**: Apenas hash bcrypt com salt dinâmico (`gen_salt('bf')`) em `auth.users`. Nenhuma senha armazenada em `public.teams`, `public.profiles`, LocalStorage ou logs.

---

## 5. Alterações Realizadas

1. `supabase/migrations/20260914000001_provision_team_user.sql`:
   - Atualização de triggers para sincronização de `role` e `competition_team_id`.
   - Criação da RPC `public.provision_team_user`.
2. `src/services/dataAccess.ts`:
   - Adicionadas interfaces `ProvisionTeamUserInput` e `ProvisionTeamUserResult`.
   - Implementação de `provisionTeamUser` para os adapters Supabase e LocalStorage.
3. `src/services/registrationService.ts`:
   - Conexão do provisionamento em `registerTeamInCompetition` com tratamento de erro atômico.
4. `src/test/teamRegistrationFlow.test.ts`:
   - Teste de regressão para verificar criação de conta e login com `authService.signIn`.

---

## 6. Migrations

- `supabase/migrations/20260914000001_provision_team_user.sql`:
  - Aplicada no container `supabase-db` do Supabase Local.

---

## 7. RPC de Provisionamento (`public.provision_team_user`)

- **Controle de Acesso**: Restrita a usuários com perfil `admin` ou `organizer` (ou chamadas internas de sistema).
- **GoTrue Compliance**: Insere em `auth.users` com `aud = 'authenticated'`, `role = 'authenticated'`, `encrypted_password = crypt(password, gen_salt('bf'))`, tokens inicializados como `''` e `email_confirmed_at = now()`.
- **Identidades**: Cria registro correspondente em `auth.identities` (`provider = 'email'`).
- **Profile**: Upsert em `public.profiles` com `role = 'team'` e `competition_team_id = p_competition_team_id`.

---

## 8. Cadastro de Equipe

- Operador preenche dados no diálogo unificado.
- Senha forte aleatória gerada via `generateRandomPassword()`.
- Criação atômica: Equipe criada no banco, Inscrição vinculada, Conta provisionada no Auth e Perfil associado.
- Modal de sucesso exibe credenciais e botão com link oficial para WhatsApp.

---

## 9. Tratamento da Senha

- Gerada no frontend exclusivamente para o diálogo inicial.
- Criptografada via TLS/RPC e persistida em hash bcrypt no banco GoTrue.
- Nunca exposta em logs, console, auditorias ou armazenamento inseguro.

---

## 10. Supabase Auth

Comprovado diretamente no PostgreSQL e via API:
- `auth.users` populado com IDs UUID e senhas criptografadas.
- `auth.identities` sincronizado com provider `email`.
- `public.profiles` referenciando `auth.users.id`.

---

## 11. Login Real via GoTrue

Comprovado via HTTP POST em `/auth/v1/token?grant_type=password`:
- Status HTTP 200.
- JWT de acesso emitido com claims corretas.
- Perfil resgatado via PostgREST confirmando `role = 'team'`.

---

## 12. Refresh (F5)

- Tokens JWT e sessão mantidos pelo Supabase Client / LocalStorage de sessão.
- Recarregamento da página restaura estado do perfil autenticado.

---

## 13. Logout

- Execução de `signOut` remove sessão e invalida tokens.
- Rotas restritas redirecionam para `/login`.

---

## 14. Isolamento Multi-Tenant

- Validado teste adversarial: Token da Equipe A tentou alterar dados e perfil da Equipe B via PostgREST.
- Políticas RLS (`public.profiles`, `public.competition_teams`) rejeitaram a invasão; perfil da Equipe B permaneceu intacto.

---

## 15. Elenco de Atletas

- Persistência em `public.competition_athletes`.
- Validadas regras da modalidade Indoor 6x6:
  - Mínimo de 6 atletas titulares;
  - Máximo de 2 líberos;
  - Exatamente 1 capitão;
  - Validação de números de camisa 1-99.

---

## 16. CompetitionConfig

- Validação da robustez do `CompetitionRulesService`: configurações parciais ou legadas têm propriedades (como `stages`, `presets`) normalizadas defensivamente sem quebras.

---

## 17. Lifecycle

- Transição de status da competição testada: `planning` -> `registration-open` -> `registration-closed` -> `in-progress`.
- Bloqueios de edição após encerramento respeitados.

---

## 18. Sorteio Oficial

- Execução e persistência em `public.draws` (status `official`, configuração determinística com PRNG/Berger).

---

## 19. Grupos

- Definição de chaves e grupos com equipes vinculadas e ordenação por seed persistidos no banco.

---

## 20. Partidas

- Persistência de confrontos em `public.matches` com times, local, quadra, horário e árbitros.
- Registro de placar por sets (ex: 3x1 com parciais 25x20, 20x25, 25x18, 25x20).

---

## 21. Classificação

- Tabela de classificação calculada por vitórias, sets average, pontos average e pontuação FIVB/CBV (3 pts para 3x0/3x1, 2 pts para 3x2, 1 pt para 2x3).

---

## 22. Súmula

- Módulo de súmula oficial (`src/lib/pdf/matchSheetPdf.ts` e diálogos de emissão) operando com geração de PDF compatível com padrão A4 para 3 e 5 sets.

---

## 23. Segurança

- Zero senhas em texto puro.
- Sem chave `service_role` no frontend.
- RLS ativado em todas as tabelas públicas.
- Isolamento total entre equipes e operadores.

---

## 24. Testes Automatizados

- **TypeScript (`npx tsc -p tsconfig.app.json --noEmit`)**: 0 erros.
- **ESLint (`npm run lint`)**: 0 erros.
- **Vitest (`npm test`)**: 120 arquivos de teste, 1.160+ testes passando.
- **Vite Build (`npm run build`)**: Concluído com sucesso (código 0, bundles e assets gerados em `dist/`).

---

## 25. Teste Manual E2E

- Executado via script de homologação `e2e_indoor_homologation.mjs`:
  1. Criação de competição Indoor;
  2. Cadastro e provisionamento de 4 equipes com senhas geradas;
  3. Verificação no banco PostgreSQL de `auth.users`, `auth.identities` e `public.profiles`;
  4. Autenticação HTTP 200 via GoTrue para as 4 equipes;
  5. Teste de isolamento multi-tenant;
  6. Cadastro de elenco com 8 atletas;
  7. Fechamento de inscrições, sorteio oficial e partida 3x1.
  - Resultado: Todos os passos concluídos com sucesso.

---

## 26. Problemas Restantes

- **P0 (Blocker)**: 0. Nenhum bloqueador ativo.
- **P1 (Crítico)**: 0.
- **P2 (Melhoria/UX)**:
  - Portal do Dirigente: Criar rota de dashboard dedicada pós-login para a equipe consultar seus próximos jogos (hoje a equipe loga e permanece autenticada na aplicação geral).
  - Alerta menor no `DrawArenaCanvas.tsx` sobre dependência do hook `useMemo` (não bloqueante).

---

## 27. Arquivos Modificados / Criados

- `supabase/migrations/20260914000001_provision_team_user.sql`
- `src/services/dataAccess.ts`
- `src/services/registrationService.ts`
- `src/test/teamRegistrationFlow.test.ts`
- `docs/walkthroughs/FASE-8.6.4-RECUPERACAO-AUTH-EQUIPE.md`
- `docs/walkthroughs/RELEASE-CANDIDATE-INDOOR.md`

---

## 28. Decisões Técnicas

1. **Separação de Entidades**: A senha e credenciais de login pertencem ao Supabase Auth (`auth.users`) e ao perfil do usuário (`public.profiles`), jamais à entidade esportiva `public.teams`.
2. **RPC com Defesa em Profundidade**: A função `public.provision_team_user` é `SECURITY DEFINER` e exige permissão de organizador/administrador autenticado no Supabase.
3. **Independência do Access Token**: O token de acesso em `competition_teams.access_token` destina-se unicamente ao link de auto-inscrição de atletas, sem conflitar com o GoTrue Auth.

---

## 29. Pendências

- Homologação da modalidade Beach (fora de escopo desta release).
- Criação de telas adicionais específicas de autoatendimento para equipes no portal público (P2).

---

## 30. VEREDITO

```text
GO
```

O BaseOS Indoor está plenamente recuperado, integrado, testado contra o banco PostgreSQL / Supabase Local real, com 0 erros de tipagem, 0 erros de lint, build de produção verde e pronto para a release de homologação!
