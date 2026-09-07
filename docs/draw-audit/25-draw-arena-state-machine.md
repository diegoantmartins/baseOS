# 25 — Draw Arena State Machine

## Visão Geral

A **Draw Arena Cinematográfica** é orquestrada por uma máquina de estados que controla:
- Estado visual da arena
- Posição e animação da câmera
- Comportamento de equipes e grupos
- Iluminação dinâmica
- Sequência de eventos

---

## 1. DIAGRAMA DE ESTADOS

```
                    ┌─────────────────────────────┐
                    │       IDLE (Repouso)        │
                    │  Aguardando ação do usuário │
                    │  Urna giratória lentamente  │
                    │  Grupos em repouso          │
                    └──────────────┬──────────────┘
                                   │
                              (Click: Iniciar)
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │    INTRO (Abertura)         │
                    │  Duração: 2-3 segundos      │
                    │  Câmera sai zoom out        │
                    │  Arena revelar-se           │
                    └──────────────┬──────────────┘
                                   │
                           (Fim animação)
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │   ARENA_READY (Pronto)      │
                    │  Duração: indefinida        │
                    │  Arena em establishing shot │
                    │  Urna em repouso, grupos    │
                    │  Aguardando sorteio         │
                    └──────────────┬──────────────┘
                                   │
                     (Click: Sortear ou Auto)
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │  DRAWING_PREPARE (Prep.)    │
                    │  Duração: 0.8 segundos      │
                    │  Câmera aproxima urna       │
                    │  Urna pulsa (respira)       │
                    │  Equipes ficam estáticas    │
                    └──────────────┬──────────────┘
                                   │
                           (Fim preparação)
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │  TEAM_SELECTED (Seleção)    │
                    │  Duração: 1.2 segundos      │
                    │  Uma equipe destacada       │
                    │  Glow intenso               │
                    │  Outras escurecem           │
                    └──────────────┬──────────────┘
                                   │
                           (Fim seleção)
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │   TEAM_FLYING (Voo)         │
                    │  Duração: 1.5 segundos      │
                    │  Equipe viaja em 3D         │
                    │  Câmera acompanha           │
                    │  Trajetória de Bézier       │
                    │  Passa por camadas visuais  │
                    └──────────────┬──────────────┘
                                   │
                           (Fim voo / Entrada)
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │  GROUP_IMPACT (Impacto)     │
                    │  Duração: 0.8 segundos      │
                    │  Equipe entra no grupo      │
                    │  Grupo reage (luz, expand)  │
                    │  Contador atualiza          │
                    │  Câmera pausa               │
                    └──────────────┬──────────────┘
                                   │
                           (Fim reação)
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │  RETURN_TO_URN (Retorno)    │
                    │  Duração: 0.7 segundos      │
                    │  Câmera volta à urna        │
                    │  Equipes reiniciam órbita   │
                    │  Progressão visual          │
                    └──────────────┬──────────────┘
                                   │
                       (Há mais equipes?)
                         Sim │  │ Não
                            │  └──────┐
                            │         │
                            ▼         ▼
                ┌──────────────────┐  ┌─────────────────────┐
                │ DRAWING_PREPARE  │  │  FINAL_REVEAL (Fim) │
                │ (próximo sorteio)│  │  Duração: 2-3s      │
                └──────────────────┘  │  Arena final        │
                                      │  Todos os grupos    │
                                      │  Câmera em pose     │
                                      └────────┬────────────┘
                                              │
                                        (Click)
                                              │
                                              ▼
                                      ┌──────────────┐
                                      │   COMPLETE   │
                                      │   (Completo) │
                                      └──────────────┘
```

---

## 2. ESTADOS DETALHADOS

### IDLE
**Propósito:** Estado de repouso inicial

**Duração:** Indefinida

**Características visuais:**
- Urna giratória lentamente (1 RPM)
- Equipes em órbita regular
- Grupos estáticos com informações
- Iluminação ambiente estável
- HUD com informações da competição
- Botão "Iniciar Sorteio" ou timer automático visível

**Câmera:**
- Posição: Establishing shot (45°, afastada)
- Foco: Centro da arena
- Movimento: Nenhum

