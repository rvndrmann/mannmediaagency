
export enum CommandExecutionState {
  COMPLETED = "completed",
  FAILED = "failed",
  PROCESSING = "processing",
  ERROR = "error",
  PENDING = "pending",
  RUNNING = "running",
  CANCELLED = "cancelled"
}

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  state: CommandExecutionState;
  usage?: {
    creditsUsed?: number;
  };
}

export interface ToolContext {
  supabase: any;
  user: any;
  session: any;
  userId?: string;
  projectId?: string;
  [key: string]: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  execute: (parameters: any, context: ToolContext) => Promise<ToolExecutionResult>;
  parameters: {
    type: string;
    properties: { [key: string]: any };
    required: string[];
  };
  metadata?: {
    category?: string;
    displayName?: string;
    icon?: string;
  };
  requiredCredits?: number;
  version?: string;
}

import { CanvasProject, CanvasScene } from "@/types/canvas";
import { Message } from "@/types/message";

export interface CanvasEmptyStateProps {
  onCreateProject: (title: string, description?: string) => Promise<CanvasProject>;
}

export interface CanvasHeaderProps {
  project: CanvasProject | null;
  onUpdateProject: (id: string, updates: Partial<CanvasProject>) => Promise<CanvasProject>;
  showScriptPanel: boolean;
  showDetailPanel: boolean;
  onToggleScriptPanel: () => void;
  onToggleDetailPanel: () => void;
}

export interface CanvasSidebarProps {
  project: CanvasProject | null;
  scenes: CanvasScene[];
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  createScene: (projectId: string, data: any) => Promise<any>;
  deleteScene: (sceneId: string) => Promise<void>;
  loading: boolean;
}

export interface CanvasWorkspaceProps {
  project: CanvasProject | null;
  selectedScene: CanvasScene | null;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  createScene: (projectId: string, data: any) => Promise<any>;
  updateScene: (sceneId: string, type: string, value: string) => Promise<void>;
  agent: {
    isLoading: boolean;
    messages: Message[];
    generateSceneScript: (sceneId: string, context?: string) => Promise<boolean>;
    generateSceneDescription: (sceneId: string, context?: string) => Promise<boolean>;
    generateImagePrompt: (sceneId: string, context?: string) => Promise<boolean>;
    generateSceneImage: (sceneId: string, imagePrompt?: string) => Promise<boolean>;
    generateSceneVideo: (sceneId: string, description?: string) => Promise<boolean>;
    addUserMessage: (content: string) => Message;
    addAgentMessage: (agentType: string, content: string, sceneId?: string) => Message;
    addSystemMessage: (content: string) => Message;
    activeAgent: string;
    isMcpEnabled?: boolean;
    isMcpConnected?: boolean;
    toggleMcp?: () => void;
    isGenerating: boolean;
  };
}

export interface CanvasDetailPanelProps {
  scene: CanvasScene | null;
  projectId: string;
  updateScene: (sceneId: string, type: string, value: string) => Promise<void>;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export interface CanvasScriptPanelProps {
  scene: CanvasScene | null;
  projectId: string;
  onUpdateScene: (sceneId: string, type: string, value: string) => Promise<void>;
  onClose: () => void;
}

export interface WorkflowStatusProps {
  projectId: string;
  onComplete: () => void;
}
