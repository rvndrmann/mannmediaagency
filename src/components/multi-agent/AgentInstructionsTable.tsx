import { AgentType } from "@/hooks/use-multi-agent-chat";
import { useCustomAgents } from "@/hooks/use-custom-agents";
import { useMemo } from "react";

// Define the agent instructions table props
interface AgentInstructionsTableProps {
  activeAgent: AgentType;
}

export const AgentInstructionsTable = ({ activeAgent }: AgentInstructionsTableProps) => {
  const { customAgents } = useCustomAgents();

  // Get the active agent instructions
  const agentInstructions = useMemo(() => {
    // First check if this is a custom agent
    const customAgent = customAgents.find(agent => agent.id === activeAgent);
    if (customAgent) {
      return customAgent.instructions;
    }

    // Otherwise look for built-in agent instructions
    const builtInInstructions: Record<string, string> = {
      main: `I am a helpful assistant that orchestrates specialized agents for creative content generation. I can help with scriptwriting, image prompt creation, and using tools for visual content creation. When a request would be better handled by a specialized agent, I'll hand off the conversation to that agent.`,
      
      script: `I am ScriptWriterAgent, specialized in creating compelling scripts, dialogue, and scene descriptions. I create content based solely on what the user requests. I'm creative, engaging, and tailor the tone to the user's requirements.`,
      
      image: `I am ImagePromptAgent, specialized in creating detailed, creative prompts for AI image generation. My prompts are specific, descriptive, and include details about style, mood, lighting, composition, and subject matter. I format output as a single prompt string that could be directly used for image generation.`,
      
      tool: `I am ToolOrchestratorAgent, specialized in determining which tool to use based on user requests. I help users create product images, convert images to videos, and more using the available tools in the system.`,
      
      scene: `I am SceneDescriptionAgent, specialized in creating vivid, detailed scene descriptions from images or text prompts. I describe scenes in rich detail, focusing on setting, atmosphere, and visual elements. I create immersive scene settings that could be used for scripts, stories, or visual productions. My descriptions are sensory-rich, capturing not just visuals but the feeling of being in the scene.`
    };
    
    return builtInInstructions[activeAgent] || "No instructions available for this agent.";
  }, [activeAgent, customAgents]);

  return (
    <div className="mb-4 p-3 bg-[#1a202c]/70 border border-[#2d374b] rounded-lg">
      <h3 className="text-sm font-semibold mb-2 text-white/90">Current Agent Instructions</h3>
      <div className="text-xs text-gray-400 h-32 overflow-y-auto p-2 bg-[#0f141e] rounded border border-[#1e283a]">
        <p className="whitespace-pre-wrap">{agentInstructions}</p>
      </div>
    </div>
  );
};
