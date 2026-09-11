import { describe, it, expect, beforeEach } from 'vitest';
import { sanitizeExternalUrl } from '@/lib/security';
import { normalizeSupporters, sortSupporters } from '@/lib/supporters';
import { dataAccess } from '@/services/dataAccess';
import { CompetitionLifecycleService } from '@/services/competitionLifecycleService';
import { sanitizePublicCompetition } from '@/services/publicCompetitionService';
import type { CompetitionRecord, CompetitionSupporter, TeamRecord } from '@/types/entities';
import type { CompetitionConfig } from '@/types/competitionConfig';

const baseCompMock: Omit<CompetitionRecord, 'id' | 'name'> = {
  modality: 'indoor',
  format: 'groups',
  playerFormat: '6x6',
  setFormat: '3-sets',
  genderCategory: 'male',
  status: 'planning',
};

describe('Fase 2: Identidade da Competição, Apoiadores e Configuração Visual', () => {
  beforeEach(async () => {
    // Garante estado inicial limpo para testes de dataAccess
    try {
      localStorage.clear();
    } catch {
      // Ignora se não estiver em ambiente com localStorage
    }
  });

  describe('1. Sanitização e Validação de Links Externos (sanitizeExternalUrl)', () => {
    it('deve aceitar e preservar URLs seguras com https://', () => {
      expect(sanitizeExternalUrl('https://patrocinador.com.br')).toBe('https://patrocinador.com.br');
      expect(sanitizeExternalUrl('https://sub.empresa.org/apoio?ref=baseos')).toBe('https://sub.empresa.org/apoio?ref=baseos');
    });

    it('deve aceitar URLs com http://', () => {
      expect(sanitizeExternalUrl('http://apoio-local.com')).toBe('http://apoio-local.com');
    });

    it('deve normalizar domínios sem protocolo adicionando https://', () => {
      expect(sanitizeExternalUrl('patrocinador.com.br')).toBe('https://patrocinador.com.br');
      expect(sanitizeExternalUrl('www.volei.com/patrocinio')).toBe('https://www.volei.com/patrocinio');
    });

    it('deve rejeitar e retornar undefined para protocolos perigosos como javascript:, data: e blob:', () => {
      expect(sanitizeExternalUrl('javascript:alert(document.cookie)')).toBeUndefined();
      expect(sanitizeExternalUrl('JAVASCRIPT:void(0)')).toBeUndefined();
      expect(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
      expect(sanitizeExternalUrl('vbscript:msgbox(1)')).toBeUndefined();
      expect(sanitizeExternalUrl('file:///etc/passwd')).toBeUndefined();
      expect(sanitizeExternalUrl('blob:https://example.com/d9487440-2b10-4bf6')).toBeUndefined();
    });

    it('deve rejeitar entradas vazias, nulas ou inválidas', () => {
      expect(sanitizeExternalUrl('')).toBeUndefined();
      expect(sanitizeExternalUrl('   ')).toBeUndefined();
      expect(sanitizeExternalUrl(undefined)).toBeUndefined();
      expect(sanitizeExternalUrl(null as unknown as string)).toBeUndefined();
      expect(sanitizeExternalUrl('not a valid url &&&')).toBeUndefined();
    });
  });

  describe('2. Normalização e Retrocompatibilidade (dataAccess)', () => {
    it('deve normalizar competições legadas sem logoUrl ou supporters como undefined e []', async () => {
      const legacyRaw: CompetitionRecord = {
        ...baseCompMock,
        id: 'comp-legada-1',
        name: 'Copa Legada 2024',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      await dataAccess.createCompetition(legacyRaw);
      const retrieved = await dataAccess.getCompetition('comp-legada-1');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.logoUrl).toBeUndefined();
      expect(retrieved?.supporters).toEqual([]);
      expect(Array.isArray(retrieved?.supporters)).toBe(true);
    });

    it('deve salvar e persistir logoUrl e lista de apoiadores com suas categorias', async () => {
      const supporters: CompetitionSupporter[] = [
        {
          id: 'sup-1',
          name: 'Supermercado Central',
          logoUrl: 'data:image/png;base64,mockCentralLogo',
          websiteUrl: 'https://supermercadocentral.com.br',
          tier: 'master',
          order: 1,
        },
        {
          id: 'sup-2',
          name: 'Rádio Cidade Esportes',
          tier: 'media',
          order: 2,
        },
      ];

      const compWithBrand: CompetitionRecord = {
        ...baseCompMock,
        id: 'comp-branded-1',
        name: 'Grand Prix 2026',
        logoUrl: 'data:image/png;base64,mockCompetitionLogo',
        supporters,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dataAccess.createCompetition(compWithBrand);
      const reloaded = await dataAccess.getCompetition('comp-branded-1');

      expect(reloaded).not.toBeNull();
      expect(reloaded?.logoUrl).toBe('data:image/png;base64,mockCompetitionLogo');
      expect(reloaded?.supporters).toHaveLength(2);
      expect(reloaded?.supporters?.[0].name).toBe('Supermercado Central');
      expect(reloaded?.supporters?.[0].tier).toBe('master');
      expect(reloaded?.supporters?.[0].websiteUrl).toBe('https://supermercadocentral.com.br');
      expect(reloaded?.supporters?.[1].tier).toBe('media');
      expect(reloaded?.supporters?.[1].websiteUrl).toBeUndefined();
    });

    it('deve suportar ciclo completo de edição de apoiadores (inserção, alteração de nome, tier, link, ordem e remoção)', async () => {
      const initialComp: CompetitionRecord = {
        ...baseCompMock,
        id: 'comp-crud-test',
        name: 'Torneio Integração',
        supporters: [
          { id: 'sup-a', name: 'Apoiador A', tier: 'support', order: 1 },
          { id: 'sup-b', name: 'Apoiador B', tier: 'official', order: 2 },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dataAccess.createCompetition(initialComp);

      // Inserção de apoiador master e alteração de nome/tier/link/ordem do existente
      const updatedSupporters: CompetitionSupporter[] = [
        { id: 'sup-c', name: 'Novo Master Prime', tier: 'master', websiteUrl: 'https://masterprime.com', order: 1 },
        { id: 'sup-a', name: 'Apoiador A Renomeado', tier: 'official', websiteUrl: 'https://apoiadora.com', order: 2 },
        // sup-b foi removido
      ];

      await dataAccess.updateCompetition('comp-crud-test', { supporters: updatedSupporters });
      const afterEdit = await dataAccess.getCompetition('comp-crud-test');

      expect(afterEdit?.supporters).toHaveLength(2);
      expect(afterEdit?.supporters?.find(s => s.id === 'sup-b')).toBeUndefined(); // Remoção comprovada
      expect(afterEdit?.supporters?.[0].name).toBe('Novo Master Prime');
      expect(afterEdit?.supporters?.[0].tier).toBe('master');
      expect(afterEdit?.supporters?.[1].name).toBe('Apoiador A Renomeado');
      expect(afterEdit?.supporters?.[1].tier).toBe('official');
      expect(afterEdit?.supporters?.[1].websiteUrl).toBe('https://apoiadora.com');
    });

    it('deve normalizar de forma segura entradas inválidas de supporters (null, objeto, array com null, nome vazio, tier inválido)', () => {
      expect(normalizeSupporters(null)).toEqual([]);
      expect(normalizeSupporters(undefined)).toEqual([]);
      expect(normalizeSupporters({})).toEqual([]);
      expect(normalizeSupporters('não-um-array')).toEqual([]);
      expect(normalizeSupporters([null, undefined, 123, 'texto'])).toEqual([]);
      expect(normalizeSupporters([{ name: '' }])).toEqual([]);
      expect(normalizeSupporters([{ name: '   ' }])).toEqual([]);

      // Item com tier inválido 'gold' deve ter tier normalizado para undefined com segurança
      const normalizedWithInvalidTier = normalizeSupporters([
        { id: 'sup-1', name: 'Patrocinador Ouro', tier: 'gold' as unknown as import('@/types/entities').CompetitionSupporterTier },
      ]);
      expect(normalizedWithInvalidTier).toHaveLength(1);
      expect(normalizedWithInvalidTier[0].name).toBe('Patrocinador Ouro');
      expect(normalizedWithInvalidTier[0].tier).toBeUndefined();
    });
  });

  describe('3. Projeção Pública Sanitizada (publicCompetitionService)', () => {
    it('deve projetar logoUrl e apoiadores sanitizando links arbitrários na API pública', () => {
      const internalComp: CompetitionRecord = {
        ...baseCompMock,
        id: 'comp-pub-test',
        name: 'Liga Metropolitana',
        genderCategory: 'female',
        status: 'in-progress',
        logoUrl: 'https://cdn.example.com/logo-liga.png',
        supporters: [
          {
            id: 'sup-safe',
            name: 'Apoiador Confiável',
            websiteUrl: 'https://apoiador.com',
            tier: 'official',
            order: 1,
          },
          {
            id: 'sup-unsafe',
            name: 'Apoiador com Link Malicioso',
            websiteUrl: 'javascript:alert("hacked")',
            tier: 'support',
            order: 2,
          },
          {
            id: 'sup-bare',
            name: 'Apoiador sem protocolo',
            websiteUrl: 'apoio.org.br',
            tier: 'support',
            order: 3,
          },
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      };

      const publicDto = sanitizePublicCompetition(internalComp);

      expect(publicDto.logoUrl).toBe('https://cdn.example.com/logo-liga.png');
      expect(publicDto.supporters).toBeDefined();
      expect(publicDto.supporters).toHaveLength(3);

      // Link seguro mantido
      expect(publicDto.supporters?.[0].websiteUrl).toBe('https://apoiador.com');
      // Link perigoso sanitizado para undefined
      expect(publicDto.supporters?.[1].websiteUrl).toBeUndefined();
      // Link sem protocolo normalizado
      expect(publicDto.supporters?.[2].websiteUrl).toBe('https://apoio.org.br');
    });
  });

  describe('4. Autoridade de Bloqueio das Regras Esportivas (CompetitionLifecycleService.canEditRules)', () => {
    it('deve respeitar CompetitionLifecycleService.canEditRules como única autoridade normativa', () => {
      const planningComp: CompetitionRecord = {
        ...baseCompMock,
        id: 'comp-planning',
        name: 'Torneio Abertura',
        status: 'planning',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      // Sem partidas: regras editáveis
      expect(CompetitionLifecycleService.canEditRules(planningComp, [])).toBe(true);
      expect(CompetitionLifecycleService.canEditRules(planningComp, 0)).toBe(true);

      // Com partidas registradas: regras bloqueadas
      expect(CompetitionLifecycleService.canEditRules(planningComp, 1)).toBe(false);

      // Em status avançado: regras bloqueadas
      expect(CompetitionLifecycleService.canEditRules({ ...planningComp, status: 'in-progress' }, [])).toBe(false);
      expect(CompetitionLifecycleService.canEditRules({ ...planningComp, status: 'playoffs' }, [])).toBe(false);
      expect(CompetitionLifecycleService.canEditRules({ ...planningComp, status: 'completed' }, [])).toBe(false);
    });

    it('deve permitir editar identidade e apoiadores mesmo quando as regras esportivas estiverem congeladas', async () => {
      // Competição já iniciada com regras congeladas
      const lockedComp: CompetitionRecord = {
        ...baseCompMock,
        id: 'comp-locked',
        name: 'Liga Nacional',
        status: 'in-progress',
        rulesSnapshot: {
          version: 1,
          format: {
            defaultSetsToWin: 3,
            setRules: { regularSetPoints: 25, tiebreakPoints: 15, minAdvantage: 2 },
          },
          scoring: {
            systemType: 'fivb-standard',
            pointsWinClear: 3,
            pointsWinNarrow: 2,
            pointsLossNarrow: 1,
            pointsLossClear: 0,
            pointsWoWin: 3,
            pointsWoLoss: 0,
          },
          standings: {
            tiebreakCriteria: ['points', 'matches-won'],
            advancingPerGroup: 2,
          },
          registration: {
            minAthletes: 6,
            maxAthletes: 14,
            maxLiberos: 2,
            maxCaptains: 1,
          },
        } as unknown as CompetitionConfig,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      await dataAccess.createCompetition(lockedComp);
      const fetched = await dataAccess.getCompetition('comp-locked');
      expect(fetched).not.toBeNull();

      // Regras bloqueadas pela autoridade normativa
      expect(CompetitionLifecycleService.canEditRules(fetched!, 5)).toBe(false);

      // Identidade visual e apoiadores podem ser atualizados
      const updatedIdentity: Partial<CompetitionRecord> = {
        logoUrl: 'data:image/png;base64,newLogoMidSeason',
        supporters: [
          {
            id: 'sup-new',
            name: 'Novo Patrocinador da Fase Final',
            tier: 'master' as const,
            order: 1,
          },
        ],
      };

      await dataAccess.updateCompetition('comp-locked', updatedIdentity);
      const saved = await dataAccess.getCompetition('comp-locked');

      expect(saved?.logoUrl).toBe('data:image/png;base64,newLogoMidSeason');
      expect(saved?.supporters).toHaveLength(1);
      expect(saved?.supporters?.[0].name).toBe('Novo Patrocinador da Fase Final');
    });
  });

  describe('5. Separação Estrita de Domínio (TeamRecord vs CompetitionRecord)', () => {
    it('garante que TeamRecord não possui nem aceita campos de apoiadores ou patrocinadores', () => {
      const team: TeamRecord = {
        id: 'team-1',
        name: 'Vôlei Clube Estrela',
        shortName: 'VCE',
        modality: 'indoor',
        city: 'São Paulo',
        state: 'SP',
      };

      // TeamRecord não deve aceitar supporters, sponsors ou partners
      // @ts-expect-error - 'supporters' não deve existir em TeamRecord
      const invalidTeamSupporters = team.supporters;
      expect(invalidTeamSupporters).toBeUndefined();

      // @ts-expect-error - 'sponsors' não deve existir em TeamRecord
      const invalidTeamSponsors = team.sponsors;
      expect(invalidTeamSponsors).toBeUndefined();

      // @ts-expect-error - 'partners' não deve existir em TeamRecord
      const invalidTeamPartners = team.partners;
      expect(invalidTeamPartners).toBeUndefined();
    });
  });

  describe('6. Regra Determinística de Ordenação de Apoiadores (sortSupporters)', () => {
    it('deve ordenar por tier (master -> official -> support -> media), depois order ASC, depois name ASC', () => {
      const unorderedList: CompetitionSupporter[] = [
        { id: '1', name: 'Zeta Mídia', tier: 'media' },
        { id: '2', name: 'Beta Oficial', tier: 'official', order: 2 },
        { id: '3', name: 'Alpha Master', tier: 'master', order: 2 },
        { id: '4', name: 'Prime Master', tier: 'master', order: 1 },
        { id: '5', name: 'Gama Apoio', tier: 'support' },
        { id: '6', name: 'Alfa Oficial', tier: 'official', order: 2 }, // Empate em tier e order com Beta Oficial, desempata por name ASC
      ];

      const sorted = sortSupporters(unorderedList);

      // 1. master, order 1
      expect(sorted[0].name).toBe('Prime Master');
      expect(sorted[0].tier).toBe('master');

      // 2. master, order 2
      expect(sorted[1].name).toBe('Alpha Master');
      expect(sorted[1].tier).toBe('master');

      // 3. official, order 2, nome 'Alfa Oficial' (desempate lexicográfico antes de Beta)
      expect(sorted[2].name).toBe('Alfa Oficial');
      expect(sorted[2].tier).toBe('official');

      // 4. official, order 2, nome 'Beta Oficial'
      expect(sorted[3].name).toBe('Beta Oficial');
      expect(sorted[3].tier).toBe('official');

      // 5. support
      expect(sorted[4].name).toBe('Gama Apoio');
      expect(sorted[4].tier).toBe('support');

      // 6. media
      expect(sorted[5].name).toBe('Zeta Mídia');
      expect(sorted[5].tier).toBe('media');
    });
  });
});
