
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface RequestBody {
  messages?: Message[];
  activeTool?: string;
  userCredits?: { credits_remaining: number };
  command?: any;
  detectedMessage?: string;
  rawMessage?: string;
  processedMessageHistory?: string;
  requestId?: string;
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
