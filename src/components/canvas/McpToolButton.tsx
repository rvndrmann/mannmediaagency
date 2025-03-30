
import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
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
  const { useMcp, hasConnectionError, reconnectToMcp } = useMCPContext();
  
  // Handle button click with connection check
  const handleClick = async () => {
    // If MCP is enabled but has connection error, try to reconnect first
    if (useMcp && hasConnectionError) {
      const success = await reconnectToMcp();
      if (!success) {
        return; // Don't proceed if reconnection failed
      }
    }
    
    await onClick();
  };
  
  // Check if button should be disabled
  const isDisabled = disabled || isProcessing || (useMcp && hasConnectionError);
  
  // Show MCP status indicator if needed
  const showMcpStatus = showConnectionState && useMcp;
  
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
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : icon ? (
              <span className="mr-2">{icon}</span>
            ) : null}
            
            {label}
            
            {showMcpStatus && (
              hasConnectionError ? (
                <AlertCircle className="h-3.5 w-3.5 ml-2 text-red-500" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 ml-2 text-green-500" />
              )
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isProcessing ? (
            `Processing ${toolName}...`
          ) : hasConnectionError ? (
            "MCP connection error. Click to reconnect."
          ) : (
            `Run ${toolName} with MCP`
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
