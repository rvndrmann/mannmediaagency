
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CustomOrder } from "@/types/custom-order";
import { ProcessingStage, ProcessingStageStatus, OrchestrationWorkflow, WorkflowStatus, WorkflowWithDetails, StageDisplayInfo } from "@/types/orchestration";
import { AgentType } from "./use-multi-agent-chat";
import { Bot, FileText, Code, PenLine, Image, Sparkles, Video, Brain } from "lucide-react";
import { toast } from "sonner";

// Utility function to safely parse JSON
const safeJsonParse = (jsonString: any, fallback: any = {}) => {
  if (!jsonString) return fallback;
  
  // If it's already an object, return it
  if (typeof jsonString === 'object' && jsonString !== null) {
    return jsonString;
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Error parsing JSON:", e);
    return fallback;
  }
};

export const useOrderOrchestration = (orderId?: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflowDetails, setWorkflowDetails] = useState<WorkflowWithDetails | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const refreshData = () => setRefreshTrigger(prev => prev + 1);
  
  // Fetch workflow details for an order
  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }
    
    const fetchWorkflowDetails = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // First check if there's an existing workflow for this order
        const { data: workflowData, error: workflowError } = await supabase
          .from('order_workflows')
          .select('*')
          .eq('order_id', orderId)
          .single();
          
        if (workflowError && workflowError.code !== 'PGRST116') {
          throw workflowError;
        }
        
        // Fetch stages if workflow exists
        let stages: ProcessingStage[] = [];
        if (workflowData) {
          const { data: stagesData, error: stagesError } = await supabase
            .from('processing_stages')
            .select('*')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true });
            
          if (stagesError) {
            throw stagesError;
          }
          
          stages = stagesData || [];
        }
        
        // Fetch order details
        const { data: orderData, error: orderError } = await supabase
          .from('custom_orders')
          .select('*, custom_order_media(*)')
          .eq('id', orderId)
          .single();
          
        if (orderError) {
          throw orderError;
        }

        // If a workflow exists, parse its workflow_data field
        if (workflowData) {
          // Convert workflow_data to proper object if it's a string
          const workflowDataObj = safeJsonParse(workflowData.workflow_data);
          
          // Ensure 'stages' is accessible in workflowDataObj
          const workflowStages = workflowDataObj.stages || [];
          
          setWorkflowDetails({
            workflow: {
              ...workflowData,
              status: workflowData.status as WorkflowStatus,
              workflow_data: workflowDataObj
            },
            stages: stages.map(stage => ({
              ...stage,
              status: stage.status as ProcessingStageStatus,
              input_data: safeJsonParse(stage.input_data),
              output_data: safeJsonParse(stage.output_data),
            })),
            order: orderData,
            currentStageIndex: stages.findIndex(s => s.id === workflowData.current_stage) || 0
          });
        } else {
          setWorkflowDetails(null);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching workflow details:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        setIsLoading(false);
      }
    };
    
    fetchWorkflowDetails();
  }, [orderId, refreshTrigger]);
  
  // Start a new workflow for an order
  const startWorkflow = async (
    orderId: string, 
    stages: {name: string, agent: AgentType}[]
  ) => {
    try {
      // Check if there's already a workflow for this order
      const { data: existingWorkflow } = await supabase
        .from('order_workflows')
        .select('id, status')
        .eq('order_id', orderId)
        .single();
        
      if (existingWorkflow) {
        if (existingWorkflow.status !== 'completed' && existingWorkflow.status !== 'failed') {
          toast.error("A workflow is already in progress for this order");
          return false;
        }
      }
      
      const stageNames = stages.map(s => s.name);
      
      // Create a new workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('order_workflows')
        .insert({
          order_id: orderId,
          status: 'in_progress' as WorkflowStatus,
          workflow_data: {
            order_id: orderId,
            stages: stageNames
          }
        })
        .select()
        .single();
        
      if (workflowError) {
        throw workflowError;
      }
      
      // Create the first stage
      const firstStage = stages[0];
      
      const { data: stage, error: stageError } = await supabase
        .from('processing_stages')
        .insert({
          order_id: orderId,
          stage_name: firstStage.name,
          status: 'in_progress' as ProcessingStageStatus,
          agent_type: firstStage.agent,
          input_data: {
            order_id: orderId,
            stage_name: firstStage.name,
            is_first_stage: true
          }
        })
        .select()
        .single();
        
      if (stageError) {
        throw stageError;
      }
      
      // Update the workflow with the current stage
      const { error: updateError } = await supabase
        .from('order_workflows')
        .update({
          current_stage: stage.id
        })
        .eq('id', workflow.id);
        
      if (updateError) {
        throw updateError;
      }
      
      refreshData();
      toast.success("Workflow started successfully");
      return true;
    } catch (error) {
      console.error("Error starting workflow:", error);
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
      return false;
    }
  };
  
  // Update a stage status
  const updateStageStatus = async (
    stageId: string, 
    status: ProcessingStageStatus,
    outputData?: any
  ) => {
    try {
      const updates: any = { status };
      
      if (outputData) {
        updates.output_data = outputData;
      }
      
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('processing_stages')
        .update(updates)
        .eq('id', stageId);
        
      if (error) {
        throw error;
      }
      
      refreshData();
      return true;
    } catch (error) {
      console.error("Error updating stage status:", error);
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
      return false;
    }
  };
  
  // Move to the next stage
  const moveToNextStage = async (
    currentStageId: string,
    nextStageName: string,
    nextAgentType: AgentType,
    inputData?: any
  ) => {
    if (!workflowDetails) {
      toast.error("No active workflow");
      return false;
    }
    
    try {
      // Mark current stage as completed
      await updateStageStatus(currentStageId, 'completed');
      
      // Create the next stage
      const { data: newStage, error: stageError } = await supabase
        .from('processing_stages')
        .insert({
          order_id: workflowDetails.order.id,
          stage_name: nextStageName,
          status: 'in_progress' as ProcessingStageStatus,
          agent_type: nextAgentType,
          input_data: inputData || {
            order_id: workflowDetails.order.id,
            stage_name: nextStageName,
            previous_stage_id: currentStageId
          }
        })
        .select()
        .single();
        
      if (stageError) {
        throw stageError;
      }
      
      // Update the workflow with the new current stage
      const { error: updateError } = await supabase
        .from('order_workflows')
        .update({
          current_stage: newStage.id
        })
        .eq('id', workflowDetails.workflow.id);
        
      if (updateError) {
        throw updateError;
      }
      
      refreshData();
      toast.success(`Moved to next stage: ${nextStageName}`);
      return true;
    } catch (error) {
      console.error("Error moving to next stage:", error);
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
      return false;
    }
  };
  
  // Complete the workflow
  const completeWorkflow = async (
    finalStageId: string,
    status: 'completed' | 'failed' = 'completed'
  ) => {
    if (!workflowDetails) {
      toast.error("No active workflow");
      return false;
    }
    
    try {
      // Mark final stage as completed
      await updateStageStatus(finalStageId, status === 'completed' ? 'completed' : 'failed');
      
      // Update workflow status
      const { error } = await supabase
        .from('order_workflows')
        .update({
          status: status as WorkflowStatus,
          completed_at: new Date().toISOString()
        })
        .eq('id', workflowDetails.workflow.id);
        
      if (error) {
        throw error;
      }
      
      refreshData();
      toast.success(`Workflow ${status}`);
      return true;
    } catch (error) {
      console.error(`Error completing workflow:`, error);
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
      return false;
    }
  };
  
  return {
    isLoading,
    error,
    workflowDetails,
    refreshData,
    startWorkflow,
    updateStageStatus,
    moveToNextStage,
    completeWorkflow
  };
};
