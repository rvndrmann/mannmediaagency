
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { MultiAgentChat } from "@/components/multi-agent/MultiAgentChat";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { useEffect, useState, useCallback, memo } from "react";
import { useProjectContext } from "@/hooks/multi-agent/project-context";

interface CanvasChatProps {
  projectId?: string;
  onClose: () => void;
}

// Use memo to prevent unnecessary re-renders
export const CanvasChat = memo(function CanvasChat({ projectId, onClose }: CanvasChatProps) {
  const { getOrCreateChatSession, activeSession } = useChatSession();
  const { setActiveProject } = useProjectContext();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Set active project in project context to ensure shared state
  useEffect(() => {
    if (projectId) {
      setActiveProject(projectId);
    }
  }, [projectId, setActiveProject]);
  
  // Get or create chat session for this project - with improved error handling
  useEffect(() => {
    const initSession = async () => {
      if (!projectId) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const id = getOrCreateChatSession(projectId, [
          {
            id: "welcome",
            role: "system",
            content: `Welcome to Canvas Assistant. I'm here to help with your video project #${projectId}. Ask me to write scripts, create scene descriptions, or generate image prompts for your scenes.`,
            createdAt: new Date().toISOString(),
          }
        ]);
        setSessionId(id);
      } catch (error) {
        console.error("Error initializing chat session:", error);
      } finally {
        // Short delay to ensure smooth transition
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
      }
    };
    
    initSession();
  }, [projectId, getOrCreateChatSession]);
  
  // Memoize the close handler to prevent unnecessary re-renders
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);
  
  return (
    <div className="flex flex-col h-full overflow-hidden border-r">
      <div className="p-2 border-b flex justify-between items-center bg-[#1A1F29]/90 backdrop-blur-sm">
        <h3 className="font-medium text-sm text-white">Canvas Assistant</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleClose} 
          className="h-7 w-7 text-gray-300 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
          </div>
        ) : sessionId ? (
          <MultiAgentChat 
            projectId={projectId} 
            onBack={handleClose}
            isEmbedded={true}
            sessionId={sessionId}
            compactMode={true}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Could not initialize chat session.
          </div>
        )}
      </div>
    </div>
  );
});
