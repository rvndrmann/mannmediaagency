import { CanvasScene, CanvasProject } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PanelRight, ChevronRight, Wand2, Upload, Trash2, MessageSquare, Loader2, Download, RefreshCw, Video, Sparkles } from "lucide-react"; // Added Loader2, Download, RefreshCw, Video, Sparkles
import { Label } from "@/components/ui/label";
// Removed Tabs imports as they are no longer used directly here
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components (kept in case needed elsewhere indirectly)
import { AgentSelector } from "./AgentSelector"; // Kept for Agent Dialog
import { AudioUploader } from "./AudioUploader";
import { VideoUploader } from "./VideoUploader";
import { useState, useRef, useEffect, useCallback } from "react"; // Added useCallback
import { toast } from "sonner";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"; // Ensure Tooltip components are imported if used
import { useCanvasAgent } from "@/hooks/use-canvas-agent";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { uploadFileToBucket } from '@/utils/supabase-helpers'; // Import Supabase upload helper
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client
import { useFalImageToVideo } from "@/hooks/useFalImageToVideo"; // Import the new hook

interface CanvasDetailPanelProps {
  scene: CanvasScene | null;
  projectId: string;
  project: CanvasProject | null;
  projects?: CanvasProject[]; // Add projects prop
  updateScene: (sceneId: string, type: 'script' | 'imagePrompt' | 'description' | 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic' | 'sceneImageV1' | 'sceneImageV2' | 'bria_v2_request_id' | 'fal_tts_request_id' | 'voiceoverAudioUrl', value: string | null) => Promise<void>;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function CanvasDetailPanel({
  scene,
  projectId,
  project,
  projects, // Destructure projects
  updateScene,
  collapsed,
  setCollapsed,
}: CanvasDetailPanelProps) {
  const [selectedAgent, setSelectedAgent] = useState("script"); // Still needed for dialog? Review if dialog is kept
  const [aiInstructions, setAiInstructions] = useState(""); // Still needed for dialog? Review if dialog is kept
  const [isGenerating, setIsGenerating] = useState(false); // General AI generation loading
  const [isGeneratingV1, setIsGeneratingV1] = useState(false); // Specific loading for V1 generation
  const [isGeneratingV2, setIsGeneratingV2] = useState(false); // Specific loading for V2 generation
  const [showAgentDialog, setShowAgentDialog] = useState(false); // Controls the agent interaction dialog
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const sceneImageV1InputRef = useRef<HTMLInputElement>(null); // Added ref for Scene Image V1
  const sceneImageV2InputRef = useRef<HTMLInputElement>(null); // Added ref for Scene Image V2
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null); // State for interval ID
  const [pollingRequestId, setPollingRequestId] = useState<string | null>(null); // State for request ID being polled
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null); // State for polling start time
  const [isRechecking, setIsRechecking] = useState(false); // State for manual recheck loading
  const [isGeneratingVideoV1, setIsGeneratingVideoV1] = useState(false); // Loading state for Video V1
  const [isGeneratingVideoV2, setIsGeneratingVideoV2] = useState(false); // Loading state for Video V2
  const [isGeneratingVoiceOver, setIsGeneratingVoiceOver] = useState(false); // Loading state for Auto Voice Over generation/polling
  const [ttsPollingIntervalId, setTtsPollingIntervalId] = useState<NodeJS.Timeout | null>(null); // State for TTS interval ID
  const [ttsPollingRequestId, setTtsPollingRequestId] = useState<string | null>(null); // State for TTS request ID being polled
  const [ttsPollingStartTime, setTtsPollingStartTime] = useState<number | null>(null); // State for TTS polling start time
  const [isRecheckingVoiceOver, setIsRecheckingVoiceOver] = useState(false); // State for manual TTS recheck loading

  const {
    isProcessing, // Renamed from agentIsProcessing
    messages, // Use messages instead of agentMessages
    activeAgent, // Track which agent is active (script, imagePrompt, etc.)
    generateSceneScript,
    generateImagePrompt,
    generateSceneDescription // Assuming this exists in the hook
  } = useCanvasAgent({
    projectId,
    project, // Pass project
    projects, // Pass projects
    sceneId: scene?.id,
    updateScene
  });

  // Instantiate the Fal Image-to-Video hook
  const {
    submitJob: submitFalVideoJob,
    isLoading: isFalVideoSubmitting,
    isPolling: isFalVideoPolling,
    error: falVideoError,
    status: falVideoStatus,
    videoUrl: falVideoUrl, // We might use this later
  } = useFalImageToVideo();

  useEffect(() => {
    // Update general loading state based on the hook's processing state
    // This might need refinement if multiple generations can happen concurrently
    setIsGenerating(isProcessing);
  }, [isProcessing]);

  // Simplified handler, potentially triggering the dialog or directly calling generation
  const handleGenerateContent = async (contentType: 'script' | 'imagePrompt' | 'description') => {
    if (!scene) return;

    // Option 1: Directly generate without dialog (if instructions aren't needed upfront)
    setIsGenerating(true); // Set general loading true
    // activeAgent should be set within the hook based on which function is called

    try {
      const contextData: Record<string, string> = {};
      if (scene.script && contentType !== 'script') contextData.script = scene.script;
      if (scene.description && contentType !== 'description') contextData.description = scene.description;
      if (scene.imagePrompt && contentType !== 'imagePrompt') contextData.imagePrompt = scene.imagePrompt;

      const contextString = Object.entries(contextData)
        .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
        .join('\n\n');

      // Simple context for now, dialog could add more
      const fullContext = contextData ? `\n\nExisting Scene Info:\n${contextString}` : '';

      switch (contentType) {
        case 'script':
          await generateSceneScript(scene.id, fullContext);
          break;
        case 'description':
           // Assuming generateSceneDescription exists and takes similar args
          await generateSceneDescription(scene.id, fullContext);
          break;
        case 'imagePrompt':
          // Pass necessary context; adjust if hook signature differs
          await generateImagePrompt(scene.id, scene.script || '', scene.voiceOverText || '', '', fullContext);
          break;
      }
      toast.success(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} generation started.`);

    } catch (error) {
      console.error(`Error generating ${contentType}:`, error);
      toast.error(`Failed to generate ${contentType}`);
    } finally {
       // setIsGenerating(false); // Hook's isProcessing should handle this via useEffect
    }

    // Option 2: Open Dialog (if instructions ARE needed)
    // setSelectedAgent(contentType); // Set agent type for the dialog
    // setShowAgentDialog(true);
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

    toast.info("Uploading product image...");

    try {
      const publicUrl = await uploadFileToBucket('canvas-assets', file);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded product image');
      }
      await updateScene(scene.id, 'productImage', publicUrl);
      toast.success("Product image uploaded successfully");

    } catch (error) {
      console.error("Error uploading product image:", error);
      toast.error(`Failed to upload product image: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (e.target) e.target.value = '';
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

    toast.info("Uploading Scene Image V1...");

    try {
      const publicUrl = await uploadFileToBucket('canvas-assets', file);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded Scene Image V1');
      }
      console.log(`[handleSceneImageV1FileSelected] Attempting to update scene ${scene.id} with type 'sceneImageV1' and URL: ${publicUrl}`);
      try {
        await updateScene(scene.id, 'sceneImageV1', publicUrl);
        console.log(`[handleSceneImageV1FileSelected] updateScene call succeeded for scene ${scene.id}`);
        toast.success("Scene Image V1 uploaded successfully");
      } catch (updateError) {
         console.error(`[handleSceneImageV1FileSelected] updateScene call failed for scene ${scene.id}:`, updateError);
         throw updateError;
      }

    } catch (error) {
      console.error("Error uploading Scene Image V1:", error);
      toast.error(`Failed to upload Scene Image V1: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (e.target) e.target.value = '';
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

    toast.info("Uploading Scene Image V2...");

    try {
      const publicUrl = await uploadFileToBucket('canvas-assets', file);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded Scene Image V2');
      }
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
    const TIMEOUT_DURATION = 3 * 60 * 1000; // 3 minutes
    if (pollingStartTime && (Date.now() - pollingStartTime > TIMEOUT_DURATION)) {
      console.warn(`%c[pollBriaResult] Polling TIMED OUT for requestId: ${requestId}. Clearing interval ID: ${pollingIntervalId}`, 'color: orange');
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
      setPollingRequestId(null);
      setPollingStartTime(null);
      setIsGeneratingV2(false);
      toast.error("Scene Image V2 generation timed out after 3 minutes.");
      return;
    }

    if (!scene) return;

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
        setPollingStartTime(null);
        setIsGeneratingV2(false);
        if (resultData.imageUrl) {
          await updateScene(scene.id, 'sceneImageV2', resultData.imageUrl);
          toast.success("Scene Image V2 generated successfully!");
        } else {
           toast.error("Generation completed but no image URL returned.");
        }
      } else if (resultData.status === 'FAILED' || resultData.status === 'ERROR') {
        console.warn(`%c[pollBriaResult] Status FAILED/ERROR (${resultData.status}) for ${requestId}. Clearing interval ID: ${pollingIntervalId}`, 'color: red');
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
        setPollingRequestId(null);
        setPollingStartTime(null);
        setIsGeneratingV2(false);
        toast.error(`Scene Image V2 generation failed: ${resultData.error || 'Unknown error'}`);
      } else if (resultData.status === 'PENDING' || resultData.status === 'IN_PROGRESS' || resultData.status === 'IN_QUEUE') {
        console.log(`%c[pollBriaResult] Status PENDING (${resultData.status}) for ${requestId}. Continuing poll.`, 'color: gray');
      }

    } catch (error) {
      console.error(`%c[pollBriaResult] Error during poll for ${requestId}. Clearing interval ID: ${pollingIntervalId}`, 'color: red', error);
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
      setPollingRequestId(null);
      setPollingStartTime(null);
      setIsGeneratingV2(false);
      toast.error(`Failed to check generation status: ${(error as Error).message}`);
    }
  }, [scene, updateScene, pollingIntervalId, pollingStartTime]);

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
    if (pollingIntervalId) clearInterval(pollingIntervalId);

    setIsGeneratingV2(true);
    setPollingRequestId(null);
    setPollingStartTime(null);
    toast.info("Submitting V2 generation request...");

    try {
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
      setPollingRequestId(newRequestId);

      try {
        await updateScene(scene.id, 'bria_v2_request_id', newRequestId);
        console.log(`[handleGenerateV2] Saved bria_v2_request_id: ${newRequestId} for scene ${scene.id}`);
      } catch (saveError) {
        console.error(`[handleGenerateV2] Failed to save bria_v2_request_id for scene ${scene.id}:`, saveError);
        toast.error("Failed to save the generation request ID. Manual recheck might be needed later.");
      }
      toast.info(`Generation request submitted (ID: ${newRequestId}). Polling for result...`);

      pollBriaResult(newRequestId); // Initial check
      const intervalId = setInterval(() => {
          console.log(`%c[setInterval] Triggering pollBriaResult for ${newRequestId}`, 'color: purple');
          pollBriaResult(newRequestId);
      }, 15000);
      console.log(`%c[handleGenerateV2] Started polling interval ID: ${intervalId} for requestId: ${newRequestId}`, 'color: green');
      setPollingIntervalId(intervalId);
      setPollingStartTime(Date.now());

    } catch (error) {
      console.error(`%c[handleGenerateV2] Error starting generation. Clearing interval ID: ${pollingIntervalId}`, 'color: red', error);
      toast.error(`Failed to start Scene Image V2 generation: ${(error as Error).message}`);
      setIsGeneratingV2(false);
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
      setPollingRequestId(null);
      setPollingStartTime(null);
    }
  };

  // Cleanup Bria polling interval on unmount or scene change
  useEffect(() => {
    const currentBriaIntervalId = pollingIntervalId; // Capture Bria interval ID
    return () => {
      if (currentBriaIntervalId) {
        console.log(`%c[useEffect Cleanup - Bria] Clearing interval ID: ${currentBriaIntervalId}`, 'color: brown');
        clearInterval(currentBriaIntervalId);
      }
    };
  }, [scene?.id]); // Depend only on scene.id for Bria cleanup

  // Cleanup TTS polling interval on unmount or scene change
  useEffect(() => {
    const currentTtsIntervalId = ttsPollingIntervalId; // Capture TTS interval ID
    return () => {
      if (currentTtsIntervalId) {
        console.log(`%c[useEffect Cleanup - TTS] Clearing interval ID: ${currentTtsIntervalId}`, 'color: brown');
        clearInterval(currentTtsIntervalId);
      }
    };
  }, [scene?.id]); // Depend only on scene.id for TTS cleanup


 // Manual Recheck Function
 const handleManualRecheck = async () => {
    if (!scene || !scene.bria_v2_request_id) {
      toast.warning("No active generation request ID found for this scene.");
      return;
    }
    if (isGeneratingV2 || isRechecking) {
        toast.info("Already checking status...");
        return;
    }

    const requestIdToCheck = scene.bria_v2_request_id;
    console.log(`%c[handleManualRecheck] Manually checking status for requestId: ${requestIdToCheck}`, 'color: magenta');
    setIsRechecking(true); // Indicate manual check is in progress
    toast.info(`Rechecking status for request ID: ${requestIdToCheck}...`);

    try {
      const { data: resultData, error: checkError } = await supabase.functions.invoke('check-bria-result', {
        body: { requestId: requestIdToCheck },
      });

      if (checkError) {
        throw new Error(`Check function error: ${checkError.message}`);
      }

      console.log("[handleManualRecheck] Received status data:", resultData);

      if (resultData.status === 'COMPLETED') {
        setIsGeneratingV2(false); // Ensure loading state is off
        if (resultData.imageUrl) {
          await updateScene(scene.id, 'sceneImageV2', resultData.imageUrl);
          toast.success("Scene Image V2 status rechecked: Generation completed!");
        } else {
           toast.error("Recheck status: Generation completed but no image URL returned.");
        }
      } else if (resultData.status === 'FAILED' || resultData.status === 'ERROR') {
        setIsGeneratingV2(false); // Ensure loading state is off
        toast.error(`Recheck status: Generation failed: ${resultData.error || 'Unknown error'}`);
      } else if (resultData.status === 'PENDING' || resultData.status === 'IN_PROGRESS' || resultData.status === 'IN_QUEUE') {
        toast.info(`Recheck status: Generation still in progress (${resultData.status}).`);
        // Optionally restart polling if it wasn't running
        if (!pollingIntervalId && !isGeneratingV2) {
            console.log(`%c[handleManualRecheck] Restarting polling for ${requestIdToCheck}`, 'color: orange');
            setPollingRequestId(requestIdToCheck);
            setPollingStartTime(Date.now()); // Reset start time for the new polling session
            setIsGeneratingV2(true); // Set loading state as polling is now active
            pollBriaResult(requestIdToCheck); // Initial check
            const intervalId = setInterval(() => pollBriaResult(requestIdToCheck), 15000);
            setPollingIntervalId(intervalId);
            toast.info("Polling restarted.");
        }
      } else {
          toast.warning(`Recheck status: Unknown status received (${resultData.status})`);
      }

    } catch (error) {
      console.error(`%c[handleManualRecheck] Error during manual check for ${requestIdToCheck}`, 'color: red', error);
      toast.error(`Failed to recheck generation status: ${(error as Error).message}`);
    } finally {
        setIsRechecking(false); // Turn off manual recheck indicator
    }
  };

  // --- Video Generation Placeholder Handlers ---
  const handleGenerateVideoV1 = async () => {
    if (!scene) return;
    console.log("Generate Video V1 clicked for scene:", scene.id);
    toast.info("Video V1 generation not yet implemented.");
    // Placeholder: Set loading state (optional for pure placeholder)
    // setIsGeneratingVideoV1(true);
    // Simulate work
    // setTimeout(() => setIsGeneratingVideoV1(false), 1000);
  };

  const handleGenerateVideoV2 = async () => {
    if (!scene) return;
    console.log("Generate Video V2 clicked for scene:", scene.id);
    toast.info("Video V2 generation not yet implemented.");
    // Placeholder: Set loading state (optional for pure placeholder)
    // setIsGeneratingVideoV2(true);
    // Simulate work
    // setTimeout(() => setIsGeneratingVideoV2(false), 1000);
  };
  // --- End Video Generation Placeholder Handlers ---



  // --- Utility Handlers ---
  const handleDownloadImage = async (imageUrl: string, filename = 'downloaded-image.png') => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Network response was not ok.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("Image downloaded.");
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Failed to download image.");
    }
  };

  // --- Media Upload Handlers ---
  const handleVoiceOverUploaded = async (url: string) => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'voiceOver', url);
      toast.success("Voice over uploaded.");
    } catch (error) {
      toast.error("Failed to save voice over.");
    }
  };

  const handleRemoveVoiceOver = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'voiceOver', '');
      toast.success("Voice over removed.");
    } catch (error) {
      toast.error("Failed to remove voice over.");
    }
  };

  const handleBackgroundMusicUploaded = async (url: string) => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'backgroundMusic', url);
      toast.success("Background music uploaded.");
    } catch (error) {
      toast.error("Failed to save background music.");
    }
  };

  const handleRemoveBackgroundMusic = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'backgroundMusic', '');
      toast.success("Background music removed.");
    } catch (error) {
      toast.error("Failed to remove background music.");
    }
  };

  const handleGenerateVoiceOver = async () => {
    if (!scene) return;
    console.log("Generate Auto Voice Over clicked for scene:", scene.id);
    // In a real implementation, you would set loading state here:
    // setIsGeneratingVoiceOver(true);
    toast.info("Auto voice over generation not yet implemented.");
    // And reset loading state in a finally block after API call
    // finally { setIsGeneratingVoiceOver(false); }
  };

  const handleVideoUploaded = async (url: string) => {
    if (!scene) return;
    try {
      // Conceptually treat scene.videoUrls as string[] | undefined
      const currentUrls = (scene as any).videoUrls as string[] | undefined ?? [];
      const newUrls = [...currentUrls, url];
      // Assume updateScene can handle 'videoUrls' and string[] (using 'as any' to bypass current TS definition)
      await updateScene(scene.id, 'videoUrls' as any, newUrls as any);
      toast.success("Video added successfully");
    } catch (error) {
      console.error("Error adding video URL:", error);
      toast.error("Failed to add video URL");
    }
  };

  const handleRemoveVideo = async (urlToRemove: string) => {
    if (!scene) return;
    try {
      // Conceptually treat scene.videoUrls as string[] | undefined
      const currentUrls = (scene as any).videoUrls as string[] | undefined ?? [];
      const newUrls = currentUrls.filter(vUrl => vUrl !== urlToRemove);
      // Assume updateScene can handle 'videoUrls' and string[] (using 'as any' to bypass current TS definition)
      await updateScene(scene.id, 'videoUrls' as any, newUrls as any);
      toast.success("Video removed successfully");
    } catch (error) {
      console.error("Error removing video URL:", error);
      toast.error("Failed to remove video URL");
    }
  };


  if (collapsed) {
    return (
      <div className="w-10 border-l flex flex-col items-center py-4 bg-background dark:bg-secondary">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setCollapsed(false)}>
                <PanelRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Show Details</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Expanded Panel
  return (
    <TooltipProvider>
      <div className="flex-1 border-l bg-background dark:bg-secondary flex flex-col relative h-full"> {/* Changed w-80 to flex-1 */}
        {/* Header */}
        <div className="p-4 border-b bg-background flex justify-between items-center">
          <h2 className="text-lg font-semibold">Scene Details</h2>
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(true)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Content Area (Replaces Tabs) */}
        <ScrollArea className="flex-1 p-4"> {/* Added flex-1 and padding */}
          <div className="space-y-6"> {/* Removed padding from here */}

            {/* --- Re-integrated Text Areas --- */}
            {/* Scene Description */}
            <div className="space-y-2 relative"> {/* Added relative */}
              <Label htmlFor="scene-description">Scene Description</Label>
              <Textarea
                id="scene-description"
                placeholder="Describe the scene visually..."
                value={scene?.description || ""}
                onChange={(e) => scene && updateScene(scene.id, 'description', e.target.value)}
                className="min-h-[80px]"
                disabled={!scene || isProcessing} // Disable textarea during generation
              />
              {/* Generate with AI Button for Description */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                   <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-0 right-0 mt-1 mr-1 h-7 w-7" // Positioned top-right within the div
                      onClick={() => handleGenerateContent('description')}
                      disabled={!scene || isProcessing} // Disable button during generation
                    >
                      {isProcessing && activeAgent === 'description' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" /> // Use Sparkles for consistency
                      )}
                      <span className="sr-only">Generate Description with AI</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Generate Description with AI</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Script / Voiceover Text */}
            <div className="space-y-2 relative"> {/* Added relative */}
              <Label htmlFor="scene-script">Script / Voiceover Text</Label>
              <Textarea
                id="scene-script"
                placeholder="Enter script or voiceover text..."
                value={scene?.script || ""}
                onChange={(e) => scene && updateScene(scene.id, 'script', e.target.value)}
                className="min-h-[100px]"
                disabled={!scene}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                   <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground" // Adjusted size/pos
                    onClick={() => handleGenerateContent('script')}
                    disabled={isProcessing || !scene} // Use isProcessing for consistency
                  >
                    {(isProcessing && activeAgent === 'script') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Generate Script with AI</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Image Prompt */}
            <div className="space-y-2 relative"> {/* Added relative */}
              <Label htmlFor="scene-image-prompt">Image Prompt</Label>
              <Textarea
                id="scene-image-prompt"
                placeholder="Enter prompt for image generation..."
                value={scene?.imagePrompt || ""}
                onChange={(e) => scene && updateScene(scene.id, 'imagePrompt', e.target.value)}
                className="min-h-[100px]"
                disabled={!scene}
              />
               <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground" // Adjusted size/pos
                    onClick={() => handleGenerateContent('imagePrompt')}
                    disabled={isProcessing || !scene} // Use isProcessing for consistency
                  >
                    {(isProcessing && activeAgent === 'imagePrompt') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Generate Image Prompt with AI</p>
                </TooltipContent>
              </Tooltip>
            </div>
            {/* --- End Re-integrated Text Areas --- */}


            {/* --- Media Sections (Original Media Tab Content) --- */}
            {/* Product Image */}
            <div className="space-y-2">
              <Label htmlFor="product-image">Product Image</Label>
              <Input
                id="product-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                ref={productImageInputRef}
                onChange={handleFileSelected}
                disabled={!scene}
              />
              {scene?.productImageUrl ? (
                <div className="relative group">
                  <img
                    src={scene.productImageUrl}
                    alt="Product Image"
                    className="w-full h-auto rounded object-cover max-h-48" // Added max-h
                  />
                  <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/30 rounded">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={handleRemoveProductImage}
                      disabled={!scene}
                      title="Remove Product Image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleProductImageUpload}
                  disabled={!scene}
                >
                  <Upload className="mr-2 h-4 w-4" /> Upload Product Image
                </Button>
              )}
            </div>

            {/* Scene Image V1 */}
            <div className="space-y-2">
              <Label htmlFor="scene-image-v1">Scene Image V1 (Fal AI)</Label>
              <Input
                id="scene-image-v1-upload"
                type="file"
                accept="image/*"
                className="hidden"
                ref={sceneImageV1InputRef}
                onChange={handleSceneImageV1FileSelected}
                disabled={!scene}
              />
              {scene?.sceneImageV1Url ? (
                <div className="relative group">
                  <img
                    src={scene.sceneImageV1Url}
                    alt="Scene V1"
                    className="w-full h-auto rounded object-cover max-h-48" // Added max-h
                  />
                  <div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-2 bg-black/50 rounded"> {/* Added gap, darker overlay */}
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={() => handleDownloadImage(scene.sceneImageV1Url!, `scene_${scene.id}_v1.png`)}
                              title="Download V1 Image"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Download V1 Image</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={handleRemoveSceneImageV1}
                              disabled={!scene}
                              title="Remove V1 Image"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Remove V1 Image</p></TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ) : (
                 <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSceneImageV1Upload}
                  disabled={!scene}
                >
                  <Upload className="mr-2 h-4 w-4" /> Upload Scene Image V1
                </Button>
              )}
              {/* Generate V1 Button */}
              <Button
                className="w-full"
                onClick={handleGenerateV1}
                disabled={!scene || !scene.productImageUrl || !scene.imagePrompt || isGeneratingV1 || isGeneratingV2}
                title={!scene?.productImageUrl || !scene?.imagePrompt ? "Requires Product Image and Image Prompt" : "Generate Scene Image V1 using Fal AI"}
              >
                {isGeneratingV1 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                {isGeneratingV1 ? 'Generating V1...' : 'Generate Scene Image V1 (Fal)'}
              </Button>
            </div>


            {/* Scene Image V2 */}
            <div className="space-y-2">
              <Label htmlFor="scene-image-v2">Scene Image V2 (Bria AI)</Label>
               <Input
                id="scene-image-v2-upload"
                type="file"
                accept="image/*"
                className="hidden"
                ref={sceneImageV2InputRef}
                onChange={handleSceneImageV2FileSelected}
                disabled={!scene}
              />
              {scene?.sceneImageV2Url ? (
                <div className="relative group">
                  <img
                    src={scene.sceneImageV2Url}
                    alt="Scene V2"
                    className="w-full h-auto rounded object-cover max-h-48" // Added max-h
                  />
                  <div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-2 bg-black/50 rounded"> {/* Added gap, darker overlay */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={() => handleDownloadImage(scene.sceneImageV2Url!, `scene_${scene.id}_v2.png`)}
                              title="Download V2 Image"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Download V2 Image</p></TooltipContent>
                    </Tooltip>
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={handleRemoveSceneImageV2}
                              disabled={!scene}
                              title="Remove V2 Image"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Remove V2 Image</p></TooltipContent>
                    </Tooltip>
                  </div>
                   {/* Recheck Button - Show only if V2 URL exists */}
                   <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-1 right-1 text-xs h-6" // Smaller, positioned top-right
                      onClick={handleManualRecheck}
                      disabled={!scene?.bria_v2_request_id || isGeneratingV2 || isRechecking}
                      title="Manually recheck generation status"
                    >
                      {isRechecking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    </Button>
                </div>
              ) : (
                 // Show upload button only if V2 URL doesn't exist
                 <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSceneImageV2Upload}
                  disabled={!scene}
                >
                  <Upload className="mr-2 h-4 w-4" /> Upload Scene Image V2
                </Button>
              )}

              {/* Generate V2 Button & Status */}
              <div className="flex flex-col gap-2">
                 <Button
                    className="w-full"
                    onClick={handleGenerateV2}
                    disabled={!scene || !scene.productImageUrl || !scene.sceneImageV1Url || isGeneratingV2 || isGeneratingV1 || !!pollingIntervalId}
                    title={!scene?.productImageUrl || !scene?.sceneImageV1Url ? "Requires Product Image and Scene Image V1" : "Generate Scene Image V2 using Bria AI"}
                  >
                    {isGeneratingV2 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    {isGeneratingV2 ? (pollingRequestId ? 'Polling Status...' : 'Submitting...') : 'Generate Scene Image V2 (Bria)'}
                  </Button>

                 {/* Show Recheck button below Generate button if polling is not active but request ID exists and no V2 image yet */}
                 {scene?.bria_v2_request_id && !scene?.sceneImageV2Url && !pollingIntervalId && !isGeneratingV2 && (
                   <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleManualRecheck}
                      disabled={isRechecking}
                      title="Manually recheck generation status"
                    >
                      {isRechecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Recheck V2 Status
                    </Button>
                 )}
              </div>
            </div>


            {/* Video Section - Now handles multiple videos */}
            <div className="space-y-2">
              <Label htmlFor="video-upload">Scene Videos</Label>
              {/* Display existing videos */}
              <div className="space-y-1">
                {((scene as any)?.videoUrls as string[] | undefined ?? []).map((videoUrl) => (
                  <div key={videoUrl} className="flex items-center justify-between text-sm p-2 border rounded bg-muted/40">
                    <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" title={videoUrl}>
                      {videoUrl.split('/').pop() || videoUrl} {/* Show filename or full URL */}
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveVideo(videoUrl)}
                      aria-label={`Remove video ${videoUrl}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {((scene as any)?.videoUrls as string[] | undefined ?? []).length === 0 && (
                   <p className="text-xs text-muted-foreground">No videos added yet.</p>
                )}
              </div>
              {/* Uploader for adding new videos */}
              <VideoUploader
                // projectId={projectId} // Removed as VideoUploader doesn't accept this prop
                // sceneId={scene?.id} // Removed as VideoUploader doesn't accept this prop
                bucketName="canvas-assets" // Keep bucketName
                label="Add New Video" // Change label for clarity
                // Pass a function to add, not replace. Remove props related to single URL display/removal.
                onVideoUploaded={handleVideoUploaded}
                // We don't need onRemoveVideo here anymore as removal is handled per-video above
                // Remove videoUrl prop as it's for single video display
              />
              <p className="text-xs text-muted-foreground">Upload videos for this scene one by one.</p>
            </div>

            {/* --- Video Generation --- */}
            <div className="space-y-2">
              <Label htmlFor="video-generation">Scene Video Generation</Label>
              <div className="flex flex-col gap-2">
                 <TooltipProvider>
                   <Tooltip>
                     <TooltipTrigger asChild>
                        <Button
                          onClick={handleGenerateVideoV1}
                          // Example dependency: Disable if no V1 image exists or if loading
                          disabled={isGeneratingVideoV1 || !scene?.sceneImageV1Url}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start" // Align text left
                        >
                          {isGeneratingVideoV1 ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Video className="mr-2 h-4 w-4" /> // Using Video icon
                          )}
                          Generate Video V1
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Generate video from Scene Image V1 (Fal/Kling - Not Implemented)</p>
                        {!scene?.sceneImageV1Url && <p className="text-destructive">Requires Scene Image V1.</p>}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleGenerateVideoV2}
                          // Example dependency: Disable if no V2 image exists or if loading
                          disabled={isGeneratingVideoV2 || !scene?.sceneImageV2Url}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start" // Align text left
                        >
                          {isGeneratingVideoV2 ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="mr-2 h-4 w-4" /> // Using Sparkles icon for V2
                          )}
                          Generate Video V2
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Generate video from Scene Image V2 (Fal/Kling - Not Implemented)</p>
                         {!scene?.sceneImageV2Url && <p className="text-destructive">Requires Scene Image V2.</p>}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
              </div>
              {/* Optional description if needed
              <p className="text-xs text-muted-foreground">
                Generate video from Scene Image V1 or V2 (implementation pending).
              </p>
              */}
            </div>
            {/* --- End Video Generation --- */}

            {/* Removed duplicated/incorrect AudioUploader instance */}

            {/* Voice Over */}
            <div className="space-y-2"> {/* Added a div for spacing */}
              <Label>Voice Over</Label> {/* Re-added Label for consistency */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateVoiceOver}
                disabled={isGeneratingVoiceOver || !scene?.script}
                className="w-full justify-start"
              >
                {isGeneratingVoiceOver ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate Auto Voice Over
              </Button>
              <AudioUploader
                label="Upload Voice Over" // Changed label slightly for clarity
                audioUrl={scene?.voiceOverUrl}
                onAudioUploaded={handleVoiceOverUploaded}
                onRemoveAudio={handleRemoveVoiceOver}
                bucketName="voice-over" // Kept specific bucket name
              />
               <p className="text-sm text-muted-foreground">
                 Generate voice over from script or upload an audio file. Max 10MB.
               </p>
            </div>

            {/* Background Music */}
            <AudioUploader
              label="Background Music"
              audioUrl={scene?.backgroundMusicUrl}
              onAudioUploaded={handleBackgroundMusicUploaded}
              onRemoveAudio={handleRemoveBackgroundMusic}
              bucketName="background-music" // Added specific bucket name
            />
            {/* --- End Media Sections --- */}

          </div> {/* End space-y-6 */}
        </ScrollArea> {/* End ScrollArea */}

      </div> {/* End expanded view div */}

      {/* Agent Interaction Dialog (Optional - kept for potential future use) */}
      <Dialog open={showAgentDialog} onOpenChange={setShowAgentDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>AI Generation: {selectedAgent.charAt(0).toUpperCase() + selectedAgent.slice(1)}</DialogTitle>
            <DialogDescription>
              Review context and provide instructions.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4 -mr-4 mb-4">
            <div className="space-y-4">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {isProcessing && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            </div>
          </ScrollArea>
           {/* Input for instructions - consider if needed without tabs */}
           {/* <Textarea
              placeholder="Add specific instructions for the AI..."
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              className="min-h-[80px]"
            />
           <Button onClick={() => handleGenerateContent(selectedAgent as any)} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate Now
            </Button> */}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
