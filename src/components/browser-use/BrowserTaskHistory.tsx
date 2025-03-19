
import { useState, useEffect } from "react";
import { useTaskHistory } from "@/hooks/browser-use/use-task-history";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, Clock, XCircle, Pause, RotateCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function BrowserTaskHistory() {
  const { taskHistory, isLoading, error, fetchTaskHistory } = useTaskHistory();

  useEffect(() => {
    fetchTaskHistory();
  }, [fetchTaskHistory]);

  // Helper function to get badge variants based on status
  const getBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'failed':
      case 'expired':
        return 'destructive';
      case 'running':
        return 'default';
      case 'stopped':
        return 'secondary';
      case 'paused':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
      case 'expired':
        return <XCircle className="h-4 w-4" />;
      case 'running':
        return <RotateCw className="h-4 w-4 animate-spin" />;
      case 'stopped':
        return <XCircle className="h-4 w-4" />;
      case 'paused':
        return <Pause className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading && taskHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RotateCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchTaskHistory} variant="outline" className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (taskHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No task history found</p>
          <p className="text-sm text-muted-foreground mt-1">Run browser tasks to see your history here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Task History</h2>
        <Button variant="outline" size="sm" onClick={fetchTaskHistory}>
          Refresh
        </Button>
      </div>
      
      <ScrollArea className="h-[500px]">
        <div className="space-y-4 pr-4">
          {taskHistory.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div className="font-medium line-clamp-2">{task.task_input}</div>
                  <Badge variant={getBadgeVariant(task.status)} className="ml-2 flex items-center gap-1">
                    {getStatusIcon(task.status)}
                    <span>{task.status}</span>
                  </Badge>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {task.created_at && (
                    <span>
                      Started {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                    </span>
                  )}
                  {task.completed_at && (
                    <span className="ml-2">
                      • Completed {formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                
                {task.result_url && (
                  <div className="mt-2">
                    <a 
                      href={task.result_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View Recording
                    </a>
                  </div>
                )}
                
                {task.output && (
                  <div className="mt-2">
                    <Separator className="my-2" />
                    <details>
                      <summary className="text-sm font-medium cursor-pointer">
                        View Output
                      </summary>
                      <div className="mt-2 p-2 bg-muted rounded-md text-xs overflow-x-auto max-h-32">
                        <pre>{task.output}</pre>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
