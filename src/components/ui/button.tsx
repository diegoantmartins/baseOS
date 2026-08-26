import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Hierarquia enterprise:
//  - default/accent: 1 ação primária sólida (âmbar) por contexto
//  - secondary: superfície neutra zinc-800
//  - outline: borda neutra discreta
//  - ghost: ação terciária silenciosa
// Sem escalas/brilhos; transições de 150ms apenas em cores.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        // Primário — âmbar sólido, único por contexto
        default: "bg-primary text-primary-foreground font-semibold hover:bg-amber-400",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Neutros
        outline: "border border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100",
        "outline-primary": "border border-primary/40 text-primary hover:bg-primary/10",
        secondary: "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-zinc-100",
        ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
        link: "text-zinc-300 underline-offset-4 hover:text-zinc-100 hover:underline",
        // Aliases legados mapeados para a hierarquia enterprise
        accent: "bg-primary text-primary-foreground font-semibold hover:bg-amber-400",
        success: "bg-emerald-600/90 text-white hover:bg-emerald-600",
        warning: "bg-primary text-primary-foreground hover:bg-amber-400",
        hero: "bg-primary text-primary-foreground font-semibold hover:bg-amber-400",
        "hero-outline": "border border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100",
        indoor: "bg-primary text-primary-foreground font-semibold hover:bg-amber-400",
        beach: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
        score: "bg-zinc-900 border border-zinc-700 text-zinc-100 hover:border-zinc-500 font-display text-2xl min-w-[60px] h-14",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        xl: "h-12 rounded-md px-8 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
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
