
"use client";

import { Suspense } from "react";
import BrowserUsePage from "@/pages/BrowserUse";
import { Loader2 } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Loading Browser Use API...</p>
        </div>
      </div>
    }>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <TooltipProvider>
          <BrowserUsePage />
        </TooltipProvider>
      </ThemeProvider>
    </Suspense>
  );
}
