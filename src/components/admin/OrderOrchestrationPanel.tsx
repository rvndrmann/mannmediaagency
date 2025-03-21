import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useOrderOrchestration } from "@/hooks/use-order-orchestration";
import { ProcessingStage, ProcessingStageStatus, StageDisplayInfo } from "@/types/orchestration";
import { ClipboardCheck, Clock, Play, AlertCircle, CheckCircle, Loader2, ArrowRight, MoveRight, FileText, VideoIcon, Mic, Music, Image, Link, Cog } from "lucide-react";
import { useMultiAgentChat } from "@/hooks/use-multi-agent-chat";
import { formatDistanceToNow } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const WORKFLOW_STAGES: Record<string, StageDisplayInfo> = {
  script_writing: {
    name: 'script_writing',
    displayName: 'Script Writing',
    icon: <FileText className="h-4 w-4" />,
    agent: 'script',
    description: 'Draft a script based on the order requirements'
  },
  scene_description: {
    name: 'scene_description',
    displayName: 'Scene Description',
    icon: <ClipboardCheck className="h-4 w-4" />,
    agent: 'scene',
    description: 'Break down the script into detailed scene descriptions'
  },
  voiceover_generation: {
    name: 'voiceover_generation',
    displayName: 'Voiceover',
    icon: <Mic className="h-4 w-4" />,
    agent: 'voiceover',
    description: 'Generate voiceover audio for the script'
  },
  image_generation: {
    name: 'image_generation',
    displayName: 'Image Generation',
    icon: <Image className="h-4 w-4" />,
    agent: 'image',
    description: 'Create or select images for each scene'
  },
  music_generation: {
    name: 'music_generation',
    displayName: 'Music Selection',
    icon: <Music className="h-4 w-4" />,
    agent: 'music',
    description: 'Select appropriate background music'
  },
  video_assembly: {
    name: 'video_assembly',
    displayName: 'Video Assembly',
    icon: <VideoIcon className="h-4 w-4" />,
    agent: 'tool',
    description: 'Assemble all components into the final video'
  }
};

const StatusBadge = ({ status }: { status: ProcessingStageStatus }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let label = status.charAt(0).toUpperCase() + status.slice(1);
  let icon = null;

  switch (status) {
    case "pending":
      variant = "outline";
      icon = <Clock className="h-3.5 w-3.5 mr-1" />;
      break;
    case "in_progress":
      variant = "secondary";
      icon = <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />;
      break;
    case "completed":
      variant = "default";
      icon = <CheckCircle className="h-3.5 w-3.5 mr-1" />;
      break;
    case "approved":
      variant = "default";
      icon = <CheckCircle className="h-3.5 w-3.5 mr-1" />;
      break;
    case "failed":
      variant = "destructive";
      icon = <AlertCircle className="h-3.5 w-3.5 mr-1" />;
      break;
    case "rejected":
      variant = "destructive";
      icon = <AlertCircle className="h-3.5 w-3.5 mr-1" />;
      break;
  }

  return (
    <Badge variant={variant} className="flex items-center">
      {icon}
      {label}
    </Badge>
  );
};

