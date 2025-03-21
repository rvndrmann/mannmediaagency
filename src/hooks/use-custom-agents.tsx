
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CustomAgent, CustomAgentFormData } from '@/hooks/multi-agent/types';

export const useCustomAgents = () => {
  const [agents, setAgents] = useState<CustomAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAgent, setActiveAgent] = useState<CustomAgent | null>(null);

  // Fetch agents from the database
  const fetchAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if the agent_instructions table exists
      const { data, error } = await supabase.rpc('check_table_exists', { table_name: 'agent_instructions' });
      
      if (error) {
        console.error('Error checking table:', error);
        return;
      }
      
      if (!data) {
        console.info('Agent instructions table does not exist yet');
        setAgents([]);
        setIsLoading(false);
        return;
      }
      
      // Fetch agent instructions for the current user
      const { data: agentData, error: fetchError } = await supabase
        .from('agent_instructions')
        .select('*')
        .eq('user_id', user.id);
      
      if (fetchError) {
        console.error('Error fetching agents:', fetchError);
        return;
      }
      
      if (agentData) {
        const typedAgents: CustomAgent[] = agentData.map(agent => ({
          id: agent.id,
          name: agent.name,
          instructions: agent.instructions,
          user_id: agent.user_id,
          created_at: agent.created_at
        }));
        setAgents(typedAgents);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new agent
  const createAgent = async (agentData: CustomAgentFormData): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create an agent');
        return false;
      }

      // Check if the agent_instructions table exists
      const { data, error } = await supabase.rpc('check_table_exists', { table_name: 'agent_instructions' });
      
      if (error) {
        console.error('Error checking table:', error);
        toast.error('Failed to check database schema');
        return false;
      }
      
      // Create the table if it doesn't exist
      if (!data) {
        const { error: createError } = await supabase.rpc('create_agent_instructions_table');
        
        if (createError) {
          console.error('Error creating table:', createError);
          toast.error('Failed to set up database schema');
          return false;
        }
      }
      
      // Insert the new agent
      const { data: newAgent, error: insertError } = await supabase
        .from('agent_instructions')
        .insert({
          name: agentData.name,
          instructions: agentData.instructions,
          user_id: user.id
        })
        .select('*')
        .single();
      
      if (insertError) {
        console.error('Error creating agent:', insertError);
        toast.error('Failed to create agent');
        return false;
      }
      
      if (newAgent) {
        const typedAgent: CustomAgent = {
          id: newAgent.id,
          name: newAgent.name,
          instructions: newAgent.instructions,
          user_id: newAgent.user_id,
          created_at: newAgent.created_at
        };
        
        setAgents(prev => [...prev, typedAgent]);
        toast.success(`Agent "${agentData.name}" created successfully`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('Failed to create agent');
      return false;
    }
  };

  // Update an existing agent
  const updateAgent = async (id: string, agentData: CustomAgentFormData): Promise<boolean> => {
    try {
      const { data: updatedAgent, error } = await supabase
        .from('agent_instructions')
        .update({
          name: agentData.name,
          instructions: agentData.instructions
        })
        .eq('id', id)
        .select('*')
        .single();
      
      if (error) {
        console.error('Error updating agent:', error);
        toast.error('Failed to update agent');
        return false;
      }
      
      if (updatedAgent) {
        const typedAgent: CustomAgent = {
          id: updatedAgent.id,
          name: updatedAgent.name,
          instructions: updatedAgent.instructions,
          user_id: updatedAgent.user_id,
          created_at: updatedAgent.created_at
        };
        
        setAgents(prev => prev.map(agent => 
          agent.id === id ? typedAgent : agent
        ));
        
        if (activeAgent && activeAgent.id === id) {
          setActiveAgent(typedAgent);
        }
        
        toast.success(`Agent "${agentData.name}" updated successfully`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating agent:', error);
      toast.error('Failed to update agent');
      return false;
    }
  };

  // Delete an agent
  const deleteAgent = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('agent_instructions')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting agent:', error);
        toast.error('Failed to delete agent');
        return false;
      }
      
      setAgents(prev => prev.filter(agent => agent.id !== id));
      
      if (activeAgent && activeAgent.id === id) {
        setActiveAgent(null);
      }
      
      toast.success('Agent deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent');
      return false;
    }
  };

  // Load agents on initialization
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    isLoading,
    activeAgent,
    setActiveAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    refreshAgents: fetchAgents
  };
};

export default useCustomAgents;
