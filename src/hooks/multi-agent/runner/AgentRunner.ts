import { getTool, getToolsForLLM } from "@/hooks/multi-agent/tools";
import {
  AgentRunnerCallbacks,
  AgentRunnerOptions,
  RunResult,
} from "@/hooks/multi-agent/types";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { ChatCompletionCreateParams } from "openai/resources/chat";

export class AgentRunner {
  private agentType: string;
  private options: AgentRunnerOptions;
  private callbacks: AgentRunnerCallbacks;
  private openai: OpenAI;
  private supabase: any;

  constructor(
    agentType: string,
    options: AgentRunnerOptions,
    callbacks: AgentRunnerCallbacks
  ) {
    this.agentType = agentType;
    this.options = options;
    this.callbacks = callbacks;

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    });

    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    );
  }

  async run(input: string, attachments: any[], userId: string): Promise<RunResult> {
    try {
      // Step 1: Add user message to chat history
      const userMessage = {
        id: "user-" + Date.now(),
        createdAt: new Date(),
        content: input,
        role: "user",
        agentType: this.agentType,
        userId: userId,
        attachments: attachments,
      };
      this.callbacks.onMessage(userMessage);

      // Step 2: Construct the messages array for the OpenAI API
      const messages: ChatCompletionCreateParams.Message[] = [
        {
          role: "system",
          content: this.getSystemPrompt(),
        },
        ...this.getChatHistory(),
        {
          role: "user",
          content: input,
        },
      ];

      // Step 3: Call the OpenAI API
      const completion = await this.openai.chat.completions.create({
        messages: messages,
        model: this.options.usePerformanceModel ? "gpt-4o-2024-05-13" : "gpt-4o-2024-05-13",
        // model: this.options.usePerformanceModel ? "gpt-3.5-turbo-1106" : "gpt-4-1106-preview",
        // model: this.options.usePerformanceModel ? "gpt-3.5-turbo" : "gpt-4",
        // model: "gpt-3.5-turbo",
        // response_format: { type: "json_object" },
        temperature: 0.7,
        // stream: true,
        tools: getToolsForLLM(),
        tool_choice: "auto",
        // seed: 42,
        metadata: this.options.metadata,
      });

      // Step 4: Process the response
      const aiMessage = completion.choices[0].message;

      // Step 5: Handle tool calls
      if (aiMessage.tool_calls) {
        // Step 5a: Add AI message with tool calls to chat history
        const aiToolCallMessage = {
          id: "ai-" + Date.now(),
          createdAt: new Date(),
          content: aiMessage.content || "",
          role: "assistant",
          agentType: this.agentType,
          tool_calls: aiMessage.tool_calls,
        };
        this.callbacks.onMessage(aiToolCallMessage);

        // Step 5b: Execute tool calls
        for (const toolCall of aiMessage.tool_calls) {
          const tool = getTool(toolCall.function.name);
          if (!tool) {
            throw new Error(`Tool ${toolCall.function.name} not found`);
          }

          // Execute the tool
          const toolArgs = JSON.parse(toolCall.function.arguments);
          const toolContext = {
            userId: this.options.metadata.userId,
            creditsRemaining: 9999, // TODO: Implement credit system
            attachments: attachments,
            previousOutputs: {}, // TODO: Implement previous outputs
          };

          // Log the tool execution
          const commandId = toolCall.id;
          await this.logCommandState(commandId, "pending");

          // Execute the tool and log the result
          try {
            await this.logCommandState(commandId, "executing");
            const toolResult = await tool.execute(toolArgs, toolContext);
            await this.logCommandState(commandId, "completed", toolResult);

            // Add the tool result to chat history
            const toolResultMessage = {
              id: "tool-" + Date.now(),
              createdAt: new Date(),
              content: JSON.stringify(toolResult),
              role: "tool",
              tool_call_id: toolCall.id,
            };
            this.callbacks.onMessage(toolResultMessage);

            // If tool failed, throw an error
            if (!toolResult.success) {
              throw new Error(toolResult.message);
            }
          } catch (error: any) {
            await this.logCommandState(commandId, "failed", undefined, error.message);
            throw error;
          }
        }

        // Step 5c: If direct tool execution is disabled, handoff to tool agent
        if (!this.options.enableDirectToolExecution) {
          this.callbacks.onHandoffEnd && this.callbacks.onHandoffEnd("tool");
          return { message: "Handoff to tool agent" };
        }

        // Step 5d: Run the agent again to process the tool results
        return await this.run(input, attachments, userId);
      } else {
        // Step 6: If no tool calls, add AI message to chat history
        const aiTextMessage = {
          id: "ai-" + Date.now(),
          createdAt: new Date(),
          content: aiMessage.content || "",
          role: "assistant",
          agentType: this.agentType,
        };
        this.callbacks.onMessage(aiTextMessage);
        return { message: aiMessage.content || "" };
      }
    } catch (error: any) {
      console.error("Error in agent runner:", error);
      this.callbacks.onError(error.message);
      return { message: "", error: error.message };
    }
  }

  private getSystemPrompt(): string {
    switch (this.agentType) {
      case "script":
        return `You are a script writer. You write scripts, dialogue, and stories.`;
      case "image":
        return `You are an image prompt generator. You create detailed prompts for AI image generation.`;
      case "tool":
        return `You are a tool orchestrator. You help the user use tools to accomplish tasks.`;
      case "scene":
        return `You are a scene description generator. You create vivid scene descriptions for visual content.`;
      case "browser":
        return `You are a browser automation specialist. You help the user automate browser tasks.`;
      case "product-video":
        return `You are a product video creator. You help the user create professional product videos.`;
      case "custom-video":
        return `You are a custom video request agent. You help the user submit requests for custom videos.`;
      default:
        return `You are a general-purpose AI assistant. You are helpful, creative, clever, and friendly.`;
    }
  }

  private getChatHistory(): ChatCompletionCreateParams.Message[] {
    // Get the last 10 messages from the chat history
    const chatHistory = localStorage.getItem("multi_agent_chat_history");
    if (!chatHistory) {
      return [];
    }

    // Parse the chat history and filter out tool messages
    const messages = JSON.parse(chatHistory)
      .filter((m: any) => m.role !== "tool")
      .slice(-10)
      .map((m: any) => {
        return {
          role: m.role,
          content: m.content,
        };
      });
    return messages;
  }

  private async logCommandState(
    commandId: string,
    status: string,
    result?: any,
    error?: string
  ) {
    if (this.options.tracingDisabled) {
      return;
    }

    const updates = {
      status: status,
      result: result,
      error: error,
      end_time: new Date(),
    };

    try {
      const { error } = await this.supabase
        .from("command_execution_state")
        .update(updates)
        .eq("command_id", commandId);

      if (error) {
        console.error("Error logging command state:", error);
      }
    } catch (error) {
      console.error("Error logging command state:", error);
    }
  }
}
