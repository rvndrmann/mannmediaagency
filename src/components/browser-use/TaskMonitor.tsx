
import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, CheckCircle, Clock, Loader2 } from "lucide-react";
import { TaskStatus } from '@/hooks/browser-use/types';

interface TaskMonitorProps {
  taskStatus: TaskStatus;
  browserTaskId: string | null;
  currentUrl: string | null;
  progress: number;
  elapsedTime: number;
}

export function TaskMonitor({
  taskStatus,
  browserTaskId,
  currentUrl,
  progress,
  elapsedTime
}: TaskMonitorProps) {
  // Format elapsed time as mm:ss
  const formatElapsedTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Helper to check if a status is in a list of valid statuses
  const statusIsOneOf = (status: TaskStatus, validStatuses: TaskStatus[]): boolean => {
    return validStatuses.includes(status);
  };

  // Get badge color based on status
  const getBadgeVariant = (status: TaskStatus) => {
    switch (status) {
      case 'running':
        return 'default';
      case 'paused':
        return 'outline';
      case 'completed':
        return 'success';
      case 'failed':
      case 'stopped':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Main content renderer
  const renderContent = () => {
    // If no task is running yet
    if (statusIsOneOf(taskStatus, ['created', 'pending', 'idle'] as TaskStatus[])) {
      return (
        <div className="py-6 flex items-center justify-center">
          <Clock className="h-6 w-6 text-muted-foreground mr-2" />
          <p className="text-muted-foreground text-sm font-medium">Waiting to start a task...</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 divide-y divide-border">
        <div className="py-3">
          <p className="text-sm font-medium mb-1">Status</p>
          <div className="flex items-center">
            <Badge variant={getBadgeVariant(taskStatus)} className="capitalize">
              {taskStatus === 'running' && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {taskStatus === 'completed' && <Check className="h-3 w-3 mr-1" />}
              {taskStatus}
            </Badge>
            {progress > 0 && progress < 100 && (
              <span className="text-sm ml-2">{progress}% Complete</span>
            )}
          </div>
        </div>

        {browserTaskId && (
          <div className="py-3">
            <p className="text-sm font-medium mb-1">Task ID</p>
            <p className="text-xs font-mono bg-gray-50 dark:bg-gray-800 p-1 rounded">
              {browserTaskId}
            </p>
          </div>
        )}

        <div className="py-3">
          <p className="text-sm font-medium mb-1">Elapsed Time</p>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
            <span>{formatElapsedTime(elapsedTime)}</span>
          </div>
        </div>

        {currentUrl && (
          <div className="py-3">
            <p className="text-sm font-medium mb-1">Current URL</p>
            <p className="text-xs truncate">
              {currentUrl}
            </p>
          </div>
        )}

        {taskStatus === 'completed' && (
          <div className="py-3 flex items-center text-green-600">
            <CheckCircle className="h-5 w-5 mr-2" />
            <p className="font-medium">Task completed successfully</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="h-full">
      <div className="p-4 border-b">
        <h3 className="text-lg font-medium">Task Monitor</h3>
      </div>
      <div className="p-4">
        {renderContent()}
      </div>
    </Card>
  );
}
