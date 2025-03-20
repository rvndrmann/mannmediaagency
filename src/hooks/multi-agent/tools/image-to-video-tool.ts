
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { ToolResult } from '../types';

interface ImageToVideoToolParams {
  prompt: string;
  imageUrl: string;
  duration: string;
  aspectRatio: string;
}

export const useImageToVideoTool = () => {
  const convertImageToVideo = async (params: ImageToVideoToolParams): Promise<ToolResult> => {
    const requestId = uuidv4();

    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return {
          content: `⚠️ You need to be logged in to convert images to video.`,
          metadata: { error: "Not authenticated" }
        };
      }

      // Invoke the edge function to generate the video
      const { data, error } = await supabase.functions.invoke("generate-video-from-image", {
        body: {
          prompt: params.prompt,
          imageUrl: params.imageUrl,
          duration: params.duration,
          aspectRatio: params.aspectRatio,
          requestId: requestId,
          userId: session.user.id
        }
      });

      if (error) {
        console.error("Error during video generation:", error);
        return {
          content: `Error during video generation: ${error.message || error}`,
          metadata: { requestId: requestId, error: error.message }
        };
      }

      if (data?.result_url) {
        return {
          content: `Successfully converted image to video. Video URL: ${data.result_url}`,
          metadata: { requestId: requestId }
        };
      } else {
        return {
          content: `Video conversion initiated. Please check back in a few minutes.`,
          metadata: { requestId: requestId, pending: true }
        };
      }
    } catch (error: any) {
      console.error("Error during image to video conversion:", error);
      return {
        content: `Error during image to video conversion: ${error.message || error}`,
        metadata: { requestId: requestId, error: error.message }
      };
    }
  };

  return { convertImageToVideo };
};
