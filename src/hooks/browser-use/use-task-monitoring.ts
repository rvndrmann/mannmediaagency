import { useState, useEffect, useCallback } from 'react';
import socket from '@/socket';
import { toast } from 'sonner';
import type { TaskStatus, TaskStep, BrowserTaskState } from './types';

interface TaskMonitoringOptions {
  onTaskUpdate?: (taskState: BrowserTaskState) => void;
  onTaskError?: (error: string) => void;
  onTaskComplete?: () => void;
}

export const useTaskMonitoring = (taskId?: string) => {
  const [taskState, setTaskState] = useState<BrowserTaskState>({
    taskId: taskId || '',
    status: 'created',
    progress: 0,
    steps: [],
    connectionStatus: 'disconnected',
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  const updateTaskState = (newState: Partial<BrowserTaskState>) => {
    setTaskState(prev => ({ ...prev, ...newState }));
  };

  const connectToWebSocket = useCallback(() => {
    if (!taskId) {
      console.warn('No taskId provided, cannot connect to WebSocket');
      return;
    }

    setConnectionStatus('connecting');

    socket.connect();

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
      socket.emit('joinTask', taskId);
    });

    socket.on('taskUpdate', (data: any) => {
      if (data.taskId === taskId) {
        updateTaskState({
          status: data.status,
          progress: data.progress,
          currentStep: data.currentStep,
          steps: data.steps,
          liveUrl: data.liveUrl,
        });
      }
    });

    socket.on('taskStepUpdate', (data: TaskStep) => {
      if (taskId) {
        setTaskState(prev => {
          const updatedSteps = prev.steps.map(step =>
            step.id === data.id ? data : step
          );
          return { ...prev, steps: updatedSteps };
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnectionStatus('disconnected');
      toast.error('Lost connection to live task. Please refresh.');
    });

    socket.on('taskError', (error: any) => {
      console.error('Task error:', error);
      toast.error(error.message || 'Task failed');
      setConnectionStatus('disconnected');
      setTaskState(prev => ({
        ...prev,
        status: 'failed',
      }));
    });

    socket.on('taskComplete', (data: any) => {
      console.log('Task complete:', data);
      setConnectionStatus('disconnected');
      setIsMonitoring(false);
    });

    return () => {
      socket.off('connect');
      socket.off('taskUpdate');
      socket.off('taskStepUpdate');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('taskError');
      socket.off('taskComplete');
      socket.off('joinTask');
    };
  }, [taskId]);

  const disconnectFromWebSocket = useCallback(() => {
    socket.disconnect();
    setConnectionStatus('disconnected');
  }, []);

  useEffect(() => {
    if (taskId && isMonitoring) {
      const cleanup = connectToWebSocket();
      return () => {
        cleanup?.();
        disconnectFromWebSocket();
      };
    } else {
      disconnectFromWebSocket();
    }
  }, [taskId, isMonitoring, connectToWebSocket, disconnectFromWebSocket]);

  const startMonitoring = useCallback((id: string) => {
    if (id) {
      setIsMonitoring(true);
      setTaskState(prev => ({ ...prev, taskId: id }));
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    disconnectFromWebSocket();
  }, [disconnectFromWebSocket]);

  const checkTaskStatus = useCallback(async (id: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/browser/task/status?taskId=${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const newStatus = result.status as TaskStatus;
        
        setTaskState(prev => ({
          ...prev,
          status: newStatus,
          progress: result.progress || prev.progress,
        }));

        // Remove the expired status check since it's not in TaskStatus
        if (['finished', 'failed', 'stopped'].includes(newStatus)) {
          setIsMonitoring(false);
          setConnectionStatus('disconnected');
        }
      } else {
        console.error('Failed to fetch task status');
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Error checking task status:', error);
      setConnectionStatus('disconnected');
    }
  }, []);

  const handleWebSocketConnect = useCallback(() => {
    console.log('WebSocket connected');
    setConnectionStatus('connected');
  }, []);

  const handleWebSocketDisconnect = useCallback(() => {
    console.log('WebSocket disconnected');
    setConnectionStatus('disconnected');
  }, []);

  const handleWebSocketError = useCallback((error: Event) => {
    console.error('WebSocket error:', error);
    setConnectionStatus('disconnected');
    // Remove the expired status since it's not in TaskStatus
    setTaskState(prev => ({
      ...prev,
      status: 'failed' as TaskStatus,
    }));
  }, []);

  useEffect(() => {
    socket.on('connect', handleWebSocketConnect);
    socket.on('disconnect', handleWebSocketDisconnect);
    socket.on('connect_error', handleWebSocketError);

    return () => {
      socket.off('connect', handleWebSocketConnect);
      socket.off('disconnect', handleWebSocketDisconnect);
      socket.off('connect_error', handleWebSocketError);
    };
  }, [handleWebSocketConnect, handleWebSocketDisconnect, handleWebSocketError]);

  return {
    taskState,
    connectionStatus,
    startMonitoring,
    stopMonitoring,
    checkTaskStatus,
  };
};