const StageCard = ({ 
  stage, 
  isActive, 
  onApprove, 
  onReject, 
  onRunAgent 
}: { 
  stage: ProcessingStage; 
  isActive: boolean; 
  onApprove: () => void; 
  onReject: () => void; 
  onRunAgent: () => void; 
}) => {
  const stageInfo = WORKFLOW_STAGES[stage.stage_name];
  
  return (
    <Card className={`relative border ${isActive ? 'border-blue-500 shadow-md' : ''}`}>
      {isActive && (
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-blue-500 rounded-full animate-pulse"></div>
      )}
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {stageInfo?.icon || <Cog className="h-4 w-4" />}
            <CardTitle className="text-lg">{stageInfo?.displayName || stage.stage_name}</CardTitle>
          </div>
          <StatusBadge status={stage.status} />
        </div>
        <CardDescription>
          {stageInfo?.description || `Processing ${stage.stage_name}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        {stage.output_data ? (
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md max-h-40 overflow-auto">
            <pre className="text-xs whitespace-pre-wrap">
              {JSON.stringify(stage.output_data, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="text-gray-500 italic">No output data yet</div>
        )}
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <div className="text-xs text-gray-500">
          {stage.updated_at && (
            <>Last updated: {formatDistanceToNow(new Date(stage.updated_at), { addSuffix: true })}</>
          )}
        </div>
        <div className="flex gap-2">
          {isActive && stage.status === 'pending' && (
            <Button size="sm" onClick={onRunAgent}>
              <Play className="h-3.5 w-3.5 mr-1" />
              Run {stageInfo?.agent || 'Agent'}
            </Button>
          )}
          {isActive && stage.status === 'completed' && (
            <>
              <Button size="sm" variant="outline" onClick={onReject}>
                Reject
              </Button>
              <Button size="sm" onClick={onApprove}>
                Approve
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

interface OrderOrchestrationPanelProps {
  orderId: string;
}

export const OrderOrchestrationPanel: React.FC<OrderOrchestrationPanelProps> = ({ orderId }) => {
  const [showMultiAgentChat, setShowMultiAgentChat] = useState(false);
  const { 
    workflowDetails, 
    isLoading, 
    error, 
    startWorkflow, 
    updateStageStatus,
    moveToNextStage,
    completeWorkflow
  } = useOrderOrchestration(orderId);
  
  const { switchAgent, setInput, handleSubmit } = useMultiAgentChat();

  const handleStartOrchestration = () => {
    const standardStages = [
      { name: 'script_writing', agent: 'script' },
      { name: 'scene_description', agent: 'scene' },
      { name: 'voiceover_generation', agent: 'voiceover' },
      { name: 'image_generation', agent: 'image' },
      { name: 'music_generation', agent: 'music' },
      { name: 'video_assembly', agent: 'tool' }
    ];
    
    startWorkflow(orderId, standardStages);
  };

  const handleStageApproval = (stage: ProcessingStage, index: number) => {
    updateStageStatus(stage.id, 'approved');

    const workflow = workflowDetails?.workflow;
    const allStages = workflow?.workflow_data?.stages || [];
    
    if (index >= allStages.length - 1) {
      if (workflow) {
        completeWorkflow(stage.id, 'completed');
      }
      return;
    }

    const nextStageName = allStages[index + 1];
    const nextStageInfo = WORKFLOW_STAGES[nextStageName];
    
    if (workflow && nextStageInfo) {
      moveToNextStage(
        stage.id,
        nextStageName,
        nextStageInfo.agent
      );
    }
  };

  const handleStageRejection = (stage: ProcessingStage) => {
    updateStageStatus(stage.id, 'rejected');
  };

  const handleRunAgent = (stage: ProcessingStage) => {
    updateStageStatus(stage.id, 'in_progress');
    
    setShowMultiAgentChat(true);
    
    switchAgent(stage.agent_type);
    
    const inputData = stage.input_data || {};
    const prompt = `Process the ${stage.stage_name} stage for custom order ${orderId}. 
The order details: ${JSON.stringify(inputData, null, 2)}

Your task is to ${WORKFLOW_STAGES[stage.stage_name]?.description || `complete the ${stage.stage_name} stage`}.
Output your response in JSON format that can be easily parsed.`;
    
    setInput(prompt);
    
    setTimeout(() => {
      const event = new Event('submit', { cancelable: true, bubbles: true });
      document.querySelector('form')?.dispatchEvent(event);
    }, 500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load orchestration details: {typeof error === 'object' ? JSON.stringify(error) : String(error)}
        </AlertDescription>
      </Alert>
    );
  }

  if (!workflowDetails?.workflow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Orchestration</CardTitle>
          <CardDescription>
            Start the AI-powered orchestration workflow to process this custom order.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            This will trigger a sequence of specialized AI agents to work on this order, from script writing to final video assembly.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleStartOrchestration} 
            className="w-full"
          >
            <Play className="mr-2 h-4 w-4" />
            Start AI Orchestration
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const { workflow, stages, currentStageIndex } = workflowDetails;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Order Orchestration</CardTitle>
              <CardDescription>
                AI-driven workflow to process custom orders
              </CardDescription>
            </div>
            <Badge variant={workflow.status === 'completed' ? 'default' : 'secondary'}>
              {workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <div>
              <span className="font-medium">Current Stage:</span>{' '}
              {WORKFLOW_STAGES[workflow.current_stage || '']?.displayName || workflow.current_stage}
            </div>
            <div>
              <span className="font-medium">Started:</span>{' '}
              {formatDistanceToNow(new Date(workflow.created_at), { addSuffix: true })}
            </div>
            {workflow.completed_at && (
              <div>
                <span className="font-medium">Completed:</span>{' '}
                {formatDistanceToNow(new Date(workflow.completed_at), { addSuffix: true })}
              </div>
            )}
          </div>

          <div className="mt-4">
            <TooltipProvider>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-xs text-gray-500">
                  Stage {currentStageIndex + 1} of {workflow.workflow_data?.stages?.length || 0}
                </span>
              </div>
              <div className="relative pt-2">
                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                  <div
                    style={{
                      width: `${((currentStageIndex + 1) / (workflow.workflow_data?.stages?.length || 1)) * 100}%`
                    }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                  ></div>
                </div>
                <div className="flex justify-between mt-1">
                  {workflow.workflow_data?.stages?.map((stage: string, idx: number) => (
                    <Tooltip key={stage}>
                      <TooltipTrigger asChild>
                        <div
                          className={`h-2 w-2 rounded-full -mt-3 ${
                            idx <= currentStageIndex
                              ? 'bg-blue-500'
                              : 'bg-gray-300'
                          }`}
                          style={{
                            left: `calc(${(idx / (workflow.workflow_data?.stages?.length - 1)) * 100}% - 4px)`
                          }}
                        ></div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{WORKFLOW_STAGES[stage]?.displayName || stage}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Workflow Stages</h3>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stages.map((stage, index) => (
            <StageCard
              key={stage.id}
              stage={stage}
              isActive={index === currentStageIndex}
              onApprove={() => handleStageApproval(stage, index)}
              onReject={() => handleStageRejection(stage)}
              onRunAgent={() => handleRunAgent(stage)}
            />
          ))}
        </div>
      </div>

      {showMultiAgentChat && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Agent Chat</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowMultiAgentChat(false)}
              >
                Hide
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Use this chat interface to interact with the AI agent processing the current stage.
              The agent will automatically update the stage when finished.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
