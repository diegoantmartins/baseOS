/**
 * Section & SectionCard — Componentes universais de agrupamento semântico do BaseOS
 *
 * Responsabilidades:
 * - Agrupamento de blocos operacionais de conteúdo com cabeçalho opcional (título, descrição, ações)
 * - Section: Agrupamento semântico plano (sem superfície de card), ideal para páginas e listas
 * - SectionCard: Superfície de Card do design system (bg-card, border-border, rounded-xl) com
 *   suporte a densidades (dense, default, loose), divisores e slot de rodapé (footer).
 *
 * Design System:
 * - Respeita as cores Zinc-950/900 e bordas zinc-800 da Fase 0
 * - Sem sombras decorativas pesadas
 * - Acessibilidade semântica com <section> e <h2>/<h3>
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

// ─────────────────────────────────────────────────────────────────────────────
// Section (Plana / Sem Card)
// ─────────────────────────────────────────────────────────────────────────────

export interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Título da seção */
  title?: React.ReactNode;
  /** Descrição ou instruções auxiliares da seção */
  description?: React.ReactNode;
  /** Ações do cabeçalho da seção (ex: Botão "Ver Todos", filtros, contadores) */
  actions?: React.ReactNode;
  /** Se true, adiciona uma linha divisória sutil na base da seção */
  divided?: boolean;
  /** Conteúdo da seção */
  children?: React.ReactNode;
}

export function Section({
  title,
  description,
  actions,
  divided = false,
  className,
  children,
  ...props
}: SectionProps) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <section
      className={cn(
        'space-y-4',
        divided && 'pb-6 border-b border-border/40',
        className,
      )}
      {...props}
    >
      {hasHeader && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5 min-w-0 flex-1">
            {title && (
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs sm:text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0 sm:self-auto">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

Section.displayName = 'Section';

// ─────────────────────────────────────────────────────────────────────────────
// SectionCard (Com Superfície de Card)
// ─────────────────────────────────────────────────────────────────────────────

export interface SectionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Título do card */
  title?: React.ReactNode;
  /** Descrição do card */
  description?: React.ReactNode;
  /** Ações do cabeçalho do card */
  actions?: React.ReactNode;
  /** Rodapé opcional do card */
  footer?: React.ReactNode;
  /** Densidade interna de espaçamento */
  density?: 'dense' | 'default' | 'loose';
  /** Se true, adiciona bordas de separação entre Header, Content e Footer */
  divided?: boolean;
  /** Classes adicionais para o cabeçalho interno */
  headerClassName?: string;
  /** Classes adicionais para o container do conteúdo */
  contentClassName?: string;
  /** Classes adicionais para o rodapé */
  footerClassName?: string;
  /** Conteúdo do card */
  children?: React.ReactNode;
}

export function SectionCard({
  title,
  description,
  actions,
  footer,
  density = 'default',
  divided = false,
  className,
  headerClassName,
  contentClassName,
  footerClassName,
  children,
  ...props
}: SectionCardProps) {
  const hasHeader = Boolean(title || description || actions);

  // Mapeamento de densidades para padding
  const paddingMap = {
    dense: { header: 'p-3', content: 'p-3', footer: 'p-3' },
    default: { header: 'p-3.5 sm:p-4', content: 'p-3.5 sm:p-4', footer: 'p-3.5 sm:p-4' },
    loose: { header: 'p-6', content: 'p-6', footer: 'p-6' },
  };

  const currentPadding = paddingMap[density];

  return (
    <Card className={cn('bg-card text-card-foreground border-border rounded-xl shadow-none overflow-hidden', className)} {...props}>
      {hasHeader && (
        <CardHeader
          className={cn(
            'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between space-y-0',
            currentPadding.header,
            divided && 'border-b border-border/40',
            headerClassName,
          )}
        >
          <div className="space-y-1 min-w-0 flex-1">
            {title && (
              <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                {title}
              </CardTitle>
            )}
            {description && (
              <CardDescription className="text-xs text-muted-foreground">
                {description}
              </CardDescription>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </CardHeader>
      )}

      <CardContent
        className={cn(
          currentPadding.content,
          // Se houver header e não for divided, remove padding-top para não duplicar espaço
          hasHeader && !divided && 'pt-0',
          contentClassName,
        )}
      >
        {children}
      </CardContent>

      {footer && (
        <CardFooter
          className={cn(
            'flex items-center justify-between',
            currentPadding.footer,
            divided && 'border-t border-border/40 bg-zinc-950/40',
            footerClassName,
          )}
        >
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}

SectionCard.displayName = 'SectionCard';
