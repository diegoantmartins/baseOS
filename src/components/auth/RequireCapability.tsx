import React, { ReactNode } from 'react';
import { useCapability } from '@/hooks/useCapability';
import type { SystemCapability } from '@/services/tenantSecurityService';

interface RequireCapabilityProps {
  capability: SystemCapability | SystemCapability[];
  all?: boolean; // Se true exige todas as capacidades, se false exige ao menos uma
  fallback?: ReactNode;
  children: ReactNode;
}

export const RequireCapability: React.FC<RequireCapabilityProps> = ({
  capability,
  all = false,
  fallback = null,
  children,
}) => {
  const { hasCapability, hasAllCapabilities, hasAnyCapability } = useCapability();

  let hasAccess = false;
  if (Array.isArray(capability)) {
    hasAccess = all ? hasAllCapabilities(capability) : hasAnyCapability(capability);
  } else {
    hasAccess = hasCapability(capability);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export const Can: React.FC<{
  do: SystemCapability | SystemCapability[];
  all?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}> = ({ do: capability, all, fallback, children }) => {
  return (
    <RequireCapability capability={capability} all={all} fallback={fallback}>
      {children}
    </RequireCapability>
  );
};
