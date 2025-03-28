
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { MultiAgentChat } from "@/components/multi-agent/MultiAgentChat";

interface CanvasChatProps {
  projectId?: string;
  onClose: () => void;
}

export function CanvasChat({ projectId, onClose }: CanvasChatProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden border-r">
      <div className="p-4 border-b flex justify-between items-center bg-background">
        <h3 className="font-medium">Canvas Assistant</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <MultiAgentChat 
          projectId={projectId} 
          onBack={onClose}
          isEmbedded={true}
        />
      </div>
    </div>
  );
}
