# BASEOS — INTEGRAÇÃO COM WHATSAPP E ACESSO AO PORTAL DA EQUIPE (FASE 2)
## Especificação do Serviço de Mensageria, Normalização de Telefones e Abertura Segura

**Projeto:** BaseOS (VolleyPro)  
**Documento:** `docs/competition-portals/WHATSAPP-TEAM-ACCESS.md`  
**Data:** 04/09/2026  

---

## 1. OBJETIVO DO SERVIÇO DE WHATSAPP

Centralizar em um único módulo puro e testável (`src/services/whatsAppService.ts`):
1. **Normalização de números telefônicos:** conversão de formatos brutos digitados por usuários (ex.: `(31) 98765-4321`, `31987654321`, `+55 31 ...`) para o padrão internacional exigido pela API do WhatsApp.
2. **Template canônico de mensagem:** construção consistente da mensagem de convite/acesso contendo nome do gestor, equipe, campeonato, link direto e prazo.
3. **Encoding de URL:** codificação correta dos caracteres especiais (espaços, quebras de linha, acentos e emojis) para a URL `api.whatsapp.com`.
4. **Garantia de não-envio automático:** o sistema **nunca** dispara mensagens via backend ou bot não autorizado. O envio sempre ocorre por ação explícita do organizador via WhatsApp Web ou WhatsApp App.

---

## 2. REGRAS DE NORMALIZAÇÃO DE NÚMEROS (`normalizePhoneNumber`)

- **Limpeza de caracteres:** são removidos todos os caracteres não numéricos (`\D`), tais como `(`, `)`, `-`, `.` e espaços.
- **DDI Brasil (55):**
  - Se o número tiver 10 dígitos (DDD + telefone fixo, ex.: `3133334444`) ou 11 dígitos (DDD + celular, ex.: `31987654321`) e não iniciar com `55`, o prefixo `55` é injetado automaticamente.
- **Números Internacionais com `+`:**
  - Se a entrada começar com `+` e o código de país não for Brasil (ex.: `+1 555 123 4567`), o formato internacional é respeitado e mantido sem injeção indevida de 55.

---

## 3. TEMPLATE CANÔNICO DA MENSAGEM (`buildTeamRegistrationWhatsAppMessage`)

```text
Olá, [NOME DO RESPONSÁVEL]! 👋

A equipe *[NOME DA EQUIPE]* foi cadastrada na competição *[NOME DA COMPETIÇÃO]* no BaseOS.

Você pode acessar o Portal da Equipe pelo link:

[URL DO PORTAL: https://.../equipe/inscricao/:token]

Dados de identificação:
E-mail: [E-MAIL DO RESPONSÁVEL]
Acesso: Link direto exclusivo com token de segurança (dispensa senha inicial).

No portal você poderá cadastrar os atletas da equipe dentro do prazo de inscrição e acompanhar jogos, resultados e classificação.

Prazo para cadastro dos atletas:
[DATA E HORA DO PRAZO REGULAMENTAR]

Qualquer dúvida, entre em contato com a organização.
```

---

## 4. GERAÇÃO DE URL E ABERTURA SEGURA

A URL oficial é construída como:
```text
https://api.whatsapp.com/send?phone=[TELEFONE_NORMALIZADO]&text=[MENSAGEM_ENCODED]
```

Se nenhum telefone for informado no cadastro, a URL gerada é:
```text
https://api.whatsapp.com/send?text=[MENSAGEM_ENCODED]
```
permitindo que o organizador selecione qualquer contato da sua agenda no WhatsApp Web para encaminhar a mensagem.

Ao clicar em **"Enviar pelo WhatsApp"**, a função `openWhatsAppWeb` executa:
```ts
window.open(url, '_blank', 'noopener,noreferrer');
```
garantindo proteção contra *tabnabbing* e mantendo a sessão do BaseOS isolada.
