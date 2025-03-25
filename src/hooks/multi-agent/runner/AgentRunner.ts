
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { Message, Attachment, Task, HandoffRequest } from '@/types/message';
import { toast } from 'sonner';
import { 
  isTaskInProgress, 
  isTaskCompleted, 
  isTaskFailed, 
  isTaskPending, 
  createTypedMessage,
  safeJsonParse,
  safeJsonStringify,
  handleBrowserUseApiResponse
} from './fix-agent-runner';
import { createTraceEvent, saveTrace } from '@/lib/trace-utils';

const BUILT_IN_AGENT_TYPES = ['main', 'script', 'image', 'tool', 'scene'];
const BUILT_IN_TOOL_TYPES = ['browser', 'product-video', 'custom-video'];

interface AgentRunnerOptions {
  usePerformanceModel?: boolean;
  enableDirectToolExecution?: boolean;
  tracingDisabled?: boolean;
  metadata?: Record<string, any>;
  runId?: string;
  groupId?: string;
}

interface AgentRunnerCallbacks {
  onMessage?: (message: Message) => void;
  onError?: (error: string) => void;
  onHandoffEnd?: (toAgent: string) => void;
}

export class AgentRunner {
  private agentType: string;
  private options: AgentRunnerOptions;
  private callbacks: AgentRunnerCallbacks;
  private traceId: string;
  private conversationId: string;
  private isHandoffContinuation: boolean = false;
  private handoffChain: string[] = [];
  private traceEvents: any[] = [];
  private startTime: string;

  constructor(
    agentType: string,
    options: AgentRunnerOptions = {},
    callbacks: AgentRunnerCallbacks = {}
  ) {
    this.agentType = agentType;
    this.options = {
      usePerformanceModel: false,
      enableDirectToolExecution: true,
      tracingDisabled: false,
      metadata: {},
      ...options
    };
    this.callbacks = callbacks;
    this.traceId = options.runId || uuidv4();
    this.conversationId = options.groupId || uuidv4();
    this.startTime = new Date().toISOString();
    this.traceEvents = [];
    
    if (!options.tracingDisabled) {
      this.addTraceEvent('init', {
        agentType: this.agentType,
        options: {
          ...options,
          metadata: { ...options.metadata, userId: undefined }
        }
      });
    }
  }

  public async run(
    userInput: string,
    attachments: Attachment[] = [],
    userId: string
  ): Promise<Message> {
    console.log(`Running ${this.agentType} agent with input: ${userInput.slice(0, 50)}...`);
    
    this.addTraceEvent('user_input', { 
      content: userInput,
      hasAttachments: attachments.length > 0
    });
    
    try {
      const thinkingMessage = this.createThinkingMessage();
      this.sendMessage(thinkingMessage);
      
      const messages = await this.prepareMessages(userInput, attachments);
      
      const requestedTool = this.options.metadata?.requestedTool;
      const isToolAgent = this.agentType === 'tool' && requestedTool;
      
      if (isToolAgent) {
        console.log(`Tool agent requested with specific tool: ${requestedTool}`);
        this.addTraceEvent('tool_agent_request', { requestedTool });
      }
      
      const contextData = {
        hasAttachments: attachments.length > 0,
        attachmentTypes: this.getAttachmentTypes(attachments),
        isCustomAgent: !BUILT_IN_AGENT_TYPES.includes(this.agentType),
        isHandoffContinuation: this.isHandoffContinuation,
        usePerformanceModel: this.options.usePerformanceModel,
        enableDirectToolExecution: this.options.enableDirectToolExecution,
        traceId: this.options.tracingDisabled ? undefined : this.traceId,
        requestedTool: requestedTool,
        availableTools: await this.getAvailableTools()
      };
      
      this.addTraceEvent('api_call_start', {
        contextData,
        agentType: this.agentType,
        modelType: this.options.usePerformanceModel ? 'gpt-4o-mini' : 'gpt-4o'
      });
      
      const apiCallStartTime = new Date().getTime();
      
      const { completion, handoffRequest, modelUsed } = await this.callAgentApi(
        messages,
        userId,
        contextData
      );
      
      const apiCallDuration = new Date().getTime() - apiCallStartTime;
      
      this.addTraceEvent('api_call_end', {
        completion: completion.slice(0, 100) + '...',
        duration: apiCallDuration,
        handoffRequest: handoffRequest ? true : false,
        modelUsed,
        agentType: this.agentType
      });
      
      const responseMessage = this.createResponseMessage(completion, modelUsed);
      
      this.addTraceEvent('response', {
        messageId: responseMessage.id,
        agentType: this.agentType,
        handoffRequested: handoffRequest ? true : false,
        modelUsed
      });
      
      if (handoffRequest) {
        this.addTraceEvent('handoff', {
          from: this.agentType,
          to: handoffRequest.targetAgent,
          reason: handoffRequest.reason
        });
        
        return await this.handleHandoff(
          handoffRequest,
          userInput,
          attachments,
          userId,
          responseMessage
        );
      }
      
      if (this.agentType === 'tool') {
        const toolExecution = this.parseToolExecution(completion);
        if (toolExecution) {
          responseMessage.command = {
            toolName: toolExecution.toolName,
            feature: toolExecution.toolName,
            parameters: toolExecution.parameters
          };
          
          const task: Task = {
            id: uuidv4(),
            name: `Executing ${toolExecution.toolName}`,
            status: 'pending'
          };
          
          responseMessage.tasks = [task];
          this.sendMessage(responseMessage);
          
          this.addTraceEvent('tool_call', {
            toolName: toolExecution.toolName,
            parameters: toolExecution.parameters
          });
          
          return await this.executeTool(
            toolExecution.toolName,
            toolExecution.parameters,
            userId,
            responseMessage
          );
        }
      }
      
      this.sendMessage(responseMessage);
      
      this.saveTraceData(userId, [responseMessage]);
      
      return responseMessage;
    } catch (error) {
      console.error(`Error in ${this.agentType} agent:`, error);
      
      this.addTraceEvent('error', {
        message: error instanceof Error ? error.message : String(error),
        agentType: this.agentType
      });
      
      const errorMessage = this.createErrorMessage(
        error instanceof Error ? error.message : String(error)
      );
      this.sendMessage(errorMessage);
      
      if (this.callbacks.onError) {
        this.callbacks.onError(error instanceof Error ? error.message : String(error));
      }
      
      this.saveTraceData(userId, [errorMessage]);
      
      return errorMessage;
    }
  }
  
