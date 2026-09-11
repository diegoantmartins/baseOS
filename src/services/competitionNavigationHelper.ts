/**
 * competitionNavigationHelper — Helper puro de navegação contextual do BaseOS
 *
 * Responsabilidades:
 * - Resolução da competição ativa com a prioridade estrita:
 *   URL explícita > Contexto persistido localmente > Fallback controlado
 * - Detecção segura de identificadores inválidos (evita selecionar outra competição silenciosamente)
 * - Persistência opcional da última competição conhecida em localStorage (somente para UX da rota raiz /competicoes)
 * - Construção canônica e fortemente tipada de URLs com preservação de contexto
 *
 * Isolamento Arquitetural:
 * - NÃO acessa banco de dados nem API
 * - NÃO executa regras esportivas nem de desempate
 * - NÃO avalia permissões RBAC nem autorização
 * - NÃO duplica ou manipula entidades de domínio
 */

import type { CompetitionTab } from '@/components/competition/CompetitionHeader';
import type { CompetitionRecord } from '@/types/entities';

export const PERSISTED_COMPETITION_STORAGE_KEY = 'baseos_last_active_competition_id';
export const ACTIVE_COMPETITION_STORAGE_KEY = PERSISTED_COMPETITION_STORAGE_KEY;

/**
 * Lê o identificador da última competição persistido localmente (localStorage).
 * Utilizado exclusivamente como conveniência de UX para a rota raiz /competicoes sem parâmetros.
 * Seguro contra execução em ambientes sem window/localStorage (SSR/testes).
 */
export function getPersistedCompetitionId(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(PERSISTED_COMPETITION_STORAGE_KEY);
    return stored && stored.trim() ? stored.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Persiste o identificador da última competição visualizada localmente (localStorage).
 */
export function setPersistedCompetitionId(id: string | null | undefined): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    if (id && id.trim()) {
      window.localStorage.setItem(PERSISTED_COMPETITION_STORAGE_KEY, id.trim());
    } else {
      window.localStorage.removeItem(PERSISTED_COMPETITION_STORAGE_KEY);
    }
  } catch {
    // Ignora restrições eventuais de storage em modo privado restrito
  }
}

// Aliases para preservar compatibilidade semântica
export const getActiveCompetitionId = getPersistedCompetitionId;
export const setActiveCompetitionId = setPersistedCompetitionId;

export interface ResolveActiveCompetitionParams {
  routeParamId?: string | null;
  searchParamId?: string | null;
  competitions: CompetitionRecord[];
}

export interface ResolveActiveCompetitionResult {
  selectedId: string | null;
  isExplicitInvalid: boolean;
  rawExplicitId?: string;
}

/**
 * Resolve qual competição deve ser selecionada seguindo a hierarquia estrita:
 * 1. URL explícita (routeParamId > searchParamId):
 *    - Se existir em `competitions`, é selecionado e persiste no storage local.
 *    - Se NÃO existir, retorna selectedId: null e isExplicitInvalid: true (NUNCA seleciona silenciosamente outra!).
 * 2. Se nenhum ID for passado na URL:
 *    - Tenta recuperar o ID persistido localmente (localStorage) se ele existir em `competitions`.
 *    - Se o ID persistido for obsoleto/removido, realiza fallback controlado para a primeira competição válida.
 *    - Se não houver storage nem URL, usa a primeira competição como fallback de UX.
 */
export function resolveActiveCompetition({
  routeParamId,
  searchParamId,
  competitions,
}: ResolveActiveCompetitionParams): ResolveActiveCompetitionResult {
  // Precedência explícita: routeParamId (mais específico) > searchParamId
  const rawExplicitId = routeParamId?.trim() || searchParamId?.trim() || null;

  if (rawExplicitId) {
    const found = competitions.find((c) => c.id === rawExplicitId);
    if (found) {
      setPersistedCompetitionId(found.id);
      return {
        selectedId: found.id,
        isExplicitInvalid: false,
        rawExplicitId,
      };
    }
    // ID explícito inexistente/deletado: NUNCA selecionar outra competição silenciosamente
    return {
      selectedId: null,
      isExplicitInvalid: true,
      rawExplicitId,
    };
  }

  // 2. Contexto persistido localmente (localStorage) como conveniência de UX
  const storedId = getPersistedCompetitionId();
  if (storedId) {
    const foundStored = competitions.find((c) => c.id === storedId);
    if (foundStored) {
      return {
        selectedId: foundStored.id,
        isExplicitInvalid: false,
      };
    }
    // Storage continha ID que foi excluído/não existe mais: fallback controlado para a primeira
  }

  // 3. Fallback controlado
  return {
    selectedId: competitions.length > 0 ? competitions[0].id : null,
    isExplicitInvalid: false,
  };
}

/**
 * Constrói a URL canônica para gestão de uma competição.
 */
export function buildCompetitionUrl(id?: string | null, tab?: CompetitionTab): string {
  const params = new URLSearchParams();
  if (id && id.trim()) {
    params.set('competitionId', id.trim());
  }
  if (tab && tab !== 'overview') {
    params.set('tab', tab);
  }
  const qs = params.toString();
  return qs ? `/competicoes?${qs}` : '/competicoes';
}

/**
 * Constrói a URL canônica para a central de jogos com contexto.
 */
export function buildMatchesUrl(id?: string | null): string {
  if (!id || id.trim() === '' || id === 'all') {
    return '/jogos';
  }
  return `/jogos?competitionId=${encodeURIComponent(id.trim())}`;
}

/**
 * Constrói a URL canônica para a central de relatórios com contexto.
 */
export function buildReportsUrl(id?: string | null): string {
  if (!id || id.trim() === '') {
    return '/relatorios';
  }
  return `/relatorios?competitionId=${encodeURIComponent(id.trim())}`;
}

/**
 * Constrói a URL canônica para a tabela de classificação com contexto.
 */
export function buildStandingsUrl(id?: string | null): string {
  if (!id || id.trim() === '') {
    return '/classificacao';
  }
  return `/classificacao?competitionId=${encodeURIComponent(id.trim())}`;
}

/**
 * Constrói a rota canônica para o motor de sorteio.
 */
export function buildDrawUrl(id?: string | null): string {
  if (!id || id.trim() === '') {
    return '/sorteio';
  }
  return `/sorteio/${encodeURIComponent(id.trim())}`;
}

/**
 * Constrói a rota canônica para gestão de inscrições.
 */
export function buildRegistrationsUrl(id: string): string {
  return `/competicoes/${encodeURIComponent(id.trim())}/inscricoes`;
}
