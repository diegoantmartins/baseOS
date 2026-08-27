import * as React from 'react';
import { cn } from '@/lib/utils';
import { badgeVariants, type BadgeProps } from './badgeVariants';

export type { BadgeProps };

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