**Animações:**
- `urnaRotation`: 360° a cada 8 segundos
- `teamOrbit`: Sincronizada com urna
- `groupPulse`: Leve pulsação (0.2s ciclo)

**Transições:**
- Para INTRO: Usuário clica "Iniciar" ou timer auto executa
- Para COMPLETE: Voltar de resumo (reiniciar)

---

### INTRO
**Propósito:** Abertura cinematográfica, estabelecer atmosfera

**Duração:** 2-3 segundos

**Características visuais:**
- Fade-in gradual da arena
- Identidade BASEOS aparece e desaparece
- Céu/ambiente se ilumina
- Partículas suaves entram
- Grupos "acordam" (brilho gradual)

**Câmera:**
- Posição inicial: Ultra zoom-out (distante)
- Posição final: Establishing shot padrão
- Movimento: Dolly + Zoom simultaneamente
- Easing: easeInOutQuad

**Iluminação:**
- Fade-in luzes principais
- Efeito de cortina subindo

**Transições:**
- Para ARENA_READY: Automático ao fim da animação

---

### ARENA_READY
**Propósito:** Estado estável aguardando sorteio

**Duração:** Indefinida

**Características visuais:**
- Arena em plena operação
- Urna estável (sem rotação contínua)
- Grupos mostram equipes atuais
- HUD ativo mostrando próximo sorteio
- Painel de informações em tempo real

**Câmera:**
- Posição: Establishing shot (45°, ~700px distância)
- Foco: Urna central
- Movimento: Nenhum

**Estados paralelos possíveis:**
- Usuário pode pausar aqui indefinidamente
- Usuário pode ver preview de próxima equipe
- Usuário pode revisar grupos já sorteados

**Transições:**
- Para DRAWING_PREPARE: Usuário clica "Sortear" ou auto-executa

---

### DRAWING_PREPARE
**Propósito:** Preparação para seleção de equipe

**Duração:** 0.8 segundos

**Características visuais:**
- Todas as ações pausam
- Urna "respira" (pulsa: 0.9 → 1.0 → 0.9)
- Grupos escurecem ligeiramente
- Câmera se move para a urna
- Antecipação visual (brightening do background)

**Câmera:**
- De: Establishing shot
- Para: Aproximada da urna (distância ~300px)
- Movimento: Dolly in suave
- Easing: easeOutQuad

**Iluminação:**
- Spotlight na urna intensifica
- Rim light ao redor cresce

**Animações:**
- `urnaPulse`: Scale 0.95 → 1.05 → 1.0 (duração: 0.8s)
- `groupDim`: Opacity 1.0 → 0.5

**Transições:**
- Para TEAM_SELECTED: Automático ao fim

---

### TEAM_SELECTED
**Propósito:** Revelação da equipe sorteada

**Duração:** 1.2 segundos

**Características visuais:**
- Uma equipe é destacada (glow intenso)
- Outras equipes escurecem mais
- Card de equipe aparece (nome, logo)
- Áudio ou efeito visual de "seleção"
- Grupo destino é revelado sutilmente

**Câmera:**
- Permanece na urna
- Pode fazer um pequeno zoom/aproximação
- Foco na equipe selecionada

**Iluminação:**
- Spotlight intenso na equipe
- Glow branco/ouro ao seu redor
- Outras equipes em shadow

**Animações:**
- `selectedTeamGlow`: Intensidade 0 → 1 (duração: 0.6s)
- `selectedTeamScale`: 1.0 → 1.2 → 1.0 (duração: 1.0s)
- `cardReveal`: Fade-in + slide-up

**Efeitos sonoros (opcional):**
- "Whoosh" de seleção
- Bip eletrônico

**Transições:**
- Para TEAM_FLYING: Automático ao fim

---

### TEAM_FLYING
**Propósito:** Trajetória 3D da equipe até o grupo

**Duração:** 1.5 segundos

**Características visuais:**
- Equipe sai da urna em trajetória de Bézier
- Passa por camadas de profundidade
- Câmera segue (tracking shot)
- Grupo destino emite "sinal de recepção" (glow, pulsação)
- Outras equipes permanecem estáticas

