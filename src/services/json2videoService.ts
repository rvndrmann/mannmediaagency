
import axios from 'axios';

// In browser environments, we use import.meta.env instead of process.env
const API_KEY = import.meta.env.VITE_JSON2VIDEO_API_KEY || '';

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
 * Creates a new video project using the JSON2Video API
 * @param jsonData The JSON configuration for the video project
 * @returns The API response with project details
 */
export const createVideo = async (jsonData: any): Promise<VideoProjectResponse> => {
  if (!API_KEY) {
    throw new Error('JSON2Video API key is missing. Please set the VITE_JSON2VIDEO_API_KEY environment variable.');
  }
  
  console.log("Creating video with JSON data:", JSON.stringify(jsonData, null, 2));
  
  try {
    const response = await axios.post(
      'https://api.json2video.com/v2/movies',
      jsonData,
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log("API response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating video:', error);
    
    // Provide more specific error messages based on error type
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        const statusCode = error.response.status;
        const errorData = error.response.data;
        
        console.error('API error details:', {
          statusCode,
          errorData,
          headers: error.response.headers,
        });
        
        if (statusCode === 401 || statusCode === 403) {
          throw new Error('Authentication failed. Please check your API key.');
        } else if (statusCode === 400) {
          const errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
          throw new Error(`Invalid request: ${errorMessage}`);
        } else {
          throw new Error(`API error (${statusCode}): ${errorData.message || error.message}`);
        }
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response received:', error.request);
        throw new Error('No response from JSON2Video API. Please try again later.');
      } else {
        // Error setting up the request
        throw new Error(`Request setup error: ${error.message}`);
      }
    }
    
    // For non-Axios errors
    throw error;
  }
};

/**
 * Gets the status of a video project
 * @param projectId The ID of the project to check
 * @returns The API response with current status
 */
export const getVideoStatus = async (projectId: string): Promise<VideoProjectResponse> => {
  if (!API_KEY) {
    throw new Error('JSON2Video API key is missing. Please set the VITE_JSON2VIDEO_API_KEY environment variable.');
  }
  
  try {
    const response = await axios.get(
      `https://api.json2video.com/v2/movies?project=${projectId}`,
      {
        headers: {
          'x-api-key': API_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error getting video status:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      const statusCode = error.response.status;
      
      if (statusCode === 404) {
        throw new Error(`Project ${projectId} not found`);
      } else if (statusCode === 401 || statusCode === 403) {
        throw new Error('Authentication failed. Please check your API key.');
      } else {
        throw new Error(`API error (${statusCode}): ${error.response.data.message || error.message}`);
      }
    }
    
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
