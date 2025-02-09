
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ResearchMaterial {
  id: string;
  content_type: 'text' | 'url' | 'image';
  content: string;
  summary: string;
  created_at: string;
}
