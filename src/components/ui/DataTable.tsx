/**
 * DataTable — Tabela de dados universal, fortemente tipada e integrada aos estados do BaseOS
 *
 * Responsabilidades:
 * - Renderização consistente de dados tabulares (equipes, partidas, atletas, classificações)
 * - Aplicação automática de `tabular-nums` e `font-mono` em colunas numéricas esportivas
 * - Tratamento integrado de estados de Loading (via TableSkeleton), Error e Empty (via StateContainer)
 * - Suporte opcional a paginação operacional e linhas clicáveis (hover interativo)
 * - Responsividade com scroll horizontal contido (sem quebrar o layout da página)
 *
 * Acessibilidade:
 * - Marcação semântica completa de <table>, <thead>, <tbody>, <th>, <td>
 * - Suporte a role="alert" em caso de erro e aria-busy em carregamento
 */

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StateContainer } from '@/components/ui/StateContainer';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de Definição de Coluna
// ─────────────────────────────────────────────────────────────────────────────

export interface DataTableColumn<TData> {
  /** Identificador único da coluna */
  id?: string;
  /** Título do cabeçalho da coluna ou função de renderização */
  header: React.ReactNode | ((context: { column: DataTableColumn<TData> }) => React.ReactNode);
  /** Chave do objeto de dados acessada diretamente */
  accessorKey?: keyof TData;
  /** Função de renderização personalizada para a célula */
  cell?: (context: { row: TData; value: unknown; index: number }) => React.ReactNode;
  /** Alinhamento do conteúdo da coluna */
  align?: 'left' | 'center' | 'right';
  /** Se true, aplica números tabulares com alinhamento à direita e fonte mono esportiva */
  isNumeric?: boolean;
  /** Classes CSS adicionais para as células desta coluna */
  className?: string;
  /** Classes CSS adicionais para o cabeçalho desta coluna */
  headerClassName?: string;
}

export interface DataTablePagination {
  /** Página atual (1-indexed) */
  page: number;
  /** Total de páginas */
  totalPages: number;
  /** Callback para mudança de página */
  onPageChange: (page: number) => void;
  /** Quantidade de itens por página (opcional) */
  pageSize?: number;
  /** Total absoluto de registros (opcional) */
  totalItems?: number;
}

export interface DataTableProps<TData> extends React.HTMLAttributes<HTMLDivElement> {
  /** Array de dados a serem renderizados */
  data: TData[];
  /** Configuração das colunas */
  columns: DataTableColumn<TData>[];
  /** Função para extrair a chave única de cada linha (default: (row, i) => (row as any).id || i) */
  keyExtractor?: (row: TData, index: number) => string | number;
  /** Callback acionado ao clicar em uma linha */
  onRowClick?: (row: TData) => void;
  /** Se true, aplica espaçamento compacto nas células */
  dense?: boolean;
  /** Configuração de paginação opcional */
  pagination?: DataTablePagination;
  /** Estado de carregamento */
  isLoading?: boolean;
  /** Estado de erro */
  isError?: boolean;
  /** Título do estado de erro */
  errorTitle?: string;
  /** Descrição do estado de erro */
  errorDescription?: string;
  /** Callback de retry no estado de erro */
  onRetry?: () => void;
  /** Título do estado vazio */
  emptyTitle?: string;
  /** Descrição do estado vazio */
  emptyDescription?: string;
  /** Ícone do estado vazio */
  emptyIcon?: React.ReactNode;
  /** Ação/CTA do estado vazio */
  emptyAction?: React.ReactNode;
  /** Quantidade de linhas simuladas no Skeleton durante o loading (default: 5) */
  skeletonRows?: number;
}

