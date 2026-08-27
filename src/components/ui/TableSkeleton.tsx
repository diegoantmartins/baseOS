/**
 * TableSkeleton — Skeleton de carregamento estruturado e proporcional para tabelas
 *
 * Responsabilidades:
 * - Renderizar estrutura de tabela idêntica à real (TableHeader, TableRow, TableCell)
 * - Evitar Content Layout Shift (CLS) durante o carregamento de dados
 * - Permitir configuração de número de colunas, linhas e densidade
 * - Utiliza larguras realistas variadas para simular dados esportivos reais
 *
 * Acessibilidade:
 * - Atributo aria-busy="true" e aria-label para informar leitores de tela
 */

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface TableSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Quantidade de colunas a serem simuladas (default: 4) */
  columns?: number;
  /** Quantidade de linhas a serem simuladas (default: 5) */
  rows?: number;
  /** Se true, aplica padding mais compacto (dense) */
  dense?: boolean;
  /** Larguras customizadas para cada coluna (ex: ['w-12', 'w-48', 'w-24']) */
  columnWidths?: string[];
}

export function TableSkeleton({
  columns = 4,
  rows = 5,
  dense = false,
  columnWidths,
  className,
  ...props
}: TableSkeletonProps) {
  // Padrão de larguras para colunas quando não informado
  const defaultWidths = ['w-12', 'w-48', 'w-28', 'w-20', 'w-32', 'w-16'];

  const getColWidth = (index: number) => {
    if (columnWidths && columnWidths[index]) return columnWidths[index];
    return defaultWidths[index % defaultWidths.length];
  };

  return (
    <div
      className={cn('w-full border border-border rounded-xl overflow-hidden bg-card', className)}
      aria-busy="true"
      aria-label="Carregando dados da tabela..."
      {...props}
    >
      <Table>
        <TableHeader className="bg-zinc-950/40">
          <TableRow className="hover:bg-transparent border-b border-border">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableHead
                key={`th-skel-${colIndex}`}
                className={cn(dense ? 'h-9 px-3' : 'h-11 px-4')}
              >
                <Skeleton className={cn('h-3.5 rounded', getColWidth(colIndex))} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow
              key={`tr-skel-${rowIndex}`}
              className="hover:bg-transparent border-b border-border/40 last:border-0"
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell
                  key={`td-skel-${rowIndex}-${colIndex}`}
                  className={cn(dense ? 'p-3' : 'p-4')}
                >
                  <Skeleton
                    className={cn(
                      'h-4 rounded',
                      // Alterna ligeiramente o tamanho das células nas linhas para realismo visual
                      rowIndex % 2 === 0
                        ? getColWidth(colIndex)
                        : colIndex === 1
                          ? 'w-36'
                          : getColWidth(colIndex),
                    )}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

TableSkeleton.displayName = 'TableSkeleton';
