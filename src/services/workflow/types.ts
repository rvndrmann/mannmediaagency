
import { WorkflowStage, WorkflowState } from '@/types/canvas';

export interface VideoWorkflowOptions {
  projectId: string;
  scenes?: string[];
  aspectRatio?: '16:9' | '9:16' | '1:1';
  outputFormat?: 'mp4' | 'webm';
  quality?: 'draft' | 'standard' | 'high';
}

export interface WorkflowResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface StageResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface WorkflowProgress {
  currentStage: string;
  completedStages: string[];
  progress: number; // 0-100
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}
