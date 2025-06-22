import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Camera } from "lucide-react";
import { toast } from "sonner";
import { useBrowserAutomation } from "@/hooks/computer-use/use-browser-automation";

interface BrowserAutomationAgentProps {
  
}

export const BrowserAutomationAgent = () => {
  const [taskDescription, setTaskDescription] = useState("");
  const {
    isProcessing,
    startSession,
    executeAction,
    clearSession,
    browserSessionConnected,
  } = useBrowserAutomation();

  const handleStartSession = async () => {
    if (!taskDescription.trim()) {
      toast.error("Please enter a task description");
      return;
    }

    try {
      await startSession();
      toast.success("Browser automation session started");
    } catch (error) {
      console.error("Failed to start session:", error);
      toast.error("Failed to start session");
    }
  };

  const canExecuteAction = () => {
    return Boolean(executeAction) && browserSessionConnected;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Browser Automation Agent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="task">Task Description</Label>
            <Input
              id="task"
              placeholder="Enter task description"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex gap-2">
        <Button
          onClick={handleStartSession}
          disabled={isProcessing || !taskDescription.trim()}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Start Browser Session"
          )}
        </Button>

        {canExecuteAction() && (
          <Button
            onClick={() => executeAction?.({ type: 'screenshot' })}
            variant="outline"
            disabled={isProcessing}
          >
            <Camera className="mr-2 h-4 w-4" />
            Screenshot
          </Button>
        )}

        {clearSession && (
          <Button
            onClick={clearSession}
            variant="destructive"
            disabled={isProcessing}
          >
            Clear Session
          </Button>
        )}
      </div>
    </div>
  );
};
