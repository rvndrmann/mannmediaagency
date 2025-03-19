
import { Progress } from "@/components/ui/progress";
import { TaskStatus, TaskStep } from "@/hooks/browser-use/types";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, CheckCircle2, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TaskProgressProps {
  progress: number;
  status: TaskStatus;
  steps: TaskStep[];
  currentUrl: string | null;
}

export function TaskProgress({ progress, status, steps, currentUrl }: TaskProgressProps) {
  const getStatusColor = (status: TaskStatus) => {
    switch(status) {
      case 'running': return 'bg-blue-500';
      case 'finished':
      case 'completed': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'failed': 
      case 'stopped': return 'bg-red-500';
      case 'pending':
      case 'created':
      case 'idle':
      default: return 'bg-gray-500';
    }
  };
  
  const getStatusText = (status: TaskStatus): string => {
    switch(status) {
      case 'running': return 'Running';
      case 'finished': return 'Finished';
      case 'completed': return 'Completed';
      case 'paused': return 'Paused';
      case 'failed': return 'Failed';
      case 'stopped': return 'Stopped';
      case 'pending': return 'Pending';
      case 'created': return 'Created';
      case 'idle': return 'Idle';
      default: 
        // Ensure we handle the string properly by type checking
        if (typeof status === 'string') {
          return status.charAt(0).toUpperCase() + status.slice(1);
        }
        return 'Unknown';
    }
  };
  
  const getStepIcon = (stepStatus: 'pending' | 'completed' | 'failed') => {
    switch(stepStatus) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': 
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-medium">Task Progress</div>
        <Badge className={getStatusColor(status)}>
          {getStatusText(status)}
        </Badge>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      {currentUrl && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 overflow-hidden">
          <span className="font-medium whitespace-nowrap">Current URL:</span>
          <div className="flex items-center gap-1 truncate">
            <span className="truncate">{currentUrl}</span>
            <a 
              href={currentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="shrink-0 text-blue-500 hover:text-blue-600"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
      
      {steps.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Steps</div>
          <ScrollArea className="h-[200px] rounded-md border p-2">
            <div className="space-y-2">
              {steps.map((step) => (
                <div 
                  key={step.id} 
                  className="flex items-start gap-2 p-2 rounded-md border bg-card"
                >
                  <div className="mt-0.5 shrink-0">
                    {getStepIcon(step.status)}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-medium text-sm">{step.description}</div>
                    {step.details && (
                      <div className="text-xs text-muted-foreground mt-1 break-words">
                        {step.details}
                      </div>
                    )}
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
