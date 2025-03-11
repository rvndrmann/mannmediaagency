
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AISettingsDialogProps {
  useAssistantsApi: boolean;
  setUseAssistantsApi: (value: boolean) => void;
  useMcp: boolean;
  setUseMcp: (value: boolean) => void;
}

export function AISettingsDialog({
  useAssistantsApi,
  setUseAssistantsApi,
  useMcp,
  setUseMcp,
}: AISettingsDialogProps) {
  const handleAssistantsChange = (checked: boolean) => {
    setUseAssistantsApi(checked);
    if (checked) {
      setUseMcp(false);
    }
  };

  const handleMcpChange = (checked: boolean) => {
    setUseMcp(checked);
    if (checked) {
      setUseAssistantsApi(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI Engine Settings</DialogTitle>
          <DialogDescription>
            Configure which AI backend to use for chat responses
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label htmlFor="use-langflow" className="text-base">Use Langflow</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-xs">
                      Default engine based on Langflow. Works with standard OpenAI models but uses your custom knowledge base.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="use-langflow"
              checked={!useAssistantsApi && !useMcp}
              onCheckedChange={(checked) => {
                if (checked) {
                  setUseAssistantsApi(false);
                  setUseMcp(false);
                }
              }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label htmlFor="use-assistants" className="text-base">Use OpenAI Assistants</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-xs">
                      Use OpenAI Assistants API. Provides advanced capabilities like function calling but requires configuration in OpenAI.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="use-assistants"
              checked={useAssistantsApi}
              onCheckedChange={handleAssistantsChange}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label htmlFor="use-mcp" className="text-base">Use Model Context Protocol (MCP)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="max-w-xs">
                      Use Model Context Protocol (MCP) server. Enables AI to access your data sources and tools directly.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="use-mcp"
              checked={useMcp}
              onCheckedChange={handleMcpChange}
            />
          </div>
          
          <div className="px-3 py-2 border border-yellow-500/20 bg-yellow-500/10 rounded-md">
            <p className="text-sm text-yellow-300">
              Note: Switching between AI engines may require administrator setup. Consult documentation for required environment variables.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
