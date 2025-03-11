
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface RequestBody {
  message: string;            // Only the message content
  requestId?: string;         // For tracking purposes
  useAssistantsApi?: boolean; // Optional flag to use Assistants API
  useMcp?: boolean;          // Optional flag to use MCP
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

export interface GeneratedMedia {
  type: "image" | "video";
  url: string;
  prompt?: string;
}

export interface MCPQueryPayload {
  query: string;
  include_citations?: boolean;
  target_audience?: "beginner" | "intermediate" | "expert";
  response_tokens?: number;
  enable_image_generation?: boolean;
  enable_video_generation?: boolean;
}

export interface MCPResponse {
  response: string;
  citations?: Array<{
    text: string;
    source: string;
  }>;
  generated_media?: GeneratedMedia;
}
