# 23 — Draw Arena Cinematic Audit

## Contexto
Esta é uma auditoria profunda da implementação atual do módulo de sorteio visual, com foco em analisar o estado da arte da apresentação e planejar uma evolução para uma experiência cinematográfica, 3D, premium e esportiva.

---

## 1. ARQUITETURA ATUAL

### 1.1 Componentes Principais

#### `DrawScene3D.tsx`
**Responsabilidade:** Camada visual principal da apresentação do sorteio.

**Estado de implementação:**
- Renderiza uma cena em 2D/CSS 3D (transformStyle: preserve-3d)
- Não utiliza Three.js ou WebGL real
- Usa Framer Motion para animações
- Comportamento motion-tracking com mouse (parallax 2D simulado)
- Renderiza 18 "bolas" de equipes em posição circular ao redor de uma urna central
- Grupos são renderizados como cards absolutos em posições fixas
- Há uma revelação de equipe em um card central
- Progress bar com contagem visual

**Análise:**
```
✓ Funcional e estável
✓ Suporta reduced-motion
✓ Usa constraints de CSS 3D (não é 3D verdadeiro)
✗ Sem câmera real
✗ Sem profundidade volumétrica
✗ Sem trajetórias 3D
✗ Parallax é apenas movimento 2D de mouse
✗ Urna é uma representação visual, não um modelo 3D
✗ Sem iluminação dinâmica
✗ Sem easing cinematográfico sofisticado
```

#### `DrawPage.tsx`
**Responsabilidade:** Orquestra o sorteio e gerencia a modal de apresentação.

**Estado de implementação:**
- Página React Router com lista de competições
- Interface para configurar sorteio (grupos, seeding mode, seed, cabeças de chave)
- Drag & drop para mover equipes entre grupos
- Chama `runDraw()` do motor
- Abre LiveDrawModal com o resultado
- Salva sorteio em banco de dados

**Análise:**
```
✓ Motor de sorteio é chamado corretamente
✓ Resultado é passado para a modal
✓ Não interfere com lógica de sorteio
✓ Validação de configuração existente
✗ Não há pré-visualização cinematográfica
✗ Não há controle de apresentador
```

#### `LiveDrawModal.tsx`
**Responsabilidade:** Wrapper que conecta DrawPage com DrawScene3D.

**Estado de implementação:**
- Recebe `result: DrawResult | null`
- Reutiliza o resultado real ou cria um substituto vazio
- Passa para DrawScene3D sem modificar

**Análise:**
```
✓ Integração correta
✓ Sem lógica de sorteio
✗ Não oferece controles adicionais
✗ Sem preview cinematográfico
```

#### `drawRevealSequence.ts`
**Responsabilidade:** Define a sequência de revelação das equipes.

**Estado de implementação:**
- Constrói array de eventos ordenados por grupo
- Cada evento: { teamId, groupName, order }
- Sequência: Grupo A, Grupo B, ..., depois segunda rodada, etc.

**Análise:**
```
✓ Lógica de sequência simples e correta
✓ Não interfere com motor de sorteio
✗ Sem controle de ritmo
✗ Sem estados intermediários
✗ Sem eventos de câmera
```

### 1.2 Camada de Serviços e Tipos

#### `drawService.ts`
**Responsabilidade:** Motor de sorteio puro.

**Estado de implementação:**
- `mulberry32()` - PRNG determinístico
- `distributeTeamsIntoGroups()` - Distribuição em grupos
- `generateGroupRoundRobin()` - Tabela de jogos (Berger table)
- `runDraw()` - Orquestra o sorteio
- Suporta modo 'random' e 'seeded'
- Sem side effects, totalmente puro

**Análise:**
```
✓ Integridade crítica do sorteio
✓ Sem acoplamento com apresentação
✓ Totalmente determinístico
✓ Bem testado (27 testes)
✗ Não pode ser alterado nesta fase
```

#### `types/draw.ts`
**Responsabilidade:** Contratos de tipo para sorteio.

**Tipos:**
- `DrawConfig` - configuração do sorteio
- `DrawTeamEntry` - entrada do sorteio
- `DrawGroup` - grupo com equipes
- `DrawMatchProposal` - proposta de jogo
- `DrawResult` - resultado completo
- `DrawRecord` - resultado persistido

**Análise:**
```
✓ Estrutura clara e bem definida
✓ Suporta estado ('preview', 'official', 'locked')
✓ Sem dependências cíclicas
✗ Sem tipos específicos para apresentação cinematográfica
✗ Sem tipos para câmera, trajetórias, lighting
```

### 1.3 Dependências Atuais

```
✓ Framer Motion (v12.29.0) - animações
✓ React (v18.3.1) - UI framework
✓ Tailwind CSS - estilo
✓ Radix UI - componentes acessíveis
✓ Lucide React - ícones
✗ Three.js - NÃO instalado
✗ React Three Fiber - NÃO instalado
✗ Drei - NÃO instalado
✗ Babylon.js - NÃO instalado
```

