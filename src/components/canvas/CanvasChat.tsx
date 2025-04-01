
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
          await generateImagePrompt(sceneId, command.content || "");
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
  
  return (
    <div className="flex flex-col h-full overflow-hidden border-r">
      <div className="p-2 border-b flex justify-between items-center bg-[#1A1F29]/90 backdrop-blur-sm">
        <h3 className="font-medium text-sm text-white">Canvas Assistant</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-gray-300 hover:text-white">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {sessionId ? (
          <MultiAgentChat 
            projectId={projectId} 
            onBack={onClose}
            isEmbedded={true}
            sessionId={sessionId}
            compactMode={true}
            sceneId={sceneId}
            onAgentCommand={handleAgentCommand}
          />
        ) : (
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
                  No messages yet. Generate content to start a conversation.
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