  private async prepareMessages(
    userInput: string,
    attachments: Attachment[] = []
  ): Promise<any[]> {
    let formattedInput = userInput;
    
    if (attachments.length > 0) {
      attachments.forEach(attachment => {
        const attachmentType = attachment.type === 'image' ? 'image' : 'file';
        formattedInput += `\n\n[Attached ${attachmentType}: ${attachment.name}, URL: ${attachment.url}]`;
      });
    }
    
    const userMessage = {
      role: 'user',
      content: formattedInput
    };
    
    if (this.isHandoffContinuation && this.handoffChain.length > 0) {
      const previousAgent = this.handoffChain[this.handoffChain.length - 1];
      return [
        {
          role: 'system',
          content: `You are now the ${this.agentType} agent. The conversation was handed off to you from the ${previousAgent} agent.`
        },
        userMessage
      ];
    }
    
    return [userMessage];
  }
  
  private async callAgentApi(
    messages: any[],
    userId: string,
    contextData: Record<string, any>
  ): Promise<{ completion: string; handoffRequest?: HandoffRequest; modelUsed: string }> {
    try {
      console.log("Invoking Supabase function: multi-agent-chat");
      
      const { data, error } = await supabase.functions.invoke('multi-agent-chat', {
        body: {
          messages,
          agentType: this.agentType,
          userId,
          contextData
        }
      });
      
      if (error) {
        console.error("Supabase function invocation error:", error);
        throw new Error(`Failed to invoke multi-agent-chat function: ${error.message}`);
      }
      
      if (!data) {
        throw new Error("Empty response received from Supabase function");
      }
      
      return data;
    } catch (error) {
      console.error("Error calling agent API:", error);
      throw error;
    }
  }
  
  private async handleHandoff(
    handoffRequest: HandoffRequest,
    userInput: string,
    attachments: Attachment[],
    userId: string,
    currentMessage: Message
  ): Promise<Message> {
    try {
      const targetAgent = handoffRequest.targetAgent.toLowerCase();
      
      this.handoffChain.push(this.agentType);
      
      const handoffRunner = new AgentRunner(targetAgent, {
        ...this.options,
        metadata: {
          ...this.options.metadata,
          previousAgent: this.agentType
        }
      }, this.callbacks);
      
      handoffRunner.isHandoffContinuation = true;
      handoffRunner.handoffChain = [...this.handoffChain];
      
      const handoffMessage: Message = {
        ...currentMessage,
        content: `${currentMessage.content}\n\n*Handing off to ${targetAgent} agent for better assistance...*`,
        handoff: {
          to: targetAgent,
          reason: handoffRequest.reason
        }
      };
      
      this.sendMessage(handoffMessage);
      this.saveTraceData(userId, [handoffMessage]);
      
      if (this.callbacks.onHandoffEnd) {
        this.callbacks.onHandoffEnd(targetAgent);
      }
      
      return await handoffRunner.run(userInput, attachments, userId);
    } catch (error) {
      console.error("Error in handleHandoff:", error);
      
      const errorMessage = this.createErrorMessage(
        error instanceof Error ? error.message : String(error)
      );
      this.sendMessage(errorMessage);
      this.saveTraceData(userId, [errorMessage]);
      
      return errorMessage;
    }
  }
  
