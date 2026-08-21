// =====================================================================
// Schemas do Motor de Documentos — Súmula (3 e 5 sets)
//
// Define o contrato de dados preenchidos sobre o template PDF fixo,
// os tipos de coordenadas de campo e a interface de renderização.
// =====================================================================

import type {
  ImproperRequest,
  Lineup,
  MatchDocument,
  Officials,
  Sanction,
  Substitution,
} from './match.schema';

export type FieldAlign = 'left' | 'center' | 'right';

/**
 * Definição de um campo a ser desenhado sobre o template.
 * Coordenadas em pontos (pts) com origem no CANTO SUPERIOR ESQUERDO
 * (1/72 polegada) — compatíveis com as medições dos templates FPV.
 */
export type FieldCoords = {
  /** X do canto superior esquerdo (pts, da borda esquerda da página). */
  x: number;
  /** Y do canto superior esquerdo (pts, do topo da página). */
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  align?: FieldAlign;
  bold?: boolean;
  color?: string;
  /** Tamanho mínimo de fonte permitido no ajuste automático (drawDynamicText). */
  minSize?: number;
  /** Número máximo de linhas antes de truncar. */
  maxLines?: number;
};

/** Área do template a ser branqueada (remoção de logos/marcas de terceiros). */
export type CleanZone = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Estrutura de um set na súmula (dados derivados da partida). */
export type SumulaSetSection = {
  number: number;
  pointsA: number;
  pointsB: number;
  lineupA?: Lineup;
  lineupB?: Lineup;
  sanctions: Sanction[];
  substitutions: Substitution[];
  improperRequests: ImproperRequest[];
};

/** Dados de preenchimento da súmula. */
export type SumulaData = {
  match: MatchDocument;
  /** Nome da organização/entidade exibido no cabeçalho do documento. */
  orgName?: string;
  officials: Officials;
  observations?: string;
  winnerTeamId?: string;
  sets: SumulaSetSection[];
  /** Vencedor por set ('A' | 'B' | undefined). */
  setWinners: Array<'A' | 'B' | undefined>;
};

/** Mapa de campos de um template de súmula. Cada chave é um campo editável. */
export type SumulaFieldMap = Record<string, FieldCoords>;

/** Geometria geral de um template de súmula. */
export type SumulaGeometry = {
  /** Dimensões da página em pts. */
  pageWidth: number;
  pageHeight: number;
  /** Áreas a branquear (remover marcas de terceiros). */
  cleanZones: CleanZone[];
  /** Área do logo do sistema (settings.documentLogo). */
  logoZone: CleanZone;
  /** Campos (iniciais; refináveis pelo editor de template). */
  fields: SumulaFieldMap;
};

export type TemplateKind = 'sumula3' | 'sumula5' | 'ordem-saque';

/** Renderiza o template de súmula com os dados preenchidos.
 *  Retorna os bytes do PDF final. */
export type SumulaRenderer = (templateBytes: Uint8Array, data: SumulaData) => Promise<Uint8Array> | Uint8Array;