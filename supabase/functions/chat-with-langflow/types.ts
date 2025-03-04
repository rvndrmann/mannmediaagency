
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface RequestBody {
  message?: string;            // New simplified approach - just the message content
  activeTool?: string;         // Which tool is currently active in the UI
  userCredits?: { credits_remaining: number };
  requestId?: string;          // For tracking purposes
}

export interface ChatResponse {
  message: string;
  command: any | null;
  error?: string;
}

export interface ExtractedResponse {
  messageText: string | null;
  command: any | null;
}
