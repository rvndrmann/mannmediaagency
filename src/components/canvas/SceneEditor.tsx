
import { useState, useEffect, useCallback } from "react";
import { CanvasScene } from "@/types/canvas";
import { toast } from "sonner";
import { useCanvasAgent } from "@/hooks/use-canvas-agent";
import { SceneContentForm } from "./SceneContentForm";
import { SceneControls } from "./SceneControls";
import { useMCPContext } from "@/contexts/MCPContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SceneEditorProps {
  scene: CanvasScene;
  onUpdate: (sceneId: string, type: 'script' | 'image_prompt' | 'description' | 'voice_over_text' | 'image' | 'video', value: string) => Promise<void>;
}

export function SceneEditor({ scene, onUpdate }: SceneEditorProps) {
  const [title, setTitle] = useState(scene?.title || "");
  const [script, setScript] = useState(scene?.script || "");
  const [voiceOverText, setVoiceOverText] = useState(scene?.voice_over_text || "");
  const [description, setDescription] = useState(scene?.description || "");
  const [imagePrompt, setImagePrompt] = useState(scene?.image_prompt || "");
  const [customInstruction, setCustomInstruction] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const { useMcp, isConnecting, hasConnectionError, reconnectToMcp } = useMCPContext();
  
  const { 
    isProcessing,
    activeAgent,
    generateSceneScript,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo
  } = useCanvasAgent({
    projectId: scene?.projectId || "",
    sceneId: scene?.id || "",
    updateScene: onUpdate
  });
  
  useEffect(() => {
    const loadSceneData = async () => {
      setIsLoading(true);
      setLoadError(null);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (scene) {
          setTitle(scene.title || "");
          setScript(scene.script || "");
          setVoiceOverText(scene.voice_over_text || "");
          setDescription(scene.description || "");
          setImagePrompt(scene.image_prompt || "");
        }
      } catch (error) {
        console.error("Error loading scene data:", error);
        setLoadError("Failed to load scene data. Please try refreshing the page.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSceneData();
  }, [scene?.id]);
  
  useEffect(() => {
    setIsGenerating(isProcessing);
  }, [isProcessing]);
  
  const handleSave = async (field: 'script' | 'voice_over_text' | 'description' | 'image_prompt') => {
    if (!scene) return;
    
    setIsSaving(true);
    
    try {
      let value = '';
      switch (field) {
        case 'script':
          value = script;
          break;
        case 'voice_over_text':
          value = voiceOverText;
          break;
        case 'description':
          value = description;
          break;
        case 'image_prompt':
          value = imagePrompt;
          break;
      }
      
      await onUpdate(scene.id, field, value);
      toast.success(`Scene ${field.replace('_', ' ')} updated`);
    } catch (error) {
      console.error(`Error updating scene ${field}:`, error);
      toast.error(`Failed to update scene ${field.replace('_', ' ')}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const generateWithAI = useCallback(async (type: 'script' | 'description' | 'image_prompt') => {
    if (!scene) return;
    
    if (isProcessing) {
      toast.error("Please wait for the current operation to complete");
      return;
    }
    
    try {
      let context = "";
      
      if (type === 'script') {
        context = `You need to create a script for a video scene.
Scene Title: ${scene.title || ""}
${scene.description ? "Scene Description: " + scene.description : ""}
${scene.voice_over_text ? "Voice Over Text: " + scene.voice_over_text : ""}

Write a creative and engaging script that includes dialogue, action descriptions, and camera directions.
Be specific about what characters say and do, and how the scene should be shot.`;

        await generateSceneScript(scene.id, context);
        setScript(scene.script || "");
        toast.success("Scene script generated and saved");
      
      } else if (type === 'description') {
        context = `You need to create a detailed scene description for a video. 
Scene Title: ${scene.title || ""}
Scene Script: ${script}
Voice Over Text: ${voiceOverText}
${scene.image_url ? "The scene already has an image that you should use as reference: " + scene.image_url : ""}

Describe how the camera should move, how subjects are positioned, lighting, mood, and transitions. 
Be specific about camera angles, movements, and visual composition.`;

        await generateSceneDescription(scene.id, context);
        setDescription(scene.description || "");
        toast.success("Scene description generated and saved");
        
      } else if (type === 'image_prompt') {
        context = `You need to create a detailed image prompt for this scene that will be used for AI image generation.
Scene Title: ${scene.title || ""}
Scene Script: ${script}
Voice Over Text: ${voiceOverText}
${scene.description ? "Scene Description: " + scene.description : ""}

Create a detailed image prompt that includes visual elements, style, lighting, mood, composition, and quality parameters.
Format the prompt to get the best results from an AI image generator.`;

        await generateImagePrompt(scene.id, script, voiceOverText, customInstruction, context);
        toast.success("Image prompt generated and saved");
      }
    } catch (error) {
      console.error(`Error generating ${type}:`, error);
      toast.error(`Failed to generate ${type.replace('_', ' ')}`);
    }
  }, [
    scene, 
    script, 
    voiceOverText, 
    isProcessing, 
    generateSceneScript,
    generateSceneDescription,
    generateImagePrompt,
    customInstruction
  ]);
  
  const handleGenerateImage = async () => {
    if (!scene) return;
    
    if (!imagePrompt || !imagePrompt.trim()) {
      toast.error("Please generate or enter an image prompt first");
      return;
    }
    
    try {
      await generateSceneImage(scene.id, imagePrompt);
      toast.success("Scene image generated successfully");
    } catch (error) {
      console.error("Error generating scene image:", error);
      toast.error("Failed to generate scene image");
    }
  };
  
  const handleGenerateVideo = async () => {
    if (!scene) return;
    
    if (!scene.image_url) {
      toast.error("Please generate a scene image first");
      return;
    }
    
    try {
      await generateSceneVideo(scene.id, description);
      toast.success("Scene video generated successfully");
    } catch (error) {
      console.error("Error generating scene video:", error);
      toast.error("Failed to generate scene video");
    }
  };
  
  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading scene data...</p>
      </div>
    );
  }
  
  if (loadError) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </div>
    );
  }
  
  if (!scene) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No scene selected</p>
      </div>
    );
  }
  
  const showMcpConnectionError = useMcp && hasConnectionError && !isConnecting;
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-1">{title}</h2>
        <p className="text-muted-foreground">Scene ID: {scene.id}</p>
      </div>
      
      {showMcpConnectionError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>
            MCP connection error. Some AI features may be limited. 
            <Button 
              variant="link" 
              className="p-0 h-auto text-xs ml-1"
              onClick={() => reconnectToMcp()}
            >
              Try reconnecting
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-8">
        <SceneContentForm
          label="Scene Script"
          value={script}
          fieldType="script"
          placeholder="Write the script for this scene..."
          isSaving={isSaving}
          isGenerating={isGenerating}
          isProcessing={isProcessing}
          activeAgent={activeAgent}
          onSave={() => handleSave('script')}
          onChange={setScript}
          onGenerateWithAI={() => generateWithAI('script')}
        />
        
        <SceneContentForm
          label="Voice Over Text"
          value={voiceOverText}
          fieldType="voice_over_text"
          placeholder="Write the voice over text for this scene..."
          isSaving={isSaving}
          isGenerating={isGenerating}
          isProcessing={isProcessing}
          activeAgent={activeAgent}
          onSave={() => handleSave('voice_over_text')}
          onChange={setVoiceOverText}
        />
        
        <SceneContentForm
          label="Scene Description"
          value={description}
          fieldType="description"
          placeholder="Describe what happens in this scene..."
          isSaving={isSaving}
          isGenerating={isGenerating}
          isProcessing={isProcessing}
          activeAgent={activeAgent}
          onSave={() => handleSave('description')}
          onChange={setDescription}
          onGenerateWithAI={() => generateWithAI('description')}
          imagePreview={scene.image_url}
        />
        
        <SceneContentForm
          label="Image Prompt"
          value={imagePrompt}
          fieldType="image_prompt"
          placeholder="Write an image prompt for AI image generation..."
          isSaving={isSaving}
          isGenerating={isGenerating}
          isProcessing={isProcessing}
          activeAgent={activeAgent}
          onSave={() => handleSave('image_prompt')}
          onChange={setImagePrompt}
          onGenerateWithAI={() => generateWithAI('image_prompt')}
        />

        <div className="space-y-2">
          <Label htmlFor="custom-instruction">Custom Instruction (Optional)</Label>
          <Textarea
            id="custom-instruction"
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            placeholder="Enter specific instructions for the AI image prompt generation..."
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">
            Provide specific guidance for the AI, e.g., "Focus on the character's expression", "Use a wide-angle shot", "Make it black and white".
          </p>
        </div>
        
        <SceneControls
          sceneId={scene.id}
          imagePrompt={imagePrompt}
          hasImage={!!scene.image_url}
          isProcessing={isProcessing}
          activeAgent={activeAgent}
          onGenerateImage={handleGenerateImage}
          onGenerateVideo={handleGenerateVideo}
        />
      </div>
    </div>
  );
}
