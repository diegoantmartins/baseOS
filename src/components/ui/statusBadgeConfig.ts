import * as React from 'react';
import {
  Clock,
  Radio,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  XCircle,
  AlertOctagon,
  FileEdit,
  Lock,
  Eye,
} from 'lucide-react';
import type { BadgeProps } from '@/components/ui/badge';

export type SportsStatus =
  | 'scheduled'
  | 'live'
  | 'completed'
  | 'finished'
  | 'homologated'
  | 'approved'
  | 'pending'
  | 'cancelled'
  | 'walkover'
  | 'wo';

export type AdminStatus =
  | 'active'
  | 'inactive'
  | 'draft'
  | 'published'
  | 'locked';

export type BaseOsStatus = SportsStatus | AdminStatus | (string & {});

export interface StatusConfig {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
  icon: React.ElementType;
}

export const STATUS_CONFIG_MAP: Record<string, StatusConfig> = {
  // Estados Esportivos
  scheduled: {
    label: 'Agendado',
    variant: 'scheduled',
    icon: Clock,
  },
  live: {
    label: 'Ao Vivo',
    variant: 'live',
    icon: Radio,
  },
  completed: {
    label: 'Encerrado',
    variant: 'completed',
    icon: CheckCircle2,
  },
  finished: {
    label: 'Encerrado',
    variant: 'completed',
    icon: CheckCircle2,
  },
  homologated: {
    label: 'Homologado',
    variant: 'homologated',
    icon: ShieldCheck,
  },
  approved: {
    label: 'Homologado',
    variant: 'homologated',
    icon: ShieldCheck,
  },
  pending: {
    label: 'Pendente',
    variant: 'pending',
    icon: AlertCircle,
  },
  cancelled: {
    label: 'Cancelado',
    variant: 'cancelled',
    icon: XCircle,
  },
  walkover: {
    label: 'W.O.',
    variant: 'walkover',
    icon: AlertOctagon,
  },
  wo: {
    label: 'W.O.',
    variant: 'walkover',
    icon: AlertOctagon,
  },

  // Estados Administrativos / Cadastrais
  active: {
    label: 'Ativo',
    variant: 'success',
    icon: CheckCircle2,
  },
  inactive: {
    label: 'Inativo',
    variant: 'secondary',
    icon: XCircle,
  },
  draft: {
    label: 'Rascunho',
    variant: 'warning',
    icon: FileEdit,
  },
  published: {
    label: 'Publicado',
    variant: 'info',
    icon: Eye,
  },
  locked: {
    label: 'Bloqueado',
    variant: 'destructive',
    icon: Lock,
  },
};
