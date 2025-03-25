
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AgentIconType } from "@/types/message";
import { adaptAgentIconToDBType } from "@/utils/type-adapters";

// Define the form data type
export interface CustomAgentFormData {
  name: string;
  description: string;
  instructions: string;
  icon: AgentIconType;
  color: string;
}

// Define the agent type
export interface CustomAgent {
  id: string;
  name: string;
  description: string;
  instructions: string;
  icon: AgentIconType;
  color: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

// Custom hook for managing agent CRUD operations
export const useCustomAgents = () => {
  const [agents, setAgents] = useState<CustomAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all agents for the current user
  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from('custom_agents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setAgents(data || []);
    } catch (err) {
      console.error("Error fetching agents:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      toast.error("Failed to load custom agents");
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Create a new agent
  const createAgent = useCallback(async (formData: CustomAgentFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // Use the type adapter to ensure the icon is compatible with DB enum
      const dbCompatibleIcon = adaptAgentIconToDBType(formData.icon);
      
      const { data, error } = await supabase
        .from('custom_agents')
        .insert({
          name: formData.name,
          description: formData.description,
          instructions: formData.instructions,
          icon: dbCompatibleIcon,
          color: formData.color,
          user_id: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success("Agent created successfully");
      
      // Update the local state
      setAgents(prev => [data, ...prev]);
      
      return data.id;
    } catch (err) {
      console.error("Error creating agent:", err);
      toast.error("Failed to create agent");
      throw err;
    }
  }, []);
  
  // Update an existing agent
  const updateAgent = useCallback(async (id: string, updates: Partial<CustomAgentFormData>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // Prepare updates, ensuring icon type is compatible if provided
      const dbUpdates: Record<string, any> = { ...updates };
      if (updates.icon) {
        dbUpdates.icon = adaptAgentIconToDBType(updates.icon);
      }
      
      const { data, error } = await supabase
        .from('custom_agents')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success("Agent updated successfully");
      
      // Update the local state
      setAgents(prev => prev.map(agent => agent.id === id ? data : agent));
      
      return data;
    } catch (err) {
      console.error("Error updating agent:", err);
      toast.error("Failed to update agent");
      throw err;
    }
  }, []);
  
  // Delete an agent
  const deleteAgent = useCallback(async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from('custom_agents')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast.success("Agent deleted successfully");
      
      // Update the local state
      setAgents(prev => prev.filter(agent => agent.id !== id));
      
      return true;
    } catch (err) {
      console.error("Error deleting agent:", err);
      toast.error("Failed to delete agent");
      return false;
    }
  }, []);
  
  // Get a single agent by ID
  const getAgent = useCallback(async (id: string): Promise<CustomAgent | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from('custom_agents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (err) {
      console.error("Error getting agent:", err);
      return null;
    }
  }, []);

  // Load agents on mount
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    isLoading,
    error,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    getAgent
  };
};
