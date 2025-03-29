
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { MultiAgentChat } from "@/components/multi-agent/MultiAgentChat";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { useEffect, useState } from "react";
import { useProjectContext } from "@/hooks/multi-agent/project-context";

interface CanvasChatProps {
  projectId?: string;
  onClose: () => void;
}

export function CanvasChat({ projectId, onClose }: CanvasChatProps) {
  const { getOrCreateChatSession, activeSession } = useChatSession();
  const { setActiveProject } = useProjectContext();
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Set active project in project context to ensure shared state
  useEffect(() => {
    if (projectId) {
      setActiveProject(projectId);
    }
  }, [projectId, setActiveProject]);
  
  // Get or create chat session for this project
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
      <div className="p-2 border-b flex justify-between items-center bg-[#1A1F29]/90 backdrop-blur-sm">
        <h3 className="font-medium text-sm text-white">Canvas Assistant</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-gray-300 hover:text-white">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {sessionId && (
          <MultiAgentChat 
            projectId={projectId} 
            onBack={onClose}
            isEmbedded={true}
            sessionId={sessionId}
            compactMode={true}
          />
        )}
      </div>
    </div>
  );
}