**Câmera:**
- Posição: Começa na urna, acompanha equipe
- Tipo: Tracking shot (segue objeto)
- Distância: Mantém equipe no centro da tela
- Profundidade: Acompanha Z da equipe

**Trajetória:**
```
Início: (0, 0, 0) [Centro da urna]
Pico: (grupo.x / 2, grupo.y / 2, 150px) [Altura máxima]
Fim: (grupo.x, grupo.y, 0) [Entrada no grupo]

Curva: Cúbica de Bézier com ease-in-out
Parâmetros:
  - t de 0 a 1 em 1.5 segundos
  - Posição: lerp(start, pico, pico, fim, t)
  - Rotação: Suave ao longo do caminho
```

**Iluminação:**
- Luz segue a equipe (como spotlight móvel)
- Grupo emite rim light crescente
- Trail/esteira suave atrás da equipe (opcional)

**Animações:**
- `teamFlight`: Position + Rotation (duração: 1.5s)
- `groupGlowReceive`: Intensidade crescente (duração: 1.5s)
- `cameraTracking`: Posição + Look-at (duração: 1.5s)

**Transições:**
- Para GROUP_IMPACT: Quando equipe se aproxima do grupo (último 0.2s)

---

### GROUP_IMPACT
**Propósito:** Recepção da equipe no grupo

**Duração:** 0.8 segundos

**Características visuais:**
- Equipe entra no grupo
- Grupo "reage" (brilho, expansão, vibração)
- Contador do grupo atualiza
- Equipe se acomoda na lista do grupo
- Câmera pausa/fixa posição

**Câmera:**
- Posição: Ângulo que mostra grupo recebendo (30-40°)
- Foco: Grupo + equipe
- Movimento: Para (pausa)

**Iluminação:**
- Grupo emite glow roxo/dourado
- Equipe recebe "absorção" (glow de entrada)
- Fundo do grupo brilha

**Animações:**
- `groupExpand`: Scale 1.0 → 1.1 → 1.0 (duração: 0.6s)
- `groupShake`: Vibração suave (duração: 0.4s)
- `counterUpdate`: Fade + slide do número novo
- `teamSettle`: Entra na posição final com spring physics

**Efeitos visuais:**
- Partículas suaves ao redor do grupo (opcional)
- Onda de energia saindo do grupo (opcional)

**Transições:**
- Para RETURN_TO_URN: Automático ao fim

---

### RETURN_TO_URN
**Propósito:** Retorno da câmera e preparação para próximo sorteio

**Duração:** 0.7 segundos

**Características visuais:**
- Câmera volta à urna
- Equipes não sorteadas reiniciam órbita
- Grupos retornam ao repouso
- Progress bar atualiza
- Iluminação normaliza

**Câmera:**
- De: Posição do grupo
- Para: Establishing shot novamente
- Movimento: Dolly out + pan
- Easing: easeInOutQuad

**Iluminação:**
- Dimm de spotlight, volta ao ambient normal

**Animações:**
- `cameraReturn`: Position + Look-at (duração: 0.7s)
- `groupDimOut`: Opacity volta a 1.0
- `orbitResume`: Equipes voltam a órbita
- `progressUpdate`: Barra avança

**Transições:**
- Para DRAWING_PREPARE: Se há mais equipes (retorno ao loop)
- Para FINAL_REVEAL: Se foi a última equipe

---

### FINAL_REVEAL
**Propósito:** Composição final mostrando todos os grupos

**Duração:** 2-3 segundos

**Características visuais:**
- Arena completa é revelada
- Todos os grupos em pose final
- Urna em repouso no centro
- HUD mostra resumo (total de rodadas, estado)
- Efeito de "cortina caindo" ou fade-out de animação

