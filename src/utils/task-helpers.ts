
import { Task } from "@/types/message";

/**
 * Create a new task with required fields
 */
export function createTask(name: string, status: Task['status'] = 'pending'): Task {
  return {
    id: crypto.randomUUID(),
    type: 'task',
    name,
    status
  };
}

/**
 * Update a task status
 */
export function updateTaskStatus(task: Task, status: Task['status']): Task {
  return {
    ...task,
    status
  };
}

/**
 * Set task result
 */
export function setTaskResult(task: Task, result: any): Task {
  return {
    ...task,
    result,
    status: 'completed'
  };
}

/**
 * Set task error
 */
export function setTaskError(task: Task, error: string): Task {
  return {
    ...task,
    error,
    status: 'error'
  };
}
