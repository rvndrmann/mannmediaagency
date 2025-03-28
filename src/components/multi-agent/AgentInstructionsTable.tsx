
import { Button } from "@/components/ui/button";
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { Edit } from "lucide-react";

interface AgentInstructionsTableProps {
  activeAgent: AgentType;
  agentInstructions: Record<AgentType, string>;
  onEditInstructions: (agentType: AgentType) => void;
}

export function AgentInstructionsTable({ 
  activeAgent, 
  agentInstructions,
  onEditInstructions
}: AgentInstructionsTableProps) {
  const getDefaultInstructions = (agentType: AgentType): string => {
    switch(agentType) {
      case 'main':
        return "You are a helpful AI assistant that can analyze user requests and provide assistance or delegate to specialized agents.";
      case 'script':
        return "You are a professional script writer who can create compelling narratives, ad scripts, and other written content.";
      case 'image':
        return "You are an expert at creating detailed image prompts for generating visual content.";
      case 'tool':
        return "You are a technical tool specialist. Guide users through using various tools and APIs.";
      case 'scene':
        return "You are a scene creation expert. Help users visualize and describe detailed environments and settings.";
      default:
        return "Default instructions for an AI assistant.";
    }
  };

  // Get the actual instructions to display (user-defined or default)
  const getDisplayInstructions = (agentType: AgentType): string => {
    if (agentInstructions[agentType]) {
      return agentInstructions[agentType];
    }
    return getDefaultInstructions(agentType);
  };

  // Format instructions to show just a preview (first 100 characters)
  const formatInstructions = (instructions: string): string => {
    if (instructions.length <= 100) return instructions;
    return instructions.substring(0, 100) + "...";
  };

  return (
    <div className="mb-2 bg-[#21283B]/80 rounded-lg border border-white/10 p-3 text-white/90 shadow-md">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">Agent Instructions</h3>
        <p className="text-xs text-white/60">Click edit to customize agent behavior</p>
      </div>
      
      <div className="overflow-auto max-h-32 text-sm">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 text-xs text-white/70">
              <th className="py-1 px-2 w-20">Agent</th>
              <th className="py-1 px-2">Instructions</th>
              <th className="py-1 px-2 w-14 text-right">Edit</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {(['main', 'script', 'image', 'tool', 'scene'] as AgentType[]).map((agentType) => (
              <tr 
                key={agentType}
                className={`border-b border-white/10 hover:bg-white/5 ${activeAgent === agentType ? 'bg-white/10' : ''}`}
              >
                <td className="py-1 px-2 font-medium">
                  {agentType.charAt(0).toUpperCase() + agentType.slice(1)}
                </td>
                <td className="py-1 px-2 text-white/80">
                  {formatInstructions(getDisplayInstructions(agentType))}
                </td>
                <td className="py-1 px-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditInstructions(agentType)}
                    className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
