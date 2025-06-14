
import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TaskStatus, TaskStep } from "@/hooks/browser-use/types";

interface TaskProgressProps {
  taskStatus: TaskStatus;
  taskSteps: TaskStep[];
  progress?: number;
}

export function TaskProgress({ taskStatus, taskSteps, progress }: TaskProgressProps) {
  const [currentProgress, setCurrentProgress] = useState(0);

  const statusMessages: Record<TaskStatus, string> = {
    pending: "Task is waiting to start...",
    created: "Task has been created...",
    running: "Task is currently running...",
    completed: "Task completed successfully!",
    failed: "Task failed to complete",
    stopped: "Task was stopped",
    paused: "Task is paused",
    expired: "Task has expired",
    idle: "Task is idle"
  };

  const statusColors: Record<TaskStatus, string> = {
    pending: "bg-yellow-500",
    created: "bg-blue-500",
    running: "bg-blue-500",
    completed: "bg-green-500",
    failed: "bg-red-500",
    stopped: "bg-orange-500",
    paused: "bg-yellow-500",
    expired: "bg-red-500",
    idle: "bg-gray-500"
  };

  useEffect(() => {
    if (progress !== undefined) {
      setCurrentProgress(progress);
    } else if (taskSteps.length > 0) {
      const completedSteps = taskSteps.filter(step => step.status === 'completed').length;
      const calculatedProgress = (completedSteps / taskSteps.length) * 100;
      setCurrentProgress(calculatedProgress);
    }
  }, [progress, taskSteps]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Task Progress</h3>
        <Badge className={statusColors[taskStatus]}>
          {taskStatus.charAt(0).toUpperCase() + taskStatus.slice(1)}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{statusMessages[taskStatus]}</span>
          <span>{Math.round(currentProgress)}%</span>
        </div>
        <Progress value={currentProgress} className="w-full" />
      </div>

      {taskSteps.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Steps</h4>
          <div className="space-y-1">
            {taskSteps.map((step, index) => (
              <div key={step.id || index} className="flex items-center space-x-2 text-sm">
                <Badge 
                  variant={step.status === 'completed' ? 'default' : 'secondary'}
                  className={
                    step.status === 'completed' ? 'bg-green-500' :
                    step.status === 'failed' ? 'bg-red-500' :
                    step.status === 'running' ? 'bg-blue-500' : 'bg-gray-500'
                  }
                >
                  {step.status}
                </Badge>
                <span>{step.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
