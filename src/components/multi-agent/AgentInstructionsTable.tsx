
import { AgentType, BUILT_IN_AGENT_TYPES } from "@/hooks/use-multi-agent-chat";
import { useCustomAgents } from "@/hooks/use-custom-agents";
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Info } from "lucide-react";
import { EditAgentInstructionsDialog } from "./EditAgentInstructionsDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AgentInstructionsTableProps {
  activeAgent: AgentType;
}

const INSTRUCTIONS_STORAGE_KEY = 'built_in_agent_instructions';

export const AgentInstructionsTable = ({ activeAgent }: AgentInstructionsTableProps) => {
  const { customAgents, updateCustomAgent } = useCustomAgents();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [builtInInstructions, setBuiltInInstructions] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load instructions from localStorage and database
  useEffect(() => {
    const loadInstructions = async () => {
      setIsLoading(true);
      try {
        // First, try to load from localStorage
        const savedInstructions = localStorage.getItem(INSTRUCTIONS_STORAGE_KEY);
        const defaultInstructions = {
          main: `I am a helpful assistant that orchestrates specialized agents for creative content generation. I can help with scriptwriting, image prompt creation, and using tools for visual content creation. I can analyze images you upload and provide insights. When a request would be better handled by a specialized agent, I'll hand off the conversation to that agent.`,
          
          script: `I am ScriptWriterAgent, specialized in creating compelling scripts, dialogue, and scene descriptions. I create content based solely on what the user requests. I can analyze reference images to help craft scripts with accurate settings and visual elements. I'm creative, engaging, and tailor the tone to the user's requirements.`,
          
          image: `I am ImagePromptAgent, specialized in creating detailed, creative prompts for AI image generation. My prompts are specific, descriptive, and include details about style, mood, lighting, composition, and subject matter. I can analyze reference images to create similar styles or iterations. I format output as a single prompt string that could be directly used for image generation.`,
          
          tool: `I am ToolOrchestratorAgent, specialized in determining which tool to use based on user requests. I help users create product images, convert images to videos, and more using the available tools in the system. I can analyze uploaded images to suggest appropriate tool workflows.`,
          
          scene: `I am SceneDescriptionAgent, specialized in creating vivid, detailed scene descriptions from images or text prompts. I describe scenes in rich detail, focusing on setting, atmosphere, and visual elements. I can analyze uploaded photos to extract scene details and create immersive scene settings that could be used for scripts, stories, or visual productions. My descriptions are sensory-rich, capturing not just visuals but the feeling of being in the scene.`
        };
        
        let instructions = savedInstructions ? JSON.parse(savedInstructions) : defaultInstructions;
        
        // Also try to fetch from database for server-side values
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: dbInstructions, error } = await supabase
            .from('agent_instructions')
            .select('agent_type, instructions')
            .eq('user_id', user.id);
            
          if (!error && dbInstructions?.length > 0) {
            // Convert array to object
            const dbInstructionsObj = dbInstructions.reduce((acc, item) => {
              acc[item.agent_type] = item.instructions;
              return acc;
            }, {} as Record<string, string>);
            
            // Merge with local instructions, prioritizing DB values
            instructions = { ...defaultInstructions, ...instructions, ...dbInstructionsObj };
            
            // Update localStorage with merged values
            localStorage.setItem(INSTRUCTIONS_STORAGE_KEY, JSON.stringify(instructions));
          }
        }
        
        setBuiltInInstructions(instructions);
      } catch (error) {
        console.error("Error loading agent instructions:", error);
        toast.error("Failed to load agent instructions");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInstructions();
  }, []);

  const handleUpdateBuiltInInstructions = async (agentType: AgentType, instructions: string) => {
    try {
      if (agentType === 'tool') {
        toast.error("Tool agent instructions cannot be modified");
        return;
      }
      
      const updatedInstructions = {
        ...builtInInstructions,
        [agentType]: instructions
      };
      
      // Update local state
      setBuiltInInstructions(updatedInstructions);
      localStorage.setItem(INSTRUCTIONS_STORAGE_KEY, JSON.stringify(updatedInstructions));
      
      // Also update in database for server-side persistence
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // First check if record exists
        const { data: existingRecord, error: checkError } = await supabase
          .from('agent_instructions')
          .select('id')
          .eq('user_id', user.id)
          .eq('agent_type', agentType)
          .single();
        
        if (checkError || !existingRecord) {
          // Insert new record
          await supabase
            .from('agent_instructions')
            .insert({
              user_id: user.id,
              agent_type: agentType,
              instructions: instructions
            });
        } else {
          // Update existing record
          await supabase
            .from('agent_instructions')
            .update({ instructions: instructions })
            .eq('id', existingRecord.id);
        }
      }
      
      toast.success("Agent instructions updated successfully");
    } catch (error) {
      console.error("Error updating instructions:", error);
      toast.error("Failed to update agent instructions");
    }
  };

  const handleUpdateCustomAgentInstructions = async (agentType: AgentType, instructions: string) => {
    try {
      const customAgent = customAgents.find(agent => agent.id === agentType);
      
      if (customAgent) {
        await updateCustomAgent(customAgent.id, {
          name: customAgent.name,
          description: customAgent.description,
          icon: customAgent.icon,
          color: customAgent.color,
          instructions: instructions
        });
        toast.success("Agent instructions updated successfully");
      }
    } catch (error) {
      console.error("Error updating custom agent instructions:", error);
      toast.error("Failed to update agent instructions");
    }
  };

  const agentInstructions = useMemo(() => {
    const customAgent = customAgents.find(agent => agent.id === activeAgent);
    if (customAgent) {
      return customAgent.instructions;
    }

    return builtInInstructions[activeAgent] || "No instructions available for this agent.";
  }, [activeAgent, customAgents, builtInInstructions]);

  const canEditInstructions = activeAgent !== 'tool';
  
  const handleSaveInstructions = (agentType: AgentType, instructions: string) => {
    const isCustomAgent = !BUILT_IN_AGENT_TYPES.includes(agentType);
    
    if (isCustomAgent) {
      handleUpdateCustomAgentInstructions(agentType, instructions);
    } else {
      handleUpdateBuiltInInstructions(agentType, instructions);
    }
  };

  return (
    <div className="mb-2 p-1.5 bg-[#1a202c]/70 border border-[#2d374b] rounded-lg">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-semibold text-white/90">Current Agent Instructions</h3>
          <div className="tooltip" data-tip="Instructions tell the agent how to respond to your requests. Custom instructions let you control how the agent behaves.">
            <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
          </div>
        </div>
        
        {isLoading ? (
          <div className="text-xs text-gray-400">Loading...</div>
        ) : canEditInstructions && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowEditDialog(true)}
            className="text-xs flex items-center gap-1 border-gray-600 bg-gray-800/50 hover:bg-gray-700/70 h-5 px-1.5"
          >
            <Edit className="h-2.5 w-2.5" />
            Edit
          </Button>
        )}
      </div>
      
      <div className="text-xs text-gray-400 h-20 overflow-y-auto p-1.5 bg-[#0f141e] rounded border border-[#1e283a]">
        {isLoading ? (
          <div className="animate-pulse h-full bg-gray-800/20 rounded"></div>
        ) : (
          <p className="whitespace-pre-wrap">{agentInstructions}</p>
        )}
      </div>

      <EditAgentInstructionsDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={handleSaveInstructions}
        agentType={activeAgent}
        initialInstructions={agentInstructions}
      />
    </div>
  );
};
