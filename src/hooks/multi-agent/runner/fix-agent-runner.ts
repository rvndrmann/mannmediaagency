
/**
 * This is a utility script to fix the AgentRunner's task status comparison.
 * 
 * The issue is in AgentRunner.ts where it compares task.status with "running"
 * but the valid statuses in the Task interface are 'pending', 'in_progress', 'completed', 'failed', 'in-progress', 'error'.
 * 
 * This file demonstrates how to properly check the task status.
 */

// Function to check if a task is in progress
export const isTaskInProgress = (status: string): boolean => {
  // Valid in-progress statuses
  return status === 'in_progress' || status === 'in-progress';
};

// Function to check if a task is completed
export const isTaskCompleted = (status: string): boolean => {
  return status === 'completed';
};

// Function to check if a task has failed
export const isTaskFailed = (status: string): boolean => {
  return status === 'failed' || status === 'error';
};

// Function to check if a task is pending
export const isTaskPending = (status: string): boolean => {
  return status === 'pending';
};

// Example usage:
// Instead of: if (task.status === 'running') { ... }
// Use: if (isTaskInProgress(task.status)) { ... }
