/**
 * modalitiesContract.test.ts
 *
 * Teste do contrato arquitetural de modalidades (Fase 8.6.2):
 * Comprova que modalities é servido como catálogo de domínio e não depende
 * de tabela relacional no PostgreSQL, prevenindo requisições inexistentes ao PostgREST.
 */

import { describe, it, expect } from 'vitest';
import { dataAccess } from '@/services/dataAccess';

describe('Modalities Contract — Catálogo Canônico de Domínio (Fase 8.6.2)', () => {
  it('1. listModalities retorna o catálogo de domínio com modalidades oficiais', async () => {
    const modalities = await dataAccess.listModalities();

    expect(Array.isArray(modalities)).toBe(true);
    expect(modalities.length).toBeGreaterThanOrEqual(2);

    const indoor = modalities.find(m => m.type === 'indoor');
    expect(indoor).toBeDefined();
    expect(indoor?.id).toBe('mod-indoor');
    expect(indoor?.defaultPlayerFormat).toBe('6x6');
    expect(indoor?.defaultSetPoints).toBe(25);

    const beach = modalities.find(m => m.type === 'beach');
    expect(beach).toBeDefined();
    expect(beach?.id).toBe('mod-beach');
    expect(beach?.defaultPlayerFormat).toBe('2x2');
    expect(beach?.defaultSetPoints).toBe(21);
  });

  it('2. getModality localiza modalidades por id ou por type', async () => {
    const byId = await dataAccess.getModality('mod-indoor');
    expect(byId).toBeDefined();
    expect(byId?.name).toBe('Vôlei de Quadra');

    const byType = await dataAccess.getModality('beach');
    expect(byType).toBeDefined();
    expect(byType?.name).toBe('Vôlei de Praia');

    const notFound = await dataAccess.getModality('mod-inexistente');
    expect(notFound).toBeNull();
  });
});
