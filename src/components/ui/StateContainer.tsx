/**
 * StateContainer — Componente Universal de Cobertura de 4 Estados
 *
 * Responsabilidade: Tratamento consistente de estados de carregamento,
 * vazio, erro e conteúdo normal em TODA a interface do BaseOS.
 *
 * Regras de uso:
 * - Puramente apresentacional: não faz queries, não conhece Supabase,
 *   não contém regras de negócio esportivas.
 * - Toda tela que consume dataAccess.ts deve envolver seu conteúdo
 *   em <StateContainer> com os props de estado corretos.
 * - Prefer Skeleton sobre spinner para estados de loading quando
 *   o shape do conteúdo pode ser antecipado.
 */

import * as React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos e Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface StateContainerProps {
  /** Estado de carregamento — exibe Skeleton ou spinner */
  isLoading?: boolean;
  /** Estado de erro — exibe mensagem de erro com retry */
  isError?: boolean;
  /** Estado vazio — exibe mensagem e CTA */
  isEmpty?: boolean;
  /** Mensagem de título no estado de erro */
  errorTitle?: string;
  /** Mensagem descritiva no estado de erro */
  errorDescription?: string;
  /** Callback de retry no estado de erro */
  onRetry?: () => void;
  /** Label do botão de retry */
  retryLabel?: string;
  /** Título do estado vazio */
  emptyTitle?: string;
  /** Descrição do estado vazio */
  emptyDescription?: string;
  /** Elemento React para o ícone do estado vazio */
  emptyIcon?: React.ReactNode;
  /** Botão de ação principal no estado vazio */
  emptyAction?: React.ReactNode;
  /** Skeleton customizado para exibir durante o loading (substitui o padrão) */
  loadingSkeleton?: React.ReactNode;
  /** Número de linhas de Skeleton a exibir no loading padrão */
  skeletonRows?: number;
  /** Conteúdo normal da tela (exibido quando não há loading/erro/vazio) */
  children?: React.ReactNode;
  /** Classes CSS adicionais para o container raiz */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Componentes Internos
// ─────────────────────────────────────────────────────────────────────────────

/** Skeleton padrão de listagem quando nenhum customizado for fornecido */
function DefaultLoadingSkeleton({ rows = 3 }: { rows: number }) {
  return (
    <div className="space-y-3 w-full" aria-busy="true" aria-label="Carregando conteúdo…">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Estado de erro padronizado com retry */
function ErrorState({
  title = 'Não foi possível carregar os dados',
  description = 'Verifique sua conexão e tente novamente.',
  onRetry,
  retryLabel = 'Tentar Novamente',
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-2"
          aria-label={retryLabel}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

/** Estado vazio padronizado com CTA */
function EmptyState({
  title = 'Nenhum item encontrado',
  description,
  icon,
  action,
}: {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="space-y-1.5 max-w-sm">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * StateContainer — Envolve conteúdo com tratamento de 4 estados.
 *
 * Prioridade de renderização:
 * 1. isLoading → Skeleton
 * 2. isError   → ErrorState
 * 3. isEmpty   → EmptyState
 * 4. children  → Conteúdo normal
 *
 * @example
 * <StateContainer
 *   isLoading={loading}
 *   isError={!!error}
 *   isEmpty={teams.length === 0}
 *   errorDescription="Não foi possível carregar as equipes."
 *   onRetry={refetch}
 *   emptyTitle="Nenhuma equipe cadastrada"
 *   emptyDescription="Cadastre a primeira equipe para começar."
 *   emptyAction={<Button onClick={openCreateDialog}>Nova Equipe</Button>}
 * >
 *   <TeamList teams={teams} />
 * </StateContainer>
 */
function StateContainer({
  isLoading = false,
  isError = false,
  isEmpty = false,
  errorTitle,
  errorDescription,
  onRetry,
  retryLabel,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  loadingSkeleton,
  skeletonRows = 3,
  children,
  className,
}: StateContainerProps) {
  // 1. Loading
  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        className={cn('w-full', className)}
      >
        <span className="sr-only">Carregando dados...</span>
        {loadingSkeleton ?? <DefaultLoadingSkeleton rows={skeletonRows} />}
      </div>
    );
  }

  // 2. Error
  if (isError) {
    return (
      <div className={cn('w-full', className)}>
        <ErrorState
          title={errorTitle}
          description={errorDescription}
          onRetry={onRetry}
          retryLabel={retryLabel}
        />
      </div>
    );
  }

  // 3. Empty
  if (isEmpty) {
    return (
      <div className={cn('w-full', className)}>
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={emptyIcon}
          action={emptyAction}
        />
      </div>
    );
  }

  // 4. Normal
  return <>{children}</>;
}

StateContainer.displayName = 'StateContainer';

// Exportar sub-componentes para uso avançado independente
export { StateContainer, ErrorState, EmptyState, DefaultLoadingSkeleton };
