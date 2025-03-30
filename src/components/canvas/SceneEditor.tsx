
import { useState, useEffect } from "react";
import { CanvasScene } from "@/types/canvas";
import { toast } from "sonner";
import { useCanvasAgent } from "@/hooks/use-canvas-agent";
import { SceneContentForm } from "./SceneContentForm";
import { SceneControls } from "./SceneControls";
import { useMCPContext } from "@/contexts/MCPContext";

interface SceneEditorProps {
  scene: CanvasScene;
  onUpdate: (sceneId: string, type: 'script' | 'imagePrompt' | 'description' | 'voiceOverText' | 'image' | 'video', value: string) => Promise<void>;
}

export function SceneEditor({ scene, onUpdate }: SceneEditorProps) {
  const [title, setTitle] = useState(scene.title);
  const [script, setScript] = useState(scene.script);
  const [voiceOverText, setVoiceOverText] = useState(scene.voiceOverText);
  const [description, setDescription] = useState(scene.description);
  const [imagePrompt, setImagePrompt] = useState(scene.imagePrompt);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { setUseMcp } = useMCPContext();
  
  const { 
    isProcessing,
    activeAgent,
    generateSceneScript,
    generateSceneDescription,
    generateImagePrompt,
    generateSceneImage,
    generateSceneVideo
  } = useCanvasAgent({
    projectId: scene.projectId,
    sceneId: scene.id,
    updateScene: onUpdate
  });
  
  // Update local state when scene changes
  useEffect(() => {
    setTitle(scene.title);
    setScript(scene.script);
    setVoiceOverText(scene.voiceOverText);
    setDescription(scene.description);
    setImagePrompt(scene.imagePrompt);
  }, [scene]);
  
  useEffect(() => {
    setIsGenerating(isProcessing);
  }, [isProcessing]);
  
  const handleSave = async (field: 'script' | 'voiceOverText' | 'description' | 'imagePrompt') => {
    setIsSaving(true);
    
    try {
      let value = '';
      switch (field) {
        case 'script':
          value = script;
          break;
        case 'voiceOverText':
          value = voiceOverText;
          break;
        case 'description':
          value = description;
          break;
        case 'imagePrompt':
          value = imagePrompt;
          break;
      }
      
      await onUpdate(scene.id, field, value);
      toast.success(`Scene ${field} updated`);
    } catch (error) {
      console.error(`Error updating scene ${field}:`, error);
      toast.error(`Failed to update scene ${field}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const generateWithAI = async (type: 'description' | 'imagePrompt') => {
    if (isProcessing) {
      toast.error("Please wait for the current operation to complete");
      return;
    }
    
    try {
      // Create context based on current scene data
      let context = "";
      if (type === 'description') {
        context = `You need to create a detailed scene description for a video. 
Scene Title: ${scene.title}
Scene Script: ${script}
Voice Over Text: ${voiceOverText}
${scene.imageUrl ? "The scene already has an image that you should use as reference: " + scene.imageUrl : ""}

Describe how the camera should move, how subjects are positioned, lighting, mood, and transitions. 
Be specific about camera angles, movements, and visual composition.`;

        await generateSceneDescription(scene.id, context);
        setDescription(scene.description);
        toast.success("Scene description generated and saved");
        
      } else if (type === 'imagePrompt') {
        context = `You need to create a detailed image prompt for this scene that will be used for AI image generation.
Scene Title: ${scene.title}
Scene Script: ${script}
Voice Over Text: ${voiceOverText}
${scene.description ? "Scene Description: " + scene.description : ""}

Create a detailed image prompt that includes visual elements, style, lighting, mood, composition, and quality parameters.
Format the prompt to get the best results from an AI image generator.`;

        await generateImagePrompt(scene.id, context);
        setImagePrompt(scene.imagePrompt);
        toast.success("Image prompt generated and saved");
      }
    } catch (error) {
      console.error(`Error generating ${type}:`, error);
      toast.error(`Failed to generate ${type}`);
    }
  };
  
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
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
    if (!scene.imageUrl) {
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
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-1">{title}</h2>
        <p className="text-muted-foreground">Scene ID: {scene.id}</p>
      </div>
      
      <div className="space-y-6">
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
        />
        
        <SceneContentForm
          label="Voice Over Text"
          value={voiceOverText}
          fieldType="voiceOverText"
          placeholder="Write the voice over text for this scene..."
          isSaving={isSaving}
          isGenerating={isGenerating}
          isProcessing={isProcessing}
          activeAgent={activeAgent}
          onSave={() => handleSave('voiceOverText')}
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
          imagePreview={scene.imageUrl}
        />
        
        <SceneContentForm
          label="Image Prompt"
          value={imagePrompt}
          fieldType="imagePrompt"
          placeholder="Write an image prompt for AI image generation..."
          isSaving={isSaving}
          isGenerating={isGenerating}
          isProcessing={isProcessing}
          activeAgent={activeAgent}
          onSave={() => handleSave('imagePrompt')}
          onChange={setImagePrompt}
          onGenerateWithAI={() => generateWithAI('imagePrompt')}
        />
        
        <SceneControls
          sceneId={scene.id}
          imagePrompt={imagePrompt}
          hasImage={!!scene.imageUrl}
          isProcessing={isProcessing}
          activeAgent={activeAgent}
          onGenerateImage={handleGenerateImage}
          onGenerateVideo={handleGenerateVideo}
        />
      </div>
    </div>
  );
}
