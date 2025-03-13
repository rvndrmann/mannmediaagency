
export interface Message {
  role: "user" | "assistant";
  content: string;
  status?: "thinking" | "working" | "completed" | "error";
  tasks?: Task[];
  command?: Command;
  selectedTool?: string;
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
  };
  confidence?: number;
  type?: string;
  tool?: string;
  selectedTool?: string;
}

export interface AdminMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  message_type: "admin_to_user" | "user_to_admin";
  created_at: string;
  updated_at: string;
}
