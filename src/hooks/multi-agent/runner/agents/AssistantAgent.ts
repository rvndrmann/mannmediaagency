
import { AgentOptions, AgentResult, AgentType, RunnerContext } from "../types";
import { BaseAgentImpl } from "./BaseAgentImpl";
import OpenAI from "openai";
import { parseJsonToolCall, parseToolCall } from "../../tool-parser";
import { executeCommand } from "../../tool-executor";

export class AssistantAgent extends BaseAgentImpl {
  private model: string;
  private config: any;
  
  constructor(options: AgentOptions) {
    super(options);
    this.model = options.model || "gpt-3.5-turbo";
    this.config = options.config || {};
  }
  
  getType(): AgentType {
    return "main";
  }
  
  async process(message: string, context: RunnerContext): Promise<AgentResult> {
    try {
      // Initial setup and logging
      this.recordTraceEvent({
        type: "agent_start",
        agent: "assistant",
        timestamp: new Date().toISOString(),
        message
      });
      
      // Apply input guardrails
      const guardedInput = await this.applyInputGuardrails(message);
      
      // Get agent instructions
      const instructions = this.getInstructions();
      
      // Create a list of messages for the OpenAI API
      const messages = [
        { role: "system", content: instructions },
        ...context.history.map(item => ({
          role: item.role,
          content: item.content
        })),
        { role: "user", content: guardedInput }
      ];
      
      // Log the messages being sent to the API
      this.recordTraceEvent({
        type: "openai_request",
        messages,
        timestamp: new Date().toISOString()
      });
      
      // Call the OpenAI API
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || ""
      });
      
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: messages as any,
        temperature: 0.7
      });
      
      // Log the response from the API
      this.recordTraceEvent({
        type: "openai_response",
        response,
        timestamp: new Date().toISOString()
      });
      
      // Parse the completion content
      const completion = response.choices[0]?.message?.content || "";
      
      // Check if the response contains a tool call
      const toolCall = parseJsonToolCall(completion) || parseToolCall(completion);
      
      if (toolCall) {
        const result = await executeCommand(toolCall, {
          ...context,
          addMessage: context.addMessage || ((msg, type) => console.log(`[${type}] ${msg}`))
        });
        
        // Apply output guardrails
        const guardedOutput = await this.applyOutputGuardrails(result);
        
        // Log the tool execution
        this.recordTraceEvent({
          type: "tool_execution",
          tool: toolCall.name,
          params: toolCall.parameters,
          result: guardedOutput,
          timestamp: new Date().toISOString()
        });
        
        return {
          output: result.message,
          response: result.message,
          nextAgent: null,
          commandSuggestion: null,
          structured_output: result.data
        };
      }
      
      // Return the completion as the final output
      return {
        output: completion,
        response: completion,
        nextAgent: null
      };
    } catch (error) {
      // Log the error and return it
      this.recordTraceEvent({
        type: "agent_error",
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return {
        output: `Error in AssistantAgent: ${error.message}`,
        response: `Error in AssistantAgent: ${error.message}`,
        nextAgent: null
      };
    }
  }
}
