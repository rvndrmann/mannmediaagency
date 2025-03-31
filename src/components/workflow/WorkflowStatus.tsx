
import React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WorkflowState, WorkflowStage } from '@/types/canvas';
import { IntegrationService } from '@/services/integration/IntegrationService';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WorkflowStatusProps {
  projectId: string;
  userId: string;
  onComplete?: () => void;
}

const stageLabels: Record<WorkflowStage, string> = {
  'script_generation': 'Script Generation',
  'scene_splitting': 'Scene Splitting',
  'image_generation': 'Image Generation',
  'scene_description': 'Scene Description',
  'video_generation': 'Video Generation',
  'final_assembly': 'Final Assembly'
};

const stageTips: Record<WorkflowStage, string> = {
  'script_generation': 'AI is writing a complete script for your project',
  'scene_splitting': 'Dividing the script into logical scenes with voice-over text',
  'image_generation': 'Creating visual images for each scene',
  'scene_description': 'Generating descriptive text about camera movements and scene details',
  'video_generation': 'Converting scene images to video clips',
  'final_assembly': 'Combining all scene videos into a final product'
};

export const WorkflowStatus: React.FC<WorkflowStatusProps> = ({ projectId, userId, onComplete }) => {
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  const integrationService = IntegrationService.getInstance();
  
  // Get workflow state
  const fetchWorkflow = async () => {
    try {
      const workflowState = await integrationService.getWorkflowState(projectId);
      setWorkflow(workflowState);
      
      // Calculate progress
      if (workflowState) {
        const stages: WorkflowStage[] = [
          'script_generation',
          'scene_splitting',
          'image_generation',
          'scene_description',
          'video_generation',
          'final_assembly'
        ];
        
        const currentIndex = stages.indexOf(workflowState.currentStage);
        const completedCount = workflowState.completedStages.length;
        const totalStages = stages.length;
        
        const progressValue = workflowState.status === 'completed' 
          ? 100 
          : Math.floor((completedCount / totalStages) * 100);
          
        setProgress(progressValue);
        
        // If workflow is completed, call onComplete callback
        if (workflowState.status === 'completed' && onComplete) {
          onComplete();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  // Start workflow
  const startWorkflow = async () => {
    try {
      setLoading(true);
      const workflowState = await integrationService.startVideoWorkflow(projectId, userId);
      setWorkflow(workflowState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  // Retry workflow from a specific stage
  const retryFromStage = async (stage: WorkflowStage) => {
    try {
      setRefreshing(true);
      await integrationService.retryWorkflowFromStage(projectId, stage, userId);
      await fetchWorkflow();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRefreshing(false);
    }
  };
  
  // Set up real-time subscription to workflow updates
  useEffect(() => {
    if (!projectId) return;
    
    // Initial fetch
    fetchWorkflow();
    
    // Subscribe to workflow updates
    const subscription = supabase
      .channel(`canvas_workflows:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas_workflows',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          setWorkflow(payload.new as WorkflowState);
          
          // Update progress
          if (payload.new) {
            const stages: WorkflowStage[] = [
              'script_generation',
              'scene_splitting',
              'image_generation',
              'scene_description',
              'video_generation',
              'final_assembly'
            ];
            
            const workflowState = payload.new as WorkflowState;
            const completedCount = workflowState.completedStages.length;
            const totalStages = stages.length;
            
            const progressValue = workflowState.status === 'completed' 
              ? 100 
              : Math.floor((completedCount / totalStages) * 100);
              
            setProgress(progressValue);
            
            // If workflow is completed, call onComplete callback
            if (workflowState.status === 'completed' && onComplete) {
              onComplete();
            }
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [projectId, userId]);
  
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Video Workflow</CardTitle>
          <CardDescription>Setting up your automated video creation...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!workflow) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Video Workflow</CardTitle>
          <CardDescription>Create a complete video with AI assistance</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Start the automated workflow to create a video from script to final assembly.
          </p>
          <Button onClick={startWorkflow}>Start Workflow</Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Video Workflow</CardTitle>
            <CardDescription>
              Status: {workflow.status === 'in_progress' ? 'In Progress' : 
                      workflow.status === 'completed' ? 'Completed' :
                      'Failed'}
            </CardDescription>
          </div>
          <Badge variant={
            workflow.status === 'in_progress' ? 'outline' : 
            workflow.status === 'completed' ? 'success' : 
            'destructive'
          }>
            {workflow.status === 'in_progress' ? 'In Progress' : 
             workflow.status === 'completed' ? 'Completed' : 
             'Failed'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm">Progress</span>
            <span className="text-sm">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        <div className="space-y-4 mt-6">
          {Object.entries(stageLabels).map(([stage, label]) => {
            const isCurrentStage = workflow.currentStage === stage;
            const isCompleted = workflow.completedStages.includes(stage as WorkflowStage);
            
            return (
              <div key={stage} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-3">
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : isCurrentStage ? (
                    <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-gray-300" />
                  )}
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-gray-500">{stageTips[stage as WorkflowStage]}</p>
                  </div>
                </div>
                
                {(isCurrentStage || workflow.status === 'failed') && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={refreshing}
                    onClick={() => retryFromStage(stage as WorkflowStage)}
                  >
                    {refreshing ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Retry
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        
        {workflow.errorMessage && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{workflow.errorMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <div className="text-sm text-gray-500">
          Started: {new Date(workflow.startedAt).toLocaleString()}
          {workflow.completedAt && (
            <>
              <br />
              Completed: {new Date(workflow.completedAt).toLocaleString()}
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};
