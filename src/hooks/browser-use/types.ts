
export type TaskStatus = 'idle' | 'created' | 'pending' | 'running' | 'paused' | 'finished' | 'failed' | 'stopped' | 'completed';

export interface TaskStep {
  id: string;
  task_id: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  details?: string | null;
  screenshot?: string | null;
  created_at: string;
}

export interface BrowserTaskState {
  taskInput: string;
  currentTaskId: string | null;
  progress: number;
  taskStatus: TaskStatus;
  taskSteps: TaskStep[];
  taskOutput: string | null;
  isProcessing: boolean;
  currentUrl: string | null;
  liveUrl: string | null;
  error: string | null;
  browserConfig: BrowserConfig;
}

export interface BrowserConfig {
  headless: boolean;
  disableSecurity: boolean;
  wssUrl?: string;
  cdpUrl?: string;
  useOwnBrowser: boolean;
  chromePath?: string;
  extraChromiumArgs?: string[] | string;
  proxy?: ProxyConfig | string;
  resolution: string; // e.g. "1920x1080"
  contextConfig?: {
    minWaitPageLoadTime?: number;
    waitForNetworkIdlePageLoadTime?: number;
    maxWaitPageLoadTime?: number;
    browserWindowSize?: { width: number; height: number };
    locale?: string;
    userAgent?: string;
    highlightElements?: boolean;
    viewportExpansion?: number;
    allowedDomains?: string[];
    saveRecordingPath?: string;
    tracePath?: string;
    cookiesFile?: string;
  };
  theme?: BrowserTheme;
  darkMode?: boolean;
  persistentSession?: boolean;
}

// Adding these types to fix the errors in BrowserSettings
export type BrowserTheme = 'light' | 'dark' | 'Default' | 'Soft' | 'Monochrome' | 'Glass' | 'Origin' | 'Citrus' | 'Ocean';

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
  bypass?: string;
}

export interface UserCredits {
  credits_remaining: number;
  total_remaining: number;
}

export interface CaptureWebsiteResponse {
  url: string;
  imageUrl: string;
  error?: string;
}
