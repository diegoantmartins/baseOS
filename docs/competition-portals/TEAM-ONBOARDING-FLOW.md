# BASEOS — FLUXO OPERACIONAL DE ONBOARDING DE EQUIPE (FASE 2)
## Manual do Fluxo Unificado de Cadastro, Vinculação, Prazos e Credenciais

**Projeto:** BaseOS (VolleyPro)  
**Documento:** `docs/competition-portals/TEAM-ONBOARDING-FLOW.md`  
**Data:** 04/09/2026  

---

## 1. INTRODUÇÃO E OBJETIVO OPERACIONAL

O onboarding de equipes no BaseOS foi redesenhado para eliminar passos redundantes e dar máxima agilidade ao gestor da competição.

No fluxo unificado, o organizador cadastra e inscreve uma equipe em menos de 1 minuto sem sair da página de inscrições do campeonato, recebendo imediatamente o link exclusivo do portal e a mensagem formatada para envio via WhatsApp Web.

---

## 2. DIAGRAMA DO FLUXO COMPLETO

```text
       [PAINEL DO ORGANIZADOR: /competicoes/:id/inscricoes]
                                │
                      clique em "+ Cadastrar Equipe"
                                │
                                ▼
            [FORMULÁRIO UNIFICADO DE CADASTRO]
             - Modo: Nova Equipe ou Reutilizar Existente
             - Dados da Equipe: Nome, Sigla (3 letras), Escudo
             - Dados do Gestor: Nome, WhatsApp, E-mail
             - Prazo Regulamentar: Herdado da Competição (defaultDeadline)
                                │
                      clique em "Salvar Equipe"
                                │
                                ▼
            [ORQUESTRAÇÃO ATÔMICA: registerTeamInCompetition]
             1. Validação de regras e prazo
             2. Deduplicação (criação de Team ou reutilização)
             3. Bloqueio contra inscrição duplicada na mesma competição
             4. Geração da CompetitionTeam com status 'invited'
             5. Vinculação do responsável em persons ('manager')
             6. Registro na Trilha de Auditoria Operacional
                                │
                                ▼
             [MODAL DE SUCESSO: TeamRegistrationSuccessModal]
             - Resumo das informações e prazo
             - Link Oficial do Portal (/equipe/inscricao/:token)
             - Botões: [Copiar Link] e [Copiar Mensagem]
             - Botão: [Enviar pelo WhatsApp]
                                │
                                ▼
                 [ABERTURA DO WHATSAPP WEB]
             - Abre em nova aba com mensagem pré-carregada
             - Organizador revisa e confirma o envio
                                │
                                ▼
                    [PORTAL DA EQUIPE]
             - Gestor abre o link sem senha
             - Preenche a lista nominal de atletas
             - Finaliza o elenco antes do prazo expirar
```

---

## 3. TRATAMENTO DE DUPLICIDADE (CASOS A, B E C)

| Caso | Cenário | Comportamento do Sistema |
|---|---|---|
| **Caso A** | Equipe é nova no sistema | Cria um novo `TeamRecord` global com `registrationToken` e em seguida cria a `CompetitionTeam`. |
| **Caso B** | Equipe já existe no sistema, mas não está inscrita nesta competição | Reutiliza o `TeamRecord` existente e cria apenas a nova `CompetitionTeam` vinculada à competição ativa. |
| **Caso C** | Equipe já está inscrita nesta competição | A operação é rejeitada com alerta: *"A equipe [Nome] já está inscrita nesta competição."* Nenhuma duplicata é gravada no banco. |

---

## 4. HERANÇA CANÔNICA DE PRAZO

Conforme o princípio de que o `CompetitionConfig` e o domínio da competição são as fontes únicas de regras:
1. O formulário não inventa prazos nem adota prazos arbitrários (`+7 dias`, `+30 dias`).
2. O prazo é extraído diretamente de `competition.defaultDeadline`.
3. Se a competição não tiver prazo configurado, o formulário exibe um banner de alerta e impede o envio até que o organizador configure o prazo oficial.

---

## 5. EXPERIÊNCIA DO GESTOR DA EQUIPE

Ao receber o link via WhatsApp, o gestor clica e é direcionado para:
`https://[host]/equipe/inscricao/:token`

- Não há necessidade de cadastrar usuário prévio ou lembrar senhas.
- O token criptográfico de 36 caracteres valida a sessão diretamente para aquela equipe naquele torneio.
- Na tela do portal, o gestor visualiza:
  - Contagem regressiva do prazo limite.
  - Botão "Adicionar Atleta" (validação de número 1-99, 1 capitão, até 2 líberos).
  - Ao atingir o elenco mínimo (ex.: 6 para quadra, 2 para praia), o botão "Finalizar e Confirmar Elenco" é habilitado.
  - Próximos confrontos da tabela de jogos e classificação em tempo real.
