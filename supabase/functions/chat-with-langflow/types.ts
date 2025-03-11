
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

export interface MCPToolParameter {
  name: string;
  value: string | number | boolean;
  description?: string;
}

export interface MCPTool {
  tool_name: string;
  description: string;
  required_parameters: string[];
  parameters?: MCPToolParameter[];
}

export interface MCPQueryPayload {
  query: string;
  include_citations?: boolean;
  target_audience?: "beginner" | "intermediate" | "expert";
  response_tokens?: number;
  enable_image_generation?: boolean;
  enable_video_generation?: boolean;
  available_tools?: MCPTool[];
  suggested_tool?: string;
  selected_tool?: string;   // Added this field for tracking which tool was used
}

export interface MCPResponse {
  response: string;
  citations?: Array<{
    text: string;
    source: string;
  }>;
  generated_media?: GeneratedMedia;
  selected_tool?: string;
  tool_parameters?: Record<string, any>;
  tool_selection_confidence?: number;
}
