// =====================================================================
// Tipos de persistência do Editor de Documentos
//
// DocumentEdit: edição manual do CONTEÚDO de um documento gerado para
// uma partida (valores por campo, ex.: nome da equipe, placar, árbitro).
// TemplateLayout: ajuste global de LAYOUT (posição/tamanho/fonte) dos
// campos sobre cada template fixo (súmula 3/5 sets e ficha de posição).
//
// Ambos são persistidos via dataAccess (LocalStorage/Supabase) e NUNCA
// alteram os arquivos PDF de referência.
// =====================================================================

import type { DocumentType } from '../document-engine/schemas/match.schema';
import type { FieldCoords, TemplateKind } from '../document-engine/schemas/sumula.schema';

/** Edição manual do conteúdo de um documento de uma partida. */
export type DocumentEdit = {
  id: string;
  matchId: string;
  documentType: DocumentType;
  /** Valores por campo (key do mapa de campos da geometria do template). */
  values: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

/** Ajuste de layout aplicado a um único campo (parcial). */
export type FieldLayoutOverride = Partial<FieldCoords>;

/** Ajustes globais de layout de um template (persistidos por template). */
export type TemplateLayout = {
  id: TemplateKind;
  templateKind: TemplateKind;
  fields: Record<string, FieldLayoutOverride>;
  updatedAt: string;
};

/** Chave identificadora de um documento editável: partida + tipo. */
export type DocumentEditKey = {
  matchId: string;
  documentType: DocumentType;
};