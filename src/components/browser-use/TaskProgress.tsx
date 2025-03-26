
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskStatus, TaskStep } from "@/hooks/browser-use/types";
import { 
  Check,
  Clock,
  Play,
  AlertCircle,
  RotateCcw,
  Hourglass,
  PauseCircle
} from "lucide-react";

interface TaskProgressProps {
  taskStatus: TaskStatus;
  steps: TaskStep[];
  progress: number;
}

export function TaskProgress({ taskStatus, steps, progress }: TaskProgressProps) {
  // Status badge configurations
  const statusConfigs: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    running: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    paused: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    stopped: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    expired: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    created: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    idle: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  };

  // Status icon configurations
  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Hourglass size={16} />,
    running: <Play size={16} />,
    paused: <PauseCircle size={16} />,
    stopped: <RotateCcw size={16} />,
    completed: <Check size={16} />,
    failed: <AlertCircle size={16} />,
    expired: <Clock size={16} />,
    created: <Hourglass size={16} />,
    idle: <Clock size={16} />
  };

  // Get icon for current status
  const StatusIcon = () => {
    // Cast taskStatus to string to ensure compatibility with statusIcons keys
    const status = taskStatus as string;
    const IconComponent = statusIcons[status] || statusIcons.idle;
    return IconComponent;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <h3 className="text-md font-medium">Task Progress</h3>
          <Badge className={`${statusConfigs[taskStatus as string]} flex items-center gap-1`}>
            <StatusIcon />
            <span className="capitalize">{taskStatus}</span>
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground">{progress}%</span>
      </div>

      <Progress value={progress} className="h-2" />

      {steps.length > 0 ? (
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {steps.map((step, index) => {
              // Make sure step has an id or use index
              const stepId = step.id || `step-${index}`;
              
              return (
                <div key={stepId} className="relative pl-6 pb-4">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700"></div>
                  <div className={`absolute left-[-4px] top-1 w-2 h-2 rounded-full ${
                    step.status === 'completed' ? 'bg-green-500' : 
                    step.status === 'failed' ? 'bg-red-500' : 
                    step.status === 'running' ? 'bg-blue-500' : 
                    'bg-gray-300 dark:bg-gray-600'
                  }`}></div>
                  
                  <div className="space-y-1">
                    <div className="flex items-start">
                      <span className="text-sm font-medium mr-2">Step {step.step}:</span>
                      <span className="text-sm flex-1">{step.description || step.next_goal}</span>
                    </div>
                    
                    {step.evaluation_previous_goal && (
                      <p className="text-xs text-muted-foreground">{step.evaluation_previous_goal}</p>
                    )}
                    
                    {step.details && (
                      <p className="text-xs text-gray-500 mt-1 italic">{step.details}</p>
                    )}
                  </div>
                  
                  {index < steps.length - 1 && <Separator className="mt-4" />}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      ) : (
        <div className="py-8 text-center text-muted-foreground text-sm">
          <p>No steps recorded yet.</p>
          <p>Task steps will appear here as they are executed.</p>
        </div>
      )}
    </div>
  );
}
