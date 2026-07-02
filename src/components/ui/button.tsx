import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-#2a8fc4 to-#5ab8e0 text-white shadow-[0_0_4px_0_rgba(255,255,255,0.07),0_-2px_0_0_rgba(0,0,0,0.20)_inset,0_1px_0_0_rgba(255,255,255,0.40)_inset] hover:opacity-90 hover:shadow-[0_0_8px_0_rgba(42,143,196,0.5),0_-2px_0_0_rgba(0,0,0,0.20)_inset,0_1px_0_0_rgba(255,255,255,0.40)_inset] active:scale-[0.98]",
        destructive:
          "bg-gradient-to-b from-red-600 to-red-400 text-white shadow-[0_0_4px_0_rgba(255,255,255,0.07),0_-2px_0_0_rgba(0,0,0,0.20)_inset,0_1px_0_0_rgba(255,255,255,0.40)_inset] hover:opacity-90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient:
          "bg-gradient-to-b from-#2a8fc4 to-#5ab8e0 text-white shadow-[0_0_4px_0_rgba(255,255,255,0.07),0_-2px_0_0_rgba(0,0,0,0.20)_inset,0_1px_0_0_rgba(255,255,255,0.40)_inset] hover:opacity-90 hover:shadow-[0_0_8px_0_rgba(42,143,196,0.5),0_-2px_0_0_rgba(0,0,0,0.20)_inset,0_1px_0_0_rgba(255,255,255,0.40)_inset] active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-6",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
