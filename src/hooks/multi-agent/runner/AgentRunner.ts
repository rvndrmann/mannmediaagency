import { v4 as uuidv4 } from "uuid";
import { Message, Attachment } from "@/types/message";
import { getTool } from "../tools";
import { ToolContext } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { AssistantAgent } from "./agents/AssistantAgent";
import { ScriptWriterAgent } from "./agents/ScriptWriterAgent";
import { ToolAgent } from "./agents/ToolAgent";
import { ImageGeneratorAgent } from "./agents/ImageGeneratorAgent";
import { SceneGeneratorAgent } from "./agents/SceneGeneratorAgent";

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
}

export class AgentRunner {
  private agentType: string;
  private params: AgentRunnerParams;
  private callbacks: AgentRunnerCallbacks;
  private status: "idle" | "running" | "completed" | "error" = "idle";
  private controller: AbortController | null = null;

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

    const agentContext = this.createAgentContext(userId);

    try {
      let agentResponse: string | null = null;
      let nextAgent: string | null = null;

      switch (this.agentType) {
        case "main":
        case "assistant":
          const assistantAgent = new AssistantAgent(agentContext);
          ({ response: agentResponse, nextAgent } = await assistantAgent.run(input, attachments));
          break;
        case "script":
          const scriptWriterAgent = new ScriptWriterAgent(agentContext);
          ({ response: agentResponse, nextAgent } = await scriptWriterAgent.run(input, attachments));
          break;
        case "image":
          const imageGeneratorAgent = new ImageGeneratorAgent(agentContext);
          ({ response: agentResponse, nextAgent } = await imageGeneratorAgent.run(input, attachments));
          break;
        case "scene":
          const sceneGeneratorAgent = new SceneGeneratorAgent(agentContext);
          ({ response: agentResponse, nextAgent } = await sceneGeneratorAgent.run(input, attachments));
          break;
        case "tool":
          const toolAgent = new ToolAgent(agentContext);
          ({ response: agentResponse, nextAgent } = await toolAgent.run(input, attachments));
          break;
        default:
          this.status = "error";
          throw new Error(`Unknown agent type: ${this.agentType}`);
      }

      if (agentResponse) {
        this.addMessage(agentResponse, "agent", attachments);
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
      toolAvailable: this.toolAvailable.bind(this)
    };
  }

  private addMessage(text: string, type: string, attachments: Attachment[] = []) {
    const message: Message = {
      id: uuidv4(),
      role: type === "agent" ? "assistant" : "user",
      content: text,
      createdAt: new Date().toISOString(),
      agentType: this.agentType,
      attachments: attachments
    };
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
