
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProcessingStage, OrchestrationWorkflow, WorkflowWithDetails } from "@/types/orchestration";
import { CustomOrder } from "@/types/custom-order";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useOrderOrchestration = (orderId?: string) => {
  const queryClient = useQueryClient();

  // Fetch workflow and stages for a specific order
  const {
    data: workflowDetails,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['orderOrchestration', orderId],
    enabled: !!orderId,
    queryFn: async (): Promise<WorkflowWithDetails | null> => {
      if (!orderId) return null;

      // Fetch the workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('agent_orchestration_workflows')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (workflowError) throw workflowError;
      if (!workflow) return null;

      // Fetch all stages
      const { data: stages, error: stagesError } = await supabase
        .from('order_processing_stages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (stagesError) throw stagesError;

      // Fetch the order details
      const { data: order, error: orderError } = await supabase
        .from('custom_orders')
        .select('*, custom_order_media(*)')
        .eq('id', orderId)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!order) throw new Error("Order not found");

      // Calculate current stage index
      const currentStageIndex = workflow.workflow_data?.stages
        ? workflow.workflow_data.stages.indexOf(workflow.current_stage)
        : 0;

      return {
        workflow,
        stages: stages || [],
        order,
        currentStageIndex: currentStageIndex >= 0 ? currentStageIndex : 0
      };
    }
  });

  // Start a new orchestration workflow
  const startOrchestrationMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .rpc('start_order_orchestration', { order_id_param: orderId });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Order orchestration started successfully");
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ['orderOrchestration', orderId] });
        queryClient.invalidateQueries({ queryKey: ['customOrders'] });
      }
    },
    onError: (error) => {
      toast.error(`Failed to start orchestration: ${error.message}`);
    }
  });

  // Update a stage's status
  const updateStageMutation = useMutation({
    mutationFn: async ({
      stageId,
      status,
      outputData,
      completedAt = status === 'completed' ? new Date().toISOString() : undefined
    }: {
      stageId: string;
      status: string;
      outputData?: any;
      completedAt?: string;
    }) => {
      const { data, error } = await supabase
        .from('order_processing_stages')
        .update({
          status,
          output_data: outputData,
          completed_at: completedAt
        })
        .eq('id', stageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Stage updated successfully");
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ['orderOrchestration', orderId] });
      }
    },
    onError: (error) => {
      toast.error(`Failed to update stage: ${error.message}`);
    }
  });

  // Move to the next stage in the workflow
  const moveToNextStageMutation = useMutation({
    mutationFn: async ({ 
      workflowId, 
      currentStage, 
      nextStage, 
      agentType 
    }: { 
      workflowId: string; 
      currentStage: string; 
      nextStage: string; 
      agentType: string;
    }) => {
      // Update the workflow to the next stage
      const { data: updatedWorkflow, error: workflowError } = await supabase
        .from('agent_orchestration_workflows')
        .update({
          current_stage: nextStage
        })
        .eq('id', workflowId)
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create the next stage record
      const { data: newStage, error: stageError } = await supabase
        .from('order_processing_stages')
        .insert({
          order_id: orderId,
          stage_name: nextStage,
          status: 'pending',
          agent_type: agentType,
          input_data: {
            order_id: orderId,
            previous_stage: currentStage
          }
        })
        .select()
        .single();

      if (stageError) throw stageError;

      return { workflow: updatedWorkflow, stage: newStage };
    },
    onSuccess: () => {
      toast.success("Moved to next stage");
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ['orderOrchestration', orderId] });
      }
    },
    onError: (error) => {
      toast.error(`Failed to move to next stage: ${error.message}`);
    }
  });

  // Complete the workflow
  const completeWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const { data, error } = await supabase
        .from('agent_orchestration_workflows')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', workflowId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Workflow completed successfully");
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ['orderOrchestration', orderId] });
        queryClient.invalidateQueries({ queryKey: ['customOrders'] });
      }
    },
    onError: (error) => {
      toast.error(`Failed to complete workflow: ${error.message}`);
    }
  });

  return {
    workflowDetails,
    isLoading,
    error,
    refetch,
    startOrchestration: startOrchestrationMutation.mutate,
    isStarting: startOrchestrationMutation.isPending,
    updateStage: updateStageMutation.mutate,
    isUpdatingStage: updateStageMutation.isPending,
    moveToNextStage: moveToNextStageMutation.mutate,
    isMovingToNextStage: moveToNextStageMutation.isPending,
    completeWorkflow: completeWorkflowMutation.mutate,
    isCompletingWorkflow: completeWorkflowMutation.isPending,
  };
};
