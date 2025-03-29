
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MultiAgentChat } from "@/components/multi-agent/MultiAgentChat";
import { useProjectContext } from "@/hooks/multi-agent/project-context";
import { useChatSession } from "@/contexts/ChatSessionContext";

export default function MultiAgentChatPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const sessionId = searchParams.get('sessionId');
  
  const { setActiveProject } = useProjectContext({ initialProjectId: projectId || undefined });
  const { getOrCreateChatSession } = useChatSession();
  
  const [chatSessionId, setChatSessionId] = useState<string | null>(
    sessionId || null
  );
  
  // Initialize chat session if needed
  useEffect(() => {
    if (!chatSessionId) {
      if (projectId) {
        // Get or create a session for this project
        const newSessionId = getOrCreateChatSession(projectId);
        setChatSessionId(newSessionId);
      } else {
        // Create a new general chat session
        const newSessionId = getOrCreateChatSession(null);
        setChatSessionId(newSessionId);
      }
    }
  }, [projectId, chatSessionId, getOrCreateChatSession]);

  useEffect(() => {
    // Set page title based on project
    document.title = projectId 
      ? `Canvas Project #${projectId} - AI Collaboration` 
      : "Multi-Agent Chat | AI Collaboration";
      
    // Ensure project is set in context
    if (projectId) {
      setActiveProject(projectId);
    }
  }, [projectId, setActiveProject]);

  return <MultiAgentChat 
    projectId={projectId || undefined} 
    sessionId={chatSessionId || undefined}
  />;
}
