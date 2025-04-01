
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayCircle, RefreshCw } from 'lucide-react';
import { WorkflowStatus } from '@/components/workflow/WorkflowStatus';
import { toast } from 'sonner';

interface WorkflowPanelProps {
  projectId: string;
  onComplete?: () => void;
}

export function WorkflowPanel({ projectId, onComplete }: WorkflowPanelProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleStartGeneration = async () => {
    try {
      setIsGenerating(true);
      // Start workflow generation logic here
      toast.success('Video generation started!');
    } catch (error) {
      console.error('Error starting generation:', error);
      toast.error('Failed to start generation');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      // Refresh status logic here
      toast.success('Status refreshed');
    } catch (error) {
      console.error('Error refreshing status:', error);
      toast.error('Failed to refresh status');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card className="w-full mt-4">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Video Generation</span>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <WorkflowStatus 
            projectId={projectId} 
            onComplete={onComplete} 
          />
          
          <Button 
            className="w-full mt-4" 
            disabled={isGenerating}
            onClick={handleStartGeneration}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Start Generation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
