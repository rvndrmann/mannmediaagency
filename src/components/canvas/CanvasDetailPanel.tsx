import { CanvasScene, CanvasProject } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PanelRight, ChevronRight, Wand2, Upload, Trash2, MessageSquare, Loader2, Download, RefreshCw } from "lucide-react"; // Added Loader2, Download, RefreshCw
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { AgentSelector } from "./AgentSelector";
import { AudioUploader } from "./AudioUploader";
import { VideoUploader } from "./VideoUploader";
import { useState, useRef, useEffect, useCallback } from "react"; // Added useCallback
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCanvasAgent } from "@/hooks/use-canvas-agent";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { uploadFileToBucket } from '@/utils/supabase-helpers'; // Import Supabase upload helper
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client

interface CanvasDetailPanelProps {
  scene: CanvasScene | null;
  projectId: string;
  project: CanvasProject | null;
  updateScene: (sceneId: string, type: 'script' | 'imagePrompt' | 'description' | 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic' | 'sceneImageV1' | 'sceneImageV2' | 'bria_v2_request_id', value: string) => Promise<void>;
  // updateProject prop is removed
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function CanvasDetailPanel({
  scene,
  projectId,
  project,
  updateScene,
  // updateProject removed from destructuring
  collapsed,
  setCollapsed,
}: CanvasDetailPanelProps) {
  const [selectedAgent, setSelectedAgent] = useState("script");
  const [aiInstructions, setAiInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false); // General AI generation loading
  const [isGeneratingV1, setIsGeneratingV1] = useState(false); // Specific loading for V1 generation
  const [isGeneratingV2, setIsGeneratingV2] = useState(false); // Specific loading for V2 generation
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const sceneImageV1InputRef = useRef<HTMLInputElement>(null); // Added ref for Scene Image V1
  const sceneImageV2InputRef = useRef<HTMLInputElement>(null); // Added ref for Scene Image V2
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null); // State for interval ID
  const [pollingRequestId, setPollingRequestId] = useState<string | null>(null); // State for request ID being polled
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null); // State for polling start time
  const [isRechecking, setIsRechecking] = useState(false); // State for manual recheck loading

  const {
    isProcessing,
    messages, // Use messages instead of agentMessages
    activeAgent,
    generateSceneScript,
    generateImagePrompt,
    generateSceneDescription
  } = useCanvasAgent({
    projectId,
    sceneId: scene?.id,
    updateScene
  });

  useEffect(() => {
    setIsGenerating(isProcessing);
  }, [isProcessing]);

