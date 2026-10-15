// =====================================================================
// BaseOS Domain - Regras de Quadra e Alocação de Súmulas
// =====================================================================

/**
 * Normaliza e padroniza a identificação da quadra para exibição oficial.
 * Exemplos:
 *  '1' -> 'QUADRA 1'
 *  'Quadra 1' -> 'QUADRA 1'
 *  'quadra 2' -> 'QUADRA 2'
 *  'Quadra Central' -> 'QUADRA CENTRAL'
 *  undefined -> 'QUADRA 1'
 */
export function formatCourtDisplay(court?: string | number | null): string {
  if (court === undefined || court === null || String(court).trim() === '') {
    return 'QUADRA 1';
  }
  const str = String(court).trim().toUpperCase();
  if (str.startsWith('QUADRA')) {
    return str;
  }
  if (/^\d+$/.test(str)) {
    return `QUADRA ${str}`;
  }
  return str;
}

/**
 * Formata datas de maneira determinística para o cabeçalho oficial (DD/MM/AAAA)
 * evitando problemas de timezone entre UTC e hora local.
 */
export function formatHeaderDate(date?: string | null): string {
  if (!date || !date.trim()) return '__/__/____';
  const clean = date.trim();
  if (clean.includes('/')) return clean;
  if (clean.length >= 10 && clean.includes('-')) {
    const [y, m, d] = clean.slice(0, 10).split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  return clean;
}

/**
 * Verifica se a partida está associada a uma quadra específica (1, 2, etc).
 * Suporta formatos: "1", "Quadra 1", "quadra 01", "Q1", etc.
 * Evita falsos positivos com números compostos (ex.: "Quadra 10" não confere com quadra 1).
 */
export function isMatchOnCourt(courtValue: string | undefined | null, courtNumber: number): boolean {
  if (!courtValue) return false;
  const clean = courtValue.trim().toLowerCase();
  if (clean === String(courtNumber)) return true;
  const regex = new RegExp(`(?:quadra|q)\\s*0*${courtNumber}(?:\\b|[^0-9]|$)`, 'i');
  return regex.test(clean);
}

/**
 * Extrai o nome de arquivo semântico padronizado para exportação em lote de súmulas
 */
export function generateBatchScoresheetFileName(
  scope: 'quadra-1' | 'quadra-2' | 'todas' | string,
  phaseOrCategory?: string,
): string {
  const safePhase = (phaseOrCategory || 'fase-atual')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (scope === 'quadra-1') {
    return `sumulas-quadra-1-${safePhase || 'classificatoria'}.pdf`;
  }
  if (scope === 'quadra-2') {
    return `sumulas-quadra-2-${safePhase || 'classificatoria'}.pdf`;
  }
  return `sumulas-todas-${safePhase || 'fase-atual'}.pdf`;
}
