import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { Message, Attachment, Task, HandoffRequest } from '@/types/message';
import { toast } from 'sonner';

// Define built-in agent types
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
  }

  public async run(
    userInput: string,
    attachments: Attachment[] = [],
    userId: string
  ): Promise<Message> {
    console.log(`Running ${this.agentType} agent with input: ${userInput.slice(0, 50)}...`);
    
    try {
      // Create initial thinking message
      const thinkingMessage = this.createThinkingMessage();
      this.sendMessage(thinkingMessage);
      
      // Prepare messages for the API
      const messages = await this.prepareMessages(userInput, attachments);
      
      // Check if this is a tool agent with a requested tool
      const requestedTool = this.options.metadata?.requestedTool;
      const isToolAgent = this.agentType === 'tool' && requestedTool;
      
      if (isToolAgent) {
        console.log(`Tool agent requested with specific tool: ${requestedTool}`);
      }
      
      // Get context data for the API
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
      
      // Call the agent API
      const { completion, handoffRequest, modelUsed } = await this.callAgentApi(
        messages,
        userId,
        contextData
      );
      
      // Process the response
      const responseMessage = this.createResponseMessage(completion, modelUsed);
      
      // Handle handoff if needed
      if (handoffRequest) {
        return await this.handleHandoff(
          handoffRequest,
          userInput,
          attachments,
          userId,
          responseMessage
        );
      }
      
      // Check for tool execution
      if (this.agentType === 'tool') {
        const toolExecution = this.parseToolExecution(completion);
        if (toolExecution) {
          responseMessage.command = {
            toolName: toolExecution.toolName,
            feature: toolExecution.toolName,
            parameters: toolExecution.parameters
          };
          
          // Add task for tool execution
          const task: Task = {
            id: uuidv4(),
            name: `Executing ${toolExecution.toolName}`,
            status: 'pending'
          };
          
          responseMessage.tasks = [task];
          this.sendMessage(responseMessage);
          
          // Execute the tool
          return await this.executeTool(
            toolExecution.toolName,
            toolExecution.parameters,
            userId,
            responseMessage
          );
        }
      }
      
      // Send the final response
      this.sendMessage(responseMessage);
      return responseMessage;
    } catch (error) {
      console.error(`Error in ${this.agentType} agent:`, error);
      const errorMessage = this.createErrorMessage(
        error instanceof Error ? error.message : String(error)
      );
      this.sendMessage(errorMessage);
      
      if (this.callbacks.onError) {
        this.callbacks.onError(error instanceof Error ? error.message : String(error));
      }
      
      return errorMessage;
    }
  }
  
  private async prepareMessages(
    userInput: string,
    attachments: Attachment[] = []
  ): Promise<any[]> {
    // Format user input with attachments if any
    let formattedInput = userInput;
    
    if (attachments.length > 0) {
      // Add attachment information to the user input
      attachments.forEach(attachment => {
        const attachmentType = attachment.type === 'image' ? 'image' : 'file';
        formattedInput += `\n\n[Attached ${attachmentType}: ${attachment.name}, URL: ${attachment.url}]`;
      });
    }
    
    // Create the user message
    const userMessage = {
      role: 'user',
      content: formattedInput
    };
    
    // For handoff continuation, we need to add the previous agent's name
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
        body: JSON.stringify({
          messages,
          agentType: this.agentType,
          userId,
          contextData
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API returned ${response.status}`);
      }
      
      return await response.json();
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
    
    // Update the current response with handoff information
    currentResponse.handoffRequest = handoffRequest;
    this.sendMessage(currentResponse);
    
    // Check if the target agent is valid
    const isBuiltInTarget = [...BUILT_IN_AGENT_TYPES, ...BUILT_IN_TOOL_TYPES].includes(targetAgent);
    
    if (!isBuiltInTarget) {
      // Check if it's a valid custom agent
      const { data, error } = await supabase
        .from('custom_agents')
        .select('id, name')
        .eq('id', targetAgent)
        .single();
      
      if (error || !data) {
        console.error(`Invalid handoff target: ${targetAgent}`, error);
        const errorMessage = this.createErrorMessage(
          `Cannot hand off to unknown agent: ${targetAgent}`
        );
        this.sendMessage(errorMessage);
        return errorMessage;
      }
    }
    
    // Create a new runner for the target agent
    const newRunner = new AgentRunner(
      targetAgent,
      {
        ...this.options,
        runId: this.traceId // Keep the same trace ID
      },
      this.callbacks
    );
    
    // Set handoff continuation flag and update chain
    newRunner.isHandoffContinuation = true;
    newRunner.handoffChain = [...this.handoffChain, this.agentType];
    
    // Notify about handoff completion
    if (this.callbacks.onHandoffEnd) {
      this.callbacks.onHandoffEnd(targetAgent);
    }
    
    // Run the new agent
    return await newRunner.run(userInput, attachments, userId);
  }
  
  private parseToolExecution(text: string): { toolName: string; parameters: Record<string, any> } | null {
    if (!text) return null;
    
    // Look for the tool execution pattern
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
    
    // Update task status
    if (responseMessage.tasks && responseMessage.tasks.length > 0) {
      responseMessage.tasks[0].status = 'in_progress';
      this.sendMessage({ ...responseMessage });
    }
    
    try {
      // Get user credits
      const { data: userCredits, error: creditsError } = await supabase
        .from('user_credits')
        .select('credits_remaining')
        .eq('user_id', userId)
        .single();
      
      if (creditsError || !userCredits) {
        throw new Error('Failed to retrieve user credits');
      }
      
      // Call the tool execution API
      const response = await fetch('/api/execute-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toolName,
          parameters,
          userId,
          traceId: this.traceId,
          conversationId: this.conversationId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Tool API returned ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update task status
      if (responseMessage.tasks && responseMessage.tasks.length > 0) {
        const task = responseMessage.tasks[0];
        task.status = result.success ? 'completed' : 'error';
        task.details = result.message;
        
        // Update the response message
        responseMessage.selectedTool = toolName;
        this.sendMessage({ ...responseMessage });
      }
      
      // If the tool execution was successful, create a tool message
      if (result.success) {
        const toolMessage: Message = {
          id: uuidv4(),
          role: 'tool',
          content: result.message || 'Tool executed successfully',
          createdAt: new Date().toISOString(),
          agentType: 'tool'
        };
        
        this.sendMessage(toolMessage);
      } else {
        // If the tool execution failed, create an error message
        const errorMessage = this.createErrorMessage(
          result.message || 'Tool execution failed'
        );
        this.sendMessage(errorMessage);
        return errorMessage;
      }
      
      return responseMessage;
    } catch (error) {
      console.error('Error executing tool:', error);
      
      // Update task status to error
      if (responseMessage.tasks && responseMessage.tasks.length > 0) {
        responseMessage.tasks[0].status = 'error';
        responseMessage.tasks[0].details = error instanceof Error ? error.message : String(error);
        this.sendMessage({ ...responseMessage });
      }
      
      const errorMessage = this.createErrorMessage(
        `Error executing tool: ${error instanceof Error ? error.message : String(error)}`
      );
      this.sendMessage(errorMessage);
      return errorMessage;
    }
  }
  
  private createThinkingMessage(): Message {
    return {
      id: uuidv4(),
      role: 'assistant',
      content: 'Thinking...',
      createdAt: new Date().toISOString(),
      agentType: this.agentType,
      status: 'thinking'
    };
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
      // Check if the tools table exists before querying
      const { error: checkError } = await supabase
        .from('tools')
        .select('count')
        .limit(1)
        .single();
        
      // If there's an error, it likely means the table doesn't exist
      if (checkError) {
        console.error('Error checking tools table:', checkError);
        return [];
      }
      
      // If no error, proceed with fetching tools
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .eq('is_active', true);
      
      if (error) {
        console.error('Error fetching tools:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getAvailableTools:', error);
      return [];
    }
  }
}
