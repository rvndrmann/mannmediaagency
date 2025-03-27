
import { supabase } from '@/integrations/supabase/client';

export interface VideoProject {
  projectId: string;
  status: string;
  url?: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface VideoProjectResponse {
  project: string;
  status: string;
  url?: string;
  thumbnail?: string;
  created?: string;
}

/**
 * Checks if the JSON2Video API key is configured
 * @returns A promise that resolves to a boolean indicating if the API key is configured
 */
export const checkApiKeyStatus = async (): Promise<{success: boolean, message: string}> => {
  try {
    const { data, error } = await supabase.functions.invoke('json2video-status');
    
    if (error) {
      console.error('Error checking JSON2Video API key:', error);
      return { success: false, message: error.message };
    }
    
    if (!data || !data.success) {
      const errorMessage = data?.error || 'Unknown error checking JSON2Video API key';
      return { success: false, message: errorMessage };
    }
    
    return { success: true, message: data.message || 'API key is configured' };
  } catch (error) {
    console.error('Exception checking JSON2Video API key:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Creates a new video project using the JSON2Video API
 * @param jsonData The JSON configuration for the video project
 * @returns The API response with project details
 */
export const createVideo = async (jsonData: any): Promise<VideoProjectResponse> => {
  try {
    console.log("Creating video with JSON data:", JSON.stringify(jsonData, null, 2));
    
    // First check if API key is configured
    const apiStatus = await checkApiKeyStatus();
    if (!apiStatus.success) {
      throw new Error(`JSON2Video API key error: ${apiStatus.message}`);
    }
    
    const { data, error } = await supabase.functions.invoke('json2video-proxy', {
      body: {
        operation: 'createVideo',
        body: jsonData
      }
    });
    
    if (error) {
      console.error('Error calling JSON2Video proxy:', error);
      throw new Error(`JSON2Video proxy error: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data received from JSON2Video proxy');
    }
    
    console.log("API response:", data);
    return data;
  } catch (error) {
    console.error('Error creating video:', error);
    throw error;
  }
};

/**
 * Gets the status of a video project
 * @param projectId The ID of the project to check
 * @returns The API response with current status
 */
export const getVideoStatus = async (projectId: string): Promise<VideoProjectResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('json2video-proxy', {
      body: {
        operation: 'getStatus',
        body: {
          projectId
        }
      }
    });
    
    if (error) {
      console.error('Error calling JSON2Video proxy:', error);
      throw new Error(`JSON2Video proxy error: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data received from JSON2Video proxy');
    }
    
    return data;
  } catch (error) {
    console.error('Error getting video status:', error);
    throw error;
  }
};

/**
 * Formats the API response into a standardized VideoProject object
 * @param response The API response to format
 * @returns A formatted VideoProject object
 */
export const formatVideoProject = (response: VideoProjectResponse): VideoProject => {
  return {
    projectId: response.project,
    status: response.status,
    url: response.url,
    thumbnailUrl: response.thumbnail,
    createdAt: response.created || new Date().toISOString(),
  };
};
