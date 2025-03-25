
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AgentIconType, AgentInfo } from "@/types/message";
import { toast } from "sonner";

// Define CustomAgentFormData type
export interface CustomAgentFormData {
  name: string;
  description: string;
  icon: AgentIconType;
  color: string;
  instructions: string;
}

export const useCustomAgents = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  // Get user session
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  // Query to get custom agents
  const { 
    data: customAgents,
    isLoading: isLoadingAgents,
    error: agentsError 
  } = useQuery({
    queryKey: ["customAgents"],
    queryFn: async () => {
      if (!session?.user.id) return [];

      const { data, error } = await supabase
        .from("custom_agents")
        .select("*")
        .eq("user_id", session.user.id);

      if (error) throw error;
      
      return data.map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        icon: agent.icon as AgentIconType,
        color: agent.color,
        instructions: agent.instructions
      }));
    },
    enabled: !!session?.user.id,
  });

  // Create custom agent mutation
  const createAgentMutation = useMutation({
    mutationFn: async (agentData: CustomAgentFormData) => {
      if (!session?.user.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("custom_agents")
        .insert({
          name: agentData.name,
          description: agentData.description,
          icon: agentData.icon,
          color: agentData.color,
          instructions: agentData.instructions,
          user_id: session.user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customAgents"] });
      setIsCreating(false);
      toast.success("Custom agent created successfully");
    },
    onError: (error) => {
      console.error("Error creating custom agent:", error);
      toast.error("Failed to create custom agent");
    },
  });

  // Update custom agent mutation
  const updateAgentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<CustomAgentFormData> }) => {
      if (!session?.user.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("custom_agents")
        .update({
          name: updates.name,
          description: updates.description,
          icon: updates.icon as AgentIconType, // Type assertion here
          color: updates.color,
          instructions: updates.instructions
        })
        .eq("id", id)
        .eq("user_id", session.user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customAgents"] });
      setIsEditing(false);
      toast.success("Custom agent updated successfully");
    },
    onError: (error) => {
      console.error("Error updating custom agent:", error);
      toast.error("Failed to update custom agent");
    },
  });

  // Delete custom agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      if (!session?.user.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("custom_agents")
        .delete()
        .eq("id", agentId)
        .eq("user_id", session.user.id);

      if (error) throw error;
      return agentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customAgents"] });
      toast.success("Custom agent deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting custom agent:", error);
      toast.error("Failed to delete custom agent");
    },
  });

  // Handlers
  const handleCreateAgent = useCallback((agentData: CustomAgentFormData) => {
    createAgentMutation.mutate(agentData);
  }, [createAgentMutation]);

  const handleUpdateAgent = useCallback((id: string, updates: Partial<CustomAgentFormData>) => {
    updateAgentMutation.mutate({ id, updates });
  }, [updateAgentMutation]);

  const handleDeleteAgent = useCallback((id: string) => {
    deleteAgentMutation.mutate(id);
  }, [deleteAgentMutation]);

  return {
    customAgents,
    isLoadingAgents,
    agentsError,
    isCreating,
    setIsCreating,
    isEditing,
    setIsEditing,
    handleCreateAgent,
    handleUpdateAgent,
    handleDeleteAgent,
    createAgentMutation,
    updateAgentMutation,
    deleteAgentMutation
  };
};
