import type { CompetitionSupporter, CompetitionSupporterTier } from '@/types/entities';
import { sanitizeExternalUrl } from '@/lib/security';

/**
 * Ordem normativa de pesos para exibição determinística de apoiadores por tier.
 * Prioridade:
 * 1. master
 * 2. official
 * 3. support
 * 4. media
 * 5. sem categoria (undefined)
 */
export const TIER_WEIGHTS: Record<CompetitionSupporterTier, number> = {
  master: 0,
  official: 1,
  support: 2,
  media: 3,
};

const VALID_TIERS = new Set<CompetitionSupporterTier>(['master', 'official', 'support', 'media']);

/**
 * Ordenação determinística de apoiadores:
 * 1. tier (master -> official -> support -> media -> sem tier)
 * 2. order ASC (itens com order definido vêm antes de itens sem order)
 * 3. name ASC (desempate lexicográfico em português)
 */
export function sortSupporters(supporters: CompetitionSupporter[]): CompetitionSupporter[] {
  return [...supporters].sort((a, b) => {
    const weightA = a.tier && a.tier in TIER_WEIGHTS ? TIER_WEIGHTS[a.tier] : 4;
    const weightB = b.tier && b.tier in TIER_WEIGHTS ? TIER_WEIGHTS[b.tier] : 4;
    if (weightA !== weightB) {
      return weightA - weightB;
    }

    const orderA = typeof a.order === 'number' && Number.isFinite(a.order) ? a.order : undefined;
    const orderB = typeof b.order === 'number' && Number.isFinite(b.order) ? b.order : undefined;

    if (orderA !== undefined && orderB !== undefined) {
      if (orderA !== orderB) return orderA - orderB;
    } else if (orderA !== undefined && orderB === undefined) {
      return -1;
    } else if (orderA === undefined && orderB !== undefined) {
      return 1;
    }

    return (a.name || '').localeCompare(b.name || '', 'pt-BR');
  });
}

/**
 * Normaliza e valida rigorosamente uma lista arbitrária de apoiadores:
 * 1. Verifica se a entrada é um Array (senão retorna []);
 * 2. Filtra entradas nulas, vazias ou que não sejam objetos;
 * 3. Valida campo `name` obrigatório e não vazio (descarta se inválido);
 * 4. Valida `id` (gera identificador seguro se ausente);
 * 5. Valida `tier` fechado ('master' | 'official' | 'support' | 'media');
 * 6. Valida `order` numérico;
 * 7. Sanitiza `websiteUrl` rejeitando protocolos perigosos;
 * 8. Normaliza `logoUrl` (rejeita strings vazias);
 * 9. Retorna a lista ordenada deterministicamente.
 */
export function normalizeSupporters(rawSupporters: unknown): CompetitionSupporter[] {
  if (!Array.isArray(rawSupporters)) {
    return [];
  }

  const validSupporters: CompetitionSupporter[] = [];

  for (let idx = 0; idx < rawSupporters.length; idx++) {
    const raw = rawSupporters[idx];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      continue;
    }

    const record = raw as Record<string, unknown>;

    // Validação de nome obrigatório
    const rawName = record.name;
    if (typeof rawName !== 'string' || !rawName.trim()) {
      continue;
    }
    const name = rawName.trim();

    // Validação ou geração de id
    const rawId = record.id;
    const id = typeof rawId === 'string' && rawId.trim()
      ? rawId.trim()
      : `sup-${idx + 1}-${Date.now()}`;

    // Validação de tier fechado
    let tier: CompetitionSupporterTier | undefined = undefined;
    if (typeof record.tier === 'string' && VALID_TIERS.has(record.tier as CompetitionSupporterTier)) {
      tier = record.tier as CompetitionSupporterTier;
    }

    // Validação de order numérico
    let order: number | undefined = undefined;
    if (typeof record.order === 'number' && Number.isFinite(record.order)) {
      order = record.order;
    }

    // Sanitização de websiteUrl
    const websiteUrl = typeof record.websiteUrl === 'string'
      ? sanitizeExternalUrl(record.websiteUrl)
      : undefined;

    // Normalização de logoUrl
    const logoUrl = typeof record.logoUrl === 'string' && record.logoUrl.trim()
      ? record.logoUrl.trim()
      : undefined;

    validSupporters.push({
      id,
      name,
      ...(tier ? { tier } : {}),
      ...(order !== undefined ? { order } : {}),
      ...(websiteUrl ? { websiteUrl } : {}),
      ...(logoUrl ? { logoUrl } : {}),
    });
  }

  return sortSupporters(validSupporters);
}
