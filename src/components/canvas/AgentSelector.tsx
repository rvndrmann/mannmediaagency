
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Bot, 
  PenLine, 
  Image as ImageIcon, 
  Wrench, 
  FileText, 
  Database 
} from "lucide-react";
import { useState } from "react";
import { getAgentIcon } from "@/lib/agent-icons";

interface AgentSelectorProps {
  onChange?: (value: string) => void;
  defaultValue?: string;
}

export function AgentSelector({ onChange, defaultValue = "main" }: AgentSelectorProps) {
  const [selectedAgent, setSelectedAgent] = useState(defaultValue);
  
  const handleValueChange = (value: string) => {
    setSelectedAgent(value);
    if (onChange) {
      onChange(value);
    }
  };

  const getAgentIconComponent = (agentId: string) => {
    switch (agentId) {
      case "main": return <Bot className="h-4 w-4 text-primary" />;
      case "script": return <PenLine className="h-4 w-4 text-indigo-500" />;
      case "image": return <ImageIcon className="h-4 w-4 text-orange-500" />;
      case "data": return <Database className="h-4 w-4 text-cyan-500" />;
      case "tool": return <Wrench className="h-4 w-4 text-blue-500" />;
      case "scene": return <FileText className="h-4 w-4 text-green-500" />;
      default: return <Bot className="h-4 w-4 text-primary" />;
    }
  };
  
  return (
    <Select 
      defaultValue={selectedAgent}
      onValueChange={handleValueChange}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select agent" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="main" className="flex items-center">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span>Main Assistant</span>
            </div>
          </SelectItem>
          <SelectItem value="script">
            <div className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-indigo-500" />
              <span>Script Writer</span>
            </div>
          </SelectItem>
          <SelectItem value="image">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-orange-500" />
              <span>Image Generator</span>
            </div>
          </SelectItem>
          <SelectItem value="data">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-500" />
              <span>Data Agent</span>
            </div>
          </SelectItem>
          <SelectItem value="tool">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-blue-500" />
              <span>Tool Assistant</span>
            </div>
          </SelectItem>
          <SelectItem value="scene">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              <span>Scene Generator</span>
            </div>
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
