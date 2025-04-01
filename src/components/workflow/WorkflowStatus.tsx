
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { IntegrationService } from '@/services/integration/IntegrationService';
import { toast } from 'sonner';
import { PlayCircle, RefreshCw } from 'lucide-react';

export interface WorkflowStatusProps {
  projectId: string;
  onComplete?: () => void;
}

export function WorkflowStatus({ projectId, onComplete }: WorkflowStatusProps) {
  const [workflowState, setWorkflowState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const integrationService = IntegrationService.getInstance();

  useEffect(() => {
    fetchWorkflowState();
  }, [projectId]);

  const fetchWorkflowState = async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const state = await integrationService.getWorkflowState(projectId);
      setWorkflowState(state);
    } catch (error) {
      console.error('Error fetching workflow state:', error);
      toast.error('Failed to load workflow status');
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkflow = async () => {
    setLoading(true);
    try {
      const success = await integrationService.startVideoWorkflow(projectId);
      if (success) {
        toast.success('Workflow started successfully');
        await fetchWorkflowState();
      } else {
        toast.error('Failed to start workflow');
      }
    } catch (error) {
      console.error('Error starting workflow:', error);
      toast.error('Failed to start workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryStage = async (stage: string) => {
    setLoading(true);
    try {
      const success = await integrationService.retryWorkflowFromStage(projectId, stage);
      if (success) {
        toast.success(`Workflow restarted from ${stage}`);
        await fetchWorkflowState();
      } else {
        toast.error('Failed to retry workflow stage');
      }
    } catch (error) {
      console.error('Error retrying workflow stage:', error);
      toast.error('Failed to retry workflow stage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Workflow Status</span>
          <Button variant="outline" size="sm" onClick={fetchWorkflowState} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!workflowState ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">No workflow in progress</p>
            <Button onClick={handleStartWorkflow} disabled={loading}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Start Workflow
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">Status</h3>
              <p className="text-sm">{workflowState.status || 'Unknown'}</p>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-medium mb-1">Current Stage</h3>
              <p className="text-sm">{workflowState.current_stage || 'Not started'}</p>
            </div>
            
            {workflowState.error && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium mb-1 text-red-500">Error</h3>
                  <p className="text-sm text-red-500">{workflowState.error}</p>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => handleRetryStage(workflowState.current_stage)}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Stage
                  </Button>
                </div>
              </>
            )}
            
            {workflowState.status === 'completed' && onComplete && (
              <Button onClick={onComplete} className="w-full">
                View Results
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
