
import { useEffect, useState } from "react";
import { useMCPContext } from "@/contexts/MCPContext";
import { MCPToolDefinition } from "@/types/mcp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Server, Sliders } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { MCPConnectionStatus } from "./MCPConnectionStatus";

interface McpToolsPanelProps {
  projectId?: string;
  onSelectTool?: (tool: MCPToolDefinition) => void;
}

export function McpToolsPanel({ projectId, onSelectTool }: McpToolsPanelProps) {
  const { mcpServers, useMcp, isConnecting, hasConnectionError, reconnectToMcp } = useMCPContext();
  const [tools, setTools] = useState<MCPToolDefinition[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  
  const fetchTools = async () => {
    if (!useMcp || mcpServers.length === 0 || hasConnectionError) {
      setTools([]);
      return;
    }
    
    setIsLoadingTools(true);
    
    try {
      const toolsList = await mcpServers[0].listTools();
      setTools(toolsList);
    } catch (error) {
      console.error("Error fetching MCP tools:", error);
      setTools([]);
    } finally {
      setIsLoadingTools(false);
    }
  };
  
  useEffect(() => {
    if (useMcp && mcpServers.length > 0 && !hasConnectionError) {
      fetchTools();
    } else {
      setTools([]);
    }
  }, [useMcp, mcpServers, hasConnectionError]);
  
  const handleRefresh = async () => {
    if (hasConnectionError) {
      await reconnectToMcp();
    } else {
      await fetchTools();
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="h-4 w-4" />
              MCP Tools
            </CardTitle>
            <CardDescription>
              Available Model Context Protocol tools
            </CardDescription>
          </div>
          
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            {isLoadingTools ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="pt-4">
        <div className="space-y-2 mb-4">
          <MCPConnectionStatus showConnectionDetails showAlert={hasConnectionError} />
        </div>
        
        {!useMcp ? (
          <div className="bg-muted p-4 rounded-md text-center text-sm text-muted-foreground">
            <p>MCP is currently disabled</p>
            <p className="mt-1">Enable MCP in settings to access advanced tools</p>
          </div>
        ) : isLoadingTools ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span>Loading available tools...</span>
          </div>
        ) : tools.length === 0 ? (
          <div className="bg-muted p-4 rounded-md text-center text-sm text-muted-foreground">
            <p>No MCP tools available</p>
            <p className="mt-1">Check connection status or try refreshing</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tools.map((tool) => (
              <div 
                key={tool.name} 
                className="border rounded-md p-3 hover:bg-accent cursor-pointer"
                onClick={() => onSelectTool && onSelectTool(tool)}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-sm">{tool.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    <Sliders className="h-3 w-3 mr-1" />
                    Tool
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                
                <div className="mt-2 flex flex-wrap gap-1">
                  {tool.parameters.required.map((param) => (
                    <Badge key={param} variant="secondary" className="text-xs">
                      {param}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