---

## 2. AUDITORIA VISUAL DA IMPLEMENTAÇÃO ATUAL

### 2.1 Câmera
- ❌ **Não existe câmera real**
- Layout é absolutamente posicionado em viewport 2D
- Movimento de mouse só afeta rotação Y/X (CSS 3D simulado)
- Sem perspectiva cinematográfica
- Sem estabelecimento de shot (establishing shot)

### 2.2 Objetos
- ✓ Urna central (representação com círculos concêntricos)
- ✓ Bolas de equipes (18 bolas posicionadas radialmente)
- ✓ Grupos (4 cards em posições fixas)
- ✗ Sem volumetria real (tudo é 2D com sombras CSS)
- ✗ Sem texturas 3D
- ✗ Sem modelos 3D

### 2.3 Movimento
- ✓ Transições suaves com Framer Motion
- ✓ Easing definido (easeInOut, spring)
- ✓ Movimento de mouse em tempo real
- ✗ Sem trajetórias 3D
- ✗ Sem movimento de câmera cinematográfico
- ✗ Sem aceleração/desaceleração sofisticada
- ✗ Sem slow motion em momentos críticos

### 2.4 Iluminação
- ✓ Uso de CSS radial-gradient para simular iluminação
- ✓ Sombras CSS (box-shadow com blur)
- ✓ Cor de fundo com gradient radial
- ✗ Sem iluminação dinâmica
- ✗ Sem glow em tempo real
- ✗ Sem light rays ou volumetric lighting
- ✗ Sem resposta a interações

### 2.5 Composição Visual
- ✓ Urna central é o foco natural
- ✓ Grupos em posições simétricas
- ✓ Equipe destacada em primeiro plano
- ✓ Progress bar integrado
- ✗ Sem profundidade visual clara
- ✗ Sem sensação de escala real
- ✗ Sem hierarquia de profundidade

---

## 3. ESTADO DO SORTEIO

### O que já funciona
- ✓ Motor de sorteio é determinístico e testado
- ✓ Distribuição equilibrada em grupos
- ✓ Tabela de jogos (Berger table)
- ✓ Persistência em banco de dados
- ✓ Drag & drop para reordenação manual
- ✓ Validação de configuração
- ✓ Suporte a cabeças de chave (seeding)
- ✓ Testes automatizados (47 testes passando)
- ✓ TypeScript sem erros
- ✓ Build de produção funcionando

### O que pode ser reutilizado
- ✓ Toda a estrutura de tipos
- ✓ Motor de sorteio (intacto)
- ✓ Sequência de revelação
- ✓ Integração DrawPage → LiveDrawModal → DrawScene3D
- ✓ Sistema de reduced-motion
- ✓ Estrutura de animação com Framer Motion

### O que deve ser refatorado
- 🔄 DrawScene3D (expandir, não reescrever)
- 🔄 buildRevealSequence (adicionar dados cinematográficos)
- 🔄 Tipos de DrawResult (estender para cinematografia)

### O que não pode ser tocado
- 🚫 `drawService.ts` (motor)
- 🚫 `mulberry32` (PRNG)
- 🚫 Algoritmo de distribuição
- 🚫 Berger table
- 🚫 Persistência de dados
- 🚫 Lógica de validação

---

## 4. PROBLEMAS ENCONTRADOS

### Críticos
1. **Sem verdadeira câmera 3D**
   - Impacto: Não é possível fazer cinematografia profissional
   - Solução: Necessário Three.js ou Babylon.js

2. **Sem trajetória 3D para equipes**
   - Impacto: Não é possível mostrar movimento no espaço
   - Solução: Sistema de trajetórias com interpolação 3D

3. **Parallax é apenas 2D**
   - Impacto: Falta sensação de profundidade real
   - Solução: Camadas com profundidade real em 3D

### Moderados
4. **Urna é visual, não estrutural**
   - Impacto: Não é um objeto inteligente na cena
   - Solução: Criar urna como componente 3D ou SVG sofisticado

5. **Iluminação é estática**
   - Impacto: Falta dinamismo e reação
   - Solução: Sistema de iluminação em tempo real

6. **Sem state machine visual robusta**
   - Impacto: Difícil controlar fluxo cinematográfico
   - Solução: State machine com transições definidas

### Menores
7. **Controles de apresentador limitados**
   - Impacto: Falta flexibilidade em apresentações ao vivo
   - Solução: Expandir controles (pausar, resumir, pular, reverter)

8. **Sem preview em tela grande**
   - Impacto: Não há confiança visual antes de projetar
   - Solução: Modo preview full-screen em desktop

---

