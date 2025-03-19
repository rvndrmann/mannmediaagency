
export type TaskStatus = 'idle' | 'pending' | 'created' | 'running' | 'paused' | 'completed' | 'stopped' | 'failed' | 'expired';

export interface TaskStep {
  id: string;
  description: string;
  status: string;
  timestamp?: string;
  details?: any;
}

export interface UserCredits {
  id: string;
  user_id: string;
  credits_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface BrowserConfig {
  // Browser core settings
  headless: boolean;
  disableSecurity: boolean;
  useOwnBrowser: boolean;
  chromePath: string;
  chromeUserData?: string;
  persistentSession: boolean;
  
  // Display and resolution settings
  resolution: string;
  theme: string;
  darkMode: boolean;
  
  // Advanced settings
  wssUrl?: string;
  cdpUrl?: string;
  extraChromiumArgs?: string[];
  proxy?: string;
  
  // Context configuration
  contextConfig?: {
    minWaitPageLoadTime?: number;
    waitForNetworkIdlePageLoadTime?: number;
    maxWaitPageLoadTime?: number;
    browserWindowSize?: { width: number; height: number };
    highlightElements?: boolean;
    viewportExpansion?: number;
    locale?: string;
    userAgent?: string;
    allowedDomains?: string[] | string;
    saveRecordingPath?: string;
    tracePath?: string;
    cookiesFile?: string;
  };
}

export interface BrowserUseError {
  message: string;
  code?: string;
  details?: any;
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
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
}

export interface BrowserTaskHistory {
  id: string;
  user_id: string;
  task_input: string;
  output: string | null;
  status: string;
  browser_task_id: string | null;
  screenshot_url: string | null;
  result_url: string | null;
  browser_data: any;
  created_at: string;
  completed_at: string | null;
}
