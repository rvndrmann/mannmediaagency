
import { AgentType, BUILT_IN_AGENT_TYPES } from "@/hooks/use-multi-agent-chat";
import { useCustomAgents } from "@/hooks/use-custom-agents";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { EditAgentInstructionsDialog } from "./EditAgentInstructionsDialog";
import { toast } from "sonner";

interface AgentInstructionsTableProps {
  activeAgent: AgentType;
}

export const AgentInstructionsTable = ({ activeAgent }: AgentInstructionsTableProps) => {
  const { customAgents, updateCustomAgent } = useCustomAgents();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [builtInInstructions, setBuiltInInstructions] = useState<Record<string, string>>(() => {
    const savedInstructions = localStorage.getItem('built_in_agent_instructions');
    const defaultInstructions = {
      main: `I am a helpful assistant that orchestrates specialized agents for creative content generation. I can help with scriptwriting, image prompt creation, and using tools for visual content creation. I can analyze images you upload and provide insights. When a request would be better handled by a specialized agent, I'll hand off the conversation to that agent.`,
      
      script: `I am ScriptWriterAgent, specialized in creating compelling scripts, dialogue, and scene descriptions. I create content based solely on what the user requests. I can analyze reference images to help craft scripts with accurate settings and visual elements. I'm creative, engaging, and tailor the tone to the user's requirements.`,
      
      image: `I am ImagePromptAgent, specialized in creating detailed, creative prompts for AI image generation. My prompts are specific, descriptive, and include details about style, mood, lighting, composition, and subject matter. I can analyze reference images to create similar styles or iterations. I format output as a single prompt string that could be directly used for image generation.`,
      
      tool: `I am ToolOrchestratorAgent, specialized in determining which tool to use based on user requests. I help users create product images, convert images to videos, and more using the available tools in the system. I can analyze uploaded images to suggest appropriate tool workflows.`,
      
      scene: `I am SceneDescriptionAgent, specialized in creating vivid, detailed scene descriptions from images or text prompts. I describe scenes in rich detail, focusing on setting, atmosphere, and visual elements. I can analyze uploaded photos to extract scene details and create immersive scene settings that could be used for scripts, stories, or visual productions. My descriptions are sensory-rich, capturing not just visuals but the feeling of being in the scene.`
    };
    
    return savedInstructions ? JSON.parse(savedInstructions) : defaultInstructions;
  });

  const handleUpdateBuiltInInstructions = (agentType: AgentType, instructions: string) => {
    if (agentType === 'tool') {
      toast.error("Tool agent instructions cannot be modified");
      return;
    }
    
    const updatedInstructions = {
      ...builtInInstructions,
      [agentType]: instructions
    };
    
    setBuiltInInstructions(updatedInstructions);
    localStorage.setItem('built_in_agent_instructions', JSON.stringify(updatedInstructions));
    toast.success("Agent instructions updated successfully");
  };

  const handleUpdateCustomAgentInstructions = async (agentType: AgentType, instructions: string) => {
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
        <h3 className="text-xs font-semibold text-white/90">Agent Instructions</h3>
        
        {canEditInstructions && (
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
      
      <div className="text-xs text-gray-400 h-16 overflow-y-auto p-1.5 bg-[#0f141e] rounded border border-[#1e283a]">
        <p className="whitespace-pre-wrap">{agentInstructions}</p>
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