**Câmera:**
- Posição: Wide shot (ultra zoom-out ou bird's eye)
- Foco: Arena completa
- Profundidade: Mostra toda estrutura 3D

**Iluminação:**
- Iluminação geral, sem destaques
- Grupos todos em lighting padrão
- Fundo brilha suavemente

**Animações:**
- `groupsFadeIn`: Todos os grupos aparecem simultaneamente
- `cameraWideShot`: Zoom out suave
- `finalPulse`: Arena toda pulsa uma vez (celebração suave)

**Elementos UI:**
- Botão "Revisar Sorteio"
- Botão "Sortear Novamente"
- Opção "Finalizar e Salvar"

**Transições:**
- Para COMPLETE: Usuário clica ação final
- Para IDLE: Reiniciar sorteio (volta ao estado inicial)

---

### COMPLETE
**Propósito:** Estado final

**Duração:** Indefinida

**Características visuais:**
- Arena em pose final
- Opções: Exportar, Revisar, Sorteio Novo
- Sorteio é oficializado e pode ser salvo

---

## 3. TRANSIÇÕES E INTERRUPTIONS

### Pausar
Em qualquer estado, o usuário pode pausar:
- Último estado é lembrado
- Câmera congela
- Animações pausam (exceto reduced-motion)
- Botão "Continuar" aparece

### Pular
- De DRAWING_PREPARE/TEAM_FLYING/GROUP_IMPACT: Ir direto para RETURN_TO_URN
- Equipe ainda é registrada corretamente
- Câmera salta (com transição)

### Reverter
- De qualquer pós-seleção: Volta para ARENA_READY
- Última equipe é desmarcada
- Grupo remove a equipe
- Contador regride

### Reduced Motion
Em qualquer estado com reduced-motion ativo:
- Elimina trajetória de voo (corta para imediato)
- Reduz movimento de câmera
- Mantém sequência lógica
- Preserva informação visual

---

## 4. TIMING TOTAL

**Cenário: 20 equipes em 4 grupos**

```
IDLE:               0-indefinido
INTRO:              2-3s
ARENA_READY:        0-indefinido (aguardando)
DRAWING_PREPARE:    0.8s (5 vezes) = 4s total
TEAM_SELECTED:      1.2s (5 vezes) = 6s total
TEAM_FLYING:        1.5s (5 vezes) = 7.5s total
GROUP_IMPACT:       0.8s (5 vezes) = 4s total
RETURN_TO_URN:      0.7s (4 vezes) = 2.8s total
---
SUBTOTAL PER CYCLE: ~5.5s/equipe
TOTAL SORTEIO:      ~110s (20 equipes) = ~1:50 minutos

FINAL_REVEAL:       2-3s
---
GRAND TOTAL:        ~115s = ~2 minutos
```

### Aceleração Progressiva

**Versão acelerada (ritmo crescente):**

```
Equipes 1-5:    5.5s cada (padrão)
Equipes 6-10:   4.5s cada (-18%)
Equipes 11-15:  4.0s cada (-27%)
Equipes 16-20:  3.5s cada (-36%)

TOTAL: ~95s (20 equipes) = ~1:35 minutos
```

---

## 5. EVENTOS E HOOKS

A state machine emite eventos que podem ser capturados:

```typescript
// Eventos possíveis
onStateChange(oldState, newState)
onTeamSelected(teamId, groupName)
onTeamFlying(teamId, startPos, endPos)
onGroupImpact(groupName, teamId)
onProgressUpdate(current, total)
onSorteioPaused()
onSorteioResumed()
onSorteioCompleted()
```

---

## 6. COMPATIBILIDADE COM REDUCED MOTION

**Reduz para:**

```
INTRO:          → Sem animação (fade instantâneo)
DRAWING_PREPARE → Sem pulso (urna estática)
TEAM_FLYING:    → Sem trajetória (aparição instantânea)
GROUP_IMPACT:   → Sem vibração (transição simples)
RETURN_TO_URN:  → Câmera corta (sem dolly)
FINAL_REVEAL:   → Sem zoom (fade direto)
```

**Mantém:**
- Sequência lógica
- Valores visuais (cores, tamanhos)
- Informações críticas
- Controles acessíveis

---

## 7. CONCLUSÃO

A máquina de estados oferece:
- ✅ Controle total sobre narrativa visual
- ✅ Transições suaves e profissionais
- ✅ Flexibilidade para interrupções
- ✅ Escalabilidade (mais/menos equipes)
- ✅ Acessibilidade integrada

Próxima etapa: **Arquitetura de Câmera Cinematográfica**
