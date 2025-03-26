
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { TaskStatus } from "@/hooks/browser-use/types";
import { AlertCircle, CheckCircle, Clock, Loader2, PauseCircle, XCircle } from "lucide-react";

interface TaskMonitorProps {
  taskStatus: TaskStatus;
  progress: number;
  error: string | null;
  isProcessing: boolean;
  taskOutput: string | null;
}

export function TaskMonitor({
  taskStatus,
  progress,
  error,
  isProcessing,
  taskOutput
}: TaskMonitorProps) {
  const getStatusBadge = () => {
    switch (taskStatus) {
      case "running":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Running</span>
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="success" className="bg-green-500 text-white flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>Completed</span>
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            <span>Failed</span>
          </Badge>
        );
      case "paused":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <PauseCircle className="h-3 w-3" />
            <span>Paused</span>
          </Badge>
        );
      case "stopped":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            <span>Stopped</span>
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Expired</span>
          </Badge>
        );
      case "pending":
      case "created":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Pending</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Idle</span>
          </Badge>
        );
    }
  };

  return (
    <Card className="p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Task Status</h3>
        {getStatusBadge()}
      </div>

      <div className="space-y-4 flex-1">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {taskStatus === 'idle' && (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <p>No active task</p>
              <p className="text-sm">Enter a task description and click Start to begin</p>
            </div>
          </div>
        )}

        {taskOutput && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Task Output</h4>
            <div className="bg-muted p-3 rounded-md max-h-40 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap">{taskOutput}</pre>
            </div>
          </div>
        )}
        
        <div className="text-sm text-muted-foreground mt-auto pt-4">
          <p>Each task execution costs 1 credit. Credits are deducted when you start or restart a task.</p>
        </div>
      </div>
    </Card>
  );
}
