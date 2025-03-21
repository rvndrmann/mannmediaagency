
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CustomAgent, CustomAgentFormData } from '@/hooks/multi-agent/types';

interface CustomAgentsHook {
  agents: CustomAgent[];
  isLoading: boolean;
  activeAgent: CustomAgent | null;
  setActiveAgent: (agent: CustomAgent | null) => void;
  createAgent: (agentData: CustomAgentFormData) => Promise<boolean>;
  updateAgent: (id: string, agentData: CustomAgentFormData) => Promise<boolean>;
  deleteAgent: (id: string) => Promise<boolean>;
  refreshAgents: () => Promise<void>;
}

export const useCustomAgents = (): CustomAgentsHook => {
  const [agents, setAgents] = useState<CustomAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAgent, setActiveAgent] = useState<CustomAgent | null>(null);

  // Fetch agents from the database
  const fetchAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if custom_agents table exists
      // If not, we'll create it in the createAgent function when needed
      try {
        const { data: agentData, error } = await supabase
          .from('custom_agents')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Error fetching agents:', error);
          setAgents([]);
          return;
        }
        
        if (agentData) {
          const typedAgents: CustomAgent[] = agentData.map(agent => ({
            id: agent.id,
            name: agent.name,
            instructions: agent.instructions,
            user_id: agent.user_id,
            created_at: agent.created_at,
            description: agent.description,
            icon: agent.icon,
            color: agent.color
          }));
          setAgents(typedAgents);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
        setAgents([]);
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

      try {
        // Insert the new agent
        const { data: newAgent, error: insertError } = await supabase
          .from('custom_agents')
          .insert({
            name: agentData.name,
            instructions: agentData.instructions,
            description: agentData.description || '',
            icon: agentData.icon || 'Bot',
            color: agentData.color || 'from-blue-400 to-indigo-500',
            user_id: user.id
          })
          .select('*')
          .single();
        
        if (insertError) {
          // If the error is because the table doesn't exist, try to create it
          if (insertError.code === '42P01') {
            await createCustomAgentsTable(user.id, agentData);
            return true;
          }
          
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
            created_at: newAgent.created_at,
            description: newAgent.description,
            icon: newAgent.icon,
            color: newAgent.color
          };
          
          setAgents(prev => [...prev, typedAgent]);
          toast.success(`Agent "${agentData.name}" created successfully`);
          return true;
        }
      } catch (error) {
        console.error('Error creating agent:', error);
        toast.error('Failed to create agent - you might need to create the custom_agents table');
      }
      
      return false;
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('Failed to create agent');
      return false;
    }
  };

  // Helper to create the custom_agents table if it doesn't exist
  const createCustomAgentsTable = async (userId: string, agentData: CustomAgentFormData): Promise<boolean> => {
    try {
      // Create the table using SQL
      const { error: sqlError } = await supabase.rpc('create_custom_agents_table');
      
      if (sqlError) {
        console.error('Error creating custom_agents table:', sqlError);
        toast.error('Failed to create agents table');
        return false;
      }
      
      // Now try to insert the agent again
      const { data: newAgent, error: insertError } = await supabase
        .from('custom_agents')
        .insert({
          name: agentData.name,
          instructions: agentData.instructions,
          description: agentData.description || '',
          icon: agentData.icon || 'Bot',
          color: agentData.color || 'from-blue-400 to-indigo-500',
          user_id: userId
        })
        .select('*')
        .single();
      
      if (insertError) {
        console.error('Error creating agent after table creation:', insertError);
        toast.error('Failed to create agent after table creation');
        return false;
      }
      
      if (newAgent) {
        const typedAgent: CustomAgent = {
          id: newAgent.id,
          name: newAgent.name,
          instructions: newAgent.instructions,
          user_id: newAgent.user_id,
          created_at: newAgent.created_at,
          description: newAgent.description,
          icon: newAgent.icon,
          color: newAgent.color
        };
        
        setAgents(prev => [...prev, typedAgent]);
        toast.success(`Agent "${agentData.name}" created successfully`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error in createCustomAgentsTable:', error);
      return false;
    }
  };

  // Update an existing agent
  const updateAgent = async (id: string, agentData: CustomAgentFormData): Promise<boolean> => {
    try {
      const { data: updatedAgent, error } = await supabase
        .from('custom_agents')
        .update({
          name: agentData.name,
          instructions: agentData.instructions,
          description: agentData.description || '',
          icon: agentData.icon || 'Bot',
          color: agentData.color || 'from-blue-400 to-indigo-500',
          updated_at: new Date().toISOString()
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
          created_at: updatedAgent.created_at,
          description: updatedAgent.description,
          icon: updatedAgent.icon,
          color: updatedAgent.color
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
        .from('custom_agents')
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
