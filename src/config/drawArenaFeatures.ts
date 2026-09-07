/**
 * Feature flags e configurações do Draw Arena Cinematográfico.
 *
 * Controla a ativação da experiência 3D do sorteio.
 * O Draw Arena 3D é a EXPERIÊNCIA PRINCIPAL quando o ambiente suporta WebGL.
 * Quando desativado ou sem WebGL, fallback para DrawScene3D.
 *
 * Comportamento da flag VITE_DRAW_ARENA_3D:
 *   - 'true'   → força ON (Draw Arena 3D)
 *   - 'false'  → força OFF (fallback DrawScene3D)
 *   - ausente  → AUTO (usar Draw Arena 3D se WebGL disponível)
 */

const drawArenaFlag = import.meta.env.VITE_DRAW_ARENA_3D;

// Presença explícita da flag em var de ambiente (true/false)
function readDrawArenaFlag(): boolean | 'auto' {
  if (drawArenaFlag === undefined) return 'auto';
  return drawArenaFlag === 'true';
}

// Habilita o Draw Arena 3D por padrão (auto). Força desligado se flag 'false'.
export const DRAW_ARENA_3D_ENABLED = readDrawArenaFlag() !== false;

// Auto-detectar suporte a WebGL
// Se verdadeiro, será testado se o navegador suporta WebGL
// Se não suporta, fallback automático para DrawScene3D
export const AUTO_DETECT_WEBGL = true;

// Pixel ratio máximo para canvas (limita para performance em mobile)
// Se > 2, limita a 2 (não renderiza resoluções absurdas)
export const MAX_PIXEL_RATIO = 2;

// Timeouts para estado visual
//
// FONTE ÚNICA de timing do Draw Arena.
// O controller e o DrawScene3D consomem estas constantes (via resolveDrawTimings
// e resolveScene3DTiming) — NENHUM número mágico deve viver nos componentes.
export const ANIMATION_TIMINGS = {
  INTRO_DURATION: 2500,
  PREPARE_DURATION: 800,
  SELECT_DURATION: 1200,
  FLIGHT_DURATION: 1500,
  IMPACT_DURATION: 800,
  RETURN_DURATION: 700,
  REVEAL_DURATION: 800,

  // Tempos de leitura/confirmação por equipe (soma ≈ 4–5s por equipe)
  REVEAL_HOLD_MS: 2000, // leitura da equipe revelada
  GROUP_HOLD_MS: 1500,  // confirmação do grupo destino
  PREPARE_MS: 2400,     // fase DRAWING (urna) antes do próximo reveal

  // Limites do controle de velocidade
  MIN_REVEAL_MS: 1200,
  MAX_REVEAL_MS: 6000,
  STEP_MS: 100,
};

// Proporção das sub-fases em relação ao tempo de preparo (DRAWING).
// Permite que UM único controle de velocidade module todo o ciclo.
const REVEAL_HOLD_RATIO = 0.55;
const GROUP_HOLD_RATIO = 0.4;

/**
 * Centraliza o timing real do Draw Arena (controller).
 * A partir do valor do slider (tempo de preparo/DRAWING) devolve os holds de
 * REVEAL e GROUP_UPDATE proporcionais, mantendo um único sistema de velocidade.
 */
export function resolveDrawTimings(revealDurationMs: number) {
  const prepare = Math.max(ANIMATION_TIMINGS.MIN_REVEAL_MS, revealDurationMs);
  return {
    prepare,
    revealHold: Math.round(prepare * REVEAL_HOLD_RATIO),
    groupHold: Math.round(prepare * GROUP_HOLD_RATIO),
  };
}

/**
 * Timing padrão (ms) usado pelo DrawScene3D (fallback).
 * Alinhado à prescrição documental de ~4–5s por equipe.
 */
export const SCENE3D_REVEAL_MS = 4000;

// Detectar se tem suporte a WebGL
export function supportsWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

// Flag final: usar Draw Arena 3D ou fallback?
export function shouldUseDrawArena3D(): boolean {
  if (!DRAW_ARENA_3D_ENABLED) {
    return false;
  }

  if (!AUTO_DETECT_WEBGL) {
    return true;
  }

  return supportsWebGL();
}
