# 24 — Draw Arena Visual Concept

## Visão Geral

A **Draw Arena Cinematográfica** é uma evolução da apresentação do sorteio para uma experiência que se assemelha a uma transmissão profissional de competição esportiva.

**Não é um jogo. Não é um efeito vazio. É um evento.**

---

## 1. INSPIRAÇÃO E REFERÊNCIAS

### Visual
- Cerimônias de sorteio da UEFA Champions League
- Transmissões da NBA Draft
- Sequências de abertura de eventos esportivos
- Cinemas premium com ênfase em profundidade e ritmo

### Princípios
- **Gravidade visual**: Tudo tem peso e importância
- **Narrativa cinematográfica**: Sequência estabelecimento → revelação → resolução
- **Profundidade real**: Não apenas simulação
- **Ritmo variável**: Tensão, clímax, resolução

---

## 2. EXPERIÊNCIA DESEJADA

### Ato I: Abertura (0-3s)

```
Tela escura.
Logo/Identidade BASEOS aparece de forma sutil.
Câmera se afasta lentamente, revelando a arena.
A iluminação cresce gradualmente.
Ambiente 3D vem à vida.
```

**Sensação:** Profissionalismo, antecipação.

### Ato II: Apresentação da Arena (3-8s)

```
Câmera faz um estabelecimento completo (establishing shot).
A urna está no centro, iluminada dramaticamente.
Os grupos estão visíveis em suas posições (espacialmente diferenciados).
Todas as equipes (representadas visualmente) giram lentamente ao redor da urna.
Painel informativo mostra o estado da competição.
```

**Sensação:** Escala, autoridade, organização.

### Ato III: Sorteio (8s - fim)

**Repetido para cada equipe sorteada:**

1. **Preparação (0.8s)**
   - Todas as equipes param de girar
   - Câmera se aproxima da urna
   - Urna "respira" (pulsa levemente)

2. **Seleção (1.2s)**
   - Uma equipe "sai" da urna
   - Glow ao seu redor
   - Câmera acompanha
   - Outras equipes "voltam para trás"

3. **Voo (1.5s)**
   - Equipe viaja em trajetória 3D
   - Câmera segue (tracking shot)
   - Percorre o espaço com profundidade real
   - Passa por outras camadas visuais

4. **Destino (0.8s)**
   - Equipe chega ao grupo
   - Grupo "reage" visualmente (brilho, expansão)
   - Câmera posa
   - Números são atualizados

5. **Retorno (0.7s)**
   - Câmera volta para a urna
   - Equipes reiniciam rotação
   - Próximo sorteio

**Duração total por equipe:** ~5 segundos (ajustável por ritmo)

---

## 3. CONCEITO VISUAL

### Paleta de Cores

**Primárias:**
- Fundo: `#020816` (preto premium)
- Urna: `#f6c76b` (ouro/dourado)
- Acentos: `#3b82f6` (azul profundo)
- Equipes: Cores do clube (logos reais)

**Secundárias:**
- Sombras: `#050c1d`
- Highlights: `#f8fafc`
- Reação: `#8b5cf6` (roxo elétrico)
- Foco: `#fcd34d` (dourado brilhante)

### Tipografia

- Cabeçalho: `font-black`, tracking amplo, 2.5rem (desktop)
- Labels: `font-bold`, maiúscula, 0.75rem
- Números: Monoespacho, bold

### Estilo de Iluminação

```
Principal (Urna):
  - Luz branca com tint dourado
  - Intensidade 1.0
  - Posição: superior-central

Ambiente:
  - Luz azul suave
  - Intensidade 0.3
  - Posição: omnidirecional

Spotlight (Equipe selecionada):
  - Luz branca pura
  - Intensidade 1.2 durante seleção
  - Posição: acompanha equipe

Rimlight (Grupos):
  - Luz roxo elétrico
  - Intensidade 0.4
  - Apenas quando grupo está recebendo equipe
```

---

## 4. ELEMENTOS PRINCIPAIS

### 4.1 Urna Central

**Representação física:**
- Modelo 3D: Esfera facetada ou cilindro cônico
- Altura: ~200px (desktop), ~120px (mobile)
- Material: Vidro/cristal (semi-transparente)
- Cor: Dourada/transparent com reflexos

