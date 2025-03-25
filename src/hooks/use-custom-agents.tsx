
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AgentIconType } from '@/types/message';
import { toast } from 'sonner';

export interface CustomAgent {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  instructions: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export const useCustomAgents = (userId?: string) => {
  const [agents, setAgents] = useState<CustomAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch custom agents
  const fetchAgents = async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('custom_agents')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) {
        console.error('Error fetching custom agents:', fetchError);
        setError('Failed to load custom agents');
        return;
      }

      setAgents(data || []);
    } catch (err) {
      console.error('Unexpected error in useCustomAgents:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new agent
  const createAgent = async (agentData: Omit<CustomAgent, 'id' | 'created_at' | 'updated_at'>) => {
    if (!userId) {
      setError('User not authenticated');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Ensure icon is a valid string value
      const safeIcon = agentData.icon as string;
      
      // Insert single agent with properly typed icon
      const { data, error: insertError } = await supabase
        .from('custom_agents')
        .insert({
          name: agentData.name,
          description: agentData.description,
          icon: safeIcon,
          color: agentData.color,
          instructions: agentData.instructions,
          user_id: userId
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating custom agent:', insertError);
        setError('Failed to create agent');
        return null;
      }

      setAgents(prev => [...prev, data]);
      toast.success('Agent created successfully');
      return data;
    } catch (err) {
      console.error('Unexpected error creating agent:', err);
      setError('An unexpected error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing agent
  const updateAgent = async (id: string, updates: Partial<Omit<CustomAgent, 'id' | 'created_at' | 'updated_at' | 'user_id'>>) => {
    if (!userId) {
      setError('User not authenticated');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Ensure icon is a valid string if it's being updated
      const updateData = { ...updates };
      if (updates.icon) {
        updateData.icon = updates.icon as string;
      }
      
      const { error: updateError } = await supabase
        .from('custom_agents')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating custom agent:', updateError);
        setError('Failed to update agent');
        return false;
      }

      setAgents(prev => prev.map(agent => 
        agent.id === id ? { ...agent, ...updates } : agent
      ));
      
      toast.success('Agent updated successfully');
      return true;
    } catch (err) {
      console.error('Unexpected error updating agent:', err);
      setError('An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete an agent
  const deleteAgent = async (id: string) => {
    if (!userId) {
      setError('User not authenticated');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('custom_agents')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting custom agent:', deleteError);
        setError('Failed to delete agent');
        return false;
      }

      setAgents(prev => prev.filter(agent => agent.id !== id));
      toast.success('Agent deleted successfully');
      return true;
    } catch (err) {
      console.error('Unexpected error deleting agent:', err);
      setError('An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Load agents on component mount if userId is available
  useEffect(() => {
    if (userId) {
      fetchAgents();
    }
  }, [userId]);

  return {
    agents,
    isLoading,
    error,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent
  };
};
