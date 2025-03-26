
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskStatus, ConnectionStatus } from "@/hooks/browser-use/types";
import { 
  Globe, 
  Loader2, 
  Wifi, 
  WifiOff, 
  Upload, 
  Check, 
  AlertTriangle,
  ExternalLink,
  Clock,
  RefreshCw
} from "lucide-react";

interface TaskMonitorProps {
  currentTaskId: string | null;
  browserTaskId: string | null;
  taskStatus: TaskStatus;
  connectionStatus: ConnectionStatus;
  progress: number;
  currentUrl: string | null;
  liveUrl: string | null;
  screenshot: string | null;
  updateTaskStatus: () => void;
  isProcessing: boolean;
}

export function TaskMonitor({
  currentTaskId,
  browserTaskId,
  taskStatus,
  connectionStatus,
  progress,
  currentUrl,
  liveUrl,
  screenshot,
  updateTaskStatus,
  isProcessing
}: TaskMonitorProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Refresh lastUpdate when task status changes
  useEffect(() => {
    setLastUpdate(new Date());
  }, [taskStatus, connectionStatus]);
  
  // Format time since last update
  const getTimeSinceUpdate = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s ago`;
  };
  
  // Get status indicator config based on task status
  const getStatusIndicator = () => {
    // Cast the enum value to string for comparison
    const status = taskStatus as string;
    
    if (status === "created" || status === "pending") {
      return { 
        icon: <Clock className="h-4 w-4 text-yellow-500" />,
        label: "Pending",
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
      };
    }
    
    if (status === "running") {
      return { 
        icon: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
        label: "Running",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      };
    }
    
    if (status === "paused") {
      return { 
        icon: <Clock className="h-4 w-4 text-purple-500" />,
        label: "Paused",
        color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" 
      };
    }
    
    if (status === "completed") {
      return { 
        icon: <Check className="h-4 w-4 text-green-500" />,
        label: "Completed",
        color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      };
    }
    
    if (status === "failed" || status === "stopped" || status === "expired") {
      return { 
        icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
        label: taskStatus.charAt(0).toUpperCase() + taskStatus.slice(1),
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
      };
    }
    
    // Default case (for 'idle' or other undefined statuses)
    return { 
      icon: <Clock className="h-4 w-4 text-gray-500" />,
      label: status.charAt(0).toUpperCase() + status.slice(1),
      color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    };
  };
  
  // Get connection status indicator
  const getConnectionIndicator = () => {
    switch (connectionStatus) {
      case "connected":
        return { 
          icon: <Wifi className="h-4 w-4 text-green-500" />,
          label: "Connected",
          color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
        };
      case "connecting":
        return { 
          icon: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
          label: "Connecting",
          color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
        };
      case "checking":
        return { 
          icon: <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />,
          label: "Checking",
          color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
        };
      case "error":
        return { 
          icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
          label: "Error",
          color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
        };
      case "retry":
        return { 
          icon: <RefreshCw className="h-4 w-4 text-orange-500 animate-spin" />,
          label: "Retrying",
          color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
        };
      case "disconnected":
      default:
        return { 
          icon: <WifiOff className="h-4 w-4 text-gray-500" />,
          label: "Disconnected",
          color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
        };
    }
  };
  
  const statusIndicator = getStatusIndicator();
  const connectionIndicator = getConnectionIndicator();
  
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Task Monitor
          </h3>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={updateTaskStatus}
            disabled={isProcessing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isProcessing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Badge className={statusIndicator.color}>
                <span className="flex items-center gap-1">
                  {statusIndicator.icon}
                  {statusIndicator.label}
                </span>
              </Badge>
              
              <Badge className={connectionIndicator.color}>
                <span className="flex items-center gap-1">
                  {connectionIndicator.icon}
                  {connectionIndicator.label}
                </span>
              </Badge>
            </div>
            
            <span className="text-xs text-muted-foreground">
              Updated: {getTimeSinceUpdate()}
            </span>
          </div>
          
          <Progress value={progress} className="h-2" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-1">Task ID</p>
            <p className="font-mono text-xs truncate" title={currentTaskId || 'None'}>
              {currentTaskId ? currentTaskId.substring(0, 8) + '...' : 'None'}
            </p>
          </div>
          
          <div>
            <p className="text-muted-foreground text-xs mb-1">Browser ID</p>
            <p className="font-mono text-xs truncate" title={browserTaskId || 'None'}>
              {browserTaskId ? browserTaskId.substring(0, 8) + '...' : 'None'}
            </p>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Current URL</h4>
          <div className="p-2 bg-muted rounded-md flex items-center text-xs overflow-x-auto">
            <span className="truncate flex-1">{currentUrl || 'Not available'}</span>
            {currentUrl && (
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" asChild>
                <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </div>
        
        {liveUrl && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Live Control</h4>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Browser Control
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