## 5. RECOMENDAÇÕES TÉCNICAS

### Tecnologia: Three.js vs Framer Motion

**Análise comparativa:**

| Aspecto | Framer Motion | Three.js |
|---------|---------------|----------|
| Curva de aprendizado | Baixa | Alta |
| Performance em 2D | Excelente | Adequada |
| Câmera real | ❌ | ✅ |
| Trajetórias 3D | ❌ | ✅ |
| Iluminação dinâmica | ❌ | ✅ |
| Sombras em tempo real | ❌ | ✅ |
| Glow/Bloom | ❌ | ✅ (com post-processing) |
| Particles | Possível mas limitado | ✅ |
| Responsividade | ✅ | ✅ |
| Reduzido bundle | ✅ | ❌ (maior) |
| Suporte mobile | ✅ | Degradado |
| Curvas de Bézier | ✅ | ✅ |

**Recomendação:**
- ✅ **Three.js + React Three Fiber + Drei**
- Motivo: Necessário para câmera real, trajetórias 3D, iluminação dinâmica
- Hybrid approach: Framer Motion para HUD/UI, Three.js para arena

**Alternativa (sem Three.js):**
- SVG 3D sofisticado + Framer Motion
- Limitado mas possível
- Não recomendado para cinematografia profissional

---

## 6. DEPENDÊNCIAS A INSTALAR

Se Three.js for escolhido:
```
npm install three @react-three/fiber @react-three/drei
npm install --save-dev @types/three
```

Bundle size impact:
- Three.js: ~600KB (gzipped ~150KB)
- React Three Fiber: ~30KB (gzipped ~10KB)
- Drei: ~200KB (gzipped ~50KB)
- Total add: ~210KB gzipped

Mitigation:
- Code-splitting por rota
- Lazy load da arena cinematográfica
- Fallback para Framer Motion em mobile

---

## 7. COMPATIBILIDADE COM CÓDIGO EXISTENTE

### Sem breaking changes
- ✓ DrawResult continua igual
- ✓ DrawService não é tocado
- ✓ Motor de sorteio intacto
- ✓ Persistência sem alterações
- ✓ Testes existentes permanecem válidos

### Expansão compatível
- Novos tipos para cinematografia (opcional)
- Nova estrutura de componentes (parallel path)
- Novo hook para state machine (não quebra existente)
- Nova camada de câmera (isolada)

---

## 8. ESTRUTURA PROPOSTA

```
src/components/draw/
├── DrawScene3D.tsx                 (atual - será expandido)
├── LiveDrawModal.tsx               (atual - sem mudanças)
├── drawRevealSequence.ts           (atual - será estendido)
│
├── cinematic/                      (NOVO)
│   ├── DrawArenaCinematic.tsx      (wrapper principal)
│   ├── ArenaScene.tsx              (camada Three.js)
│   ├── ArenaUrn.tsx                (modelo urna)
│   ├── ArenaTeamToken.tsx          (token de equipe)
│   ├── ArenaGroups.tsx             (estações de grupo)
│   ├── ArenaCameraController.tsx   (câmera cinematográfica)
│   ├── ArenaLighting.tsx           (sistema de iluminação)
│   └── ArenaParticles.tsx          (partículas)
│
├── hud/                            (NOVO)
│   ├── DrawArenaHUD.tsx            (HUD principal)
│   ├── CompetitionHeader.tsx       (cabeçalho)
│   ├── DrawProgress.tsx            (progresso)
│   ├── CurrentTeamCard.tsx         (equipe atual)
│   ├── GroupStatusPanel.tsx        (status dos grupos)
│   └── PresentationControls.tsx    (controles de apresentador)
│
├── state/                          (NOVO)
│   ├── useDrawArenaState.ts        (state machine)
│   ├── useDrawArenaCamera.ts       (controle de câmera)
│   └── useDrawArenaAnimation.ts    (orquestração de animações)
│
└── constants/                      (NOVO)
    └── drawArenaCinematic.ts       (configurações, timings)
```

---

## 9. CONCLUSÃO DO AUDIT

### Estado Geral
A implementação atual é:
- ✅ **Funcional e estável**
- ✅ **Sem regressions**
- ✅ **Bem testada**
- ✅ **Sem breaking changes na evolução**

### Readiness para Cinematografia
- ⚠️ **Requer adição de Three.js**
- ⚠️ **Requer refatoração de DrawScene3D**
- ⚠️ **Requer nova arquitetura de câmera**
- ⚠️ **Requer state machine mais sofisticada**

### Próximo Passo
Passar para **Design Técnico**: 
- Conceito visual cinematográfico
- Máquina de estados
- Arquitetura de câmera
- Plano de implementação

**Risco de bloqueio:** Nenhum. O sorteio continua funcionando como está enquanto a cinematografia é desenvolvida em paralelo.
