// =====================================================================
// BaseOS Geometry - Dimensões e Alturas dos Blocos
// =====================================================================

export const THREE_SETS_LAYOUT = {
  HEADER_HEIGHT: 76.0,
  MAIN_CONTENT_HEIGHT: 485.0,
  
  // Divisão horizontal: 62% Sets (esquerda) + 38% Rosters/Sanções/Resultado/Assinaturas (direita)
  SETS_COLUMN_WIDTH_PCT: '62%',
  SIDEBAR_COLUMN_WIDTH_PCT: '38%',

  // Sets empilhados
  SET_BLOCK_HEIGHT: 156.0,

  // Sidebar direita
  ROSTER_HEIGHT: 236.0,
  SANCTIONS_HEIGHT: 75.0,
  RESULT_HEIGHT: 90.0,
  SIGNATURES_HEIGHT: 76.0,
} as const;

export const FIVE_SETS_LAYOUT = {
  HEADER_HEIGHT: 90.0,
  MAIN_CONTENT_HEIGHT: 700.0,
  
  // Grade de 5 sets: Sets 1 a 4 ocupam topo e meio (2 colunas x 2 linhas)
  ROW1_HEIGHT: 215.0,
  ROW2_HEIGHT: 215.0,
  ROW3_HEIGHT: 245.0, // Set 5 + Rosters
} as const;
