
import React from "react";
import { useMCPContext } from "@/contexts/MCPContext";
import { Button } from "@/components/ui/button";
import { RefreshCw, Server, ServerCrash, ServerOff } from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface MCPConnectionStatusProps {
  className?: string;
  showConnectionDetails?: boolean;
  showAlert?: boolean;
  showStats?: boolean;
}

export function MCPConnectionStatus({ 
  className,
  showConnectionDetails = false,
  showAlert = false,
  showStats = false
}: MCPConnectionStatusProps) {
  const { 
    connectionStatus, 
    reconnectToMcp, 
    isConnecting,
    hasConnectionError,
    connectionStats
  } = useMCPContext();

  // Connection indicator color based on status
  const getStatusColor = () => {
    if (connectionStatus === 'connected') return "text-green-500";
    if (connectionStatus === 'connecting') return "text-yellow-500";
    if (connectionStatus === 'error' || hasConnectionError) return "text-red-500";
    return "text-gray-500"; // disconnected
  };

  // Connection indicator icon based on status
  const getStatusIcon = () => {
    if (connectionStatus === 'connected') return <Server className="h-4 w-4" />;
    if (connectionStatus === 'connecting') return <Server className="h-4 w-4 animate-pulse" />;
    if (connectionStatus === 'error' || hasConnectionError) return <ServerCrash className="h-4 w-4" />;
    return <ServerOff className="h-4 w-4" />; // disconnected
  };

  // Connection status text
  const getStatusText = () => {
    if (connectionStatus === 'connected') return "Connected";
    if (connectionStatus === 'connecting') return "Connecting...";
    if (connectionStatus === 'error' || hasConnectionError) return "Connection error";
    return "Disconnected";
  };

  // Get detailed connection info
  const getConnectionInfo = () => {
    const { totalClients, connectedClients, lastConnectionAttempt } = connectionStats;
    const timeSinceLastAttempt = lastConnectionAttempt > 0 
      ? Math.round((Date.now() - lastConnectionAttempt) / 1000) 
      : 0;
    
    return (
      <div className="text-xs">
        <div>Clients: {connectedClients}/{totalClients} connected</div>
        {lastConnectionAttempt > 0 && (
          <div>Last attempt: {timeSinceLastAttempt}s ago</div>
        )}
      </div>
    );
  };

  // Reconnect handler
  const handleReconnect = async () => {
    await reconnectToMcp();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1.5 ${className}`}>
            <span className={`flex items-center gap-1 text-xs ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className={showConnectionDetails ? "inline" : "hidden sm:inline"}>
                {getStatusText()}
              </span>
              {showStats && connectionStatus === 'connected' && (
                <Badge variant="outline" className="ml-1 text-[10px] py-0 h-4">
                  {connectionStats.connectedClients}/{connectionStats.totalClients}
                </Badge>
              )}
            </span>
            {(connectionStatus === 'disconnected' || connectionStatus === 'error' || hasConnectionError) && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleReconnect}
                disabled={isConnecting}
                className="h-6 w-6 rounded-full"
              >
                <RefreshCw className={`h-3 w-3 ${isConnecting ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">
            {connectionStatus === 'connected' && "Connected to MCP server"}
            {connectionStatus === 'connecting' && "Connecting to MCP server..."}
            {connectionStatus === 'error' && "Error connecting to MCP server. Click to retry."}
            {connectionStatus === 'disconnected' && "Not connected to MCP server. Click to connect."}
          </p>
          {showStats && getConnectionInfo()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
