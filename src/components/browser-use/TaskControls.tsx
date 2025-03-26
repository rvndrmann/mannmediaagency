
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { TaskStatus } from "@/hooks/browser-use/types";
import { Loader2, Play, Square, PauseCircle, RotateCcw, Save } from "lucide-react";

interface TaskControlsProps {
  taskInput: string;
  setTaskInput: (input: string) => void;
  startTask: () => void;
  pauseTask: () => void;
  resumeTask: () => void;
  stopTask: () => void;
  isProcessing: boolean;
  taskStatus: TaskStatus;
  userCredits?: number;
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
  userCredits = 0
}: TaskControlsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Helper to check if task is in an active state
  const isTaskActive = () => {
    const activeStatuses: TaskStatus[] = ['running', 'paused'];
    return activeStatuses.includes(taskStatus);
  };
  
  // Helper to check if task can be started
  const canStartTask = () => {
    const inactiveStatuses: TaskStatus[] = ['pending', 'stopped', 'completed', 'failed', 'expired', 'created', 'idle'];
    return inactiveStatuses.includes(taskStatus) && !isProcessing && taskInput.trim().length > 0 && userCredits > 0;
  };
  
  // Helper to check if task can be paused
  const canPauseTask = () => {
    return taskStatus === 'running' && !isProcessing;
  };
  
  // Helper to check if task can be resumed
  const canResumeTask = () => {
    return taskStatus === 'paused' && !isProcessing;
  };
  
  return (
    <Card className={`p-4 transition-all duration-300 ${isCollapsed ? 'max-h-16' : 'max-h-96'}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Task Controls</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? 'Expand' : 'Collapse'}
          </Button>
        </div>
        
        {!isCollapsed && (
          <>
            <div className="space-y-2">
              <label htmlFor="taskInput" className="text-sm font-medium">Task Description</label>
              <Textarea
                id="taskInput"
                placeholder="Describe what you want the browser to do..."
                className="min-h-24"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                disabled={isTaskActive() || isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                Be specific about the websites to visit and actions to perform.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={startTask}
                disabled={!canStartTask()}
                className="flex-1"
              >
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" /> Start Task</>
                )}
              </Button>
              
              {isTaskActive() && (
                <>
                  {canPauseTask() && (
                    <Button
                      variant="outline"
                      onClick={pauseTask}
                      disabled={isProcessing}
                    >
                      <PauseCircle className="h-4 w-4 mr-2" /> Pause
                    </Button>
                  )}
                  
                  {canResumeTask() && (
                    <Button
                      variant="outline"
                      onClick={resumeTask}
                      disabled={isProcessing}
                    >
                      <Play className="h-4 w-4 mr-2" /> Resume
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={stopTask}
                    disabled={isProcessing}
                  >
                    <Square className="h-4 w-4 mr-2" /> Stop
                  </Button>
                </>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>Credits: {userCredits.toFixed(2)}</span>
              <span>1 credit per task</span>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
