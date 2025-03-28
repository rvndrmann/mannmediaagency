
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MultiAgentChat } from "@/components/multi-agent/MultiAgentChat";

export default function MultiAgentChatPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');

  useEffect(() => {
    document.title = projectId 
      ? `Canvas Project #${projectId} - AI Collaboration` 
      : "Multi-Agent Chat | AI Collaboration";
  }, [projectId]);

  return <MultiAgentChat projectId={projectId || undefined} />;
}
