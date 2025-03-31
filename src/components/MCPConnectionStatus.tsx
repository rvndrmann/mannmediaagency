
import React from "react";
import { useMCPContext } from "@/contexts/MCPContext";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function MCPConnectionStatus() {
  const { 
    connectionStatus, 
    hasConnectionError, 
    reconnectToMcp, 
    isConnecting,
    connectionMetrics,
    connectionStats
  } = useMCPContext();

  // Calculate health indicator
  const getHealthStatus = () => {
    if (connectionStatus === 'connected') {
      return "healthy";
    } else if (connectionStatus === 'connecting') {
      return "connecting";
    } else if (hasConnectionError) {
      return "error";
    } else {
      return "disconnected";
    }
  };

  const healthStatus = getHealthStatus();

  const getTotalClients = () => {
    return connectionStats?.totalClients || 0;
  };

  const getConnectedClients = () => {
    return connectionStats?.connectedClients || 0;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className={`
                flex items-center h-6 px-2 gap-1
                ${healthStatus === 'healthy' ? 'bg-green-900/20 text-green-500 border-green-800' : ''}
                ${healthStatus === 'connecting' ? 'bg-blue-900/20 text-blue-500 border-blue-800' : ''}
                ${healthStatus === 'error' ? 'bg-red-900/20 text-red-500 border-red-800' : ''}
                ${healthStatus === 'disconnected' ? 'bg-gray-900/20 text-gray-500 border-gray-800' : ''}
              `}
            >
              {healthStatus === 'healthy' && <Wifi className="h-3 w-3" />}
              {healthStatus === 'connecting' && <Loader2 className="h-3 w-3 animate-spin" />}
              {healthStatus === 'error' && <AlertCircle className="h-3 w-3" />}
              {healthStatus === 'disconnected' && <WifiOff className="h-3 w-3" />}
              
              <span className="text-xs">
                {healthStatus === 'healthy' && 'Connected'}
                {healthStatus === 'connecting' && 'Connecting...'}
                {healthStatus === 'error' && 'Connection Error'}
                {healthStatus === 'disconnected' && 'Disconnected'}
              </span>
              
              {getConnectedClients() > 0 && (
                <span className="ml-1 text-xs">
                  ({getConnectedClients()}/{getTotalClients()})
                </span>
              )}
            </Badge>
            
            {(healthStatus === 'error' || healthStatus === 'disconnected') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reconnectToMcp()}
                disabled={isConnecting}
                className="h-6 px-2 text-xs"
              >
                {isConnecting ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Wifi className="h-3 w-3 mr-1" />
                )}
                Reconnect
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="space-y-1 text-xs">
            <p className="font-medium">MCP Connection Status</p>
            <p>Status: {connectionStatus}</p>
            <p>Connected Clients: {getConnectedClients()}/{getTotalClients()}</p>
            {connectionMetrics && (
              <>
                <p>Success Rate: {connectionMetrics.successCount}/{connectionMetrics.successCount + connectionMetrics.failureCount}</p>
                <p>Avg Connect Time: {connectionMetrics.averageConnectTime.toFixed(0)}ms</p>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