**Comportamento:**
- Gira constantemente (1 rotação a cada 8 segundos)
- Quando selecionando: para e pulsa
- Quando equipe sai: abre sutilmente
- Partículas internas (bolas/esferas)

**Iluminação:**
- Glow externo
- Reflexo especular
- Sombra projetada

### 4.2 Equipes (Tokens/Bolas)

**Representação:**
- Esfera com logo ou cor do clube
- Tamanho: ~24px (normal), ~40px (selecionado)
- Posição inicial: Orbitando a urna
- Material: Realista com reflexo (se possível)

**Comportamento:**
- Giram ao redor da urna
- Quando selecionadas: destacam, glow intenso, param
- Saem da órbita e viajam até o grupo
- Entram no grupo e acomodam

**Identificação:**
- Logo do clube (se disponível)
- Inicial do nome (fallback)
- Escudo em miniatura

### 4.3 Grupos (Estações)

**Representação:**
- Card volumétrico ou plataforma 3D
- Layout: Distribuído pela cena de acordo com quantidade
- Tamanho base: ~200px x ~150px (desktop)
- Material: Painel translúcido

**Posicionamento:**
- 2 grupos: Esquerda / Direita
- 3 grupos: Triangular
- 4 grupos: Quadrado
- 5+ grupos: Circular

**Comportamento:**
- Estáticos durante apresentação
- Quando equipe se aproxima: reação de luz
- Mostram lista de equipes dentro
- Contador de equipes atualiza

**Iluminação:**
- Borda com rim light quando recebendo equipe
- Glow interno quando cheio

### 4.4 Ambiente (Background/Midground)

**Elementos:**
- Piso/plataforma 3D
- Grid de fundo (sutil, não cyberpunk)
- Atmosfera (névoa/haze para profundidade)
- Superfícies com material (não apenas cor plana)

**Cores:**
- Tons escuros com reflexos
- Degradê radial ao redor da urna
- Sem excesso de efeitos

---

## 5. CINEMATOGRAFIA

### Câmera Inicial (Establishing Shot)

```
Posição: Afastada (distância = 600-800px)
Ângulo: 45 graus acima do centro
Foco: Centro da arena
Perspectiva: Ligeiramente angulada
Transição: Suave, duração 2-3 segundos
```

### Câmera Durante Sorteio

**Fase 1 - Aproximação:**
```
Mover para a urna
Ângulo: 30 graus
Duração: 0.8s
Easing: easeInOutQuad
```

**Fase 2 - Acompanhamento:**
```
Seguir a equipe selecionada
Distância: Ajustar para manter na tela
Ângulo: Dinâmico, acompanha trajetória
Duração: 1.5s (tempo do voo)
```

**Fase 3 - Pausa no Destino:**
```
Posição: Ângulo que mostra grupo recebendo
Ângulo: 30-45 graus
Duração: 0.8s
```

**Fase 4 - Retorno:**
```
Voltar à posição de sorteio
Duração: 0.7s
Easing: easeInOutCubic
```

### Movimentos Evitados
- ❌ Zoom brusco
- ❌ Rotações erráticas
- ❌ Múltiplas câmeras rapid-cutting
- ❌ Shakes (salvo tremor muito sutil)
- ❌ Movimentos desnecessários

---

## 6. TRAJETÓRIA DA EQUIPE

**Padrão geral:**

```
Ponto de Saída: Centro da urna
       ↓
Altura: Sobe para topo da cena (Z positivo)
       ↓
Arco: Trajetória de Bézier (curva suave)
       ↓
Destino: Posição do grupo alvo
       ↓
Entrada: Desce para assentamento
```

**Curva de movimento:**
- Inicio: Slow (ease-out)
- Meio: Rápido (linear)
- Fim: Slow (ease-in)

**Parâmetros:**
- Duração: 1.5 segundos
- Altura máxima: 30% da altura da cena
- Curva: Cúbica de Bézier

**Exemplo com 4 grupos:**

```
Urna no centro (0, 0, 0)

Grupo A (esquerda-acima):    (-280px, -200px)
Grupo B (direita-acima):     (280px, -200px)
Grupo C (esquerda-abaixo):   (-280px, 200px)
Grupo D (direita-abaixo):    (280px, 200px)

Trajetória para Grupo A:
  Start: (0, 0, 0)
  Apex: (-140, -100, 150) [3D com profundidade]
  End: (-280, -200, 0)
```

