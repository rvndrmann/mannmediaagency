
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface TaskProgressProps {
  progress: number;
  taskStatus: 'idle' | 'running' | 'paused' | 'finished' | 'failed' | 'stopped';
}

export function TaskProgress({
  progress,
  taskStatus
}: TaskProgressProps) {
  const getStatusColor = () => {
    switch(taskStatus) {
      case 'running': return 'bg-blue-500';
      case 'paused': return 'bg-amber-500';
      case 'finished': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'stopped': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Task Progress</h3>
        <Badge 
          variant="outline" 
          className="capitalize"
        >
          {taskStatus}
        </Badge>
      </div>
      <Progress value={progress} className={getStatusColor()} />
      <div className="text-right text-xs text-muted-foreground">
        {progress}% Complete
      </div>
    </div>
  );
}
