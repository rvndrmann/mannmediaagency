
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TaskStep } from "@/hooks/browser-use/types";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface TaskProgressProps {
  progress: number;
  currentUrl: string | null;
  taskSteps: TaskStep[];
  taskStatus: 'idle' | 'created' | 'running' | 'paused' | 'finished' | 'failed' | 'stopped';
}

export function TaskProgress({
  progress,
  currentUrl,
  taskSteps,
  taskStatus
}: TaskProgressProps) {
  const getStatusColor = () => {
    switch(taskStatus) {
      case 'running': return 'bg-blue-500';
      case 'paused': return 'bg-amber-500';
      case 'finished': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'stopped': return 'bg-gray-500';
      case 'created': return 'bg-purple-500';
      default: return 'bg-blue-500';
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Task Progress</h3>
        <Badge 
          variant="outline" 
          className={`capitalize ${
            taskStatus === 'running' ? 'text-blue-500' :
            taskStatus === 'paused' ? 'text-amber-500' :
            taskStatus === 'finished' ? 'text-green-500' :
            taskStatus === 'failed' ? 'text-red-500' :
            taskStatus === 'created' ? 'text-purple-500' :
            'text-gray-500'
          }`}
        >
          {taskStatus}
        </Badge>
      </div>
      
      <Progress value={progress} className={getStatusColor()} />
      
      <div className="text-right text-xs text-muted-foreground">
        {progress}% Complete
      </div>
      
      {currentUrl && (
        <div className="text-sm">
          <span className="font-medium">Current URL:</span> {currentUrl}
        </div>
      )}
      
      {taskSteps.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Task Steps</h4>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {taskSteps.map((step) => (
                <div 
                  key={step.id} 
                  className={`p-3 rounded-md text-sm ${
                    step.status === 'completed' ? 'bg-green-50 border border-green-100 dark:bg-green-950/20 dark:border-green-900/30' :
                    step.status === 'running' ? 'bg-blue-50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30' :
                    step.status === 'failed' ? 'bg-red-50 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30' :
                    'bg-gray-50 border border-gray-100 dark:bg-gray-800/50 dark:border-gray-700'
                  }`}
                >
                  <div className="flex justify-between">
                    <div>{step.description}</div>
                    <Badge 
                      variant="outline" 
                      className={`capitalize ${
                        step.status === 'completed' ? 'text-green-500' :
                        step.status === 'running' ? 'text-blue-500' :
                        step.status === 'failed' ? 'text-red-500' :
                        'text-gray-500'
                      }`}
                    >
                      {step.status}
                    </Badge>
                  </div>
                  {step.details && <div className="mt-1 text-xs text-gray-500">{step.details}</div>}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
