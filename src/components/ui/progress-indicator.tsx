
import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const progressIndicatorVariants = cva(
  "flex items-center gap-2 rounded-md text-sm",
  {
    variants: {
      variant: {
        default: "bg-background",
        outline: "border border-input",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        inline: "",
      },
      state: {
        loading: "text-muted-foreground",
        success: "text-green-600 dark:text-green-500",
        error: "text-destructive",
        idle: "text-muted-foreground",
      },
      size: {
        default: "p-2",
        sm: "p-1 text-xs",
        lg: "p-3 text-base",
        inline: "p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      state: "idle",
      size: "default",
    },
  }
);

const iconMap = {
  loading: <Loader2 className="h-4 w-4 animate-spin" />,
  success: <CheckCircle2 className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
  idle: null,
};

export interface ProgressIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressIndicatorVariants> {
  state: "loading" | "success" | "error" | "idle";
  showIcon?: boolean;
  message?: string | React.ReactNode;
  progress?: number;
}

export function ProgressIndicator({
  className,
  variant,
  state,
  size,
  showIcon = true,
  message,
  progress,
  ...props
}: ProgressIndicatorProps) {
  return (
    <div
      className={cn(progressIndicatorVariants({ variant, state, size, className }))}
      {...props}
    >
      {showIcon && iconMap[state]}
      
      <div className="flex flex-col gap-1 flex-grow">
        {message && <div>{message}</div>}
        
        {progress !== undefined && progress > 0 && (
          <div className="relative w-full h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "absolute top-0 left-0 h-full rounded-full transition-all duration-300 ease-in-out",
                state === "loading" && "bg-primary",
                state === "success" && "bg-green-500",
                state === "error" && "bg-destructive"
              )}
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
