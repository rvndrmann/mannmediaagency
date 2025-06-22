import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { MultiAgentChat } from "@/components/multi-agent/MultiAgentChat";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { Message } from "@/types/message";
import { useEffect, useState } from "react";
import { useProjectContext } from "@/hooks/multi-agent/project-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { useCanvasAgent } from "@/hooks/use-canvas-agent";
import { toast } from "sonner";
import { useMCPContext } from "@/contexts/MCPContext";

interface CanvasChatProps {
  projectId?: string;
  sceneId?: string;
  onClose: () => void;
  updateScene?: (sceneId: string, type: 'script' | 'imagePrompt' | 'description' | 'voiceOverText' | 'image' | 'video', value: string) => Promise<void>;
}

export function CanvasChat({ projectId, sceneId, onClose, updateScene }: CanvasChatProps) {
  const { getOrCreateChatSession, sessions } = useChatSession();
  const { setActiveProject } = useProjectContext();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { useMcp, reconnectToMcp } = useMCPContext();
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  
  const { 
    messages, 
    addUserMessage, 
    addAgentMessage,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneScript,
    generateSceneImage,
    generateSceneVideo,
    isLoading
  } = useCanvasAgent({
    projectId,
    sceneId,
    updateScene
  });
  
  // Ensure MCP is connected if needed
  useEffect(() => {
    if (useMcp && projectId) {
      reconnectToMcp().catch(error => {
        console.error("Failed to establish MCP connection:", error);
      });
    }
  }, [useMcp, projectId, reconnectToMcp]);
  
  // Set active project in project context to ensure shared state
  useEffect(() => {
    if (projectId) {
      setActiveProject(projectId);
    }
  }, [projectId, setActiveProject]);
  
  // Get or create chat session for this project
  useEffect(() => {
    setIsInitializing(true);
    setInitError(null);
    
    if (projectId) {
      try {
        const id = getOrCreateChatSession(projectId, [
          {
            id: "welcome",
            role: "system",
            content: `Welcome to Canvas Assistant. I'm here to help with your video project #${projectId}. Ask me to write scripts, create scene descriptions, or generate image prompts for your scenes.`,
            createdAt: new Date().toISOString(),
          }
        ]);
        setSessionId(id);
        setIsInitializing(false);
      } catch (error) {
        console.error("Error creating chat session:", error);
        setInitError("Failed to initialize chat session. Please try again.");
        setIsInitializing(false);
        toast.error("Failed to initialize chat session");
      }
    } else {
      setIsInitializing(false);
    }
  }, [projectId, getOrCreateChatSession]);

  // Handle canvas-specific agent commands
  const handleAgentCommand = async (command: any) => {
    if (!command || !sceneId) return;
    
    try {
      switch (command.action) {
        case 'generate_script':
          await generateSceneScript(sceneId, command.content || "");
          toast.success("Script generated for scene");
          break;
        case 'generate_description':
          await generateSceneDescription(sceneId, command.content || "");
          toast.success("Description generated for scene");
          break;
        case 'generate_image_prompt':
          await generateImagePrompt(sceneId, command.content || "", "", "");
          toast.success("Image prompt generated for scene");
          break;
        case 'generate_scene_image':
          await generateSceneImage(sceneId, command.content || "");
          toast.success("Image generated for scene");
          break;
        case 'generate_voiceover':
          if (updateScene) {
            await updateScene(sceneId, 'voiceOverText', command.content || "");
            toast.success("Voiceover text updated for scene");
          }
          break;
        default:
          console.log("Unknown canvas command:", command);
      }
    } catch (error) {
      console.error("Error handling canvas command:", error);
      toast.error("Failed to execute canvas command");
    }
  };

  const handleEditContent = (type: string, content: string, sceneId: string) => {
    if (updateScene && sceneId) {
      const updateType = type as 'script' | 'imagePrompt' | 'description' | 'voiceOverText' | 'image' | 'video';
      updateScene(sceneId, updateType, content);
    }
  };
  
  // Fallback UI if session ID is not available
  if (isInitializing) {
    return (
      <div className="flex flex-col h-full overflow-hidden border-r">
        <div className="p-2 border-b flex justify-between items-center bg-background">
          <h3 className="font-medium text-sm">Canvas Assistant</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="animate-pulse text-center">
            <p>Initializing Canvas Assistant...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (initError) {
    return (
      <div className="flex flex-col h-full overflow-hidden border-r">
        <div className="p-2 border-b flex justify-between items-center bg-background">
          <h3 className="font-medium text-sm">Canvas Assistant</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 text-center text-destructive">
          <div>
            <p>{initError}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!projectId) {
    return (
      <div className="flex flex-col h-full overflow-hidden border-r">
        <div className="p-2 border-b flex justify-between items-center bg-background">
          <h3 className="font-medium text-sm">Canvas Assistant</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 text-center text-muted-foreground">
          <p>Please select a project to use the Canvas Assistant.</p>
        </div>
      </div>
    );
  }
  
  // Handle the case where MultiAgentChat component might throw an error
  const renderChatContent = () => {
    if (!sessionId) {
      return (
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message}
                onEditContent={handleEditContent}
              />
            ))}
            
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground p-8">
                <p>No messages yet. Generate content to start a conversation.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      );
    }
    
    try {
      return (
        <MultiAgentChat 
          projectId={projectId} 
          onBack={onClose}
          isEmbedded={true}
          sessionId={sessionId}
          compactMode={true}
          sceneId={sceneId}
          onAgentCommand={handleAgentCommand}
        />
      );
    } catch (error) {
      console.error("Error rendering MultiAgentChat:", error);
      return (
        <div className="p-4 flex items-center justify-center h-full">
          <div className="text-center text-destructive">
            <p>Error loading chat interface</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={onClose}
            >
              Close Chat
            </Button>
          </div>
        </div>
      );
    }
  };
  
  return (
    <div className="flex flex-col h-full overflow-hidden border-r">
      <div className="p-2 border-b flex justify-between items-center bg-background">
        <h3 className="font-medium text-sm">Canvas Assistant</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {renderChatContent()}
      </div>
    </div>
  );
}
