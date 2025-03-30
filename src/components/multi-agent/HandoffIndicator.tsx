
import React from "react";
import { ArrowRight } from "lucide-react";

interface HandoffIndicatorProps {
  agent: string;
  reason: string;
}

export function HandoffIndicator({ agent, reason }: HandoffIndicatorProps) {
  return (
    <div className="flex flex-col space-y-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center text-slate-700 dark:text-slate-300">
        <span className="font-medium">Handoff to</span>
        <ArrowRight className="h-3 w-3 mx-1" />
        <span className="font-semibold">{agent}</span>
      </div>
      <div className="text-slate-600 dark:text-slate-400">{reason}</div>
    </div>
  );
}