---

## 7. RITMO E TIMING

### Aceleração Progressiva

**Primeiras 5 equipes:** Ritmo padrão (~5s cada)
**Próximas 5 equipes:** 10% mais rápido (~4.5s cada)
**Próximas 5 equipes:** 20% mais rápido (~4s cada)
**Últimas equipes:** 30% mais rápido (~3.5s cada)

### Sensação Dramática
- Pausas lentas no início (antecipação)
- Aceleração contínua (tensão crescente)
- Clímax em alta velocidade (adrenalina)
- Resolução final (suspiro de alívio)

### Timings Configuráveis
- Base duration: 5000ms (ajustável)
- Prepare: 800ms
- Select: 1200ms
- Flight: 1500ms
- Impact: 800ms
- Return: 700ms

---

## 8. IDENTIDADE BASEOS

**O sorteio deve parecer:**
- ✅ Oficial e autorizado
- ✅ Tecnológico mas não futurista
- ✅ Esportivo e competitivo
- ✅ Profissional e premium
- ✅ Confiável e imutável

**O sorteio NÃO deve parecer:**
- ❌ Gamer ou arcade
- ❌ Cassino ou aposta
- ❌ Genérico ou descuidado
- ❌ Infantil ou brinquedo
- ❌ Aleatório (deve parecer controlado)

---

## 9. RESPONSIVIDADE

### DESKTOP (1920x1080+)
- Arena completa em 3D
- Câmera com movimento suave
- Todos os efeitos habilitados
- Controles de apresentador visíveis
- Painel de informações em tempo real

### TABLET/EVENT (800x600+)
- Arena reduzida mas completa
- Câmera com ângulos mais simples
- Efeitos selecionados
- Controles principais apenas
- Informações em layout compacto

### MOBILE
- Versão simplificada
- Sem verdadeira 3D (fallback para 2D)
- Apenas efeitos críticos
- Controles em botões grandes
- Texto expandido para toque

---

## 10. ACESSIBILIDADE

### Reduced Motion
- Sem trajetória de voo (aparição instantânea)
- Sem rotação contínua
- Sem parallax
- Sem pulsação
- Cores e contraste mantidos

### Legibilidade
- Todos os textos com bom contraste
- Tamanho mínimo de fonte: 12px
- Labels significativos
- Não depender apenas de cor

### Estrutura
- Navegação por teclado para controles
- ARIA labels para componentes
- Focus visual claro
- Descrições alternativas para imagens/logos

---

## 11. ESTADOS VISUAIS

### Arena em Repouso
- Urna giratória lentamente
- Equipes em órbita
- Grupos estáticos
- Iluminação ambiente

### Preparação para Sorteio
- Tudo para
- Câmera aproxima
- Urna "respira"
- Antecipação visual

### Sorteio Ativo
- Equipe selecionada brilha
- Câmera acompanha
- Trajetória 3D
- Grupo reage

### Sorteio Completo
- Todas as equipes acomodadas
- Grupos completos
- Câmera para na final vista
- Opção de revisão

---

## 12. REQUISITOS DE IMPLEMENTAÇÃO

### Tecnologia Obrigatória
- Three.js (câmera real, iluminação, trajetórias 3D)
- React Three Fiber (integração React)
- Drei (helpers e utilities)
- Framer Motion (HUD e UI)

### Performance Alvo
- 60 FPS em hardware moderno
- 30 FPS aceitável em hardware médio
- Degradação progressiva em mobile
- Bundle size < 500KB gzipped (Three.js + dependências)

### Compatibilidade
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile: iOS 14+, Android 10+

---

## 13. CONCLUSÃO

A **Draw Arena Cinematográfica** não é um efeito visual gratuito. É um design de experiência que:

1. **Transmite profissionalismo** - Parece um evento oficial
2. **Cria narrativa** - Tem inicio, meio e fim
3. **Mantém legibilidade** - Sem perder clareza
4. **Respeita acessibilidade** - Funciona para todos
5. **Preserva integridade** - Sorteio é 100% confiável

Próximo passo: **Máquina de Estados Cinematográfica**
