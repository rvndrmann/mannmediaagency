
import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

interface ScrollAreaRef {
  scrollToBottom: () => void;
  scrollToTop: () => void;
  scrollTo: (options: ScrollToOptions) => void;
}

const ScrollArea = React.forwardRef<
  HTMLDivElement & ScrollAreaRef,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & { ref?: React.Ref<HTMLDivElement & ScrollAreaRef> }
>(({ className, children, ...props }, forwardedRef) => {
  const rootRef = React.useRef<HTMLDivElement>(null);
  
  // Create a ref object with scroll methods
  const scrollMethods = React.useMemo(() => ({
    scrollToBottom: () => {
      if (rootRef.current) {
        const viewport = rootRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
        if (viewport) {
          // Use requestAnimationFrame to ensure the DOM has updated before scrolling
          requestAnimationFrame(() => {
            console.log("Scrolling to bottom, current height:", viewport.scrollHeight);
            viewport.scrollTop = viewport.scrollHeight;
            
            // Double-check scroll position after a short delay
            setTimeout(() => {
              if (viewport.scrollTop < viewport.scrollHeight - viewport.clientHeight - 10) {
                console.log("Scroll didn't reach bottom, retrying");
                viewport.scrollTop = viewport.scrollHeight;
              }
            }, 50);
          });
        }
      }
    },
    scrollToTop: () => {
      if (rootRef.current) {
        const viewport = rootRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
        if (viewport) {
          requestAnimationFrame(() => {
            viewport.scrollTop = 0;
          });
        }
      }
    },
    scrollTo: (options: ScrollToOptions) => {
      if (rootRef.current) {
        const viewport = rootRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
        if (viewport) {
          requestAnimationFrame(() => {
            viewport.scrollTo(options);
          });
        }
      }
    }
  }), []);
  
  // Combine the DOM ref and the methods object
  React.useImperativeHandle(
    forwardedRef, 
    () => Object.assign(rootRef.current as HTMLDivElement, scrollMethods), 
    [scrollMethods]
  );
  
  // Apply scroll methods directly to the rootRef for backward compatibility
  React.useEffect(() => {
    if (rootRef.current) {
      Object.assign(rootRef.current, scrollMethods);
    }
  }, [scrollMethods]);
  
  return (
    <ScrollAreaPrimitive.Root
      ref={rootRef}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport 
        className="h-full w-full rounded-[inherit]"
        style={{ scrollBehavior: 'smooth' }}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
})
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-slate-200 dark:bg-slate-700" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
