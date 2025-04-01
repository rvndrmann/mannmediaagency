
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { IntegrationService } from '@/services/integration/IntegrationService';

interface WorkflowStage {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
}

export interface WorkflowStatusProps {
  projectId: string;
  onComplete?: () => void;
}

export function WorkflowStatus({ projectId, onComplete }: WorkflowStatusProps) {
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const integrationService = IntegrationService.getInstance();
  
  useEffect(() => {
    if (projectId) {
      fetchWorkflowState();
    }
  }, [projectId]);
  
  const fetchWorkflowState = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!integrationService.getWorkflowState) {
        console.error("getWorkflowState method not available on IntegrationService");
        setError("Workflow service not available");
        return;
      }
      
      const state = await integrationService.getWorkflowState(projectId);
      
      if (state) {
        setStages(state.stages || []);
        setCurrentStage(state.current_stage || null);
        setStatus(state.status || 'idle');
        setProgress(state.progress || 0);
        
        if (state.status === 'completed' && onComplete) {
          onComplete();
        }
      } else {
        setStages([]);
        setCurrentStage(null);
        setStatus('idle');
        setProgress(0);
      }
    } catch (error) {
      console.error("Error fetching workflow state:", error);
      setError("Failed to fetch workflow status");
    } finally {
      setLoading(false);
    }
  };
  
  const startWorkflow = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!integrationService.startVideoWorkflow) {
        console.error("startVideoWorkflow method not available on IntegrationService");
        setError("Workflow service not available");
        return;
      }
      
      const success = await integrationService.startVideoWorkflow(projectId);
      
      if (success) {
        toast.success("Video generation started!");
        await fetchWorkflowState();
      } else {
        toast.error("Failed to start video generation");
        setError("Failed to start workflow");
      }
    } catch (error) {
      console.error("Error starting workflow:", error);
      setError("Failed to start workflow");
      toast.error("Failed to start video generation");
    } finally {
      setLoading(false);
    }
  };
  
  const retryStage = async (stageName: string) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!integrationService.retryWorkflowFromStage) {
        console.error("retryWorkflowFromStage method not available on IntegrationService");
        setError("Workflow retry service not available");
        return;
      }
      
      const success = await integrationService.retryWorkflowFromStage(projectId, stageName);
      
      if (success) {
        toast.success(`Retrying from stage: ${stageName}`);
        await fetchWorkflowState();
      } else {
        toast.error("Failed to retry workflow stage");
        setError("Failed to retry workflow stage");
      }
    } catch (error) {
      console.error("Error retrying workflow stage:", error);
      setError("Failed to retry workflow stage");
      toast.error("Failed to retry workflow stage");
    } finally {
      setLoading(false);
    }
  };
  
  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-md text-red-800 flex items-center">
        <AlertCircle className="mr-2 h-5 w-5" />
        <span>{error}</span>
        <Button variant="ghost" size="sm" onClick={fetchWorkflowState} className="ml-auto">
          <RefreshCw size={16} />
        </Button>
      </div>
    );
  }
  
  if (status === 'idle' || !status) {
    return (
      <div className="flex flex-col space-y-4">
        <p className="text-muted-foreground">No active workflow for this project.</p>
        <Button onClick={startWorkflow} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <ArrowRight className="mr-2 h-4 w-4" />
              Start Video Generation
            </>
          )}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          Status: <span className="capitalize">{status}</span>
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchWorkflowState} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      <div className="space-y-2">
        {stages.map((stage, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                stage.status === 'completed' ? 'bg-green-500' : 
                stage.status === 'running' ? 'bg-blue-500' :
                stage.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
              }`} />
              <span className={`${currentStage === stage.name ? 'font-medium' : ''}`}>
                {stage.name}
              </span>
            </div>
            
            {stage.status === 'failed' && (
              <Button variant="outline" size="sm" onClick={() => retryStage(stage.name)} disabled={loading}>
                Retry
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
