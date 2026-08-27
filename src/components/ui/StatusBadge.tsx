/**
 * StatusBadge — Mapeamento e exibição semântica centralizada de estados do BaseOS
 *
 * Responsabilidades:
 * - Centralizar todos os estados esportivos e administrativos em um único componente
 * - Garantir conformidade com os tokens semânticos da Fase 0 (sem cores ad-hoc em páginas)
 * - Exibir labels oficiais em português
 * - Suporte a ícones contextuais (ex: pulso/radio em 'live', relógio em 'scheduled')
 * - Fallback seguro e resiliente para estados desconhecidos
 *
 * Acessibilidade:
 * - Não depende exclusivamente de cores para transmitir significado
 * - Inclui texto claro e ícones com aria-hidden
 */

import * as React from 'react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  STATUS_CONFIG_MAP,
  type BaseOsStatus,
  type SportsStatus,
  type AdminStatus,
  type StatusConfig,
} from './statusBadgeConfig';

export type { BaseOsStatus, SportsStatus, AdminStatus, StatusConfig };

export interface StatusBadgeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Identificador do status (ex: 'scheduled', 'live', 'completed', 'active') */
  status: BaseOsStatus;
  /** Texto personalizado para sobrescrever a label padrão */
  customLabel?: string;
  /** Se true, exibe o ícone semântico associado ao status (default: true) */
  showIcon?: boolean;
  /** Ícone customizado para substituir o ícone padrão */
  icon?: React.ReactNode;
  /** Variante de estilo do badge (opcional, sobrescreve o padrão do status) */
  variant?: BadgeProps['variant'];
}

export function StatusBadge({
  status,
  customLabel,
  showIcon = true,
  icon: customIcon,
  variant: overrideVariant,
  className,
  ...props
}: StatusBadgeProps) {
  const normalizedStatus = String(status || '').toLowerCase().trim();
  const config = STATUS_CONFIG_MAP[normalizedStatus];

  // Tratamento seguro para estados desconhecidos
  const label = customLabel || config?.label || (normalizedStatus ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1) : 'Indefinido');
  const variant = overrideVariant || config?.variant || 'secondary';
  const IconComponent = config?.icon;

  return (
    <Badge
      variant={variant}
      className={cn(
        'gap-1.5 font-medium select-none',
        // Adiciona micro-animação de pulso apenas para partidas ao vivo
        normalizedStatus === 'live' && '[&_svg]:animate-pulse',
        className,
      )}
      {...props}
    >
      {showIcon && (customIcon ? (
        <span className="shrink-0">{customIcon}</span>
      ) : IconComponent ? (
        <IconComponent className="w-3 h-3 shrink-0" aria-hidden="true" />
      ) : null)}
      <span>{label}</span>
    </Badge>
  );
}

StatusBadge.displayName = 'StatusBadge';
