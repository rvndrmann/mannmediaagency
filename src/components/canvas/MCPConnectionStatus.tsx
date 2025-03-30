
import React from "react";
import { useMCPContext } from "@/contexts/MCPContext";
import { Button } from "@/components/ui/button";
import { RefreshCw, Server, ServerCrash, ServerOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function MCPConnectionStatus() {
  const { mcpServers, useMcp, isConnecting, hasConnectionError, reconnectToMcp } = useMCPContext();
  
  if (!useMcp) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ServerOff className="h-3.5 w-3.5" />
        <span>MCP Disabled</span>
      </div>
    );
  }
  
  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 text-xs text-yellow-500">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span>Connecting to MCP...</span>
      </div>
    );
  }
  
  if (hasConnectionError || mcpServers.length === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs text-red-500 hover:text-red-600 p-0 gap-1.5"
              onClick={() => reconnectToMcp()}
            >
              <ServerCrash className="h-3.5 w-3.5" />
              <span>Connection Error</span>
              <RefreshCw className="h-3 w-3 ml-1" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to reconnect to MCP services</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <div className="flex items-center gap-2 text-xs text-green-500">
      <Server className="h-3.5 w-3.5" />
      <span>MCP Connected</span>
    </div>
  );
}
