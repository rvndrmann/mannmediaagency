import { useState, useEffect } from "react";
import { useProjectContext } from "@/hooks/multi-agent/project-context";
import { IntegrationService } from "@/services/integration/IntegrationService";
import { Button } from "@/components/ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkflowStatusProps {
  projectId: string;
}

interface WorkflowState {
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentStage: string | null;
  progress: number;
  error?: string | null;
}

export function WorkflowStatus({ projectId }: WorkflowStatusProps) {
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    status: 'idle',
    currentStage: null,
    progress: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { projectDetails } = useProjectContext({ initialProjectId: projectId });
  const integrationService = IntegrationService.getInstance();

  useEffect(() => {
    fetchWorkflowStatus();
  }, [projectId]);

  // Fetch the workflow status from the database
  const fetchWorkflowStatus = async () => {
    setIsLoading(true);
    try {
      const status = await integrationService.getWorkflowState(projectId);
      if (status) {
        setWorkflowState({
          status: status.status,
          currentStage: status.current_stage,
          progress: status.progress,
          error: status.error
        });
      } else {
        setWorkflowState({ status: 'idle', currentStage: null, progress: 0 });
      }
    } catch (error) {
      console.error("Error fetching workflow status:", error);
      toast.error("Failed to fetch workflow status");
      setWorkflowState({ status: 'failed', currentStage: null, progress: 0, error: 'Failed to fetch status' });
    } finally {
      setIsLoading(false);
    }
  };

  // Start a workflow for the project
  const startWorkflow = async () => {
    try {
      setIsLoading(true);
      const result = await integrationService.startVideoWorkflow(projectId);
      if (result) {
        setWorkflowState({ status: 'running', currentStage: 'init', progress: 0 });
        toast.success("Workflow started successfully");
      } else {
        toast.error("Failed to start workflow");
      }
    } catch (error) {
      console.error("Error starting workflow:", error);
      toast.error("Failed to start workflow");
    } finally {
      setIsLoading(false);
    }
  };

  // Retry workflow from a specific stage
  const retryFromStage = async (stage: string) => {
    try {
      setIsLoading(true);
      const result = await integrationService.retryWorkflowFromStage(projectId, stage);
      if (result) {
        toast.success(`Retrying workflow from ${stage}`);
        // Fetch the latest status
        fetchWorkflowStatus();
      } else {
        toast.error("Failed to retry workflow");
      }
    } catch (error) {
      console.error("Error retrying workflow:", error);
      toast.error("Failed to retry workflow");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Status</CardTitle>
        <CardDescription>
          {projectDetails?.title ? `Status for project: ${projectDetails.title}` : "No project selected"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
        ) : (
          <div className="space-y-2">
            <p>Status: {workflowState.status}</p>
            {workflowState.currentStage && <p>Current Stage: {workflowState.currentStage}</p>}
            {workflowState.error && <p className="text-red-500">Error: {workflowState.error}</p>}
            <p>Progress: {workflowState.progress}%</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          onClick={fetchWorkflowStatus}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              Please wait
            </>
          ) : (
            <>
              <ReloadIcon className="mr-2 h-4 w-4" />
              Refresh Status
            </>
          )}
        </Button>
        {workflowState.status === 'idle' ? (
          <Button onClick={startWorkflow} disabled={isLoading}>
            Start Workflow
          </Button>
        ) : workflowState.status === 'failed' ? (
          <Button onClick={() => retryFromStage(workflowState.currentStage || 'init')} disabled={isLoading}>
            Retry from {workflowState.currentStage || 'init'}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
