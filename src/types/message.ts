
export interface Message {
  role: "user" | "assistant";
  content: string;
  status?: "thinking" | "working" | "completed" | "error";
  tasks?: Task[];
  command?: Command;
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
    contextualData?: any; // Additional context data from AI analysis
  };
  confidence?: number; // Confidence score from AI detection
}
