
import axios from 'axios';

// In browser environments, we can use import.meta.env instead of process.env
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

export const createVideo = async (jsonData: any): Promise<VideoProjectResponse> => {
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
    return response.data;
  } catch (error) {
    console.error('Error creating video:', error);
    throw error;
  }
};

export const getVideoStatus = async (projectId: string): Promise<VideoProjectResponse> => {
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
    throw error;
  }
};

export const formatVideoProject = (response: VideoProjectResponse): VideoProject => {
  return {
    projectId: response.project,
    status: response.status,
    url: response.url,
    thumbnailUrl: response.thumbnail,
    createdAt: response.created || new Date().toISOString(),
  };
};
