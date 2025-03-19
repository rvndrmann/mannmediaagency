
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { TaskStep } from "@/hooks/browser-use/types";

export interface TaskOutputProps {
  output: string | null;
  taskSteps: TaskStep[];
  taskStatus?: 'idle' | 'created' | 'running' | 'paused' | 'finished' | 'failed' | 'stopped';
}

export function TaskOutput({
  output,
  taskSteps,
  taskStatus = 'idle'
}: TaskOutputProps) {
  const copyToClipboard = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      toast.success("Output copied to clipboard");
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">Task Output</h3>
        {output && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyToClipboard}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
        )}
      </div>
      
      <ScrollArea className="flex-1">
        {output ? (
          <Card className="p-4 bg-gray-50 dark:bg-gray-900 whitespace-pre-wrap font-mono text-sm">
            {output}
          </Card>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            {taskStatus === 'running' || taskStatus === 'paused' || taskStatus === 'created' ? (
              <p>Task is in progress. Output will appear when complete.</p>
            ) : (
              <p>No output available. Run a task to generate output.</p>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
