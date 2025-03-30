
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, Wand2, ImageIcon, Loader2, AlertTriangle } from "lucide-react";
import { CanvasProject } from "@/types/canvas";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CanvasScriptPanelProps {
  project: CanvasProject;
  onClose: () => void;
  saveFullScript: (script: string) => Promise<void>;
  divideScriptToScenes: (sceneScripts: Array<{ id: string; content: string; voiceOverText?: string }>) => Promise<void>;
}

export function CanvasScriptPanel({
  project,
  onClose,
  saveFullScript,
  divideScriptToScenes
}: CanvasScriptPanelProps) {
  const [fullScript, setFullScript] = useState(project.fullScript || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDividing, setIsDividing] = useState(false);
  const [isGeneratingImagePrompts, setIsGeneratingImagePrompts] = useState(false);
  const [divideError, setDivideError] = useState<string | null>(null);
  const [hasAttemptedDivide, setHasAttemptedDivide] = useState(false);
  
  const handleSaveScript = async () => {
    setIsSaving(true);
    try {
      await saveFullScript(fullScript);
      toast.success("Script saved successfully");
    } catch (error) {
      console.error("Error saving script:", error);
      toast.error("Failed to save script");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDivideScript = async () => {
    if (!fullScript.trim()) {
      toast.error("Please enter a script first");
      return;
    }
    
    if (project.scenes.length <= 0) {
      toast.error("Please add at least one scene first");
      return;
    }
    
    setIsDividing(true);
    setDivideError(null);
    setHasAttemptedDivide(true);
    
    try {
      // Get the scene IDs
      const sceneIds = project.scenes.map(scene => scene.id);
      
      // Call the process-script function directly with better error handling
      const toastId = toast.loading("Processing script...");
      
      const { data, error } = await supabase.functions.invoke('process-script', {
        body: { 
          script: fullScript, 
          sceneIds,
          projectId: project.id,
          generateImagePrompts: true
        }
      });

      toast.dismiss(toastId);
      
      if (error) {
        throw new Error(`Function error: ${error.message}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || "Script processing failed");
      }
      
      // Check if we received scene data
      if (!data.scenes || !Array.isArray(data.scenes) || data.scenes.length === 0) {
        throw new Error("No scene data returned from processing");
      }
      
      // Convert scenes data for divideScriptToScenes
      const sceneScripts = data.scenes.map(scene => ({
        id: scene.id,
        content: scene.content || "",
        voiceOverText: scene.voiceOverText || ""
      }));
      
      // Update the scenes with the divided script content
      await divideScriptToScenes(sceneScripts);
      
      toast.success("Script divided into scenes");
      
      // Show message about image prompts
      if (data.imagePrompts) {
        const { processedScenes, successfulScenes } = data.imagePrompts;
        if (processedScenes > 0) {
          toast.success(`Generated image prompts for ${successfulScenes} out of ${processedScenes} scenes`);
        }
      }
    } catch (err: any) {
      console.error("Error dividing script:", err);
      const errorMessage = err.message || "Failed to divide script";
      setDivideError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsDividing(false);
    }
  };
  
  const handleGenerateImagePrompts = async () => {
    if (!project.id || project.scenes.length === 0) {
      toast.error("No valid project or scenes to generate image prompts for");
      return;
    }
    
    // Check if we have scenes with voice-over text
    const scenesWithVoiceOver = project.scenes.filter(scene => 
      scene.voiceOverText && scene.voiceOverText.trim() !== ""
    );
    
    if (scenesWithVoiceOver.length === 0) {
      toast.error("No scenes with voice-over text found. Process the script first.");
      return;
    }
    
    setIsGeneratingImagePrompts(true);
    try {
      // Get IDs of scenes that have voice-over text but no image prompt
      const sceneIds = scenesWithVoiceOver
        .filter(scene => !scene.imagePrompt || scene.imagePrompt.trim() === "")
        .map(scene => scene.id);
      
      if (sceneIds.length === 0) {
        toast.info("All scenes already have image prompts. You can edit them directly in each scene.");
        setIsGeneratingImagePrompts(false);
        return;
      }
      
      // Call the generate-image-prompts function
      const { data, error } = await supabase.functions.invoke('generate-image-prompts', {
        body: { projectId: project.id, sceneIds }
      });
      
      if (error) {
        throw new Error(`Error generating image prompts: ${error.message}`);
      }
      
      if (data.successfulScenes > 0) {
        toast.success(`Generated image prompts for ${data.successfulScenes} out of ${data.processedScenes} scenes`);
      } else if (data.processedScenes === 0) {
        toast.info("No scenes needed image prompts");
      } else {
        toast.warning("Failed to generate any image prompts");
      }
    } catch (error) {
      console.error("Error generating image prompts:", error);
      toast.error("Failed to generate image prompts");
    } finally {
      setIsGeneratingImagePrompts(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-medium">Full Script</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDivideScript}
            disabled={isDividing || !fullScript}
          >
            {isDividing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1" />}
            {isDividing ? "Processing..." : "Divide to Scenes"}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateImagePrompts}
            disabled={isGeneratingImagePrompts}
            title="Generate image prompts for scenes with voice-over text"
          >
            {isGeneratingImagePrompts ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1" />}
            {isGeneratingImagePrompts ? "Generating..." : "Image Prompts"}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSaveScript}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 p-4 flex flex-col">
        {divideError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error dividing script</AlertTitle>
            <AlertDescription>{divideError}</AlertDescription>
          </Alert>
        )}
        
        {hasAttemptedDivide && !divideError && !isDividing && (
          <Alert className="mb-4">
            <AlertDescription>
              Script processed successfully! Check individual scenes to review the content.
            </AlertDescription>
          </Alert>
        )}
        
        <Textarea
          value={fullScript}
          onChange={(e) => setFullScript(e.target.value)}
          placeholder="Enter your full script here. You can divide it into scenes using the 'Divide to Scenes' button."
          className="h-full min-h-[300px] font-mono"
        />
      </div>
    </div>
  );
}
