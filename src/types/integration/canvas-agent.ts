
import { CanvasScene, SceneUpdateType } from "../canvas";
import { AgentType, Message } from "../multi-agent";

export interface CanvasAgentIntegration {
  projectId: string;
  sceneId: string;
  selectedScene: CanvasScene | null;
  messages: Message[];
  activeAgent: AgentType | null;
  updateScene: (sceneId: string, type: SceneUpdateType, value: string) => Promise<void>;
}

export interface CanvasToolContext {
  projectId: string;
  sceneId: string;
  scene?: CanvasScene | null;
}
