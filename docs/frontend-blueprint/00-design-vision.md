# BASEOS — FRONTEND TRANSFORMATION BLUEPRINT
## 00. Visão de Design, Filosofia & Princípios (Design Vision)

---

## 1. VISÃO DO PRODUTO: ENTERPRISE SPORTS SAAS

O **BaseOS** é o sistema operacional de gestão e operação em tempo real de competições esportivas de voleibol (quadra e praia). O objetivo desta transformação visual e de UX é elevar a plataforma ao padrão dos mais refinados produtos SaaS de alta complexidade do mercado (como Linear, Vercel, Stripe e Raycast), adaptado especificamente para as demandas de alta pressão e velocidade do ambiente esportivo.

A interface deve transmitir instantaneamente:
- **Profissionalismo & Confiabilidade**: Uma ferramenta corporativa estável em que federações, ligas e organizadores confiam a integridade de seus campeonatos.
- **Clareza & Densidade Equilibrada**: Apresentação limpa de chaves, classificações complexas e regulamentos sem ruído visual.
- **Velocidade & Eficiência Operacional**: Operações frequentes na mesa do ginásio (marcar pontos, aplicar sanções, substituir atletas, gerar súmulas em PDF) executáveis com o mínimo de cliques e tempo de resposta imediato.
- **Precisão Matemática**: Placares e critérios de desempate com alinhamento numérico perfeito (`tabular-nums`) e fidelidade estrita às regras oficiais (FIVB/CBV).

---

## 2. O QUE O BASEOS É vs. O QUE O BASEOS NÃO É

```text
┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
│ O BASEOS É:                                   │ O BASEOS NÃO É:                               │
├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ ✔ Um SaaS esportivo profissional e maduro     │ ❌ Um template genérico de dashboard comercial│
│ ✔ Dark mode profundo (Zinc) com acento âmbar  │ ❌ Um aplicativo gamer ou cyberpunk com neon  │
│ ✔ Tipografia ultra legível e números tabulares│ ❌ Uma interface com gradientes excessivos    │
│ ✔ Micro-interações táteis e rápidas (150ms)   │ ❌ Um site com animações lentas e decorativas │
│ ✔ Componentização modular e reutilizável      │ ❌ Telas com estilos inline e cores soltas    │
│ ✔ Preparado para toque em tablets de quadra   │ ❌ Um sistema que trava em telas mobile       │
│ ✔ Fiel às regras de negócio e não-regressivo  │ ❌ Um redesign destrutivo do zero             │
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

---

## 3. PERFIS DE USUÁRIO & CONTEXTOS DE USO

1. **Organizador / Diretor de Torneio (Desktop)**:
   - *Contexto*: Planejamento prévio, criação de regulamentos, sorteio de grupos com chaveamento determinístico, homologação de inscrições e emissão de boletins oficiais.
   - *Necessidade*: Visão panorâmica, gestão em massa, segurança e prevenção de erros operacionais.
2. **Apontador de Mesa & Árbitro (Tablet / Laptop de Quadra)**:
   - *Contexto*: Operação em tempo real ao lado da quadra com barulho e pressão de tempo, pontuando set a set, registrando substituições e gerando súmulas assinadas.
   - *Necessidade*: Botões táteis amplos, placar gigante e escaneável, zero atraso de interface e atalhos rápidos.
3. **Dirigente de Equipe / Técnico (Mobile / Tablet)**:
   - *Contexto*: Acesso via link exclusivo (`/equipe/inscricao/:token`) para envio do elenco de atletas, numeração de camisa, comissão técnica e consulta de jogos da rodada.
   - *Necessidade*: Formulário guiado com validação em tempo real de limites e prazos.
4. **Público / Atletas / Espectadores (Mobile)**:
   - *Contexto*: Acompanhamento de resultados ao vivo, tabelas de classificação e horários dos jogos no celular.
   - *Necessidade*: Carregamento instantâneo, visualização adaptativa de tabelas e placares claros.

---

## 4. PRINCÍPIOS DE DESIGN NORTEADORES

1. **A Função Conduz a Forma**: Cada elemento visual deve ter um propósito funcional. Elementos decorativos sem valor de negócio são terminantemente proibidos.
2. **Preservação de Dados & Feedback Imediato**: Nenhuma ação destrutiva ocorre sem confirmação explícita; nenhuma ação de salvamento ocorre sem feedback visual claro (Toasts via `sonner`).
3. **Hierarquia Semântica Rigorosa**: Uma única ação primária por contexto de tela. Ações secundárias em tom neutro e ações destrutivas em vermelho contido.
4. **Cobertura Universal de 4 Estados**: Toda tela e widget deve tratar formalmente o estado Normal, Carregando (Skeleton), Vazio (com CTA) e Erro (com ação de tentar novamente).
