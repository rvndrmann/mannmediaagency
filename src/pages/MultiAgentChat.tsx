
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MultiAgentChat } from "@/components/multi-agent/MultiAgentChat";
import { useProjectContext } from "@/hooks/multi-agent/project-context";

export default function MultiAgentChatPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const { setActiveProject } = useProjectContext({ initialProjectId: projectId || undefined });

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

  return <MultiAgentChat projectId={projectId || undefined} />;
}
