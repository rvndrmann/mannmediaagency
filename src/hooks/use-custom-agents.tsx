
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AgentInfo } from "@/types/message";
import { toast } from "sonner";

// Define a specific type for database agent icons
type DatabaseAgentIconType = "Bot" | "PenLine" | "Image" | "Wrench" | "Code" | "FileText" | "Zap" | "Brain" | "Lightbulb" | "Music";

export interface CustomAgentFormData {
  name: string;
  description: string;
  icon: DatabaseAgentIconType;
  color: string;
  instructions: string;
}

export function useCustomAgents() {
  const [customAgents, setCustomAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch custom agents on component mount
  useEffect(() => {
    fetchCustomAgents();
  }, []);

  const fetchCustomAgents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        return;
      }

      const { data, error } = await supabase
        .from("custom_agents")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      // Convert database records to AgentInfo objects
      const formattedAgents = data.map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        type: "custom",
        icon: agent.icon as DatabaseAgentIconType,
        isBuiltIn: false,
        color: agent.color,
        instructions: agent.instructions,
      }));

      setCustomAgents(formattedAgents);
    } catch (err: any) {
      console.error("Error fetching custom agents:", err);
      setError(err.message || "Failed to fetch custom agents");
      toast.error("Failed to fetch custom agents");
    } finally {
      setIsLoading(false);
    }
  };

  const createCustomAgent = async (agentData: CustomAgentFormData) => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("custom_agents")
        .insert({
          name: agentData.name,
          description: agentData.description,
          icon: agentData.icon,
          color: agentData.color,
          instructions: agentData.instructions,
          user_id: user.id
        })
        .select();

      if (error) throw error;

      const newAgent: AgentInfo = {
        id: data[0].id,
        name: data[0].name,
        description: data[0].description,
        type: "custom",
        icon: data[0].icon,
        color: data[0].color,
        instructions: data[0].instructions,
        isBuiltIn: false
      };

      setCustomAgents([...customAgents, newAgent]);
      toast.success("Custom agent created successfully");
      return newAgent;
    } catch (err: any) {
      console.error("Error creating custom agent:", err);
      toast.error("Failed to create custom agent");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCustomAgent = async (agentId: string, agentData: CustomAgentFormData) => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("custom_agents")
        .update({
          name: agentData.name,
          description: agentData.description,
          icon: agentData.icon,
          color: agentData.color,
          instructions: agentData.instructions,
          updated_at: new Date().toISOString()
        })
        .eq("id", agentId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update the local state
      setCustomAgents(prevAgents => 
        prevAgents.map(agent => 
          agent.id === agentId 
            ? {
                ...agent,
                name: agentData.name,
                description: agentData.description,
                icon: agentData.icon,
                color: agentData.color,
                instructions: agentData.instructions
              } 
            : agent
        )
      );

      toast.success("Custom agent updated successfully");
      return true;
    } catch (err: any) {
      console.error("Error updating custom agent:", err);
      toast.error("Failed to update custom agent");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCustomAgent = async (agentId: string) => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("custom_agents")
        .delete()
        .eq("id", agentId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update the local state
      setCustomAgents(prevAgents => prevAgents.filter(agent => agent.id !== agentId));
      toast.success("Custom agent deleted successfully");
      return true;
    } catch (err: any) {
      console.error("Error deleting custom agent:", err);
      toast.error("Failed to delete custom agent");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    customAgents,
    isLoading,
    error,
    fetchCustomAgents,
    createCustomAgent,
    updateCustomAgent,
    deleteCustomAgent
  };
}
