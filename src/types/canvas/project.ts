
import { CanvasScene } from './scene';

export interface CanvasProject {
  id: string;
  title: string;
  userId: string;
  fullScript: string;
  description?: string;
  scenes: CanvasScene[];
  createdAt: string;
  updatedAt: string;
}
