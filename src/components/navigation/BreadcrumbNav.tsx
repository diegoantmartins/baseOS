/**
 * BreadcrumbNav — Breadcrumb semântico e acessível para páginas profundas do BaseOS
 *
 * Utiliza o componente `Breadcrumb` do shadcn/ui (Radix).
 * Não exibe breadcrumb redundante em rotas raiz (Dashboard, Competições Ativas).
 *
 * Uso:
 * <BreadcrumbNav
 *   items={[
 *     { label: 'Competições', href: '/competicoes' },
 *     { label: 'Campeonato X', href: '/competicoes/123' },
 *     { label: 'Inscrições' }, // sem href = página atual (não clicável)
 *   ]}
 * />
 *
 * Regras:
 * - O último item é a página atual e nunca recebe href
 * - Não criar links para páginas inexistentes
 * - Breadcrumb não aparece quando items.length <= 1 (página raiz)
 */

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface BreadcrumbItemDef {
  /** Texto do item */
  label: string;
  /** Se fornecido, o item é um link clicável. O último item NUNCA deve ter href. */
  href?: string;
}

export interface BreadcrumbNavProps {
  /** Lista de itens do breadcrumb, em ordem hierárquica (pai → filho atual) */
  items: BreadcrumbItemDef[];
  /** Classes CSS adicionais para o container */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BreadcrumbNav exibe a hierarquia de navegação para páginas profundas.
 * Retorna null quando há apenas 1 item ou nenhum (página raiz = sem breadcrumb).
 */
export function BreadcrumbNav({ items, className }: BreadcrumbNavProps) {
  // Não exibir breadcrumb em páginas raiz
  if (!items || items.length <= 1) return null;

  return (
    <Breadcrumb className={cn('mb-4', className)} aria-label="Localização na aplicação">
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  // Página atual — não clicável
                  <BreadcrumbPage className="text-xs font-medium text-foreground">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  // Link clicável
                  <BreadcrumbLink
                    href={item.href}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
                  >
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {/* Separador entre itens (exceto após o último) */}
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
