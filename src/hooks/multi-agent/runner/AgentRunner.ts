
import { v4 as uuidv4 } from "uuid";
import { Message, Attachment } from "@/types/message";
import { getTool } from "../tools";
import { ToolContext, AgentConfig } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { AssistantAgent } from "./agents/AssistantAgent";
import { ScriptWriterAgent } from "./agents/ScriptWriterAgent";
import { ToolAgent } from "./agents/ToolAgent";
import { ImageGeneratorAgent } from "./agents/ImageGeneratorAgent";
import { SceneGeneratorAgent } from "./agents/SceneGeneratorAgent";
import { AgentOptions } from "./types";

interface AgentRunnerParams {
  usePerformanceModel: boolean;
  enableDirectToolExecution: boolean;
  tracingDisabled: boolean;
  metadata: Record<string, any>;
  runId: string;
  groupId: string;
}

interface AgentRunnerCallbacks {
  onMessage: (message: Message) => void;
  onError: (error: string) => void;
  onHandoffEnd: (toAgent: string) => void;
  onToolExecution?: (toolName: string, params: any) => void;
}

export class AgentRunner {
  private agentType: string;
  private params: AgentRunnerParams;
  private callbacks: AgentRunnerCallbacks;
  private status: "idle" | "running" | "completed" | "error" = "idle";
  private controller: AbortController | null = null;
  private currentAttachments: Attachment[] = [];
  private userMessage: Message | null = null;

  constructor(agentType: string, params: AgentRunnerParams, callbacks: AgentRunnerCallbacks) {
    this.agentType = agentType;
    this.params = params;
    this.callbacks = callbacks;
  }

