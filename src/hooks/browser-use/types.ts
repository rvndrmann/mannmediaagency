
// User credits info from the database
export interface UserCredits {
  id: string;
  user_id: string;
  credits_remaining: number;
  created_at: string;
  updated_at: string;
}

// Browser configuration types
export interface BrowserContextConfig {
  minWaitPageLoadTime?: number;
  waitForNetworkIdlePageLoadTime?: number;
  maxWaitPageLoadTime?: number;
  browserWindowSize?: { width: number; height: number };
  locale?: string;
  userAgent?: string;
  highlightElements?: boolean;
  viewportExpansion?: number;
  allowedDomains?: string[] | string;
  saveRecordingPath?: string;
  tracePath?: string;
  cookiesFile?: string;
}

export interface BrowserConfig {
  // Basic settings
  persistentSession: boolean;
  useOwnBrowser: boolean;
  resolution: string;
  theme?: string;
  darkMode?: boolean;
  
  // Advanced settings
  headless?: boolean;
  disableSecurity?: boolean;
  chromePath?: string;
  chromeUserData?: string;
  extraChromiumArgs?: string[];
  cdpUrl?: string;
  wssUrl?: string;
  proxy?: string;
  
  // Context configuration
  contextConfig?: BrowserContextConfig;
}

// Browser automation task state
export type TaskStatus = 'idle' | 'pending' | 'created' | 'running' | 'paused' | 'stopped' | 'failed' | 'completed' | 'expired';

export interface TaskStep {
  id: string;
  step: number;
  evaluation_previous_goal?: string;
  next_goal?: string;
  description?: string;
  screenshot?: string;
  created_at?: string;
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
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

// API responses
export interface BrowserUseError {
  error: string;
  status?: number;
  details?: string;
  task_expired?: boolean;
  message?: string;
}
