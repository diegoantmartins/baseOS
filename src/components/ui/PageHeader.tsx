/**
 * PageHeader — Cabeçalho oficial e unificado das páginas do BaseOS
 *
 * Responsabilidades:
 * - Título principal com tipografia display (Space Grotesk / Inter)
 * - Subtítulo / descrição contextual opcional
 * - Slot de Breadcrumb integrado (opcional, renderizado no topo)
 * - Badge contextual de status/tipo (opcional, renderizado ao lado do título)
 * - Área de Ações: Ação primária destacada + Ações secundárias agrupadas
 *
 * Responsividade:
 * - Desktop (sm+): Layout horizontal fluído (título/contexto à esquerda, ações à direita)
 * - Mobile (< sm): Layout vertical fluído sem overflow horizontal, ações quebram de forma limpa
 *
 * Acessibilidade:
 * - Usa tag semântica <header> ou <div> com hierarquia <h1>
 * - Foco acessível nos slots de ação
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Título principal da página */
  title: React.ReactNode;
  /** Subtítulo ou texto explicativo de apoio */
  description?: React.ReactNode;
  /** Slot para componente de breadcrumb (ex: <BreadcrumbNav />) */
  breadcrumb?: React.ReactNode;
  /** Badge contextual opcional (ex: StatusBadge, Badge de modalidade ou contagem) */
  badge?: React.ReactNode;
  /** Ação primária principal (ex: Botão "Novo Campeonato", "Criar Partida") */
  primaryAction?: React.ReactNode;
  /** Ações secundárias opcionais (ex: Botões "Filtros", "Exportar", dropdown de opções) */
  secondaryActions?: React.ReactNode;
  /** Slot alternativo genérico para ações quando passado em bloco único */
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  badge,
  primaryAction,
  secondaryActions,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  const hasActions = Boolean(primaryAction || secondaryActions || actions);

  return (
    <header
      className={cn(
        'flex flex-col gap-2 pb-3.5 border-b border-border/40 mb-4',
        className,
      )}
      {...props}
    >
      {/* 1. Breadcrumb no topo se fornecido */}
      {breadcrumb && <div className="w-full mb-1">{breadcrumb}</div>}

      {/* 2. Área principal: Título + Badge + Descrição à esquerda / Ações à direita */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Bloco de Título e Contexto */}
        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold font-display tracking-tight text-foreground">
              {title}
            </h1>
            {badge && <div className="inline-flex shrink-0">{badge}</div>}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground leading-normal max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {/* Bloco de Ações (Ação primária + secundárias) */}
        {hasActions && (
          <div className="flex items-center gap-2 flex-wrap sm:shrink-0 sm:self-center">
            {secondaryActions}
            {actions}
            {primaryAction}
          </div>
        )}
      </div>
    </header>
  );
}

PageHeader.displayName = 'PageHeader';