  const handleGenerateContent = async (contentType: 'script' | 'imagePrompt' | 'description' | 'image' | 'video') => {
    if (!scene) return;

    setIsGenerating(true);
    setShowAgentDialog(true);

    try {
      const contextData: Record<string, string> = {};

      if (scene.script && contentType !== 'script') {
        contextData.script = scene.script;
      }

      if (scene.description && contentType !== 'description') {
        contextData.description = scene.description;
      }

      if (scene.imagePrompt && contentType !== 'imagePrompt') {
        contextData.imagePrompt = scene.imagePrompt;
      }

      const contextString = Object.entries(contextData)
        .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
        .join('\n\n');

      const additionalContext = aiInstructions
        ? `\n\nAdditional instructions: ${aiInstructions}`
        : '';

      const fullContext = contextData ? `\n\nHere is the existing information about the scene:\n${contextString}${additionalContext}` : additionalContext;

      switch (contentType) {
        case 'script':
          await generateSceneScript(scene.id, fullContext);
          break;
        case 'description':
          await generateSceneDescription(scene.id, fullContext);
          break;
        case 'imagePrompt':
          await generateImagePrompt(scene.id, scene.script || '', scene.voiceOverText || '', aiInstructions, fullContext);
          break;
        case 'image':
          await generateImagePrompt(scene.id, scene.script || '', scene.voiceOverText || '', aiInstructions + "\nMake this very detailed and suitable for AI image generation.", fullContext);
          toast.info("Image prompt generated. Use the prompt to generate an actual image.");
          break;
        case 'video':
          toast.info("Video generation coming soon. For now, use the generated script and image prompt to create your video.");
          break;
      }
    } catch (error) {
      console.error(`Error generating ${contentType}:`, error);
      toast.error(`Failed to generate ${contentType}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProductImageUpload = () => {
    if (!scene) return;
    if (productImageInputRef.current) {
      productImageInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!scene) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Indicate upload start (optional, could add specific state)
    toast.info("Uploading product image...");

    try {
      // Use the Supabase helper to upload to a designated bucket (e.g., 'canvas_assets')
      // Ensure this bucket exists and has appropriate RLS policies for uploads.
      const publicUrl = await uploadFileToBucket('canvas-assets', file); // Use valid bucket name

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded product image');
      }

      // Update the scene with the public URL
      await updateScene(scene.id, 'productImage', publicUrl);
      toast.success("Product image uploaded successfully");

    } catch (error) {
      console.error("Error uploading product image:", error);
      toast.error(`Failed to upload product image: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Clear the file input
      if (e.target) e.target.value = '';
      // Indicate upload end (optional)
    }
  };

  const handleRemoveProductImage = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'productImage', '');
      toast.success("Product image removed");
    } catch (error) {
      console.error("Error removing product image:", error);
      toast.error("Failed to remove product image");
    }
  };

  // --- Scene Image V1 Handlers ---
  const handleSceneImageV1Upload = () => {
    if (!scene) return;
    if (sceneImageV1InputRef.current) {
      sceneImageV1InputRef.current.click();
    }
  };

  const handleSceneImageV1FileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!scene) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Indicate upload start
    toast.info("Uploading Scene Image V1...");

    try {
      // Use the Supabase helper to upload to a designated bucket (e.g., 'canvas_assets')
      const publicUrl = await uploadFileToBucket('canvas-assets', file); // Use valid bucket name

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded Scene Image V1');
      }

      // Update the scene with the public URL
      console.log(`[handleSceneImageV1FileSelected] Attempting to update scene ${scene.id} with type 'sceneImageV1' and URL: ${publicUrl}`);
      try {
        await updateScene(scene.id, 'sceneImageV1', publicUrl);
        console.log(`[handleSceneImageV1FileSelected] updateScene call succeeded for scene ${scene.id}`);
        toast.success("Scene Image V1 uploaded successfully");
      } catch (updateError) {
         console.error(`[handleSceneImageV1FileSelected] updateScene call failed for scene ${scene.id}:`, updateError);
         throw updateError; // Re-throw the error to be caught by the outer catch block
      }

    } catch (error) {
      console.error("Error uploading Scene Image V1:", error);
      toast.error(`Failed to upload Scene Image V1: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Clear the file input
      if (e.target) e.target.value = '';
      // Indicate upload end (optional)
    }
  };

  const handleRemoveSceneImageV1 = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'sceneImageV1', '');
      toast.success("Scene Image V1 removed");
    } catch (error) {
      console.error("Error removing Scene Image V1:", error);
      toast.error("Failed to remove Scene Image V1");
    }
  };
  // --- End Scene Image V1 Handlers ---

  // --- Scene Image V2 Handlers ---
  const handleSceneImageV2Upload = () => {
    if (!scene) return;
    if (sceneImageV2InputRef.current) {
      sceneImageV2InputRef.current.click();
    }
  };

  const handleSceneImageV2FileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!scene) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Indicate upload start
    toast.info("Uploading Scene Image V2...");

    try {
      // Use the Supabase helper to upload to the 'canvas_assets' bucket
      const publicUrl = await uploadFileToBucket('canvas-assets', file); // Use valid bucket name

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded Scene Image V2');
      }

      // Update the scene with the public URL
      await updateScene(scene.id, 'sceneImageV2', publicUrl);
      toast.success("Scene Image V2 uploaded successfully");

    } catch (error) {
      console.error("Error uploading Scene Image V2:", error);
      toast.error("Failed to upload Scene Image V2");
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveSceneImageV2 = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'sceneImageV2', '');
      toast.success("Scene Image V2 removed");
    } catch (error) {
      console.error("Error removing Scene Image V2:", error);
      toast.error("Failed to remove Scene Image V2");
    }
  };
  // --- End Scene Image V2 Handlers ---

  // --- AI Generation Handlers (Placeholders) ---
  const handleGenerateV1 = async () => {
    if (!scene || !scene.productImageUrl || !scene.imagePrompt) {
      toast.warning("Product Image and Image Prompt are required to generate Scene Image V1.");
      return;
    }
    // Ensure productImageUrl is a valid URL (basic check)
    if (!scene.productImageUrl.startsWith('http')) {
       toast.error("Invalid Product Image URL. Please re-upload the product image.");
       return;
    }

    setIsGeneratingV1(true);
    toast.info("Generating Scene Image V1 via Fal AI...");
    console.log("Calling generate-fal-image function...");
    console.log("Using Product Image URL:", scene.productImageUrl);
    console.log("Using Image Prompt:", scene.imagePrompt);

    try {
      const { data, error } = await supabase.functions.invoke('generate-fal-image', {
        body: {
          prompt: scene.imagePrompt,
          image_url: scene.productImageUrl,
        },
      });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data?.imageUrl) {
        throw new Error('Edge function did not return an image URL.');
      }

      const generatedImageUrl = data.imageUrl;
      console.log("Received generated V1 image URL:", generatedImageUrl);

      // Update the scene with the new image URL
      await updateScene(scene.id, 'sceneImageV1', generatedImageUrl);
      toast.success("Scene Image V1 generated successfully!");

    } catch (error) {
      console.error("Error generating Scene Image V1:", error);
      toast.error(`Failed to generate Scene Image V1: ${(error as Error).message}`);
    } finally {
      setIsGeneratingV1(false);
    }
  };

  // Function to poll Bria result
  const pollBriaResult = useCallback(async (requestId: string) => {
    // --- Timeout Check ---
    const TIMEOUT_DURATION = 3 * 60 * 1000; // 3 minutes in milliseconds
    if (pollingStartTime && (Date.now() - pollingStartTime > TIMEOUT_DURATION)) {
      console.warn(`%c[pollBriaResult] Polling TIMED OUT for requestId: ${requestId}. Clearing interval ID: ${pollingIntervalId}`, 'color: orange');
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
      setPollingRequestId(null);
      setPollingStartTime(null);
      setIsGeneratingV2(false);
      toast.error("Scene Image V2 generation timed out after 3 minutes.");
      return; // Stop polling
    }
    // --- End Timeout Check ---

    if (!scene) return; // Should not happen if polling is active, but good check

    console.log(`%c[pollBriaResult] START CHECK for requestId: ${requestId} (Elapsed: ${pollingStartTime ? ((Date.now() - pollingStartTime)/1000).toFixed(1) : 'N/A'}s)`, 'color: blue');
    try {
      const { data: resultData, error: checkError } = await supabase.functions.invoke('check-bria-result', {
        body: { requestId },
      });

      if (checkError) {
        throw new Error(`Check function error: ${checkError.message}`);
      }

      console.log("[pollBriaResult] Received status data:", resultData);

      if (resultData.status === 'COMPLETED') {
        console.log(`%c[pollBriaResult] Status COMPLETED for ${requestId}. Clearing interval ID: ${pollingIntervalId}`, 'color: green');
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
        setPollingRequestId(null);
        setPollingStartTime(null); // Reset start time
        setIsGeneratingV2(false);
        if (resultData.imageUrl) {
          // Save the image URL
          await updateScene(scene.id, 'sceneImageV2', resultData.imageUrl);
          // Request ID should have been saved earlier in handleGenerateV2.
          // No need to save it again here.
          toast.success("Scene Image V2 generated successfully!");
        } else {
           toast.error("Generation completed but no image URL returned.");
        }
      } else if (resultData.status === 'FAILED' || resultData.status === 'ERROR') {
        console.warn(`%c[pollBriaResult] Status FAILED/ERROR (${resultData.status}) for ${requestId}. Clearing interval ID: ${pollingIntervalId}`, 'color: red');
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
        setPollingRequestId(null);
        setPollingStartTime(null); // Reset start time
        setIsGeneratingV2(false);
        toast.error(`Scene Image V2 generation failed: ${resultData.error || 'Unknown error'}`);
      } else if (resultData.status === 'PENDING' || resultData.status === 'IN_PROGRESS' || resultData.status === 'IN_QUEUE') { // Handle all pending-like statuses
        console.log(`%c[pollBriaResult] Status PENDING (${resultData.status}) for ${requestId}. Continuing poll.`, 'color: gray');
        // Continue polling, do nothing here
      }

    } catch (error) {
      console.error(`%c[pollBriaResult] Error during poll for ${requestId}. Clearing interval ID: ${pollingIntervalId}`, 'color: red', error);
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
      setPollingRequestId(null);
      setPollingStartTime(null); // Reset start time
      setIsGeneratingV2(false);
      toast.error(`Failed to check generation status: ${(error as Error).message}`);
    }
  }, [scene, updateScene, pollingIntervalId, pollingStartTime]); // Include dependencies

  // Function to start V2 generation
  const handleGenerateV2 = async () => {
    if (!scene || !scene.productImageUrl || !scene.sceneImageV1Url) {
      toast.warning("Product Image and Scene Image V1 are required to generate Scene Image V2.");
      return;
    }
    if (!scene.productImageUrl.startsWith('http') || !scene.sceneImageV1Url.startsWith('http')) {
      toast.error("Invalid Product Image or Scene Image V1 URL.");
      return;
    }
    // Clear any existing interval
    if (pollingIntervalId) clearInterval(pollingIntervalId);

    setIsGeneratingV2(true);
    setPollingRequestId(null); // Reset request ID
    setPollingStartTime(null); // Reset start time
    toast.info("Submitting V2 generation request...");

    try {
      // Call the submit function
      const { data: submitData, error: submitError } = await supabase.functions.invoke('generate-bria-image', {
        body: {
          image_url: scene.productImageUrl,
          ref_image_url: scene.sceneImageV1Url,
        },
      });

      if (submitError) {
        throw new Error(`Submit function error: ${submitError.message}`);
      }

      if (!submitData?.requestId) {
        throw new Error('Submit function did not return a request ID.');
      }

      const newRequestId = submitData.requestId;
      setPollingRequestId(newRequestId); // Keep in local state for polling

      // --- Save Request ID immediately ---
      try {
        await updateScene(scene.id, 'bria_v2_request_id', newRequestId);
        console.log(`[handleGenerateV2] Saved bria_v2_request_id: ${newRequestId} for scene ${scene.id}`);
      } catch (saveError) {
        // Log the error but proceed with polling, as the generation *might* still succeed.
        // The user can use manual recheck later if needed.
        console.error(`[handleGenerateV2] Failed to save bria_v2_request_id for scene ${scene.id}:`, saveError);
        toast.error("Failed to save the generation request ID. Manual recheck might be needed later.");
      }
      // --- End Save Request ID ---
      toast.info(`Generation request submitted (ID: ${newRequestId}). Polling for result...`);

      // Start polling immediately and then every 15 seconds
      pollBriaResult(newRequestId); // Initial check immediately
      const intervalId = setInterval(() => {
          console.log(`%c[setInterval] Triggering pollBriaResult for ${newRequestId}`, 'color: purple');
          pollBriaResult(newRequestId);
      }, 15000);
      console.log(`%c[handleGenerateV2] Started polling interval ID: ${intervalId} for requestId: ${newRequestId}`, 'color: green');
      setPollingIntervalId(intervalId);
      setPollingStartTime(Date.now()); // Set start time

      // Note: setIsGeneratingV2(false) is now handled by pollBriaResult on completion/error

    } catch (error) {
      console.error(`%c[handleGenerateV2] Error starting generation. Clearing interval ID: ${pollingIntervalId}`, 'color: red', error);
      toast.error(`Failed to start Scene Image V2 generation: ${(error as Error).message}`);
      setIsGeneratingV2(false); // Reset loading on initial submission failure
      if (pollingIntervalId) clearInterval(pollingIntervalId); // Clear interval if submission fails
      setPollingIntervalId(null);
      setPollingRequestId(null);
      setPollingStartTime(null); // Reset start time
    }
  };

  // Note: The useEffect hook below (depending only on scene.id)
  // handles the cleanup needed when the component unmounts or the scene changes.
  // Removing the potentially redundant cleanup effect that depended on pollingIntervalId:
  // useEffect(() => {
  //   return () => {
  //     console.log(`%c[useEffect Cleanup] Unmounting or intervalId changed. Clearing interval ID: ${pollingIntervalId}`, 'color: brown');
  //     if (pollingIntervalId) {
  //       clearInterval(pollingIntervalId);
  //       setPollingStartTime(null); // Also clear start time on unmount
  //     }
  //   };
  // }, [pollingIntervalId]);

  // Also clear interval if the scene ID changes while polling is active
   useEffect(() => {
     // This effect now ONLY depends on scene.id.
     // It runs when the component mounts and whenever scene.id changes.
     // We return a cleanup function that will be executed when the component
     // unmounts OR just before the effect runs again due to scene.id changing.
     return () => {
       // If polling was active when the scene changed or component unmounted, clear it.
       if (pollingIntervalId) {
          console.log(`%c[useEffect Cleanup - Scene Change/Unmount] Scene ID changed or component unmounting. Clearing interval ID: ${pollingIntervalId}`, 'color: brown');
          clearInterval(pollingIntervalId);
          setPollingIntervalId(null);
          setPollingRequestId(null);
          setPollingStartTime(null);
          // We might not want to set isGeneratingV2 false here,
          // as the generation might still be running in the background for the *previous* scene.
          // Let the natural polling timeout/completion handle the loading state reset.
          // setIsGeneratingV2(false);
       }
     };
   }, [scene?.id]); // <-- CORRECTED DEPENDENCY ARRAY

 // --- Manual Recheck Handler ---
 const handleManualRecheck = async () => {
   if (!scene || !scene.bria_v2_request_id) {
     toast.error("No Bria V2 Request ID found for this scene to recheck.");
     return;
   }
   if (isGeneratingV2 || isRechecking) {
     toast.info("Please wait for the current operation to complete.");
     return;
   }

   const requestId = scene.bria_v2_request_id;
   setIsRechecking(true);
   toast.info(`Manually checking status for request ID: ${requestId}...`);
   console.log(`[handleManualRecheck] Checking status for ${requestId}`);

   try {
     const { data: resultData, error: checkError } = await supabase.functions.invoke('check-bria-result', {
       body: { requestId },
     });

     if (checkError) {
       throw new Error(`Check function error: ${checkError.message}`);
     }

     console.log("[handleManualRecheck] Received status data:", resultData);

     if (resultData.status === 'COMPLETED') {
       if (resultData.imageUrl) {
         // Save the image URL
         await updateScene(scene.id, 'sceneImageV2', resultData.imageUrl);
         // Optionally clear the request ID now that it's resolved
         try {
           await updateScene(scene.id, 'bria_v2_request_id', ''); // Clear the ID
           console.log(`[handleManualRecheck] Cleared bria_v2_request_id for scene ${scene.id}`);
         } catch (clearError) {
           console.warn(`[handleManualRecheck] Failed to clear bria_v2_request_id for scene ${scene.id}:`, clearError);
         }
         toast.success("Scene Image V2 retrieved successfully!");
       } else {
          toast.error("Generation completed but no image URL returned.");
          // Consider clearing the request ID even if no URL is returned to prevent repeated checks for a bad result
          // await updateScene(scene.id, 'bria_v2_request_id', '');
       }
     } else if (resultData.status === 'FAILED' || resultData.status === 'ERROR') {
       toast.error(`Generation failed or errored: ${resultData.error || 'Unknown error'}`);
       // Optionally clear the request ID for failed jobs
       // await updateScene(scene.id, 'bria_v2_request_id', '');
     } else if (resultData.status === 'PENDING' || resultData.status === 'IN_PROGRESS' || resultData.status === 'IN_QUEUE') {
       toast.info(`Generation is still in progress (${resultData.status}). Please try again later.`);
     } else {
       toast.warning(`Received unexpected status: ${resultData.status}`);
     }

   } catch (error) {
     console.error("[handleManualRecheck] Error:", error);
     toast.error(`Failed to manually check status: ${(error as Error).message}`);
   } finally {
     setIsRechecking(false);
   }
 };
  // --- End AI Generation Handlers ---

  // --- Download Handler ---
  const handleDownloadImage = async (imageUrl: string, filename = 'downloaded-image.png') => {
    if (!imageUrl) {
      toast.error("No image URL provided for download.");
      return;
    }
    toast.info("Preparing image for download...");
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      // Create a temporary link element
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;

      // Programmatically click the link to trigger the download
      document.body.appendChild(link); // Required for Firefox
      link.click();

      // Clean up the temporary link and object URL
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      toast.success("Image download started.");

    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error(`Failed to download image: ${(error as Error).message}`);
    }
  };
  // --- End Download Handler ---

  const handleVoiceOverUploaded = async (url: string) => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'voiceOver', url);
    } catch (error) {
      console.error("Error saving voice-over URL:", error);
      throw error;
    }
  };

  const handleRemoveVoiceOver = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'voiceOver', '');
    } catch (error) {
      console.error("Error removing voice-over:", error);
      throw error;
    }
  };

  const handleBackgroundMusicUploaded = async (url: string) => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'backgroundMusic', url);
    } catch (error) {
      console.error("Error saving background music URL:", error);
      throw error;
    }
  };

  const handleRemoveBackgroundMusic = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'backgroundMusic', '');
    } catch (error) {
      console.error("Error removing background music:", error);
      throw error;
    }
  };

  const handleVideoUploaded = async (url: string) => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'video', url);
    } catch (error) {
      console.error("Error saving video URL:", error);
      throw error;
    }
  };

  const handleRemoveVideo = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'video', '');
    } catch (error) {
      console.error("Error removing video:", error);
      throw error;
    }
  };

  if (collapsed) {
    return (
      <div className="w-10 border-l flex flex-col items-center py-4 bg-background dark:bg-secondary">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(false)}
          className="mb-4"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  if (!scene) {
    return (
      <div className="w-80 border-l bg-background dark:bg-secondary flex items-center justify-center">
        <p className="text-muted-foreground">Select a scene to see details</p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(true)}
          className="absolute right-2 top-2"
        >
          <PanelRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-80 border-l bg-background dark:bg-secondary flex flex-col relative h-full">
        <div className="p-4 border-b bg-background flex justify-between items-center">
          <h3 className="font-medium">Scene Details</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
          >
            <PanelRight className="h-5 w-5" />
          </Button>
        </div>

        <Tabs defaultValue="edit" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full">
            <TabsTrigger value="edit" className="flex-1">Edit</TabsTrigger>
            <TabsTrigger value="media" className="flex-1">Media</TabsTrigger>
            <TabsTrigger value="ai" className="flex-1">AI</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="space-y-6 p-4">
                <div className="space-y-2">
                  <Label htmlFor="scene-title">Scene Title</Label>
                  <Input
                    id="scene-title"
                    value={scene.title}
                    onChange={() => {}}
                    placeholder="Scene title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scene-script">Script</Label>
                  <Textarea
                    id="scene-script"
                    value={scene?.script || ""}
                    onChange={(e) => updateScene(scene!.id, 'script', e.target.value)}
                    className="min-h-[120px]"
                    placeholder="Enter script for this scene..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scene-description">Scene Description</Label>
                  <Textarea
                    id="scene-description"
                    value={scene?.description || ""}
                    onChange={(e) => updateScene(scene!.id, 'description', e.target.value)}
                    className="min-h-[120px]"
                    placeholder="Enter description for this scene..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scene-image-prompt">Image Prompt</Label>
                  <Textarea
                    id="scene-image-prompt"
                    value={scene?.imagePrompt || ""}
                    onChange={(e) => updateScene(scene!.id, 'imagePrompt', e.target.value)}
                    className="min-h-[120px]"
                    placeholder="Enter image prompt for this scene..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Scene Duration</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={scene.duration || 5}
                      onChange={() => {}}
                    />
                    <span className="text-muted-foreground">seconds</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="media" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="space-y-6 p-4">
                {/* --- Scene Product Image Section --- */}
                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <input
                    type="file"
                    ref={productImageInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelected}
                  />

                  {scene?.productImageUrl ? (
                    <div className="relative group">
                      <img
                        src={scene.productImageUrl}
                        alt="Product"
                        className="w-full h-[120px] object-contain border rounded"
                      />
                      <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/30 rounded">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleRemoveProductImage}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-[120px]"
                      onClick={handleProductImageUpload}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Product Image
                    </Button>
                  )}
                {/* --- End Scene Product Image Section --- */}
                </div>
                {/* --- End Scene Product Image Section --- */}

                {/* --- Scene Image V1 Section --- */}
                <div className="space-y-2">
                  <Label>Scene Image V1</Label>
                  <input
                    type="file"
                    ref={sceneImageV1InputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleSceneImageV1FileSelected}
                  />

                  {/* Image Preview or Upload Button */}
                  {scene?.sceneImageV1Url ? (
                    <div className="relative group mb-2"> {/* Added margin-bottom */}
                      <img
                        src={scene.sceneImageV1Url}
                        alt="Scene V1"
                        className="w-full h-[120px] object-contain border rounded"
                      />
                      <div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-2 bg-black/50 rounded"> {/* Added gap, darker overlay */}
                        {/* Download Button */}
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7" // Smaller icon button
                          onClick={() => handleDownloadImage(scene.sceneImageV1Url!, `scene_v1_${scene.id}.png`)}
                          title="Download Image"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                         {/* Remove Button */}
                        <Button
                          variant="destructive"
                          size="icon"
                           className="h-7 w-7" // Smaller icon button
                          onClick={handleRemoveSceneImageV1}
                          disabled={isGeneratingV1 || isGeneratingV2}
                          title="Remove Image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-[120px] mb-2" // Added margin-bottom
                      onClick={handleSceneImageV1Upload}
                      disabled={isGeneratingV1 || isGeneratingV2} // Disable upload during generation
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Scene Image V1
                    </Button>
                  )}

                  {/* Generate Button (Always visible below) */}
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleGenerateV1}
                    disabled={!scene?.productImageUrl || !scene?.imagePrompt || isGeneratingV1 || isGeneratingV2}
                  >
                    {isGeneratingV1 ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4 mr-2" />
                    )}
                    Generate V1 (fal)
                  </Button>
                </div>
                {/* --- End Scene Image V1 Section --- */}

                {/* --- Scene Image V2 Section --- */}
                <div className="space-y-2">
                  <Label>Scene Image V2</Label>
                  <input
                    type="file"
                    ref={sceneImageV2InputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleSceneImageV2FileSelected}
                  />

                  {scene?.sceneImageV2Url ? (
                    <div className="relative group">
                      <img
                        src={scene.sceneImageV2Url}
                        alt="Scene V2"
                        className="w-full h-[120px] object-contain border rounded"
                      />
                      <div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-2 bg-black/50 rounded"> {/* Added gap, darker overlay */}
                        {/* Download Button */}
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7" // Smaller icon button
                          onClick={() => handleDownloadImage(scene.sceneImageV2Url!, `scene_v2_${scene.id}.png`)}
                          title="Download Image"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {/* Remove Button */}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-7 w-7" // Smaller icon button
                          onClick={handleRemoveSceneImageV2}
                          disabled={isGeneratingV1 || isGeneratingV2} // Disable remove during generation
                          title="Remove Image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                     <div className="flex flex-col gap-2">
                       <Button
                         variant="outline"
                         className="w-full h-[80px]" // Adjusted height
                         onClick={handleSceneImageV2Upload}
                         disabled={isGeneratingV2}
                       >
                         <Upload className="h-4 w-4 mr-2" />
                         Upload Scene Image V2
                       </Button>
                       <Button
                         variant="secondary" // Or another appropriate variant
                         className="w-full"
                         onClick={handleGenerateV2}
                         disabled={!scene?.productImageUrl || !scene?.sceneImageV1Url || isGeneratingV1 || isGeneratingV2}
                       >
                         {isGeneratingV2 ? (
                           <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                         ) : (
                           <Wand2 className="h-4 w-4 mr-2" />
                         )}
                         Generate V2 (bria)
                       </Button>
                       {/* Manual Recheck Button - Show if ID exists but image doesn't */}
                       {scene?.bria_v2_request_id && !scene?.sceneImageV2Url && (
                         <Button
                           variant="outline"
                           size="sm"
                           className="w-full mt-2"
                           onClick={handleManualRecheck}
                           disabled={isRechecking || isGeneratingV2} // Disable during auto-poll or manual recheck
                         >
                           {isRechecking ? (
                             <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                           ) : (
                             <RefreshCw className="h-4 w-4 mr-2" />
                           )}
                           Recheck V2 Status
                         </Button>
                       )}
                     </div>
                  )}
                </div>
                {/* --- End Scene Image V2 Section --- */}
                <VideoUploader
                  label="Scene Video"
                  videoUrl={scene?.videoUrl}
                  onVideoUploaded={handleVideoUploaded}
                  onRemoveVideo={handleRemoveVideo}
                  bucketName="scene-videos"
                />

                <AudioUploader
                  label="Voice-Over"
                  audioUrl={scene?.voiceOverUrl}
                  onAudioUploaded={handleVoiceOverUploaded}
                  onRemoveAudio={handleRemoveVoiceOver}
                  bucketName="voice-over"
                />

                <AudioUploader
                  label="Background Music"
                  audioUrl={scene?.backgroundMusicUrl}
                  onAudioUploaded={handleBackgroundMusicUploaded}
                  onRemoveAudio={handleRemoveBackgroundMusic}
                  bucketName="background-music"
                />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ai" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="space-y-6 p-4">
                <div className="space-y-2">
                  <Label>AI Agent</Label>
                  <AgentSelector
                    onChange={setSelectedAgent}
                    defaultValue={selectedAgent}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Generate</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleGenerateContent('script')}
                      disabled={isGenerating}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Script
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleGenerateContent('description')}
                      disabled={isGenerating}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Description
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleGenerateContent('imagePrompt')}
                      disabled={isGenerating}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Image Prompt
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleGenerateContent('image')}
                      disabled={isGenerating}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Scene Image
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleGenerateContent('video')}
                      disabled={isGenerating}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Scene Video
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>AI Instructions</Label>
                  <Textarea
                    placeholder="Enter custom instructions for the AI..."
                    className="min-h-[120px]"
                    value={aiInstructions}
                    onChange={(e) => setAiInstructions(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Agent Chat</Label>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAgentDialog(true)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Open Agent Chat
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showAgentDialog} onOpenChange={setShowAgentDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Canvas AI Agent</DialogTitle>
            <DialogDescription>
              Agent: {activeAgent ? activeAgent.charAt(0).toUpperCase() + activeAgent.slice(1) : "Assistant"}
              {isGenerating && " (Processing...)"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto my-4 space-y-4 max-h-[60vh]">
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                showAgentName={message.role === "assistant" && message.agentType !== undefined}
              />
            ))}

            {messages.length === 0 && (
              <div className="text-center text-muted-foreground p-4">
                No messages yet. Generate content to start a conversation with the AI agent.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAgentDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
