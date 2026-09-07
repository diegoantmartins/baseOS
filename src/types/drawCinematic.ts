/**
 * Tipos do Draw Arena Cinematográfico
 *
 * Define o contrato entre o motor de sorteio (domínio) e a apresentação visual.
 * Estes tipos NÃO duplicam a lógica de sorteio, apenas representam o fluxo visual.
 */

import type { DrawResult, DrawGroup } from './draw';
import type { TeamRecord } from './entities';

/**
 * Estados da máquina visual do Draw Arena
 */
export type DrawArenaState =
  | 'IDLE'       // Não iniciado
  | 'INTRO'      // Entrada visual
  | 'READY'      // Preparado para começar
  | 'DRAWING'    // Processo de sorteio em andamento
  | 'REVEAL'     // Revelação da equipe sorteada
  | 'GROUP_UPDATE' // Atualização visual do grupo
  | 'COMPLETE'   // Sorteio concluído
  | 'ERROR'      // Falha controlada
  | 'FALLBACK';  // Experiência alternativa (sem 3D)

/**
 * Eventos semânticos da máquina de estados
 */
export type DrawArenaEvent =
  | 'START'              // Usuário inicia o sorteio
  | 'INTRO_COMPLETE'     // Animação de intro terminou
  | 'DRAW_STARTED'       // Começar a processar sequência
  | 'DRAW_RESULT_READY'  // Resultado disponível para revelar
  | 'REVEAL_COMPLETE'    // Animação de revelação terminou
  | 'GROUP_UPDATE_COMPLETE' // Atualização do grupo terminou
  | 'ADVANCE'            // Ir para próximo na sequência
  | 'DRAW_COMPLETE'      // Sorteio terminou (todas as equipes)
  | 'ERROR_OCCURRED'     // Erro aconteceu
  | 'FALLBACK_REQUIRED'  // Mudar para experiência alternativa
  | 'RESET';             // Resetar máquina

/**
 * Evento único de revelação (uma equipe em um grupo)
 */
export interface DrawArenaRevealEvent {
  teamId: string;
  groupName: string;
  order: number;
}

/**
 * Contexto da máquina de estados
 * Armazena apenas o que é necessário para a apresentação visual
 */
export interface DrawArenaContext {
  // Dados da sequência
  drawResult: DrawResult;
  teams: Map<string, TeamRecord>;
  revealSequence: DrawArenaRevealEvent[];

  // Estado de iteração
  currentIndex: number;
  totalReveals: number;

  // Estado atual
  currentReveal: DrawArenaRevealEvent | null;
  currentTeam: TeamRecord | null;
  currentGroup: DrawGroup | null;

  // Progresso
  progress: number; // 0 a 1
  progressCount: string; // "4 / 16"

  // Configuração visual
  reducedMotion: boolean;
  performanceMode: 'high' | 'medium' | 'low' | 'fallback' | 'auto';

  // Erro (se houver)
  error: Error | null;
}

/**
 * Configuração inicial do Draw Arena
 */
export interface DrawArenaConfig {
  /** Resultado do sorteio (vem do motor puro) */
  drawResult: DrawResult;

  /** Lista de equipes para lookup */
  teams: TeamRecord[];

  /** Ativar se usuário prefere movimento reduzido */
  reducedMotion?: boolean;

  /** Modo de performance (auto-detectado por padrão) */
  performanceMode?: 'high' | 'medium' | 'low' | 'fallback' | 'auto';

  /** Callback ao fechar modal */
  onClose?: () => void;

  /** Callback em transição de estado */
  onStateChange?: (state: DrawArenaState) => void;

  /** Callback em evento */
  onEvent?: (event: DrawArenaEvent) => void;
}

/**
 * Transições permitidas na máquina
 * Define quais transições são válidas
 */
export const ALLOWED_TRANSITIONS: Record<DrawArenaState, DrawArenaState[]> = {
  IDLE: ['INTRO', 'FALLBACK'],
  INTRO: ['READY'],
  READY: ['DRAWING', 'REVEAL', 'FALLBACK'],
  DRAWING: ['REVEAL', 'ERROR', 'FALLBACK'],
  REVEAL: ['GROUP_UPDATE', 'COMPLETE', 'DRAWING'],
  GROUP_UPDATE: ['DRAWING', 'COMPLETE'],
  COMPLETE: ['IDLE'],
  ERROR: ['IDLE', 'FALLBACK'],
  FALLBACK: ['IDLE', 'COMPLETE'],
};

/**
 * Validar se transição é permitida
 */
export function isValidTransition(from: DrawArenaState, to: DrawArenaState): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Calcular progresso da sequência
 */
export function calculateProgress(
  currentIndex: number,
  total: number,
): { progress: number; count: string } {
  if (currentIndex < 0 || total <= 0) {
    return { progress: 0, count: `0 / ${Math.max(0, total)}` };
  }
  const countNumber = Math.min(currentIndex + 1, total);
  const progress = total > 0 ? countNumber / total : 0;
  const count = `${countNumber} / ${total}`;
  return { progress, count };
}
