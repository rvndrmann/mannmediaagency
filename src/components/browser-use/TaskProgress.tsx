
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TaskStatus, TaskStep } from "@/hooks/browser-use/types";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskProgressProps {
  progress: number;
  status: TaskStatus;
  steps: TaskStep[];
  currentUrl: string | null;
}

export function TaskProgress({ progress, status, steps, currentUrl }: TaskProgressProps) {
  const [expanded, setExpanded] = useState(false);
  
  const statusColorMap: Record<TaskStatus, string> = {
    idle: "text-gray-500",
    pending: "text-blue-500",
    created: "text-blue-500",
    running: "text-green-500",
    paused: "text-yellow-500",
    failed: "text-red-500",
    stopped: "text-orange-500",
    finished: "text-purple-500",
    completed: "text-emerald-500"
  };
  
  const statusColor = statusColorMap[status] || "text-gray-500";
  
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="font-medium">Status: </span>
            <span className={statusColor}>{
              // Capitalize the first letter of the status
              typeof status === 'string' && status.length > 0 
                ? status.charAt(0).toUpperCase() + status.slice(1) 
                : 'Unknown'
            }</span>
          </div>
          <div className="text-sm text-gray-500">Progress: {Math.round(progress)}%</div>
        </div>
        
        <Progress value={progress} className="mb-4" />
        
        {currentUrl && (
          <div className="text-sm mb-2 flex items-center gap-1 text-gray-700">
            <span>Current URL:</span>
            <a 
              href={currentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline flex items-center"
            >
              {currentUrl.length > 45 ? `${currentUrl.substring(0, 45)}...` : currentUrl}
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
        )}
        
        {steps.length > 0 && (
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleExpanded}
              className="flex items-center justify-between w-full"
            >
              <span>Task Steps ({steps.length})</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {expanded && (
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {steps.map((step) => (
                  <div key={step.id} className="p-2 border rounded text-sm">
                    <div className="flex justify-between">
                      <div className="font-medium">{step.description}</div>
                      <div className={
                        step.status === 'completed' ? 'text-green-500' : 
                        step.status === 'failed' ? 'text-red-500' : 'text-blue-500'
                      }>
                        {step.status}
                      </div>
                    </div>
                    {step.details && <div className="text-gray-600 mt-1">{step.details}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
