
import { Message } from './message';

export interface UseCanvasAgentReturn {
  // Original properties
  isLoading: boolean;
  messages: Message[];
  generateSceneScript: (sceneId: string, context?: string) => Promise<boolean>;
  generateSceneDescription: (sceneId: string, context?: string) => Promise<boolean>;
  generateImagePrompt: (sceneId: string, context?: string) => Promise<boolean>;
  generateSceneImage: (sceneId: string, imagePrompt?: string) => Promise<boolean>;
  generateSceneVideo: (sceneId: string, description?: string) => Promise<boolean>;
  activeAgent: string;
  
  // Additional properties needed by Canvas.tsx
  addUserMessage: (content: string) => Message;
  addAgentMessage: (agentType: string, content: string, sceneId?: string) => Message;
  addSystemMessage: (content: string) => Message;
  isMcpEnabled: boolean;
  isMcpConnected: boolean;
  toggleMcp: () => void;
  isGeneratingDescription: boolean;
  isGeneratingImagePrompt: boolean;
  isGeneratingImage: boolean;
  isGeneratingVideo: boolean;
  isGeneratingScript: boolean;
}
