
import { type } from "os";

export interface TaskStep {
  id: string;
  task_id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | string;
  details: string | null;
  screenshot: string | null;
  created_at: string;
}

export interface UserCredits {
  id: string;
  user_id: string;
  credits_remaining: number;
  last_refill: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CaptureWebsiteResponse {
  image_url: string;
  url: string;
  saved?: boolean;
  error?: string;
}

export interface BrowserUseApiRequest {
  task: string;
  save_browser_data: boolean;
  task_id?: string;
  action?: 'pause' | 'resume' | 'stop';
  browser_config?: BrowserConfig;
}

export interface BrowserUseApiResponse {
  success: boolean;
  task_id?: string;
  status?: string;
  message?: string;
  result?: any;
  error?: string;
  live_url?: string;
  recordings?: string[];
}

export type TaskStatus = 'idle' | 'running' | 'paused' | 'finished' | 'completed' | 'failed' | 'stopped';

export interface BrowserTaskState {
  taskInput: string;
  currentTaskId: string | null;
  isProcessing: boolean;
  progress: number;
  taskSteps: TaskStep[];
  taskOutput: string | null;
  taskStatus: TaskStatus;
  currentUrl: string | null;
  screenshot: string | null;
  userCredits: UserCredits | null;
  error: string | null;
  browserConfig: BrowserConfig;
  liveUrl: string | null;
}

// Enhanced BrowserConfig interface with additional options from documentation
export interface BrowserConfig {
  // Basic browser settings
  persistentSession: boolean;
  useOwnBrowser: boolean;
  resolution: string;
  chromePath?: string;
  chromeUserData?: string;
  theme?: BrowserTheme;
  darkMode?: boolean;
  
  // Core settings
  headless?: boolean;
  disableSecurity?: boolean;
  
  // Alternative initialization
  wssUrl?: string;
  cdpUrl?: string;
  
  // Additional settings
  extraChromiumArgs?: string[];
  proxy?: ProxyConfig;
  
  // Context configuration
  contextConfig?: BrowserContextConfig;
}

export interface ProxyConfig {
  server: string;  // Required field
  bypass?: string;
  username?: string;
  password?: string;
}

export interface BrowserContextConfig {
  // Page load settings
  minWaitPageLoadTime?: number;
  waitForNetworkIdlePageLoadTime?: number;
  maxWaitPageLoadTime?: number;
  
  // Display settings
  browserWindowSize?: { width: number; height: number };
  locale?: string;
  userAgent?: string;
  highlightElements?: boolean;
  viewportExpansion?: number;
  
  // Restrict URLs
  allowedDomains?: string[];
  
  // Debug and recording
  saveRecordingPath?: string;
  tracePath?: string;
  
  // Cookies
  cookiesFile?: string;
}

export type BrowserTheme = 'Default' | 'Soft' | 'Monochrome' | 'Glass' | 'Origin' | 'Citrus' | 'Ocean';
