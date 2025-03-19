
import { TaskStatus, TaskStep } from "@/hooks/browser-use/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface TaskOutputProps {
  output: string | null;
  taskSteps: TaskStep[];
  taskStatus: TaskStatus;
}

export function TaskOutput({ output, taskSteps, taskStatus }: TaskOutputProps) {
  const getStatusBadge = (status: TaskStatus) => {
    switch(status) {
      case 'finished':
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      case 'stopped':
        return <Badge className="bg-orange-500">Stopped</Badge>;
      case 'running':
        return <Badge className="bg-blue-500">Running</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500">Paused</Badge>;
      case 'pending':
      case 'created':
      case 'idle':
      default:
        return <Badge className="bg-gray-500">Pending</Badge>;
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Task Result</h3>
        {getStatusBadge(taskStatus)}
      </div>
      
      {['running', 'pending', 'created', 'paused'].includes(taskStatus) && (
        <div className="flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Task in progress...</p>
          </div>
        </div>
      )}
      
      {['finished', 'completed'].includes(taskStatus) && output && (
        <div className="rounded-md border p-4 bg-muted/50">
          <div className="flex gap-2 items-center mb-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="font-medium">Task Completed</span>
          </div>
          <ScrollArea className="h-[300px] w-full">
            <pre className="text-sm whitespace-pre-wrap break-words p-2">{output}</pre>
          </ScrollArea>
        </div>
      )}
      
      {['failed', 'stopped'].includes(taskStatus) && (
        <Alert variant={taskStatus === 'failed' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {taskStatus === 'failed' 
              ? "Task failed to complete. Check the logs below for details." 
              : "Task was manually stopped."}
          </AlertDescription>
        </Alert>
      )}
      
      {!output && ['finished', 'completed', 'failed', 'stopped'].includes(taskStatus) && (
        <div className="bg-muted rounded-md p-4">
          <p className="text-muted-foreground text-sm">No output available.</p>
        </div>
      )}
      
      {output && ['failed', 'stopped'].includes(taskStatus) && (
        <div className="rounded-md border p-4 bg-muted/50">
          <ScrollArea className="h-[300px] w-full">
            <pre className="text-sm whitespace-pre-wrap break-words p-2">{output}</pre>
          </ScrollArea>
        </div>
      )}
      
      {taskSteps.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">Task Steps</h4>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {taskSteps.map((step) => (
                <div key={step.id} className="p-3 rounded-md border bg-card">
                  <div className="flex items-start">
                    <Badge 
                      className={`mr-2 ${
                        step.status === 'completed' ? 'bg-green-500' : 
                        step.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                      }`}
                    >
                      {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{step.description}</p>
                      {step.details && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {step.details}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
