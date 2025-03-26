
// Update TaskControls to handle TaskStatus type correctly
import React from 'react';
import { Button } from "@/components/ui/button";
import { TaskStatus } from '@/hooks/browser-use/types';
import {
  Play,
  Pause,
  RotateCcw,
  StopCircle,
  AlertTriangle,
  CheckCircle,
  Loader2
} from "lucide-react";

interface TaskControlsProps {
  taskStatus: TaskStatus;
  isProcessing: boolean;
  taskInput: string;
  onStartTask: () => void;
  onPauseTask: () => void;
  onResumeTask: () => void;
  onStopTask: () => void;
}

export function TaskControls({
  taskStatus,
  isProcessing,
  taskInput,
  onStartTask,
  onPauseTask,
  onResumeTask,
  onStopTask
}: TaskControlsProps) {
  const handleStartTask = () => {
    if (!taskInput.trim()) {
      alert("Please enter a task description");
      return;
    }
    onStartTask();
  };

  // Helper to check if a status is in a list of valid statuses
  const statusIsOneOf = (status: TaskStatus, validStatuses: TaskStatus[]): boolean => {
    return validStatuses.includes(status);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Start Button */}
      {statusIsOneOf(taskStatus, ['pending', 'created', 'idle'] as TaskStatus[]) && (
        <Button 
          variant="default" 
          className="bg-green-600 hover:bg-green-700" 
          onClick={handleStartTask}
          disabled={isProcessing || !taskInput.trim()}
        >
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Start Task
        </Button>
      )}

      {/* Pause Button */}
      {taskStatus === 'running' && (
        <Button 
          variant="outline" 
          onClick={onPauseTask}
          disabled={isProcessing}
        >
          <Pause className="mr-2 h-4 w-4" />
          Pause
        </Button>
      )}

      {/* Resume Button */}
      {taskStatus === 'paused' && (
        <Button 
          variant="outline" 
          onClick={onResumeTask}
          disabled={isProcessing}
        >
          <Play className="mr-2 h-4 w-4" />
          Resume
        </Button>
      )}

      {/* Stop Button - available when task is running or paused */}
      {statusIsOneOf(taskStatus, ['running', 'paused'] as TaskStatus[]) && (
        <Button 
          variant="outline" 
          className="text-red-500 border-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950" 
          onClick={onStopTask}
          disabled={isProcessing}
        >
          <StopCircle className="mr-2 h-4 w-4" />
          Stop Task
        </Button>
      )}

      {/* Task Failed */}
      {taskStatus === 'failed' && (
        <div className="flex items-center text-red-500">
          <AlertTriangle className="mr-2 h-4 w-4" />
          <span>Task Failed</span>
        </div>
      )}

      {/* Task Completed */}
      {taskStatus === 'completed' && (
        <div className="flex items-center text-green-500">
          <CheckCircle className="mr-2 h-4 w-4" />
          <span>Task Completed</span>
        </div>
      )}

      {/* New Task Button - available when task is completed, failed, or stopped */}
      {statusIsOneOf(taskStatus, ['completed', 'failed', 'stopped', 'expired'] as TaskStatus[]) && (
        <Button 
          variant="outline" 
          onClick={() => {
            // Reset to a clean state for a new task
            window.location.reload();
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          New Task
        </Button>
      )}
    </div>
  );
}
