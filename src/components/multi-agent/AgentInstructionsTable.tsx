
import { Bot, PenLine, Image, Wrench, FileText } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AgentInstructionsTableProps {
  activeAgent: string;
}

export const AgentInstructionsTable = ({ activeAgent }: AgentInstructionsTableProps) => {
  const agents = [
    {
      id: "main",
      name: "Assistant",
      icon: <Bot className="h-4 w-4" />,
      description: "General AI assistant",
      capabilities: [
        "Answers general questions",
        "Provides information on various topics",
        "Routes requests to specialized agents when needed",
        "Offers guidance on how to use the system"
      ],
      instructions: "You are a helpful assistant. You analyze user requests and either answer them directly or route to specialized agents."
    },
    {
      id: "script",
      name: "Script Writer",
      icon: <PenLine className="h-4 w-4" />,
      description: "Creates scripts and narratives",
      capabilities: [
        "Writes ad scripts and marketing copy",
        "Creates narratives and stories",
        "Develops dialogue and characters",
        "Formats scripts professionally"
      ],
      instructions: "You are a script writer specializing in creating compelling narratives, dialogue, and creative content."
    },
    {
      id: "image",
      name: "Image Prompt",
      icon: <Image className="h-4 w-4" />,
      description: "Creates AI image prompts",
      capabilities: [
        "Generates detailed image prompts",
        "Helps visualize concepts",
        "Creates style and composition descriptions",
        "Optimizes prompts for AI image generators"
      ],
      instructions: "You create detailed image generation prompts that will produce high-quality results."
    },
    {
      id: "tool",
      name: "Tool Helper",
      icon: <Wrench className="h-4 w-4" />,
      description: "Guides on using tools",
      capabilities: [
        "Explains tool functionality",
        "Provides usage examples",
        "Troubleshoots tool issues",
        "Recommends appropriate tools for tasks"
      ],
      instructions: "You help users understand and effectively use the various tools available in the system."
    },
    {
      id: "scene",
      name: "Scene Creator",
      icon: <FileText className="h-4 w-4" />,
      description: "Creates detailed scenes",
      capabilities: [
        "Crafts rich visual descriptions",
        "Develops settings and environments",
        "Creates atmosphere and mood",
        "Describes locations with sensory details"
      ],
      instructions: "You create detailed visual scenes with rich descriptions for settings, atmospheres, and visual elements."
    }
  ];

  return (
    <div className="bg-[#21283B]/60 backdrop-blur-sm rounded-xl border border-white/10 mb-4 p-4 shadow-lg">
      <h3 className="text-white text-lg font-medium mb-3">Agent Instructions</h3>
      <Table className="border border-white/10 rounded-lg overflow-hidden">
        <TableHeader className="bg-[#2D3240]">
          <TableRow>
            <TableHead className="text-white w-[120px]">Agent</TableHead>
            <TableHead className="text-white">Description</TableHead>
            <TableHead className="text-white">Capabilities</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow key={agent.id} className={activeAgent === agent.id ? "bg-[#3A4252]" : "hover:bg-[#2D3240]"}>
              <TableCell className="font-medium text-white flex items-center gap-2">
                <div className={`p-1 rounded-full ${activeAgent === agent.id ? "bg-gradient-to-r from-blue-500 to-indigo-500" : "bg-[#21283B]"}`}>
                  {agent.icon}
                </div>
                {agent.name}
                {activeAgent === agent.id && (
                  <Badge className="ml-1 bg-gradient-to-r from-blue-500 to-indigo-500">Active</Badge>
                )}
              </TableCell>
              <TableCell className="text-gray-300">{agent.description}</TableCell>
              <TableCell>
                <ul className="list-disc space-y-1 pl-5 text-gray-300 text-sm">
                  {agent.capabilities.map((capability, i) => (
                    <li key={i}>{capability}</li>
                  ))}
                </ul>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