  public async run(input: string, attachments: Attachment[], userId: string): Promise<void> {
    if (this.status === "running") {
      console.warn("Agent is already running.");
      return;
    }

    this.status = "running";
    this.controller = new AbortController();
    this.currentAttachments = attachments;
    
    // Create and add the user message
    this.userMessage = {
      id: uuidv4(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
      attachments: attachments
    };
    this.callbacks.onMessage(this.userMessage);

    const toolContext = this.createAgentContext(userId);

    try {
      let agentResponse: string | null = null;
      let nextAgent: string | null = null;
      let commandSuggestion: any = null;

      // Create agent configuration based on agent type
      const agentConfig: AgentConfig = {
        name: this.agentType,
        instructions: this.getAgentInstructions(this.agentType),
        modelName: this.params.usePerformanceModel ? "gpt-4o-mini" : "gpt-4o",
        modelSettings: {
          temperature: 0.7,
          top_p: 1.0,
          max_tokens: 2048
        }
      };

      // Create agent options with configuration and context
      const agentOptions: AgentOptions = {
        config: agentConfig,
        context: toolContext
      };

      switch (this.agentType) {
        case "main":
        case "assistant":
          const assistantAgent = new AssistantAgent(agentOptions);
          ({ response: agentResponse, nextAgent, commandSuggestion } = await assistantAgent.run(input, attachments));
          break;
        case "script":
          const scriptWriterAgent = new ScriptWriterAgent(agentOptions);
          ({ response: agentResponse, nextAgent } = await scriptWriterAgent.run(input, attachments));
          break;
        case "image":
          const imageGeneratorAgent = new ImageGeneratorAgent(agentOptions);
          ({ response: agentResponse, nextAgent } = await imageGeneratorAgent.run(input, attachments));
          break;
        case "scene":
          const sceneGeneratorAgent = new SceneGeneratorAgent(agentOptions);
          ({ response: agentResponse, nextAgent } = await sceneGeneratorAgent.run(input, attachments));
          break;
        case "tool":
          const toolAgent = new ToolAgent(agentOptions);
          ({ response: agentResponse, nextAgent, commandSuggestion } = await toolAgent.run(input, attachments));
          break;
        default:
          this.status = "error";
          throw new Error(`Unknown agent type: ${this.agentType}`);
      }

      // Process any command suggestion if present and direct tool execution is enabled
      if (commandSuggestion && this.params.enableDirectToolExecution) {
        await this.executeToolCommand(commandSuggestion, userId);
      }

      if (agentResponse) {
        this.addMessage(agentResponse, "agent", []);
      }

      if (this.status === "running" || this.status === "error") {
        this.status = "completed";
      }
      
      if (nextAgent) {
        this.callbacks.onHandoffEnd(nextAgent);
      }
    } catch (error: any) {
      this.status = "error";
      console.error("Agent run failed:", error);
      this.callbacks.onError(error.message || "Agent run failed");
    } finally {
      this.controller = null;
    }
  }

  // Get default instructions for each agent type
  private getAgentInstructions(agentType: string): string {
    switch (agentType) {
      case "main":
      case "assistant":
        return "You are a helpful assistant. Provide detailed and accurate information to user queries. If a specialized agent would be better suited to handle the request, suggest a handoff.";
      case "script":
        return "You are a script writing assistant. Create compelling narratives, dialog, and story structure. Focus on creativity and proper formatting.";
      case "image":
        return "You are an image prompt generator. Create detailed and evocative descriptions that can be used to generate images.";
      case "scene":
        return "You are a scene creator. Develop rich, detailed environments and settings that bring stories to life.";
      case "tool":
        return "You are a tool specialist. Help users utilize available tools effectively and suggest the most appropriate tool for each task.";
      default:
        return "You are a helpful assistant.";
    }
  }

  private async executeToolCommand(command: any, userId: string): Promise<void> {
    const { name, parameters } = command;
    
    if (!name) {
      console.error("Invalid tool command: missing tool name");
      return;
    }

    const tool = getTool(name);
    if (!tool) {
      console.error(`Tool not found: ${name}`);
      return;
    }

    try {
      // Notify about tool execution
      if (this.callbacks.onToolExecution) {
        this.callbacks.onToolExecution(name, parameters);
      }

      // Create tool execution message
      const toolMessage: Message = {
        id: uuidv4(),
        role: "tool",
        content: `Executing ${name} tool with parameters: ${JSON.stringify(parameters, null, 2)}`,
        createdAt: new Date().toISOString(),
        tool_name: name,
        tool_arguments: JSON.stringify(parameters),
        status: "working"
      };
      this.callbacks.onMessage(toolMessage);

      // Execute the tool
      const toolContext = this.createAgentContext(userId);
      const result = await tool.execute(parameters, toolContext);

      // Update the tool message with the result
      const updatedToolMessage: Message = {
        ...toolMessage,
        content: result.success 
          ? `Tool execution completed: ${JSON.stringify(result.data, null, 2)}` 
          : `Tool execution failed: ${result.error}`,
        status: result.success ? "completed" : "error"
      };
      this.callbacks.onMessage(updatedToolMessage);

      // Generate an agent response about the tool execution
      const responseMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: result.success 
          ? `I've executed the ${name} tool successfully. ${result.data?.message || ''}` 
          : `I attempted to use the ${name} tool, but encountered an error: ${result.error}`,
        createdAt: new Date().toISOString(),
        agentType: this.agentType
      };
      this.callbacks.onMessage(responseMessage);
    } catch (error: any) {
      console.error(`Error executing tool ${name}:`, error);
      
      // Create error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: `I attempted to use the ${name} tool, but encountered an error: ${error.message}`,
        createdAt: new Date().toISOString(),
        agentType: this.agentType
      };
      this.callbacks.onMessage(errorMessage);
    }
  }

  private createAgentContext(userId: string): ToolContext {
    return {
      supabase,
      runId: this.params.runId,
      groupId: this.params.groupId,
      userId: userId,
      usePerformanceModel: this.params.usePerformanceModel,
      enableDirectToolExecution: this.params.enableDirectToolExecution,
      tracingDisabled: this.params.tracingDisabled,
      metadata: this.params.metadata,
      abortSignal: this.controller?.signal,
      addMessage: this.addMessage.bind(this),
      toolAvailable: this.toolAvailable.bind(this),
      attachments: this.currentAttachments,
      creditsRemaining: this.params.metadata.creditsRemaining,
      executeTool: this.executeTool.bind(this)
    };
  }

  private async executeTool(toolName: string, params: any): Promise<any> {
    const tool = getTool(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const context = this.createAgentContext(user.id);
    return await tool.execute(params, context);
  }

  private addMessage(text: string, type: string, attachments: Attachment[] = []) {
    const message: Message = {
      id: uuidv4(),
      role: type === "agent" ? "assistant" : (type === "tool" ? "tool" : "user"),
      content: text,
      createdAt: new Date().toISOString(),
      agentType: this.agentType,
      attachments: attachments
    };
    
    console.log("Adding message:", message);
    this.callbacks.onMessage(message);
  }

  private toolAvailable(toolName: string): boolean {
    const tool = getTool(toolName);
    return !!tool;
  }

  public stop(): void {
    if (this.controller) {
      this.controller.abort();
      this.status = "idle";
    }
  }
}
