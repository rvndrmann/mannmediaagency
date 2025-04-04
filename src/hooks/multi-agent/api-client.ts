
// Add thread_id to params and response
import { Message } from "@/types/message";
// Keep AgentType for now if used elsewhere, but less relevant for API call
import { AgentType } from "./runner/types";
import { supabase } from "@/integrations/supabase/client"; // Import supabase client

interface SendChatMessageParams {
  input: string;
  // agentType: AgentType; // Less relevant for Assistants API call
  conversationHistory: Message[]; // May be less relevant if thread handles history
  usePerformanceModel: boolean; // Less relevant, model is on Assistant
  attachments?: any[];
  runId: string; // Keep for logging/tracing if needed
  groupId: string; // Keep for logging/tracing if needed
  projectId?: string;
  contextData?: Record<string, any>; // Keep if sending extra context
  thread_id?: string | null;
  sceneId?: string; // <-- Add sceneId
}

interface ChatMessageResponse {
  content: string;
  thread_id: string; // <-- Add thread_id
  run_id: string; // <-- Add run_id
  // Remove old fields
  // agentType: AgentType;
  // handoffRequest?: { ... };
  // command?: { ... };
  // metadata?: Record<string, any>; // Add back if backend sends useful metadata
}

export async function sendChatMessage(params: SendChatMessageParams): Promise<ChatMessageResponse> {
  try {
    // Prepare the body, explicitly including thread_id
    const bodyPayload: any = { // Use 'any' temporarily or define a specific type
        input: params.input,
        projectId: params.projectId,
        thread_id: params.thread_id,
        // Include other relevant params needed by the edge function
        contextData: params.contextData,
        attachments: params.attachments
    };
    // Conditionally add sceneId if it exists
    if (params.sceneId) {
        bodyPayload.sceneId = params.sceneId;
    }

    // Get the current session token
    const sessionResponse = await supabase.auth.getSession();
    const accessToken = sessionResponse?.data?.session?.access_token;

    if (!accessToken) {
      throw new Error("User not authenticated.");
    }

    const { data, error } = await supabase.functions.invoke<ChatMessageResponse>('multi-agent-chat', {
      body: bodyPayload,
      headers: {
        'Authorization': `Bearer ${accessToken}` // Manually set the Authorization header
      }
    });

    // Log the raw result from the invoke call IMMEDIATELY
    if (error) {
      // Handle Supabase function invocation error
      throw new Error(`Supabase function error: ${error.message}`);
    }

    if (!data) {
      throw new Error("No data received from Supabase function.");
    }

    // Ensure the response has the expected fields
    if (!data.content || !data.thread_id || !data.run_id) {
        console.error("Incomplete response received from edge function:", data); // Keep original error log
        throw new Error("Incomplete response received from Supabase function.");
    }

    return data;
  } catch (error) {
    console.error("Error in sendChatMessage:", error);
    // Ensure the error is re-thrown correctly
    if (error instanceof Error) {
      throw new Error(`Failed to send chat message: ${error.message}`);
    } else {
      throw new Error(`Failed to send chat message due to an unknown error.`);
    }
  }
}

// Additional API client functions can be added here
