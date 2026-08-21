import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default: "bg-amber-500 text-zinc-950 font-semibold hover:bg-amber-400 shadow-sm active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs active:scale-[0.98]",
        outline: "border border-cyan-500/50 text-cyan-400 hover:bg-cyan-950/30 hover:text-cyan-300 hover:border-cyan-400 active:scale-[0.98]",
        "outline-primary": "border border-amber-500/60 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 active:scale-[0.98]",
        secondary: "bg-zinc-800 text-zinc-200 hover:bg-zinc-700/80 border border-zinc-700/50 shadow-xs active:scale-[0.98]",
        ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60",
        link: "text-cyan-400 underline-offset-4 hover:underline",
        accent: "bg-amber-500 text-zinc-950 font-semibold hover:bg-amber-400 shadow-sm active:scale-[0.98]",
        success: "bg-emerald-600 text-zinc-950 font-semibold hover:bg-emerald-500 shadow-xs active:scale-[0.98]",
        warning: "bg-amber-500 text-zinc-950 font-semibold hover:bg-amber-400 shadow-xs active:scale-[0.98]",
        hero: "bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-md font-bold tracking-wide active:scale-[0.98]",
        "hero-outline": "border border-cyan-500 text-cyan-400 hover:bg-cyan-950/40 font-bold tracking-wide active:scale-[0.98]",
        indoor: "bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-xs font-semibold",
        beach: "bg-cyan-500 text-zinc-950 hover:bg-cyan-400 shadow-xs font-semibold",
        score: "bg-zinc-900 border border-zinc-800 text-amber-400 hover:border-amber-500/50 font-display text-2xl min-w-[60px] h-14 shadow-xs",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-11 rounded-md px-6 text-base",
        xl: "h-12 rounded-lg px-8 text-lg",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7",
        "icon-lg": "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
