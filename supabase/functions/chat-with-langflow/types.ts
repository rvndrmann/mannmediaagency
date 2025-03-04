
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface RequestBody {
  message: string;            // Only the message content
  requestId?: string;         // For tracking purposes
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
