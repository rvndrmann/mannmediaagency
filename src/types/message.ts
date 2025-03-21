export interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  status?: "thinking" | "working" | "completed" | "error";
  tasks?: Task[];
  command?: Command;
  agentType?: string;
  selectedTool?: string;
  attachments?: Attachment[];
  handoffRequest?: HandoffRequest;
  modelUsed?: string;
  timestamp?: string;
}

export interface HandoffRequest {
  targetAgent: string;
  reason: string;
}

export type AgentIconType = 
  | "Bot" 
  | "PenLine" 
  | "Image" 
  | "Wrench" 
  | "Code" 
  | "FileText" 
  | "Zap" 
  | "Brain" 
  | "Lightbulb" 
  | "Music" 
  | "Video"
  | "Globe"
  | "ShoppingBag";

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  icon: AgentIconType;
  color: string;
  instructions: string;
  isCustom?: boolean;
}

export interface Attachment {
  id: string;
  type: "image" | "file";
  url: string;
  name: string;
  size?: number;
  contentType?: string;
}

export interface Task {
  id: string;
  name: string;
  status: "pending" | "in-progress" | "completed" | "error";
  details?: string;
}

export interface Command {
  feature: "product-shot-v1" | "product-shot-v2" | "image-to-video" | "product-video" | "default-image";
  action: "create" | "convert" | "save" | "use" | "list";
  parameters?: {
    name?: string;
    imageId?: string;
    imageUrl?: string;
    prompt?: string;
    autoGenerate?: boolean;
    contextualData?: any;
    requestId?: string;
    [key: string]: any;
  };
  confidence?: number;
  type?: string;
  tool?: string;
  selectedTool?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
  name?: string;
}

export interface AgentCompletion {
  id: string;
  agentType: string;
  content: string;
  status: "completed" | "processing" | "error";
  createdAt: string;
}
