
import { useState } from "react";
import { Settings, Zap, MessageSquare, LayoutDashboard, Bug } from "lucide-react";
import { AgentSelector } from "./AgentSelector";
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AgentInstructionsTable } from "./AgentInstructionsTable";

interface MultiAgentChatHeaderProps {
  activeAgent: AgentType;
  onSwitchAgent: (agentType: AgentType) => void;
  onClearChat: () => void;
  usePerformanceModel: boolean;
  onTogglePerformanceMode: () => void;
  enableDirectToolExecution: boolean;
  onToggleDirectToolExecution: () => void;
  tracingEnabled: boolean;
  onToggleTracing: () => void;
  debugMode: boolean;
  onToggleDebugMode: () => void;
}

export const MultiAgentChatHeader = ({
  activeAgent,
  onSwitchAgent,
  onClearChat,
  usePerformanceModel,
  onTogglePerformanceMode,
  enableDirectToolExecution,
  onToggleDirectToolExecution,
  tracingEnabled,
  onToggleTracing,
  debugMode,
  onToggleDebugMode
}: MultiAgentChatHeaderProps) => {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div className="px-1 py-1.5 bg-[#1a202c] border-b border-[#2d374b]">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h2 className="text-white font-semibold text-sm mr-2 flex gap-1 items-center">
            <MessageSquare className="h-4 w-4 text-gray-400" /> 
            Multi-Agent Chat
          </h2>
          <a
            href="/trace-dashboard"
            className="ml-2 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            onClick={(e) => {
              e.preventDefault();
              setShowDashboard(true);
            }}
          >
            <LayoutDashboard className="h-3 w-3" /> Traces
          </a>
        </div>

        <div className="flex items-center gap-2">
          <AgentSelector
            activeAgent={activeAgent}
            onSelectAgent={onSwitchAgent}
            className="h-7"
          />

          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 rounded-md hover:bg-gray-800 focus:outline-none">
              <Settings className="h-4 w-4 text-gray-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-[#1a202c] text-white border-[#2d374b]">
              <DropdownMenuLabel className="text-xs font-normal text-gray-400">
                Chat Settings
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#2d374b]" />
              
              <div className="px-2 py-1.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">Performance Mode</span>
                    <span className="text-[10px] text-gray-400">
                      Faster responses (GPT-4o-mini)
                    </span>
                  </div>
                  <Switch
                    checked={usePerformanceModel}
                    onCheckedChange={onTogglePerformanceMode}
                    className="data-[state=checked]:bg-indigo-600"
                  />
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">Direct Tool Execution</span>
                    <span className="text-[10px] text-gray-400">
                      Any agent can use tools
                    </span>
                  </div>
                  <Switch
                    checked={enableDirectToolExecution}
                    onCheckedChange={onToggleDirectToolExecution}
                    className="data-[state=checked]:bg-indigo-600"
                  />
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">Tracing</span>
                    <span className="text-[10px] text-gray-400">
                      Record detailed telemetry
                    </span>
                  </div>
                  <Switch
                    checked={tracingEnabled}
                    onCheckedChange={onToggleTracing}
                    className="data-[state=checked]:bg-indigo-600"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium flex items-center gap-1">
                      Debug Mode <Bug className="h-3 w-3 text-amber-500" />
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Console logging for developers
                    </span>
                  </div>
                  <Switch
                    checked={debugMode}
                    onCheckedChange={onToggleDebugMode}
                    className="data-[state=checked]:bg-amber-600"
                  />
                </div>
              </div>
              
              <DropdownMenuSeparator className="bg-[#2d374b]" />
              <DropdownMenuItem 
                className="text-xs text-red-400 hover:text-red-300 focus:text-red-300 cursor-pointer"
                onClick={onClearChat}
              >
                Clear chat history
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AgentInstructionsTable activeAgent={activeAgent} />
    </div>
  );
};
