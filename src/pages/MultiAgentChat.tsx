
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { MultiAgentChat } from "@/components/multi-agent/MultiAgentChat";
import { useProjectContext } from "@/hooks/multi-agent/project-context";
import { useChatSession } from "@/contexts/ChatSessionContext";
import { Button } from "@/components/ui/button";
import { BarChartBig } from "lucide-react";
import { toast } from "sonner";

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
  
  const handleViewTraces = () => {
    toast.success("Navigating to trace analytics");
  };

  return (
    <>
      <div className="absolute top-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1 text-xs"
          asChild
        >
          <Link to="/trace-analytics">
            <BarChartBig className="h-3 w-3 mr-1" />
            View Traces
          </Link>
        </Button>
      </div>
      
      <MultiAgentChat 
        projectId={projectId || undefined} 
        sessionId={chatSessionId || undefined}
      />
    </>
  );
}
