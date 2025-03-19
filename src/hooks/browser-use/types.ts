
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
}

export interface BrowserUseApiResponse {
  success: boolean;
  task_id?: string;
  status?: string;
  message?: string;
  result?: any;
  error?: string;
}

export type TaskStatus = 'idle' | 'running' | 'paused' | 'finished' | 'failed' | 'stopped';

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
}
