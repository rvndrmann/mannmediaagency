import { v4 as uuidv4 } from 'uuid';
import { useGenerateVideoFromImageMutation } from '../mutations/use-generate-video-from-image-mutation';
import { ToolResult } from '../types';

interface ImageToVideoToolParams {
  prompt: string;
  imageUrl: string;
  duration: string;
  aspectRatio: string;
}

export const useImageToVideoTool = () => {
  const { mutateAsync: generateVideo, isLoading } = useGenerateVideoFromImageMutation();

  const convertImageToVideo = async (params: ImageToVideoToolParams): Promise<ToolResult> => {
    const requestId = uuidv4();

    try {
      const videoDetails = await generateVideo({
        ...params,
        requestId: requestId,
      });

      if (videoDetails?.result_url) {
        return {
          content: `Successfully converted image to video. Video URL: ${videoDetails.result_url}`,
          metadata: { requestId: requestId }
        };
      } else {
        return {
          content: `Video conversion failed.`,
          metadata: { requestId: requestId }
        };
      }
    } catch (error: any) {
      console.error("Error during image to video conversion:", error);
      return {
        content: `Error during image to video conversion: ${error.message || error}`,
        metadata: { requestId: requestId }
      };
    }
  };

  return { convertImageToVideo, isLoading };
};
