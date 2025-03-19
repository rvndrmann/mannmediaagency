
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

export type BrowserTheme = 'Default' | 'Soft' | 'Monochrome' | 'Glass' | 'Origin' | 'Citrus' | 'Ocean';

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
  bypass?: string;
}

export interface BrowserWindowSize {
  width: number;
  height: number;
}

export interface BrowserConfig {
  persistentSession: boolean;
  useOwnBrowser: boolean;
  resolution: string;
  theme: BrowserTheme | string;
  darkMode: boolean;
  headless: boolean;
  disableSecurity: boolean;
  chromePath?: string;
  chromeUserData?: string;
  extraChromiumArgs?: string[] | string;
  proxy?: ProxyConfig | string;
  contextConfig: {
    minWaitPageLoadTime: number;
    waitForNetworkIdlePageLoadTime: number;
    maxWaitPageLoadTime: number;
    browserWindowSize: BrowserWindowSize;
    highlightElements: boolean;
    viewportExpansion: number;
    userAgent?: string;
  };
}

export interface CaptureWebsiteResponse {
  url: string;
  imageUrl: string;
  error?: string;
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

export interface BrowserUseError {
  type: 'connection' | 'browser' | 'api' | 'unknown';
  message: string;
  details?: string;
  retryable: boolean;
}
