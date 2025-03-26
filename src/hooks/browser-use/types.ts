
// Types for browser automation tasks
export type TaskStatus = 'pending' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed' | 'expired' | 'created' | 'idle';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'checking' | 'error' | 'retry';

export interface BrowserContextConfig {
  minWaitPageLoadTime?: number;
  waitForNetworkIdlePageLoadTime?: number;
  maxWaitPageLoadTime?: number;
  highlightElements?: boolean;
  viewportExpansion?: number;
  userAgent?: string;
  locale?: string;
  allowedDomains?: string[] | string;
}

export interface BrowserConfig {
  saveSession: boolean;
  autoRetry: boolean;
  autoRefresh: boolean;
  maxRetries: number;
  // Properties that were missing - now explicitly defined
  headless?: boolean;
  disableSecurity?: boolean;
  persistentSession?: boolean;
  resolution?: string;
  darkMode?: boolean;
  proxy?: string;
  theme?: string;
  useOwnBrowser?: boolean;
  chromePath?: string;
  extraChromiumArgs?: string[];
  contextConfig?: BrowserContextConfig;
}

export interface TaskStep {
  step: number;
  next_goal: string;
  evaluation_previous_goal?: string;
  // Properties that were missing - now explicitly defined
  id?: string;
  status?: string;
  description?: string;
  details?: string;
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

// Define missing types for API responses
export interface CaptureWebsiteResponse {
  image_url?: string;
  screenshot?: string;
  error?: string;
}

// Define JSON-compatible data interfaces for Supabase
export interface SupabaseBrowserTaskData {
  cookies?: any[];
  steps?: Record<string, any>[];
  recordings?: string[];
  screenshots?: string[];
}

export interface LivePreviewProps {
  url: string;
}
