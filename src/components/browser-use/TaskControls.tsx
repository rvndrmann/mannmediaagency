
import { Button } from "@/components/ui/button";
import { TaskStatus } from "@/hooks/browser-use/types";
import { Loader2, Play, Pause, RefreshCw, Camera, Square } from "lucide-react";
import { UserCredits } from "@/hooks/browser-use/types";

interface TaskControlsProps {
  taskStatus: TaskStatus;
  isProcessing: boolean;
  userCredits: UserCredits | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onScreenshot: () => void;
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
  const creditsRemaining = userCredits?.credits_remaining || 0;
  const hasCredits = creditsRemaining > 0;
  
  return (
    <div className="flex flex-wrap gap-2">
      {!isProcessing && (
        <Button 
          onClick={onStart} 
          disabled={!hasCredits || !!error}
          className="flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          Start Task
        </Button>
      )}
      
      {isProcessing && taskStatus === 'running' && (
        <Button 
          onClick={onPause}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Pause className="h-4 w-4" />
          Pause
        </Button>
      )}
      
      {isProcessing && taskStatus === 'paused' && (
        <Button 
          onClick={onResume}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          Resume
        </Button>
      )}
      
      {isProcessing && ['running', 'paused'].includes(taskStatus) && (
        <Button 
          onClick={onStop}
          variant="destructive"
          className="flex items-center gap-2"
        >
          <Square className="h-4 w-4" />
          Stop
        </Button>
      )}
      
      {isProcessing && taskStatus === 'running' && (
        <Button 
          onClick={onScreenshot}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <Camera className="h-4 w-4" />
          Screenshot
        </Button>
      )}
      
      {!hasCredits && (
        <div className="text-sm text-amber-500 mt-2">
          You have 0 credits remaining. Please purchase credits to use this feature.
        </div>
      )}
      
      {isProcessing && ['pending', 'created'].includes(taskStatus) && (
        <div className="flex items-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Initializing browser session...
        </div>
      )}
    </div>
  );
}
