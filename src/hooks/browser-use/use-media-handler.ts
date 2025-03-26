
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage, BrowserTaskData } from './types';
import { safeParse, safeForStorage } from '@/lib/safe-stringify';
import { toast } from 'sonner';

interface UseMediaHandlerProps {
  taskId: string | null;
  browserTaskId: string | null;
  status: string;
}

export function useMediaHandler({ taskId, browserTaskId, status }: UseMediaHandlerProps) {
  const [taskMedia, setTaskMedia] = useState<BrowserTaskData | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  
  // Function to fetch media for a task
  const fetchTaskMedia = useCallback(async (browserTaskId: string) => {
    if (!browserTaskId) return null;
    
    setIsLoadingMedia(true);
    setMediaError(null);
    
    try {
      console.log('Getting media for task ID:', browserTaskId);
      
      // First, check if we have the media locally in the browser
      const localMediaKey = `workerAI_media_${browserTaskId}`;
      const localMedia = localStorage.getItem(localMediaKey);
      
      if (localMedia) {
        try {
          const mediaData = safeParse<BrowserTaskData>(localMedia, null);
          if (mediaData) {
            setTaskMedia(mediaData);
            return mediaData;
          }
        } catch (e) {
          console.error('Error parsing local media data:', e);
        }
      }
      
      // If not in local storage, fetch from API
      const response = await fetch(`https://api.browser-use.com/api/v1/task/${browserTaskId}/media`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('browser_use_api_key') || ''}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get task media: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Save media data
      if (data) {
        setTaskMedia(data);
        
        // Save to localStorage for future use
        localStorage.setItem(localMediaKey, safeForStorage(data));
        
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting task media:', error);
      setMediaError(error instanceof Error ? error.message : 'Failed to load media');
      return null;
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);
  
  // Function to convert media data to chat messages
  const mediaToMessages = useCallback((mediaData: BrowserTaskData | null): ChatMessage[] => {
    if (!mediaData) return [];
    
    const messages: ChatMessage[] = [];
    
    // Add recordings as a message
    if (mediaData.recordings && mediaData.recordings.length > 0) {
      messages.push({
        type: 'recording',
        text: 'Browser session recording available',
        urls: mediaData.recordings,
        timestamp: new Date().toISOString()
      });
    }
    
    return messages;
  }, []);
  
  // Function to load media for completed tasks
  const loadTaskMedia = useCallback(async () => {
    if (!browserTaskId) return;
    
    // Only fetch media for completed, failed, or stopped tasks
    if (!['completed', 'finished', 'failed', 'stopped'].includes(status)) return;
    
    try {
      const mediaData = await fetchTaskMedia(browserTaskId);
      
      // If we found media, store it
      if (mediaData && taskId) {
        const mediaMessages = mediaToMessages(mediaData);
        
        // If we found media, update the task in the database
        if (mediaMessages.length > 0 && mediaData.recordings?.length) {
          try {
            await supabase
              .from('browser_automation_tasks')
              .update({
                browser_data: mediaData
              })
              .eq('id', taskId);
          } catch (e) {
            console.error('Error updating task with media data:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error loading task media:', error);
    }
  }, [browserTaskId, taskId, status, fetchTaskMedia, mediaToMessages]);
  
  // Automatically load media for tasks that need it
  useEffect(() => {
    if (browserTaskId && ['completed', 'finished', 'failed', 'stopped'].includes(status)) {
      loadTaskMedia();
    }
  }, [browserTaskId, status, loadTaskMedia]);
  
  return {
    taskMedia,
    isLoadingMedia,
    mediaError,
    fetchTaskMedia,
    mediaToMessages,
    loadTaskMedia
  };
}
