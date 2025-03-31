
import React, { memo, useCallback } from "react";
import { useMCPContext } from "@/contexts/MCPContext";
import { Button } from "@/components/ui/button";
import { RefreshCw, Server, ServerCrash, ServerOff, Shield, AlertCircle, ChevronDown, BanIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MCPConnectionStatusProps {
  compact?: boolean;
  showConnectionDetails?: boolean;
  showAlert?: boolean;
}

export const MCPConnectionStatus = memo(function MCPConnectionStatus({ 
  compact = false, 
  showConnectionDetails = false,
  showAlert = false
}: MCPConnectionStatusProps) {
  const { 
    mcpServers, 
    useMcp, 
    isConnecting, 
    hasConnectionError, 
    reconnectToMcp,
    setUseMcp,
    lastReconnectAttempt,
    connectionStatus
  } = useMCPContext();
  
  // Memoize event handlers to prevent unnecessary re-renders
  const handleReconnect = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    reconnectToMcp();
  }, [reconnectToMcp]);
  
  const handleDisableMcp = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUseMcp(false);
  }, [setUseMcp]);
  
  // Extracted status rendering to improve readability
  const renderStatus = () => {
    if (!useMcp) {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status" aria-live="polite">
          <ServerOff className="h-3.5 w-3.5" aria-hidden="true" />
          <span>MCP Disabled</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 ml-1 text-xs p-0"
            onClick={handleReconnect}
            aria-label="Enable MCP"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      );
    }
    
    if (isConnecting) {
      return (
        <div className="flex items-center gap-2 text-xs text-yellow-500" role="status" aria-live="polite">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          <span>{compact ? "Connecting..." : "Connecting to MCP..."}</span>
          {!compact && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 ml-1 text-xs p-0"
              onClick={handleDisableMcp}
              aria-label="Cancel connection and disable MCP"
            >
              <BanIcon className="h-3 w-3" />
            </Button>
          )}
        </div>
      );
    }
    
    if (hasConnectionError || mcpServers.length === 0) {
      return (
        <div className="flex items-center" role="alert" aria-live="assertive">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-red-500 hover:text-red-600 p-0 gap-1.5"
                  onClick={handleReconnect}
                  aria-label="MCP connection error, click to reconnect"
                >
                  <ServerCrash className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{compact ? "Error" : "Connection Error"}</span>
                  <RefreshCw className="h-3 w-3 ml-1" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to reconnect to MCP services</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {!compact && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 p-0 ml-1" aria-label="MCP connection options">
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDisableMcp}>
                  Switch to fallback mode
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleReconnect}>
                  Try reconnecting
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2" role="status">
        <div className="flex items-center gap-2 text-xs text-green-500">
          <Server className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{compact ? "Connected" : "MCP Connected"}</span>
        </div>
        
        {showConnectionDetails && mcpServers.length > 0 && (
          <Badge variant="outline" className="ml-2 text-xs gap-1">
            <Shield className="h-3 w-3" aria-hidden="true" />
            <span>Secure</span>
          </Badge>
        )}
      </div>
    );
  };
  
  return (
    <>
      {renderStatus()}
      
      {showAlert && hasConnectionError && (
        <Alert variant="destructive" className="mt-2" role="alert" aria-live="assertive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            MCP connection error. Some AI features may be limited. 
            <div className="flex space-x-2 mt-1">
              <Button 
                variant="outline" 
                size="sm"
                className="h-7 text-xs"
                onClick={handleReconnect}
                aria-label="Try reconnecting to MCP services"
              >
                Try reconnecting
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                className="h-7 text-xs"
                onClick={handleDisableMcp}
                aria-label="Use fallback mode without MCP"
              >
                Use fallback mode
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
});
