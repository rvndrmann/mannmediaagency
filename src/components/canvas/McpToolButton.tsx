
import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { useMCPContext } from "@/contexts/MCPContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface McpToolButtonProps {
  label: string;
  toolName: string;
  icon?: React.ReactNode;
  isProcessing?: boolean;
  disabled?: boolean;
  onClick: () => Promise<void>;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showConnectionState?: boolean;
}

export function McpToolButton({
  label,
  toolName,
  icon,
  isProcessing = false,
  disabled = false,
  onClick,
  variant = "default",
  size = "default",
  className = "",
  showConnectionState = true
}: McpToolButtonProps) {
  const { useMcp, hasConnectionError, isConnecting, reconnectToMcp } = useMCPContext();
  const [isRetrying, setIsRetrying] = React.useState(false);
  
  // Handle button click with connection check
  const handleClick = async () => {
    // If MCP is enabled but has connection error, try to reconnect first
    if (useMcp && hasConnectionError) {
      setIsRetrying(true);
      try {
        const success = await reconnectToMcp();
        if (success) {
          // Successful reconnection, proceed with original action
          await onClick();
        }
      } catch (error) {
        console.error("Error reconnecting to MCP:", error);
      } finally {
        setIsRetrying(false);
      }
    } else {
      await onClick();
    }
  };
  
  // Check if button should be disabled
  const isDisabled = disabled || isProcessing || isRetrying || (useMcp && hasConnectionError && isConnecting);
  
  // Show MCP status indicator if needed
  const showMcpStatus = showConnectionState && useMcp;
  
  // Determine what icon to show
  const renderIcon = () => {
    if (isProcessing || isRetrying) {
      return <Loader2 className="h-4 w-4 mr-2 animate-spin" />;
    }
    
    if (icon) {
      return <span className="mr-2">{icon}</span>;
    }
    
    return null;
  };
  
  // Handle direct reconnect attempt
  const handleReconnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsRetrying(true);
    try {
      await reconnectToMcp();
    } finally {
      setIsRetrying(false);
    }
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={isDisabled}
            onClick={handleClick}
            className={className}
          >
            {renderIcon()}
            
            {label}
            
            {showMcpStatus && (
              hasConnectionError ? (
                <div className="ml-2 flex items-center">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  {!isDisabled && (
                    <RefreshCw 
                      className="h-3 w-3 ml-1 cursor-pointer hover:text-primary"
                      onClick={handleReconnect}
                    />
                  )}
                </div>
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 ml-2 text-green-500" />
              )
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isProcessing ? (
            `Processing ${toolName}...`
          ) : isRetrying ? (
            "Reconnecting to MCP..."
          ) : hasConnectionError ? (
            "MCP connection error. Click to reconnect and try again."
          ) : (
            `Run ${toolName} with MCP`
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
