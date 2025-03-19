
import { Button } from "@/components/ui/button";
import { Play, Pause, Square } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCredits } from "@/hooks/browser-use/types";

export interface TaskControlsProps {
  taskInput: string;
  setTaskInput: (input: string) => void;
  startTask: () => void;
  pauseTask: () => void;
  resumeTask: () => void;
  stopTask: () => void;
  isProcessing: boolean;
  taskStatus: 'idle' | 'running' | 'paused' | 'finished' | 'failed' | 'stopped';
  userCredits: UserCredits | null;
  error: string | null;
}

export function TaskControls({ 
  taskInput,
  setTaskInput,
  startTask, 
  pauseTask, 
  resumeTask, 
  stopTask,
  isProcessing,
  taskStatus,
  userCredits,
  error
}: TaskControlsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Task Instructions</h3>
      
      <Textarea
        placeholder="Enter task instructions (e.g., 'Go to google.com and search for AI news')"
        value={taskInput}
        onChange={(e) => setTaskInput(e.target.value)}
        className="min-h-[100px]"
        disabled={isProcessing && ['running', 'paused'].includes(taskStatus)}
      />
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex gap-2">
        {taskStatus === 'idle' || taskStatus === 'finished' || taskStatus === 'failed' || taskStatus === 'stopped' ? (
          <Button 
            onClick={startTask}
            disabled={isProcessing || !taskInput.trim() || (userCredits && userCredits.credits_remaining < 1)}
            className="flex-1"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Task {userCredits && `(${userCredits.credits_remaining} credits)`}
          </Button>
        ) : null}
        
        {taskStatus === 'running' ? (
          <Button 
            onClick={pauseTask}
            disabled={isProcessing && taskStatus !== 'running'}
            variant="outline"
            className="flex-1"
          >
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>
        ) : taskStatus === 'paused' ? (
          <Button 
            onClick={resumeTask}
            disabled={isProcessing && taskStatus !== 'paused'}
            variant="outline"
            className="flex-1"
          >
            <Play className="h-4 w-4 mr-2" />
            Resume
          </Button>
        ) : null}
        
        {['running', 'paused'].includes(taskStatus) && (
          <Button 
            onClick={stopTask}
            disabled={!['running', 'paused'].includes(taskStatus)}
            variant="destructive"
            className="flex-1"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
        )}
      </div>
    </div>
  );
}
