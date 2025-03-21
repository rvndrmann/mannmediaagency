
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  OrchestrationWorkflow, 
  ProcessingStage, 
  ProcessingStageStatus, 
  WorkflowStatus,
  WorkflowWithDetails 
} from "@/types/orchestration";
import { CustomOrder } from "@/types/custom-order";
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { toast } from "sonner";

export function useOrderOrchestration(orderId: string) {
  const [workflowDetails, setWorkflowDetails] = useState<WorkflowWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  
  // Fetch the workflow and stages for the given order
  const fetchWorkflowDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First check if a workflow exists for this order
      const { data: workflowData, error: workflowError } = await supabase
        .from('agent_orchestration_workflows')
        .select('*')
        .eq('order_id', orderId)
        .single();
      
      if (workflowError && workflowError.code !== 'PGRST116') {
        throw workflowError;
      }
      
      if (!workflowData) {
        setWorkflowDetails(null);
        setIsLoading(false);
        return;
      }
      
      // Fetch the stages for this workflow
      const { data: stagesData, error: stagesError } = await supabase
        .from('order_processing_stages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      
      if (stagesError) {
        throw stagesError;
      }
      
      // Fetch the order details
      const { data: orderData, error: orderError } = await supabase
        .from('custom_orders')
        .select('*, custom_order_media(*)')
        .eq('id', orderId)
        .single();
      
      if (orderError) {
        throw orderError;
      }
      
      // Parse the workflow data json if it's a string
      let workflowDataParsed = workflowData.workflow_data;
      if (typeof workflowData.workflow_data === 'string') {
        try {
          workflowDataParsed = JSON.parse(workflowData.workflow_data);
        } catch (e) {
          console.error('Error parsing workflow data:', e);
        }
      }
      
      // Find the current stage index
      const stageNames = workflowDataParsed?.stages || [];
      const currentStageIndex = stageNames.findIndex((stageName: string) => 
        stageName === workflowData.current_stage
      );
      
      // Prepare the workflow details
      const workflow: OrchestrationWorkflow = {
        id: workflowData.id,
        order_id: workflowData.order_id,
        status: workflowData.status as WorkflowStatus,
        current_stage: workflowData.current_stage,
        workflow_data: {
          order_id: orderData.id,
          stages: stageNames
        },
        created_at: workflowData.created_at,
        updated_at: workflowData.updated_at,
        completed_at: workflowData.completed_at
      };
      
      // Transform stage data
      const stages: ProcessingStage[] = stagesData.map(stage => ({
        id: stage.id,
        order_id: stage.order_id,
        stage_name: stage.stage_name,
        status: stage.status as ProcessingStageStatus,
        agent_type: stage.agent_type,
        input_data: stage.input_data,
        output_data: stage.output_data,
        created_at: stage.created_at,
        updated_at: stage.updated_at,
        completed_at: stage.completed_at
      }));
      
      // Set the workflow details
      setWorkflowDetails({
        workflow,
        stages,
        order: orderData as CustomOrder,
        currentStageIndex: currentStageIndex !== -1 ? currentStageIndex : 0
      });
      
    } catch (err) {
      console.error('Error fetching workflow details:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);
  
  // Start a new orchestration workflow
  const startOrchestration = useCallback(async (orderId: string) => {
    try {
      setIsStarting(true);
      
      const { data, error } = await supabase
        .rpc('start_order_orchestration', { 
          order_id_param: orderId 
        });
      
      if (error) throw error;
      
      toast.success('Orchestration workflow started successfully');
      
      // Refresh the workflow details
      await fetchWorkflowDetails();
      
    } catch (err) {
      console.error('Error starting orchestration:', err);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsStarting(false);
    }
  }, [fetchWorkflowDetails]);
  
  // Update a stage status
  const updateStage = useCallback(async ({ 
    stageId, 
    status, 
    outputData 
  }: { 
    stageId: string; 
    status: ProcessingStageStatus; 
    outputData?: any 
  }) => {
    try {
      const updateData: any = { status };
      
      if (outputData) {
        updateData.output_data = outputData;
      }
      
      if (status === 'completed' || status === 'approved') {
        updateData.completed_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('order_processing_stages')
        .update(updateData)
        .eq('id', stageId);
      
      if (error) throw error;
      
      toast.success(`Stage ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'updated'} successfully`);
      
      // Refresh the workflow details
      await fetchWorkflowDetails();
      
    } catch (err) {
      console.error('Error updating stage:', err);
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, [fetchWorkflowDetails]);
  
  // Move to the next stage in the workflow
  const moveToNextStage = useCallback(async ({
    workflowId,
    currentStage,
    nextStage,
    agentType
  }: {
    workflowId: string;
    currentStage: string;
    nextStage: string;
    agentType: AgentType;
  }) => {
    try {
      // Update the workflow with the new current stage
      const { error: workflowError } = await supabase
        .from('agent_orchestration_workflows')
        .update({ 
          current_stage: nextStage,
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId);
      
      if (workflowError) throw workflowError;
      
      // Create the next stage record
      const { error: stageError } = await supabase
        .from('order_processing_stages')
        .insert({
          order_id: workflowDetails?.order.id,
          stage_name: nextStage,
          status: 'pending',
          agent_type: agentType,
          input_data: {
            order_id: workflowDetails?.order.id,
            prev_stage: currentStage,
            remark: workflowDetails?.order.remark,
            prev_stage_output: workflowDetails?.stages.find(s => s.stage_name === currentStage)?.output_data
          }
        });
      
      if (stageError) throw stageError;
      
      toast.success(`Moved to ${nextStage} stage`);
      
      // Refresh the workflow details
      await fetchWorkflowDetails();
      
    } catch (err) {
      console.error('Error moving to next stage:', err);
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, [fetchWorkflowDetails, workflowDetails]);
  
  // Complete the workflow
  const completeWorkflow = useCallback(async (workflowId: string) => {
    try {
      const { error } = await supabase
        .from('agent_orchestration_workflows')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', workflowId);
      
      if (error) throw error;
      
      // Update the order status to completed
      const { error: orderError } = await supabase
        .from('custom_orders')
        .update({ status: 'completed' })
        .eq('id', workflowDetails?.order.id);
      
      if (orderError) throw orderError;
      
      toast.success('Workflow completed successfully');
      
      // Refresh the workflow details
      await fetchWorkflowDetails();
      
    } catch (err) {
      console.error('Error completing workflow:', err);
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, [fetchWorkflowDetails, workflowDetails]);
  
  // Load workflow details on initial load
  useEffect(() => {
    fetchWorkflowDetails();
  }, [fetchWorkflowDetails]);
  
  return {
    workflowDetails,
    isLoading,
    error,
    isStarting,
    startOrchestration,
    updateStage,
    moveToNextStage,
    completeWorkflow,
    refreshWorkflow: fetchWorkflowDetails
  };
}
