
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  agentType?: string; 
  sceneId?: string; // Add this property to support scene references
  metadata?: Record<string, any>;
}
