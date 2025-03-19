
import { Button } from "@/components/ui/button";
import { Play, Pause, Square } from "lucide-react";

interface TaskControlsProps {
  taskStatus: 'idle' | 'running' | 'paused' | 'finished' | 'failed' | 'stopped';
  pauseTask: () => void;
  resumeTask: () => void;
  stopTask: () => void;
  isProcessing: boolean;
}

export function TaskControls({ 
  taskStatus, 
  pauseTask, 
  resumeTask, 
  stopTask, 
  isProcessing 
}: TaskControlsProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Task Controls</h3>
      <div className="flex gap-2">
        {taskStatus === 'running' ? (
          <Button 
            onClick={pauseTask}
            disabled={isProcessing || taskStatus !== 'running'}
            variant="outline"
            className="flex-1"
          >
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>
        ) : (
          <Button 
            onClick={resumeTask}
            disabled={isProcessing || taskStatus !== 'paused'}
            variant="outline"
            className="flex-1"
          >
            <Play className="h-4 w-4 mr-2" />
            Resume
          </Button>
        )}
        
        <Button 
          onClick={stopTask}
          disabled={isProcessing || !['running', 'paused'].includes(taskStatus)}
          variant="destructive"
          className="flex-1"
        >
          <Square className="h-4 w-4 mr-2" />
          Stop
        </Button>
      </div>
    </div>
  );
}
