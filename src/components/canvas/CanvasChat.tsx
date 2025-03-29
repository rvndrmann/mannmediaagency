
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { MultiAgentChat } from "@/components/multi-agent/MultiAgentChat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { useEffect, useState } from "react";

interface CanvasChatProps {
  projectId?: string;
  onClose: () => void;
}

export function CanvasChat({ projectId, onClose }: CanvasChatProps) {
  const { getOrCreateChatSession } = useChatSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  useEffect(() => {
    if (projectId) {
      const id = getOrCreateChatSession(projectId, [
        {
          id: "welcome",
          role: "system",
          content: `Welcome to Canvas Assistant. I'm here to help with your video project #${projectId}. Ask me to write scripts, create scene descriptions, or generate image prompts for your scenes.`,
          createdAt: new Date().toISOString(),
        }
      ]);
      setSessionId(id);
    }
  }, [projectId, getOrCreateChatSession]);
  
  return (
    <div className="flex flex-col h-full overflow-hidden border-r">
      <div className="p-4 border-b flex justify-between items-center bg-background">
        <h3 className="font-medium">Canvas Assistant</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {sessionId && (
          <MultiAgentChat 
            projectId={projectId} 
            onBack={onClose}
            isEmbedded={true}
            sessionId={sessionId}
          />
        )}
      </div>
    </div>
  );
}
