
import React from "react";
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

export function MCPConnectionStatus({ 
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
    setUseMcp
  } = useMCPContext();
  
  const handleReconnect = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    reconnectToMcp();
    
    // Show feedback toast via MCPContext
  };
  
  // Fix the type issue by making this function accept either button or div events
  const handleDisableMcp = (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setUseMcp(false);
  };
  
  const renderStatus = () => {
    if (!useMcp) {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ServerOff className="h-3.5 w-3.5" />
          <span>MCP Disabled</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 ml-1 text-xs p-0"
            onClick={handleReconnect}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      );
    }
    
    if (isConnecting) {
      return (
        <div className="flex items-center gap-2 text-xs text-yellow-500">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>{compact ? "Connecting..." : "Connecting to MCP..."}</span>
          {!compact && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 ml-1 text-xs p-0"
              onClick={handleDisableMcp}
            >
              <BanIcon className="h-3 w-3" />
            </Button>
          )}
        </div>
      );
    }
    
    if (hasConnectionError || mcpServers.length === 0) {
      return (
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-red-500 hover:text-red-600 p-0 gap-1.5"
                  onClick={handleReconnect}
                >
                  <ServerCrash className="h-3.5 w-3.5" />
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
                <Button variant="ghost" size="sm" className="h-7 p-0 ml-1">
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
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-xs text-green-500">
          <Server className="h-3.5 w-3.5" />
          <span>{compact ? "Connected" : "MCP Connected"}</span>
        </div>
        
        {showConnectionDetails && mcpServers.length > 0 && (
          <Badge variant="outline" className="ml-2 text-xs gap-1">
            <Shield className="h-3 w-3" />
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
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            MCP connection error. Some AI features may be limited. 
            <div className="flex space-x-2 mt-1">
              <Button 
                variant="outline" 
                size="sm"
                className="h-7 text-xs"
                onClick={handleReconnect}
              >
                Try reconnecting
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                className="h-7 text-xs"
                onClick={handleDisableMcp}
              >
                Use fallback mode
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
