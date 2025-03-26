
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
  FileText 
} from "lucide-react";

export function AgentSelector() {
  return (
    <Select defaultValue="main">
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
