
// Types for browser automation tasks
export type TaskStatus = 'pending' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed' | 'expired';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'checking' | 'error' | 'retry';

export interface BrowserConfig {
  saveSession: boolean;
  autoRetry: boolean;
  autoRefresh: boolean;
  maxRetries: number;
}

export interface TaskStep {
  step: number;
  next_goal: string;
  evaluation_previous_goal?: string;
}

export interface BrowserTaskMedia {
  recordings?: string[];
  screenshots?: string[];
}

export interface BrowserTaskData {
  cookies?: any[];
  steps?: TaskStep[];
  recordings?: string[];
  screenshots?: string[];
}

export interface ChatMessage {
  type: 'user' | 'system' | 'error' | 'step' | 'recording';
  text?: string;
  stepNumber?: number;
  goal?: string;
  evaluation?: string;
  urls?: string[];
  timestamp?: string;
}

export interface BrowserTaskHistory {
  id: string;
  task_input: string;
  status: TaskStatus;
  user_id: string;
  browser_task_id?: string;
  output?: string | null;
  screenshot_url?: string | null;
  result_url?: string | null;
  browser_data?: BrowserTaskData | null;
  completed_at?: string | null;
  created_at?: string;
}

export interface BrowserTaskState {
  taskInput: string;
  isProcessing: boolean;
  currentTaskId: string | null;
  browserTaskId: string | null;
  progress: number;
  taskStatus: TaskStatus;
  error: string | null;
  screenshot: string | null;
  currentUrl: string | null;
  liveUrl: string | null;
  connectionStatus: ConnectionStatus;
  taskOutput: ChatMessage[];
  browserConfig: BrowserConfig;
}

export interface UserCredits {
  credits_remaining: number;
}
