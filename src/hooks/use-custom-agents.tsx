
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AgentInfo, AgentIconType } from "@/types/message";

export interface CustomAgentFormData {
  name: string;
  description: string;
  icon: AgentIconType;
  color: string;
  instructions: string;
}

export function useCustomAgents() {
  const [customAgents, setCustomAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load custom agents from Supabase
  const loadCustomAgents = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setCustomAgents([]);
        return;
      }

      const { data, error } = await supabase
        .from('custom_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedAgents = data.map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        icon: agent.icon as AgentIconType,
        color: agent.color,
        instructions: agent.instructions,
        isCustom: true
      }));

      setCustomAgents(formattedAgents);
    } catch (error) {
      console.error("Error loading custom agents:", error);
      toast.error("Failed to load custom agents");
    } finally {
      setIsLoading(false);
    }
  };

  // Create a custom agent
  const createCustomAgent = async (formData: CustomAgentFormData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to create custom agents");
        return null;
      }

      // Type assertion to deal with the AgentIconType issue
      const { data, error } = await supabase
        .from('custom_agents')
        .insert({
          user_id: session.user.id,
          name: formData.name,
          description: formData.description,
          icon: formData.icon as any, // Use type assertion
          color: formData.color,
          instructions: formData.instructions
        })
        .select()
        .single();

      if (error) throw error;

      const newAgent: AgentInfo = {
        id: data.id,
        name: data.name,
        description: data.description,
        icon: data.icon as AgentIconType,
        color: data.color,
        instructions: data.instructions,
        isCustom: true
      };

      setCustomAgents(prev => [newAgent, ...prev]);
      toast.success("Custom agent created successfully");
      return newAgent;
    } catch (error) {
      console.error("Error creating custom agent:", error);
      toast.error("Failed to create custom agent");
      return null;
    }
  };

  // Update a custom agent
  const updateCustomAgent = async (agentId: string, formData: CustomAgentFormData) => {
    try {
      const { error } = await supabase
        .from('custom_agents')
        .update({
          name: formData.name,
          description: formData.description,
          icon: formData.icon as any, // Use type assertion
          color: formData.color,
          instructions: formData.instructions
        })
        .eq('id', agentId);

      if (error) throw error;

      setCustomAgents(prev => prev.map(agent => 
        agent.id === agentId 
          ? { ...agent, ...formData }
          : agent
      ));

      toast.success("Custom agent updated successfully");
    } catch (error) {
      console.error("Error updating custom agent:", error);
      toast.error("Failed to update custom agent");
    }
  };

  // Delete a custom agent
  const deleteCustomAgent = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('custom_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      setCustomAgents(prev => prev.filter(agent => agent.id !== agentId));
      toast.success("Custom agent deleted successfully");
    } catch (error) {
      console.error("Error deleting custom agent:", error);
      toast.error("Failed to delete custom agent");
    }
  };

  // Load custom agents on component mount
  useEffect(() => {
    loadCustomAgents();
    
    // Set up realtime subscription for custom agents changes
    const channel = supabase
      .channel('custom_agents_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'custom_agents' }, 
        () => {
          loadCustomAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    customAgents,
    isLoading,
    createCustomAgent,
    updateCustomAgent,
    deleteCustomAgent,
    refreshAgents: loadCustomAgents
  };
}
