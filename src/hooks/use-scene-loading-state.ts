import { useState, useCallback, useEffect } from "react";
import { CanvasScene } from "@/types/canvas";

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface ResourceLoadingState {
  script: LoadingState;
  description: LoadingState;
  image: LoadingState;
  imagePrompt: LoadingState;
  video: LoadingState;
  loadingProgress: number;
}

interface UseSceneLoadingStateResult {
  loadingState: ResourceLoadingState;
  overallLoadingState: LoadingState;
  startLoading: (resource: keyof ResourceLoadingState) => void;
  setLoadingSuccess: (resource: keyof ResourceLoadingState) => void;
  setLoadingError: (resource: keyof ResourceLoadingState) => void;
  resetLoadingState: (resource?: keyof ResourceLoadingState) => void;
  setLoadingProgress: (progress: number) => void;
}

export function useSceneLoadingState(scene?: CanvasScene | null): UseSceneLoadingStateResult {
  const [loadingState, setLoadingState] = useState<ResourceLoadingState>({
    script: 'idle',
    description: 'idle',
    image: 'idle',
    imagePrompt: 'idle',
    video: 'idle',
    loadingProgress: 0
  });
  
  // Calculate overall loading state
  const calculateOverallState = useCallback((state: ResourceLoadingState): LoadingState => {
    // If any resource is loading, the overall state is loading
    if (Object.entries(state)
      .filter(([key]) => key !== 'loadingProgress')
      .some(([_, value]) => value === 'loading')) {
      return 'loading';
    }
    
    // If any resource is in error state, the overall state is error
    if (Object.entries(state)
      .filter(([key]) => key !== 'loadingProgress') 
      .some(([_, value]) => value === 'error')) {
      return 'error';
    }
    
    // If any resource is success, the overall state is success
    if (Object.entries(state)
      .filter(([key]) => key !== 'loadingProgress')
      .some(([_, value]) => value === 'success')) {
      return 'success';
    }
    
    // Otherwise, the overall state is idle
    return 'idle';
  }, []);
  
  const [overallLoadingState, setOverallLoadingState] = useState<LoadingState>('idle');
  
  // Update overall loading state when individual states change
  useEffect(() => {
    setOverallLoadingState(calculateOverallState(loadingState));
  }, [loadingState, calculateOverallState]);
  
  // Reset states when scene changes
  useEffect(() => {
    resetLoadingState();
  }, [scene?.id]);
  
  // Action handlers
  const startLoading = useCallback((resource: keyof ResourceLoadingState) => {
    setLoadingState(prev => ({
      ...prev,
      [resource]: 'loading'
    }));
  }, []);
  
  const setLoadingSuccess = useCallback((resource: keyof ResourceLoadingState) => {
    setLoadingState(prev => ({
      ...prev,
      [resource]: 'success',
      loadingProgress: 100
    }));
  }, []);
  
  const setLoadingError = useCallback((resource: keyof ResourceLoadingState) => {
    setLoadingState(prev => ({
      ...prev,
      [resource]: 'error'
    }));
  }, []);
  
  const resetLoadingState = useCallback((resource?: keyof ResourceLoadingState) => {
    if (resource) {
      setLoadingState(prev => ({
        ...prev,
        [resource]: 'idle'
      }));
    } else {
      setLoadingState({
        script: 'idle',
        description: 'idle',
        image: 'idle',
        imagePrompt: 'idle',
        video: 'idle',
        loadingProgress: 0
      });
    }
  }, []);
  
  const setLoadingProgress = useCallback((progress: number) => {
    setLoadingState(prev => ({
      ...prev,
      loadingProgress: Math.min(Math.max(progress, 0), 100)
    }));
  }, []);
  
  return {
    loadingState,
    overallLoadingState,
    startLoading,
    setLoadingSuccess,
    setLoadingError,
    resetLoadingState,
    setLoadingProgress
  };
}
