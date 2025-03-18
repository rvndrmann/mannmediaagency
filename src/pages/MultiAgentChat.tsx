
import { MultiAgentChat } from "@/components/multi-agent/MultiAgentChat";
import { useEffect } from "react";

export default function MultiAgentChatPage() {
  useEffect(() => {
    document.title = "Multi-Agent Chat | AI Collaboration";
  }, []);

  return <MultiAgentChat />;
}
