
export type TaskStatus = 'idle' | 'created' | 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped' | 'finished';

export interface TaskStep {
  id: string;
  task_id: string;
  description: string;
  status: string;
  details?: string | null;
  created_at: string;
}

export interface UserCredits {
  id: string;
  user_id: string;
  credits_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface BrowserConfig {
  persistentSession: boolean;
  useOwnBrowser: boolean;
  resolution: string;
  theme: string;
  darkMode: boolean;
  headless: boolean;
  disableSecurity: boolean;
  contextConfig: {
    minWaitPageLoadTime: number;
    waitForNetworkIdlePageLoadTime: number;
    maxWaitPageLoadTime: number;
    browserWindowSize: { width: number; height: number };
    highlightElements: boolean;
    viewportExpansion: number;
  };
}

export interface CaptureWebsiteResponse {
  url: string;
  imageUrl: string;
}

export interface BrowserTaskState {
  taskInput: string;
  currentTaskId: string | null;
  isProcessing: boolean;
  progress: number;
  taskSteps: TaskStep[];
  taskOutput: string | null;
  taskStatus: TaskStatus;
  currentUrl: string | null;
  error: string | null;
  browserConfig: BrowserConfig;
  liveUrl: string | null;
}
