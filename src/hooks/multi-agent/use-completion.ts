
import { useState } from "react";
import { Agent, Message } from "@/types/message";
import { supabase } from "@/integrations/supabase/client";

interface CompletionResult {
  content: string;
  command?: {
    name: string;
    parameters: Record<string, any>;
  };
  tasks?: any[];
}

export const useCompletion = () => {
  const [isLoading, setIsLoading] = useState(false);

  const getCompletion = async (agent: Agent, messages: Message[]): Promise<CompletionResult | null> => {
    try {
      setIsLoading(true);
      
      // Filter only the relevant messages for this agent
      const agentMessages = messages.filter(msg => msg.agentId === agent.id);
      
      // Call the edge function to get a completion from the LLM
      const { data, error } = await supabase.functions.invoke("multi-agent-chat", {
        body: {
          agent: {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            instructions: agent.instructions,
            icon: agent.icon,
            color: agent.color,
          },
          messages: agentMessages,
        },
      });

      if (error) {
        console.error("Error getting completion:", error);
        return null;
      }

      return {
        content: data.content,
        command: data.command,
        tasks: data.tasks,
      };
    } catch (error) {
      console.error("Error in getCompletion:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getCompletion,
    isLoading,
  };
};
