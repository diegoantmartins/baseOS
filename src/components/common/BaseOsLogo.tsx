import React from 'react';
import { cn } from '@/lib/utils';

interface BaseOsLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showSubtitle?: boolean;
  variant?: 'system' | 'document';
  className?: string;
  iconClassName?: string;
}

export function BaseOsLogo({
  size = 'md',
  showText = true,
  showSubtitle = true,
  variant = 'system',
  className,
  iconClassName,
  ...props
}: BaseOsLogoProps) {
  const isDark = variant === 'system';
  const logoSrc = isDark ? '/logo-dark.png' : '/logo-light.png';
  const iconSrc = isDark ? '/logo-icon-dark.png' : '/logo-icon-light.png';

  const heights = {
    sm: 'h-6 max-h-6',
    md: 'h-8 max-h-8',
    lg: 'h-11 max-h-11',
    xl: 'h-14 max-h-14',
  }[size];

  if (!showText) {
    return (
      <div className={cn('inline-flex items-center select-none', className)} {...props}>
        <img
          src={iconSrc}
          alt="BaseOS"
          className={cn('object-contain shrink-0 w-auto', heights, iconClassName)}
          loading="eager"
        />
      </div>
    );
  }

  return (
    <div className={cn('inline-flex items-center select-none', className)} {...props}>
      <img
        src={logoSrc}
        alt="BaseOS"
        className={cn('object-contain shrink-0 max-w-full w-auto', heights, iconClassName)}
        loading="eager"
      />
    </div>
  );
}

export default BaseOsLogo;
