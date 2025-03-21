
import { Card } from "@/components/ui/card";
import { BUILT_IN_AGENT_TYPES } from "@/hooks/use-multi-agent-chat";

interface AgentInstructionsTableProps {
  activeAgent: string;
}

export const AgentInstructionsTable = ({ activeAgent }: AgentInstructionsTableProps) => {
  const agentInstructions = [
    {
      id: "main",
      name: "Main Assistant",
      description: "General-purpose AI assistant",
      instructions: "You are a helpful AI assistant that can answer questions on a wide range of topics and assist with various tasks."
    },
    {
      id: "script",
      name: "Script Writer",
      description: "Creates scripts, dialogue, and narratives",
      instructions: "You are a creative script writer specializing in creating engaging dialogue, narratives, and scripts. Help users craft compelling stories and scripts."
    },
    {
      id: "image",
      name: "Image Prompt",
      description: "Creates detailed prompts for AI image generation",
      instructions: "You are an expert at creating detailed image prompts for AI image generators. Help users craft detailed descriptions that will produce high-quality images."
    },
    {
      id: "tool",
      name: "Tool Orchestrator",
      description: "Helps users access and use platform tools",
      instructions: "You are a tool specialist that helps users utilize the platform's tools effectively. You can access tools like image generators, browser automation, and video creation."
    },
    {
      id: "scene",
      name: "Scene Description",
      description: "Creates vivid scene descriptions",
      instructions: "You are specialized in creating vivid, detailed scene descriptions for visual content. You help users paint pictures with words."
    }
  ];

  // Tool instructions, not agents
  const toolInstructions = [
    {
      id: "browser",
      name: "Browser Automation Tool",
      description: "Automates browser tasks",
      instructions: "This is a tool for automating browser tasks. It can navigate websites, fill forms, extract data, and perform various web automation tasks. Use the Tool Orchestrator agent to access this tool."
    },
    {
      id: "product-video",
      name: "Product Video Tool",
      description: "Creates product videos",
      instructions: "This is a tool for creating professional product videos. It can generate videos showcasing products with various styles and templates. Use the Tool Orchestrator agent to access this tool."
    },
    {
      id: "custom-video",
      name: "Custom Video Request Tool",
      description: "Submit custom video creation requests",
      instructions: "This is a tool for submitting custom video creation requests. You can describe what kind of video you want created, and our team will make it for you. Use the Tool Orchestrator agent to access this tool."
    }
  ];

  const isBuiltInAgent = BUILT_IN_AGENT_TYPES.includes(activeAgent);
  const isToolAgent = activeAgent === "tool";
  
  // Get relevant instructions based on active agent or tool
  const currentAgentInfo = agentInstructions.find(agent => agent.id === activeAgent);
  
  return (
    <Card className="p-4 mb-4 bg-[#1f2639]/80 border-white/10 text-white/90">
      <h3 className="font-medium mb-2 text-sm">
        {isToolAgent ? "Tool Agent Instructions" : "Agent Instructions"}
      </h3>
      
      {currentAgentInfo && (
        <div className="space-y-2">
          <p className="text-xs opacity-90">{currentAgentInfo.instructions}</p>
        </div>
      )}
      
      {isToolAgent && (
        <div className="mt-4 space-y-3">
          <h4 className="text-xs font-semibold text-purple-400">Available Tools:</h4>
          <div className="grid grid-cols-1 gap-3">
            {toolInstructions.map(tool => (
              <div key={tool.id} className="p-2 bg-[#2a304c]/60 rounded border border-white/5">
                <h5 className="text-xs font-medium">{tool.name}</h5>
                <p className="text-[10px] mt-1 opacity-80">{tool.instructions}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!currentAgentInfo && !isToolAgent && (
        <p className="text-xs opacity-70">
          This is a custom agent. Custom agents are created by users and can be tailored for specific tasks.
        </p>
      )}
    </Card>
  );
};
