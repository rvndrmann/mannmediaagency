
import { Button } from "@/components/ui/button";
import { TaskStatus } from "@/hooks/browser-use/types";
import { Camera, Clipboard, Pause, Play, Power, RotateCw } from "lucide-react";
import { toast } from "sonner";

interface TaskControlsProps {
  taskStatus: TaskStatus;
  isProcessing: boolean;
  userCredits: number | null;
  onStart: () => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onStop: () => Promise<void>;
  onScreenshot?: () => Promise<void>;
  onRestart?: () => Promise<void>;
  error?: string | null;
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
  onRestart,
  error
}: TaskControlsProps) {
  const canStart = !isProcessing && taskStatus !== 'running';
  const canPause = isProcessing && taskStatus === 'running';
  const canResume = isProcessing && taskStatus === 'paused';
  const canStop = isProcessing && (taskStatus === 'running' || taskStatus === 'paused');
  const canScreenshot = Boolean(onScreenshot) && taskStatus === 'running' && isProcessing;
  const canRestart = Boolean(onRestart) && (taskStatus === 'failed' || taskStatus === 'stopped' || taskStatus === 'completed' || taskStatus === 'expired' || error?.includes('expired'));
  
  const copyTaskError = () => {
    if (!error) return;
    
    navigator.clipboard.writeText(error)
      .then(() => {
        toast.success("Error copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy error:", err);
        toast.error("Failed to copy error");
      });
  };
  
  return (
    <div className="flex flex-wrap gap-2 items-center justify-start">
      {canStart && (
        <Button 
          onClick={onStart}
          disabled={isProcessing || typeof userCredits !== 'number' || userCredits <= 0}
        >
          {!isProcessing && taskStatus === 'idle' ? 'Start Task' : 'New Task'}
        </Button>
      )}
      
      {canPause && (
        <Button
          variant="outline"
          onClick={onPause}
          disabled={!canPause}
        >
          <Pause className="h-4 w-4 mr-2" />
          Pause
        </Button>
      )}
      
      {canResume && (
        <Button
          variant="outline"
          onClick={onResume}
          disabled={!canResume}
        >
          <Play className="h-4 w-4 mr-2" />
          Resume
        </Button>
      )}
      
      {canStop && (
        <Button 
          variant="destructive"
          onClick={onStop}
          disabled={!canStop}
        >
          <Power className="h-4 w-4 mr-2" />
          Stop Task
        </Button>
      )}
      
      {canScreenshot && (
        <Button
          variant="outline"
          onClick={onScreenshot}
          disabled={!canScreenshot}
        >
          <Camera className="h-4 w-4 mr-2" />
          Capture
        </Button>
      )}
      
      {canRestart && (
        <Button
          variant="secondary"
          onClick={onRestart}
          disabled={isProcessing}
        >
          <RotateCw className="h-4 w-4 mr-2" />
          Restart Task
        </Button>
      )}
      
      {error && (
        <Button
          variant="outline"
          size="sm"
          onClick={copyTaskError}
          className="ml-auto"
        >
          <Clipboard className="h-4 w-4 mr-2" />
          Copy Error
        </Button>
      )}
      
      {typeof userCredits === 'number' && (
        <div className="ml-auto text-sm text-muted-foreground flex items-center gap-2">
          <span>Cost: 1 credit</span>
          <span>|</span>
          <span>Available: {userCredits.toFixed(0)} credits</span>
        </div>
      )}
    </div>
  );
}
