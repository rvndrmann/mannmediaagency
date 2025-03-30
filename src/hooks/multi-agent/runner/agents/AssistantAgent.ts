
import { Attachment } from "@/types/message";
import { AgentResult, AgentOptions, AgentType } from "../types";
import { BaseAgentImpl } from "../BaseAgentImpl";
import { supabase } from "@/integrations/supabase/client";

export class AssistantAgent extends BaseAgentImpl {
  constructor(options: AgentOptions) {
    super(options);
  }

  getType(): AgentType {
    return "assistant";
  }

  async run(input: string, attachments: Attachment[] = []): Promise<AgentResult> {
    try {
      this.recordTraceEvent("agent_run_start", {
        input_length: input.length,
        has_attachments: attachments.length > 0
      });
      
      // Apply input guardrails
      await this.applyInputGuardrails(input);
      
      // Prepare the conversation history
      const conversationHistory = this.context.metadata?.conversationHistory || [];
      
      // Get agent instructions
      const instructions = await this.getInstructions(this.context);
      
      const streamHandler = this.streamingHandler;
      const useStream = !!streamHandler;
      
      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke('multi-agent-chat', {
        body: {
          agentType: this.getType(),
          input,
          userId: this.context.userId,
          runId: this.context.runId,
          groupId: this.context.groupId,
          attachments,
          contextData: {
            ...this.context.metadata,
            instructions: {
              [this.getType()]: instructions
            }
          },
          conversationHistory,
          usePerformanceModel: this.context.usePerformanceModel,
          enableDirectToolExecution: this.context.enableDirectToolExecution,
          streamResponse: useStream
        }
      });
      
      if (error) {
        this.recordTraceEvent("agent_run_error", {
          error: error.message
        });
        throw error;
      }
      
      // Handle response based on whether we're streaming or not
      if (useStream) {
        // For streaming, process is handled through callback
        this.recordTraceEvent("agent_streaming_setup", {
          endpoint: 'multi-agent-chat'
        });
        
        // Return a promise that will be resolved when streaming is complete
        return new Promise((resolve, reject) => {
          try {
            // Create an EventSource to handle the streaming response
            // Use the full URL for the edge function
            const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://avdwgvjhufslhqrrmxgo.supabase.co';
            const funcUrl = `${SUPABASE_URL}/functions/v1/multi-agent-chat`;
            const body = {
              agentType: this.getType(),
              input,
              userId: this.context.userId,
              runId: this.context.runId,
              groupId: this.context.groupId,
              attachments,
              contextData: {
                ...this.context.metadata,
                instructions: {
                  [this.getType()]: instructions
                }
              },
              conversationHistory,
              usePerformanceModel: this.context.usePerformanceModel,
              enableDirectToolExecution: this.context.enableDirectToolExecution,
              streamResponse: true
            };
            
            // We use fetch for streaming
            fetch(funcUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
              },
              body: JSON.stringify(body)
            }).then(response => {
              if (!response.body) {
                reject(new Error("No response body"));
                return;
              }
              
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let responseText = '';
              let handoff = null;
              let structuredOutput = null;
              
              // Read the stream
              const processStream = ({ done, value }: ReadableStreamReadResult<Uint8Array>) => {
                if (done) {
                  // When stream is complete, resolve with final result
                  this.recordTraceEvent("streaming_complete", {
                    responseLength: responseText.length,
                    handoff: handoff ? true : false
                  });
                  
                  resolve({
                    response: responseText,
                    nextAgent: handoff?.targetAgent,
                    handoffReason: handoff?.reason,
                    additionalContext: handoff?.additionalContext,
                    structured_output: structuredOutput
                  });
                  return;
                }
                
                // Decode chunk
                const chunk = decoder.decode(value, { stream: true });
                
                // Process the chunk
                chunk.split('\n\n').forEach(line => {
                  if (line.startsWith('data: ')) {
                    try {
                      const jsonStr = line.substring(6);
                      
                      // Check for the done signal
                      if (jsonStr === '[DONE]') {
                        return;
                      }
                      
                      const data = JSON.parse(jsonStr);
                      
                      if (data.type === 'chunk') {
                        // Streaming text chunk
                        if (streamHandler) {
                          streamHandler(data.content);
                        }
                        responseText += data.content;
                      } else if (data.type === 'complete') {
                        // Complete message with metadata
                        responseText = data.content;
                        handoff = data.handoff;
                        structuredOutput = data.structuredOutput;
                      } else if (data.type === 'error') {
                        this.recordTraceEvent("streaming_error", {
                          error: data.content
                        });
                        console.error("Streaming error:", data.content);
                      }
                    } catch (err) {
                      console.error("Error parsing SSE line:", err, line);
                    }
                  }
                });
                
                // Continue reading
                reader.read().then(processStream).catch(err => {
                  this.recordTraceEvent("streaming_error", {
                    error: err.message
                  });
                  reject(err);
                });
              };
              
              // Start reading the stream
              reader.read().then(processStream).catch(err => {
                this.recordTraceEvent("streaming_error", {
                  error: err.message
                });
                reject(err);
              });
            }).catch(err => {
              this.recordTraceEvent("streaming_error", {
                error: err.message
              });
              reject(err);
            });
          } catch (err) {
            this.recordTraceEvent("streaming_setup_error", {
              error: err instanceof Error ? err.message : String(err)
            });
            reject(err);
          }
        });
      }
      
      // For non-streaming response
      if (!data) {
        throw new Error("No data returned from edge function");
      }
      
      const { responseText, handoff, structuredOutput } = data;
      
      // Apply output guardrails
      await this.applyOutputGuardrails(responseText);
      
      this.recordTraceEvent("agent_run_complete", {
        responseLength: responseText.length,
        hasHandoff: !!handoff,
        hasStructuredOutput: !!structuredOutput
      });
      
      // Return the agent result
      return {
        response: responseText,
        nextAgent: handoff?.targetAgent,
        handoffReason: handoff?.reason,
        additionalContext: handoff?.additionalContext,
        structured_output: structuredOutput
      };
    } catch (error) {
      this.recordTraceEvent("agent_run_error", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
      
      console.error(`${this.getType()} agent error:`, error);
      throw error;
    }
  }
}
