
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TaskMonitorProps {
  taskStatus: string;
  progress: number;
  error: string | null;
  isProcessing: boolean;
  taskOutput: string | null;
  environment: 'browser' | 'desktop';
}

export function TaskMonitor({ 
  taskStatus, 
  progress, 
  error, 
  isProcessing, 
  taskOutput,
  environment
}: TaskMonitorProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <span>Task Monitor</span>
          {taskStatus !== 'idle' && (
            <Badge 
              className={`
                ${taskStatus === 'running' ? 'bg-blue-500' : ''} 
                ${taskStatus === 'completed' ? 'bg-green-500' : ''} 
                ${taskStatus === 'stopped' || taskStatus === 'failed' || taskStatus === 'expired' ? 'bg-red-500' : ''} 
                ${taskStatus === 'paused' ? 'bg-yellow-500' : ''}
              `}
            >
              {taskStatus.charAt(0).toUpperCase() + taskStatus.slice(1)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col pb-4 pt-0">
        {isProcessing ? (
          <div className="space-y-4 h-full flex flex-col">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="space-y-2 flex-grow overflow-hidden flex flex-col">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Task Output</span>
                <span className="text-xs text-muted-foreground">
                  {environment === "browser" ? "Browser" : "Desktop"} Automation
                </span>
              </div>
              <ScrollArea className="flex-grow border rounded-md p-3 bg-muted/10 text-sm">
                {taskOutput ? (
                  <pre className="whitespace-pre-wrap font-mono text-xs">{taskOutput}</pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-center p-4">
                    <div>
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Executing {environment === "browser" ? "browser" : "desktop"} task...
                      </p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="rounded-full bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Ready</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Start a task to see live progress and results for your {environment === "browser" ? "browser" : "desktop"} automation
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
