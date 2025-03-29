
import { Bot, FileText, Image, Wrench, PenSquare, Database } from 'lucide-react';
import { type AgentType } from '@/hooks/use-multi-agent-chat';

/**
 * Get the icon component for a given agent type
 */
export function getAgentIcon(agentId: string, className: string = "") {
  const agentType = agentId as AgentType;
  
  switch (agentType) {
    case 'main':
      return <Bot className={className} />;
    case 'script':
      return <FileText className={className} />;
    case 'image':
      return <Image className={className} />;
    case 'tool':
      return <Wrench className={className} />;
    case 'scene':
      return <PenSquare className={className} />;
    case 'data':
      return <Database className={className} />;
    default:
      return <Bot className={className} />;
  }
}

/**
 * Get the display name for a given agent type
 */
export function getAgentName(agentType: AgentType): string {
  switch (agentType) {
    case "main": return "Main Assistant";
    case "script": return "Script Writer";
    case "image": return "Image Generator";
    case "tool": return "Tool Specialist";
    case "scene": return "Scene Creator";
    case "data": return "Data Agent";
    default: return "Assistant";
  }
}

/**
 * Get the color for a given agent type
 */
export function getAgentColor(agentType: AgentType): string {
  switch (agentType) {
    case "main": return "from-blue-400 to-indigo-500";
    case "script": return "from-amber-400 to-orange-500";
    case "image": return "from-emerald-400 to-green-500";
    case "tool": return "from-purple-400 to-violet-500";
    case "scene": return "from-rose-400 to-pink-500";
    case "data": return "from-cyan-400 to-blue-500";
    default: return "from-gray-400 to-gray-500";
  }
}
