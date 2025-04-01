
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  agentType?: string; 
  sceneId?: string; // This is needed for scene references
  metadata?: Record<string, any>;
}
