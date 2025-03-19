
import { Progress } from "@/components/ui/progress";
import { TaskStep, TaskStatus } from "@/hooks/browser-use/types";
import { Badge } from "@/components/ui/badge";
import { Calendar, Globe } from "lucide-react";

interface TaskProgressProps {
  progress: number;
  status: TaskStatus;
  steps: TaskStep[];
  currentUrl: string | null;
}

export function TaskProgress({ progress, status, steps, currentUrl }: TaskProgressProps) {
  const latestSteps = steps.slice(-3).reverse();
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Progress: {Math.round(progress)}%</div>
        <Badge variant={
          status === 'running' ? 'default' :
          status === 'paused' ? 'outline' :
          status === 'finished' || status === 'completed' ? 'success' :
          'secondary'
        }>
          {status}
        </Badge>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      {currentUrl && (
        <div className="flex items-center text-sm text-muted-foreground">
          <Globe className="h-4 w-4 mr-2" />
          <span className="truncate">{currentUrl}</span>
        </div>
      )}
      
      {latestSteps.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Latest Steps:</div>
          <ul className="space-y-1">
            {latestSteps.map((step) => (
              <li key={step.id} className="text-sm flex items-start">
                <Badge 
                  variant={
                    step.status === 'completed' ? 'success' :
                    step.status === 'failed' ? 'destructive' :
                    'outline'
                  }
                  className="mr-2 mt-0.5"
                >
                  {step.status}
                </Badge>
                <div className="flex-1">
                  <div>{step.description}</div>
                  {step.details && (
                    <div className="text-xs text-muted-foreground mt-1">{step.details}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
