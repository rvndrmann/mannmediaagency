
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "relative inline-block overflow-hidden rounded-full p-[1.5px] before:absolute before:inset-[-1000%] before:animate-[spin_2s_linear_infinite] before:bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] [&>span]:inline-flex [&>span]:h-full [&>span]:w-full [&>span]:cursor-pointer [&>span]:items-center [&>span]:justify-center [&>span]:rounded-full [&>span]:bg-white [&>span]:dark:bg-gray-950 [&>span]:text-xs [&>span]:font-medium [&>span]:backdrop-blur-3xl [&>span]:bg-gradient-to-tr [&>span]:from-zinc-300/20 [&>span]:via-purple-400/30 [&>span]:to-transparent [&>span]:dark:from-zinc-300/5 [&>span]:dark:via-purple-400/20 [&>span]:text-gray-900 [&>span]:dark:text-white [&>span]:border-input [&>span]:border-[1px] hover:[&>span]:bg-gradient-to-tr hover:[&>span]:from-zinc-300/30 hover:[&>span]:via-purple-400/40 hover:[&>span]:to-transparent dark:hover:[&>span]:from-zinc-300/10 dark:hover:[&>span]:via-purple-400/30 [&>span]:transition-all",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // If using gradient variant, wrap children in a span
    const content = variant === 'gradient' ? <span>{children}</span> : children

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {content}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
