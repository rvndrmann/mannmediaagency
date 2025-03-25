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
      const response = await fetch('/api/multi-agent-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: safeJsonStringify({
          messages,
          agentType: this.agentType,
          userId,
          contextData
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || `API returned ${response.status}`);
        } catch (e) {
          throw new Error(`API returned ${response.status}: ${errorText.substring(0, 100)}`);
        }
      }
      
      const text = await response.text();
      if (!text || text.trim() === '') {
        throw new Error("Empty response received from server");
      }
      
      try {
        return JSON.parse(text);
      } catch (jsonError) {
        console.error("Failed to parse response as JSON:", jsonError);
        console.log("Raw response:", text);
        throw new Error("Invalid JSON response from server");
      }
    } catch (error) {
      console.error('Error calling agent API:', error);
      throw error;
    }
  }
  
  private async handleHandoff(
    handoffRequest: HandoffRequest,
    userInput: string,
    attachments: Attachment[],
    userId: string,
    currentResponse: Message
  ): Promise<Message> {
    const { targetAgent, reason } = handoffRequest;
    
    console.log(`Handling handoff from ${this.agentType} to ${targetAgent}: ${reason}`);
    
    currentResponse.handoffRequest = handoffRequest;
    this.sendMessage(currentResponse);
    
    this.addTraceEvent('handoff_start', {
      from: this.agentType,
      to: targetAgent,
      reason
    });
    
    const isBuiltInTarget = [...BUILT_IN_AGENT_TYPES, ...BUILT_IN_TOOL_TYPES].includes(targetAgent);
    
    if (!isBuiltInTarget) {
      const { data, error } = await supabase
        .from('custom_agents')
        .select('id, name')
        .eq('id', targetAgent)
        .single();
      
      if (error || !data) {
        console.error(`Invalid handoff target: ${targetAgent}`, error);
        
        this.addTraceEvent('handoff_error', {
          from: this.agentType,
          to: targetAgent,
          error: `Cannot hand off to unknown agent: ${targetAgent}`
        });
        
        const errorMessage = this.createErrorMessage(
          `Cannot hand off to unknown agent: ${targetAgent}`
        );
        this.sendMessage(errorMessage);
        
        this.saveTraceData(userId, [currentResponse, errorMessage]);
        
        return errorMessage;
      }
    }
    
    const newRunner = new AgentRunner(
      targetAgent,
      {
        ...this.options,
        runId: this.traceId
      },
      this.callbacks
    );
    
    newRunner.isHandoffContinuation = true;
    newRunner.handoffChain = [...this.handoffChain, this.agentType];
    
    this.addTraceEvent('handoff_complete', {
      from: this.agentType,
      to: targetAgent
    });
    
    this.saveTraceData(userId, [currentResponse]);
    
    if (this.callbacks.onHandoffEnd) {
      this.callbacks.onHandoffEnd(targetAgent);
    }
    
    return await newRunner.run(userInput, attachments, userId);
  }
  
  private parseToolExecution(text: string): { toolName: string; parameters: Record<string, any> } | null {
    if (!text) return null;
    
    const toolRegex = /TOOL:\s*([a-z0-9_-]+)(?:[,\s]\s*PARAMETERS:|\s+PARAMETERS:)\s*(\{.+\})/is;
    const match = text.match(toolRegex);
    
    if (match) {
      const toolName = match[1].trim();
      let parameters: Record<string, any> = {};
      
      try {
        parameters = JSON.parse(match[2]);
      } catch (e) {
        console.error('Error parsing tool parameters:', e);
        return null;
      }
      
      return { toolName, parameters };
    }
    
    return null;
  }
  
  private async executeTool(
    toolName: string,
    parameters: Record<string, any>,
    userId: string,
    responseMessage: Message
  ): Promise<Message> {
    console.log(`Executing tool: ${toolName} with parameters:`, parameters);
    
    this.addTraceEvent('tool_execution_start', {
      toolName,
      parameters,
      messageId: responseMessage.id
    });
    
    if (responseMessage.tasks && responseMessage.tasks.length > 0) {
      responseMessage.tasks[0].status = 'in_progress';
      this.sendMessage({ ...responseMessage });
    }
    
    try {
      const { data: userCredits, error: creditsError } = await supabase
        .from('user_credits')
        .select('credits_remaining')
        .eq('user_id', userId)
        .single();
      
      if (creditsError || !userCredits) {
        throw new Error('Failed to retrieve user credits');
      }
      
      const toolExecutionStartTime = new Date().getTime();
      
      const response = await fetch('/api/execute-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: safeJsonStringify({
          toolName,
          parameters,
          userId,
          traceId: this.traceId,
          conversationId: this.conversationId
        })
      });
      
      const toolExecutionDuration = new Date().getTime() - toolExecutionStartTime;
      
      const result = await handleBrowserUseApiResponse(response);
      
      this.addTraceEvent('tool_execution_end', {
        toolName,
        success: result.success,
        duration: toolExecutionDuration,
        messageId: responseMessage.id
      });
      
      if (responseMessage.tasks && responseMessage.tasks.length > 0) {
        const task = responseMessage.tasks[0];
        task.status = result.success ? 'completed' : 'error';
        task.details = result.message || '';
        
        responseMessage.selectedTool = toolName;
        this.sendMessage({ ...responseMessage });
      }
      
      if (result.success) {
        const toolMessage: Message = {
          id: uuidv4(),
          role: 'tool',
          content: result.message || 'Tool executed successfully',
          createdAt: new Date().toISOString(),
          agentType: 'tool'
        };
        
        this.sendMessage(toolMessage);
        
        this.saveTraceData(userId, [responseMessage, toolMessage]);
      } else {
        const errorMessage = this.createErrorMessage(
          result.message || 'Tool execution failed'
        );
        this.sendMessage(errorMessage);
        
        this.saveTraceData(userId, [responseMessage, errorMessage]);
        
        return errorMessage;
      }
      
      return responseMessage;
    } catch (error) {
      console.error('Error executing tool:', error);
      
      this.addTraceEvent('tool_execution_error', {
        toolName,
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (responseMessage.tasks && responseMessage.tasks.length > 0) {
        responseMessage.tasks[0].status = 'error';
        responseMessage.tasks[0].details = error instanceof Error ? error.message : String(error);
        this.sendMessage({ ...responseMessage });
      }
      
      const errorMessage = this.createErrorMessage(
        `Error executing tool: ${error instanceof Error ? error.message : String(error)}`
      );
      this.sendMessage(errorMessage);
      
      this.saveTraceData(userId, [responseMessage, errorMessage]);
      
      return errorMessage;
    }
  }
  
  private createThinkingMessage(): Message {
    const message = createTypedMessage({
      id: uuidv4(),
      role: 'assistant',
      content: 'Thinking...',
      createdAt: new Date().toISOString(),
      agentType: this.agentType,
      status: 'thinking'
    });
    
    this.addTraceEvent('thinking', {
      messageId: message.id,
      agentType: this.agentType
    });
    
    return message;
  }
  
  private createResponseMessage(content: string, modelUsed?: string): Message {
    return {
      id: uuidv4(),
      role: 'assistant',
      content,
      createdAt: new Date().toISOString(),
      agentType: this.agentType,
      status: 'completed',
      modelUsed
    };
  }
  
  private createErrorMessage(errorText: string): Message {
    return {
      id: uuidv4(),
      role: 'assistant',
      content: `I'm sorry, there was an error: ${errorText}`,
      createdAt: new Date().toISOString(),
      agentType: this.agentType,
      status: 'error'
    };
  }
  
  private sendMessage(message: Message): void {
    if (this.callbacks.onMessage) {
      this.callbacks.onMessage(message);
    }
  }
  
  private getAttachmentTypes(attachments: Attachment[]): string[] {
    const types = new Set<string>();
    attachments.forEach(attachment => {
      types.add(attachment.type);
    });
    return Array.from(types);
  }
  
  private async getAvailableTools(): Promise<any[]> {
    try {
      return [
        { 
          name: 'browser', 
          description: 'Web browsing and automation tool',
          is_active: true,
          parameters: {
            task: {
              description: "Task for the browser to execute",
              type: "string"
            },
            save_browser_data: {
              description: "Whether to save browser session data like cookies",
              type: "boolean",
              default: true
            }
          }
        },
        { 
          name: 'product-video', 
          description: 'Generate product videos',
          is_active: true,
          parameters: {
            product_name: {
              description: "Name of the product",
              type: "string"
            },
            description: {
              description: "Description of the product",
              type: "string"
            }
          }
        },
        { 
          name: 'custom-video', 
          description: 'Create custom video content',
          is_active: true,
          parameters: {
            title: {
              description: "Title of the video",
              type: "string"
            },
            script: {
              description: "Script content for the video",
              type: "string"
            }
          }
        }
      ];
    } catch (error) {
      console.error('Error in getAvailableTools:', error);
      return [];
    }
  }

  private addTraceEvent(eventType: string, data: any): void {
    if (this.options.tracingDisabled) return;
    
    const event = createTraceEvent(eventType, data, this.agentType);
    this.traceEvents.push(event);
    
    console.log(`Trace event: ${eventType} for agent ${this.agentType}`);
  }
  
  private async saveTraceData(userId: string, messagesInThisRun: Message[] = []): Promise<void> {
    if (this.options.tracingDisabled) return;
    
    try {
      const allMessages = messagesInThisRun.map(msg => ({
        role: msg.role,
        content: msg.content,
        agentType: msg.agentType,
        status: msg.status,
        id: msg.id,
        timestamp: msg.createdAt
      }));
      
      const trace = {
        id: this.traceId,
        runId: this.traceId,
        userId,
        sessionId: this.conversationId,
        messages: allMessages,
        events: this.traceEvents,
        startTime: this.startTime,
        endTime: new Date().toISOString()
      };
      
      await saveTrace(trace);
      
      console.log(`Trace ${this.traceId} saved with ${this.traceEvents.length} events`);
    } catch (error) {
      console.error('Error saving trace data:', error);
    }
  }
}