export function DataTable<TData>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  dense = false,
  pagination,
  isLoading = false,
  isError = false,
  errorTitle,
  errorDescription,
  onRetry,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription,
  emptyIcon,
  emptyAction,
  skeletonRows = 5,
  className,
  ...props
}: DataTableProps<TData>) {
  const isEmpty = !isLoading && !isError && (!data || data.length === 0);

  // Se estiver carregando, exibe o TableSkeleton diretamente
  if (isLoading) {
    return (
      <TableSkeleton
        columns={columns.length}
        rows={skeletonRows}
        dense={dense}
        className={className}
      />
    );
  }

  // Se houver erro ou vazio, envelopa com o StateContainer sem renderizar tabela vazia
  if (isError || isEmpty) {
    return (
      <div className={cn('w-full border border-border rounded-xl bg-card p-6', className)}>
        <StateContainer
          isError={isError}
          errorTitle={errorTitle}
          errorDescription={errorDescription}
          onRetry={onRetry}
          isEmpty={isEmpty}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyIcon={emptyIcon}
          emptyAction={emptyAction}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full border border-border rounded-xl overflow-hidden bg-card flex flex-col',
        className,
      )}
      {...props}
    >
      {/* Container de rolagem horizontal seguro para mobile */}
      <div className="relative w-full overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader className="bg-zinc-950/40">
            <TableRow className="hover:bg-transparent border-b border-border">
              {columns.map((col, index) => {
                const headerContent =
                  typeof col.header === 'function' ? col.header({ column: col }) : col.header;

                const alignmentClass =
                  col.align === 'right' || col.isNumeric
                    ? 'text-right justify-end'
                    : col.align === 'center'
                      ? 'text-center justify-center'
                      : 'text-left justify-start';

                return (
                  <TableHead
                    key={col.id || String(col.accessorKey) || `col-${index}`}
                    className={cn(
                      'font-semibold text-xs text-muted-foreground uppercase tracking-wider select-none whitespace-nowrap',
                      dense ? 'h-9 px-3' : 'h-11 px-4',
                      alignmentClass,
                      col.headerClassName,
                    )}
                  >
                    {headerContent}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((row, rowIndex) => {
              const rowKey: React.Key = keyExtractor
                ? keyExtractor(row, rowIndex)
                : ((row as Record<string, unknown>)?.id as React.Key) ?? rowIndex;

              return (
                <TableRow
                  key={rowKey}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    'border-b border-border/40 last:border-0 transition-colors duration-150',
                    onRowClick && 'cursor-pointer hover:bg-zinc-800/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-zinc-800/60',
                  )}
                >
                  {columns.map((col, colIndex) => {
                    const value = col.accessorKey
                      ? (row as Record<string, unknown>)[String(col.accessorKey)]
                      : undefined;
                    const cellContent = col.cell
                      ? col.cell({ row, value, index: rowIndex })
                      : (value as React.ReactNode) ?? null;

                    const alignmentClass =
                      col.align === 'right' || col.isNumeric
                        ? 'text-right'
                        : col.align === 'center'
                          ? 'text-center'
                          : 'text-left';

                    return (
                      <TableCell
                        key={col.id || String(col.accessorKey) || `cell-${rowIndex}-${colIndex}`}
                        className={cn(
                          'text-xs text-foreground',
                          dense ? 'p-3' : 'p-4',
                          alignmentClass,
                          col.isNumeric && 'tabular-nums font-mono',
                          col.className,
                        )}
                      >
                        {cellContent}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Barra de Paginação Opcional */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/40 bg-zinc-950/20 text-xs text-muted-foreground">
          <div>
            {pagination.totalItems !== undefined ? (
              <span>Total de <strong>{pagination.totalItems}</strong> registros</span>
            ) : (
              <span>Página {pagination.page} de {pagination.totalPages}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="h-7 px-2 gap-1 text-xs"
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </Button>

            <span className="px-2 text-xs font-medium tabular-nums text-foreground">
              {pagination.page} / {pagination.totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="h-7 px-2 gap-1 text-xs"
              aria-label="Próxima página"
            >
              <span>Próxima</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

DataTable.displayName = 'DataTable';
