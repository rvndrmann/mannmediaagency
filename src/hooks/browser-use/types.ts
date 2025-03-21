
// Types for browser use automation API
export type TaskStatus = 
  | 'idle'       // Initial state, no task in progress
  | 'pending'    // Task created but not yet started
  | 'created'    // Task is initialized on the API
  | 'running'    // Task is currently executing
  | 'paused'     // Task execution is paused
  | 'completed'  // Task completed successfully
  | 'failed'     // Task encountered an error
  | 'stopped'    // Task was manually stopped
  | 'expired';   // Task expired on the API side

export interface TaskStep {
  // Task step fields
  id?: string;
  task_id?: string;
  evaluation_previous_goal?: string;
  next_goal?: string;
  is_success?: boolean;
  failure_reason?: string;
  created_at?: string;
  status?: string;
  description?: string;
  [key: string]: any;
}

export interface BrowserTaskState {
  taskInput: string;
  currentTaskId: string | null;
  browserTaskId: string | null; // Store the ID used by the Browser Use API
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

export interface UserCredits {
  id: string;
  user_id: string;
  credits_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface BrowserUseError {
  error: string;
  status?: number;
  task_expired?: boolean;
  message?: string;
  details?: string;
}

// Browser window size
export interface BrowserWindowSize {
  width: number;
  height: number;
}

// Context configuration
export interface ContextConfig {
  // Page load timing settings
  minWaitPageLoadTime?: number;
  waitForNetworkIdlePageLoadTime?: number;
  maxWaitPageLoadTime?: number;
  
  // Display settings
  browserWindowSize?: BrowserWindowSize;
  highlightElements?: boolean;
  viewportExpansion?: number;
  
  // Regional settings
  locale?: string;
  userAgent?: string;
  
  // Security settings
  allowedDomains?: string[] | string;
  
  // Debug settings
  saveRecordingPath?: string;
  tracePath?: string;
  cookiesFile?: string;
}

// Browser configuration
export interface BrowserConfig {
  // Basic settings
  persistentSession?: boolean;
  useOwnBrowser?: boolean;
  resolution?: string;
  theme?: string;
  darkMode?: boolean;
  
  // Advanced settings
  headless?: boolean;
  disableSecurity?: boolean;
  chromePath?: string;
  chromeUserData?: string;
  extraChromiumArgs?: string[];
  
  // Connection settings
  wssUrl?: string;
  cdpUrl?: string;
  proxy?: string;
  
  // Context configuration
  contextConfig?: ContextConfig;
}
