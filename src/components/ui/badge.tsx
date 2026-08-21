import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        accent: "border-transparent bg-accent text-accent-foreground",
        info: "border-transparent bg-info text-info-foreground",
        muted: "border-border bg-muted text-muted-foreground",
        outline: "border-border text-foreground",
        // Status esportivos
        scheduled: "border-transparent bg-info/15 text-info dark:bg-info/25",
        live: "border-transparent bg-accent text-accent-foreground animate-pulse-subtle",
        completed: "border-transparent bg-success/15 text-success dark:bg-success/25",
        homologated: "border-transparent bg-success text-success-foreground",
        pending: "border-border bg-muted text-muted-foreground",
        cancelled: "border-transparent bg-destructive/15 text-destructive",
        walkover: "border-transparent bg-destructive/15 text-destructive font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
