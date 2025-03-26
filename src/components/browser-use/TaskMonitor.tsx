
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertTriangle, CheckCircle, Monitor, Laptop } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskStatus } from "@/hooks/browser-use/types";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TaskMonitorProps {
  taskStatus: TaskStatus;
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
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base font-medium flex items-center">
          {environment === 'browser' ? (
            <><Monitor className="mr-2 h-4 w-4" /> Browser Task Status</>
          ) : (
            <><Laptop className="mr-2 h-4 w-4" /> Desktop Task Status</>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Status: <span className="font-medium capitalize">{taskStatus}</span></span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div>
          <h4 className="text-sm font-medium mb-2">
            {isProcessing ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                <span>{environment === 'browser' ? 'Browser' : 'Desktop'} automation in progress...</span>
              </div>
            ) : taskStatus === 'completed' ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="mr-2 h-3 w-3" />
                <span>Task completed</span>
              </div>
            ) : (
              <span>Task output:</span>
            )}
          </h4>
          
          <ScrollArea className="h-[200px] border rounded-md p-2 bg-gray-50">
            {taskOutput ? (
              <div className="whitespace-pre-wrap text-sm font-mono">
                {taskOutput}
              </div>
            ) : isProcessing ? (
              <div className="text-sm text-muted-foreground p-2">
                {environment === 'browser' 
                  ? 'Browser task is running...' 
                  : 'Desktop task is running...'}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground p-2">
                {environment === 'browser'
                  ? 'Browser automation output will appear here.'
                  : 'Desktop automation output will appear here.'}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
