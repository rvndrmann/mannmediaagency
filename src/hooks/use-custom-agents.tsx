
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CustomAgent {
  id: string;
  name: string;
  instructions: string;
  created_at: string;
  user_id: string;
}

export const useCustomAgents = () => {
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomAgents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('agent_instructions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomAgents(data || []);
    } catch (error) {
      console.error('Error fetching custom agents:', error);
      toast.error('Failed to load custom agents');
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomAgent = async (name: string, instructions: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('agent_instructions')
        .insert([
          { 
            name, 
            instructions, 
            user_id: user.id,
            agent_type: name.toLowerCase().replace(/\s+/g, '-')
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      setCustomAgents(prev => [data, ...prev]);
      toast.success('Agent created successfully');
      return data;
    } catch (error) {
      console.error('Error creating custom agent:', error);
      toast.error('Failed to create agent');
      return null;
    }
  };

  const updateCustomAgent = async (id: string, updates: Partial<CustomAgent>) => {
    try {
      const { error } = await supabase
        .from('agent_instructions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      setCustomAgents(prev => 
        prev.map(agent => agent.id === id ? { ...agent, ...updates } : agent)
      );
      
      toast.success('Agent updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating custom agent:', error);
      toast.error('Failed to update agent');
      return false;
    }
  };

  const deleteCustomAgent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('agent_instructions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setCustomAgents(prev => prev.filter(agent => agent.id !== id));
      toast.success('Agent deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting custom agent:', error);
      toast.error('Failed to delete agent');
      return false;
    }
  };

  useEffect(() => {
    fetchCustomAgents();
  }, []);

  return {
    customAgents,
    isLoading,
    addCustomAgent,
    updateCustomAgent,
    deleteCustomAgent,
    refreshAgents: fetchCustomAgents
  };
};
