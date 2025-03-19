
import { Button } from "@/components/ui/button";
import { UserCredits } from "@/hooks/browser-use/types";
import { Play, Pause, Square, Download, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useEffect } from "react";

interface TaskControlsProps {
  taskInput?: string;
  setTaskInput?: (input: string) => void;
  taskStatus: string;
  isProcessing: boolean;
  userCredits: UserCredits | null;
  onStart: () => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onStop: () => Promise<void>;
  onScreenshot?: () => Promise<void>;
  error: string | null;
}

export function TaskControls({
  taskStatus,
  isProcessing,
  userCredits,
  onStart,
  onPause,
  onResume,
  onStop,
  onScreenshot,
  error
}: TaskControlsProps) {
  const { toast } = useToast();
  
  // Show error toast if error exists
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive"
      });
    }
  }, [error, toast]);
  
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center space-x-4">
        {/* Status badge */}
        <Badge 
          variant={
            taskStatus === 'running' ? 'default' :
            taskStatus === 'paused' ? 'outline' :
            taskStatus === 'completed' || taskStatus === 'finished' ? 'success' :
            taskStatus === 'failed' || taskStatus === 'stopped' ? 'destructive' :
            'secondary'
          }
          className="text-xs capitalize px-2 py-1"
        >
          {taskStatus}
        </Badge>
        
        {/* Credits display */}
        {userCredits && (
          <Badge variant="outline" className="ml-auto">
            Credits: {userCredits.total_remaining}
          </Badge>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {/* Start button */}
        {!isProcessing && (taskStatus === 'idle' || taskStatus === 'failed' || taskStatus === 'stopped' || taskStatus === 'finished' || taskStatus === 'completed') && (
          <Button 
            onClick={onStart}
            disabled={isProcessing || (userCredits && userCredits.total_remaining <= 0)}
            className="w-full sm:w-auto"
          >
            <Play className="mr-2 h-4 w-4" />
            Start Task
          </Button>
        )}
        
        {/* Resume button */}
        {taskStatus === 'paused' && (
          <Button 
            onClick={onResume}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Play className="mr-2 h-4 w-4" />
            Resume
          </Button>
        )}
        
        {/* Pause button */}
        {taskStatus === 'running' && (
          <Button 
            onClick={onPause}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
        )}
        
        {/* Stop button */}
        {(taskStatus === 'running' || taskStatus === 'paused') && (
          <Button 
            onClick={onStop}
            variant="destructive"
            className="w-full sm:w-auto"
          >
            <Square className="mr-2 h-4 w-4" />
            Stop
          </Button>
        )}
        
        {/* Screenshot button */}
        {onScreenshot && (
          <Button 
            onClick={onScreenshot}
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={!isProcessing && taskStatus !== 'paused'}
          >
            <Camera className="mr-2 h-4 w-4" />
            Screenshot
          </Button>
        )}
      </div>
    </div>
  );
}
