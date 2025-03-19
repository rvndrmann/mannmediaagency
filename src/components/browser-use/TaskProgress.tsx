
import { Progress } from "@/components/ui/progress";
import { TaskStep } from "@/hooks/browser-use/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TaskProgressProps {
  progress: number;
  status: string;
  steps: TaskStep[];
  currentUrl?: string | null;
}

export function TaskProgress({ progress, status, steps, currentUrl }: TaskProgressProps) {
  const sortedSteps = [...steps].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  // Format the timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          Task Progress
          <span className="text-sm font-normal">
            {progress.toFixed(0)}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={progress} className="h-2 mb-4" />
        
        {currentUrl && (
          <div className="text-sm text-muted-foreground mb-4 truncate">
            Current URL: <span className="font-mono">{currentUrl}</span>
          </div>
        )}
        
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {sortedSteps.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                {status === 'running' ? (
                  <p>Task is running, waiting for steps...</p>
                ) : status === 'pending' || status === 'created' ? (
                  <p>Task is starting up...</p>
                ) : (
                  <p>No steps recorded yet</p>
                )}
              </div>
            ) : (
              sortedSteps.map((step) => (
                <div 
                  key={step.id} 
                  className={`border rounded-md p-3 transition-all ${
                    step.status === 'completed' 
                      ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900' 
                      : step.status === 'failed'
                      ? 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900'
                      : 'border-gray-200 bg-gray-50 dark:bg-gray-900/20 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {step.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : step.status === 'failed' ? (
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    )}
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{step.description}</p>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatTime(step.created_at)}
                        </span>
                      </div>
                      
                      {step.details && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {step.details}
                        </p>
                      )}
                      
                      {step.screenshot && (
                        <img 
                          src={step.screenshot} 
                          alt="Step screenshot" 
                          className="w-full h-auto mt-2 rounded-md border border-border"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