  private parseToolExecution(content: string): { toolName: string; parameters: any } | null {
    try {
      const jsonRegex = /```(?:json)?\s*({[\s\S]*?})```/;
      const match = content.match(jsonRegex);
      
      if (match && match[1]) {
        const json = JSON.parse(match[1]);
        if (json.tool && json.parameters) {
          return {
            toolName: json.tool,
            parameters: json.parameters
          };
        }
      }
      
      const toolNameMatch = content.match(/Tool Name:\s*([a-zA-Z0-9-]+)/i);
      const paramsMatch = content.match(/Parameters:\s*({[\s\S]*?})/i);
      
      if (toolNameMatch && paramsMatch) {
        try {
          const toolName = toolNameMatch[1].trim();
          const parameters = JSON.parse(paramsMatch[1]);
          return { toolName, parameters };
        } catch (e) {
          console.error("Error parsing tool parameters:", e);
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error parsing tool execution:", error);
      return null;
    }
  }
  
  private async executeTool(toolName: string, parameters: any, userId: string, message: Message): Promise<Message> {
    try {
      this.addTraceEvent('tool_execution_start', {
        toolName,
        parameters
      });
      
      let toolResult;
      
      switch (toolName) {
        case 'browser-use':
          toolResult = await this.executeBrowserUseTool(parameters, userId);
          break;
        case 'product-video':
          toolResult = await this.executeProductVideoTool(parameters, userId);
          break;
        case 'custom-video':
          toolResult = await this.executeCustomVideoTool(parameters, userId);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
      
      this.addTraceEvent('tool_execution_end', {
        toolName,
        result: typeof toolResult === 'string' ? toolResult.slice(0, 100) + '...' : toolResult
      });
      
      const updatedMessage: Message = {
        ...message,
        content: message.content + `\n\nTool Result: ${JSON.stringify(toolResult)}`,
        status: 'completed'
      };
      
      this.sendMessage(updatedMessage);
      this.saveTraceData(userId, [updatedMessage]);
      
      return updatedMessage;
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      
      this.addTraceEvent('tool_execution_error', {
        toolName,
        error: error instanceof Error ? error.message : String(error)
      });
      
      const errorMessage = this.createErrorMessage(
        error instanceof Error ? error.message : String(error)
      );
      this.sendMessage(errorMessage);
      this.saveTraceData(userId, [errorMessage]);
      
      return errorMessage;
    }
  }
  
  private async executeBrowserUseTool(parameters: any, userId: string) {
    console.log("Executing browser-use tool with parameters:", parameters);
    return `Browser use tool successfully initiated with task: ${parameters.task}`;
  }
  
  private async executeProductVideoTool(parameters: any, userId: string) {
    console.log("Executing product-video tool with parameters:", parameters);
    return `Product video generation initiated for product: ${parameters.product_name}`;
  }
  
  private async executeCustomVideoTool(parameters: any, userId: string) {
    console.log("Executing custom-video tool with parameters:", parameters);
    return `Custom video generation initiated with title: ${parameters.title}`;
  }
  
  private createThinkingMessage(): Message {
    return {
      id: uuidv4(),
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      status: "thinking",
      agentType: this.agentType
    };
  }
  
  private createResponseMessage(content: string, modelUsed?: string): Message {
    return {
      id: uuidv4(),
      role: "assistant",
      content,
      createdAt: new Date().toISOString(),
      status: "completed",
      agentType: this.agentType,
      modelUsed
    };
  }
  
  private createErrorMessage(errorMessage: string): Message {
    return {
      id: uuidv4(),
      role: "assistant",
      content: `I encountered an error: ${errorMessage}. Please try again or contact support if the issue persists.`,
      createdAt: new Date().toISOString(),
      status: "error",
      agentType: this.agentType
    };
  }
  
  private sendMessage(message: Message) {
    if (this.callbacks.onMessage) {
      this.callbacks.onMessage(message);
    }
  }
  
  private getAttachmentTypes(attachments: Attachment[]): string[] {
    const types: string[] = [];
    attachments.forEach(attachment => {
      const type = attachment.type || 'unknown';
      if (!types.includes(type)) {
        types.push(type);
      }
    });
    return types;
  }
  
  private async getAvailableTools(): Promise<string[]> {
    return BUILT_IN_TOOL_TYPES;
  }
  
  private addTraceEvent(eventType: string, data: any, agentType?: string) {
    if (this.options.tracingDisabled) return;
    
    const event = createTraceEvent(eventType, data, agentType || this.agentType);
    this.traceEvents.push(event);
  }
  
  private async saveTraceData(userId: string, messages: Message[]) {
    if (this.options.tracingDisabled) return;
    
    try {
      const trace = {
        id: this.traceId,
        runId: this.traceId,
        userId,
        sessionId: this.conversationId,
        messages,
        events: this.traceEvents,
        startTime: this.startTime,
        endTime: new Date().toISOString()
      };
      
      await saveTrace(trace);
    } catch (error) {
      console.error("Error saving trace data:", error);
    }
  }
}
