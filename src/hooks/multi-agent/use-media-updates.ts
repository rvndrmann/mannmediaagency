
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message, Task } from "@/types/message";
import { v4 as uuidv4 } from "uuid";

interface UseMediaUpdatesProps {
  messages: Message[];
  updateMessage: (index: number, updates: Partial<Message>) => void;
}

// Define types for the payload data to avoid TypeScript errors
interface ImageGenerationPayload {
  user_id?: string;
  request_id?: string;
  status?: string;
  result_url?: string;
}

interface VideoGenerationPayload {
  user_id?: string;
  request_id?: string;
  status?: string;
  result_url?: string;
}

export const useMediaUpdates = ({ messages, updateMessage }: UseMediaUpdatesProps) => {
  // Subscribe to real-time updates for image generation jobs
  useEffect(() => {
    // Find messages with pending tool commands that might generate images
    const messagesWithImageCommands = messages
      .map((message, index) => ({ message, index }))
      .filter(({ message }) => 
        message.command?.feature === "product-shot-v1" || 
        message.command?.feature === "product-shot-v2"
      );

    if (messagesWithImageCommands.length === 0) return;

    // Set up realtime subscription for image_generation_jobs table
    const imageChannel = supabase
      .channel('image-generation-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'image_generation_jobs'
        },
        (payload) => {
          // For each updated job, check if it matches any of our pending tool commands
          const { new: newData } = payload;
          const typedData = newData as ImageGenerationPayload;
          
          if (!typedData || !typedData.user_id) return;

          // Process each message with image commands
          messagesWithImageCommands.forEach(({ message, index }) => {
            // Check if this job update matches our command's requestId
            const requestId = message.command?.parameters?.requestId;
            if (requestId && requestId === typedData.request_id) {
              // Update message based on job status
              if (typedData.status === 'completed' && typedData.result_url) {
                // Update the message content with the generated image
                const imageUrl = typedData.result_url;
                const updatedContent = `${message.content}\n\n![Generated Image](${imageUrl})`;
                
                // Find and update the task status
                const updatedTasks = message.tasks ? message.tasks.map(task => 
                  task.name.includes(message.command?.feature || '') 
                    ? { ...task, status: 'completed' as const } 
                    : task
                ) : undefined;
                
                updateMessage(index, {
                  content: updatedContent,
                  tasks: updatedTasks
                });
              } else if (typedData.status === 'failed') {
                // Update with failure message
                const updatedContent = `${message.content}\n\nⓧ Image generation failed. Please try again.`;
                
                // Find and update the task status
                const updatedTasks = message.tasks ? message.tasks.map(task => 
                  task.name.includes(message.command?.feature || '') 
                    ? { ...task, status: 'error' as const, details: 'Image generation failed' } 
                    : task
                ) : undefined;
                
                updateMessage(index, {
                  content: updatedContent,
                  tasks: updatedTasks
                });
              }
            }
          });
        }
      )
      .subscribe();

    // Set up realtime subscription for video_generation_jobs table
    const videoMessagesWithCommands = messages
      .map((message, index) => ({ message, index }))
      .filter(({ message }) => 
        message.command?.feature === "image-to-video" || 
        message.command?.feature === "product-video"
      );

    let videoChannel;

    if (videoMessagesWithCommands.length > 0) {
      videoChannel = supabase
        .channel('video-generation-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'video_generation_jobs'
          },
          (payload) => {
            console.log('[useMediaUpdates] Received video job update payload:', payload); // Log received payload
            // For each updated job, check if it matches any of our pending tool commands
            const { new: newData } = payload;
            const typedData = newData as VideoGenerationPayload;
            console.log('[useMediaUpdates] Parsed video job data:', typedData); // Log parsed data
            
            if (!typedData || !typedData.user_id) {
              console.log('[useMediaUpdates] Skipping update: No typedData or user_id');
              return;
            }

            // Process each message with video commands
            videoMessagesWithCommands.forEach(({ message, index }) => {
              // Check if this job update matches our command's requestId
              const requestId = message.command?.parameters?.requestId;
              console.log(`[useMediaUpdates] Comparing message requestId (${requestId}) with job request_id (${typedData.request_id})`); // Log IDs being compared
              if (requestId && requestId === typedData.request_id) {
                console.log('[useMediaUpdates] Match found! Processing update...'); // Log match found
                // Update message based on job status
                if (typedData.status === 'completed' && typedData.result_url) {
                  // Update the message content with the generated video
                  const videoUrl = typedData.result_url;
                  const updatedContent = `${message.content}\n\n<video controls src="${videoUrl}" style="max-width: 100%; border-radius: 8px;"></video>`;
                  console.log('[useMediaUpdates] Updating message with video URL:', videoUrl); // Log video URL update
                  
                  // Find and update the task status
                  const updatedTasks = message.tasks ? message.tasks.map(task =>
                    task.name.includes('video') || task.name.includes('conversion')
                      ? { ...task, status: 'completed' as const }
                      : task
                  ) : undefined;
                  
                  updateMessage(index, {
                    content: updatedContent,
                    tasks: updatedTasks
                  });
                } else if (typedData.status === 'failed') {
                  // Update with failure message
                  const updatedContent = `${message.content}\n\nⓧ Video generation failed. Please try again.`;
                  console.log('[useMediaUpdates] Updating message with failure status.'); // Log failure update
                  
                  // Find and update the task status
                  const updatedTasks = message.tasks ? message.tasks.map(task =>
                    task.name.includes('video') || task.name.includes('conversion')
                      ? { ...task, status: 'error' as const, details: 'Video generation failed' }
                      : task
                  ) : undefined;
                  
                  updateMessage(index, {
                    content: updatedContent,
                    tasks: updatedTasks
                  });
                }
              }
            });
          }
        )
        .subscribe();
    }

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(imageChannel);
      if (videoChannel) supabase.removeChannel(videoChannel);
    };
  }, [messages, updateMessage]);

  // Helper function to create a task for tracking media generation
  const createMediaGenerationTask = (command: Message['command']): Task => {
    let taskName = "Processing request";
    
    if (command?.feature === "product-shot-v1") {
      taskName = "Generating product image (v1)";
    } else if (command?.feature === "product-shot-v2") {
      taskName = "Generating enhanced product image (v2)";
    } else if (command?.feature === "image-to-video") {
      taskName = "Converting image to video";
    } else if (command?.feature === "product-video") {
      taskName = "Creating product video";
    }
    
    return {
      id: uuidv4(),
      name: taskName,
      status: "pending",
      type: "media" // Adding the required type property
    };
  };

  return {
    createMediaGenerationTask
  };
};
