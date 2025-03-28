
import { useState, useEffect } from "react";
import { CanvasScene } from "@/types/canvas";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Sparkles, MessageSquare } from "lucide-react";
import { useCanvasAgent } from "@/hooks/use-canvas-agent";

interface SceneEditorProps {
  scene: CanvasScene;
  onUpdate: (sceneId: string, type: 'script' | 'imagePrompt' | 'description' | 'voiceOverText', value: string) => Promise<void>;
}

export function SceneEditor({ scene, onUpdate }: SceneEditorProps) {
  const [title, setTitle] = useState(scene.title);
  const [script, setScript] = useState(scene.script);
  const [voiceOverText, setVoiceOverText] = useState(scene.voiceOverText);
  const [description, setDescription] = useState(scene.description);
  const [imagePrompt, setImagePrompt] = useState(scene.imagePrompt);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { 
    isProcessing,
    agentMessages,
    activeAgent,
    generateSceneScript,
    generateImagePrompt,
    generateSceneDescription
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
    setIsGenerating(true);
    
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
        
        // Update local state with the generated description
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
        
        // Update local state with the generated image prompt
        setImagePrompt(scene.imagePrompt);
        toast.success("Image prompt generated and saved");
      }
      
    } catch (error) {
      console.error(`Error generating ${type}:`, error);
      toast.error(`Failed to generate ${type}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-1">{title}</h2>
        <p className="text-muted-foreground">Scene ID: {scene.id}</p>
      </div>
      
      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor="scene-script">Scene Script</Label>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleSave('script')} 
              disabled={isSaving}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save Script
            </Button>
          </div>
          <Textarea 
            id="scene-script" 
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Write the script for this scene..."
            className="min-h-[150px] font-mono"
          />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor="voice-over-text">Voice Over Text</Label>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleSave('voiceOverText')} 
              disabled={isSaving}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save Voice Over
            </Button>
          </div>
          <Textarea 
            id="voice-over-text" 
            value={voiceOverText}
            onChange={(e) => setVoiceOverText(e.target.value)}
            placeholder="Write the voice over text for this scene..."
            className="min-h-[150px]"
          />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor="scene-description">Scene Description</Label>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSave('description')} 
                disabled={isSaving || isProcessing}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => generateWithAI('description')}
                disabled={isGenerating || isProcessing}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {isProcessing && activeAgent === 'scene' ? "Generating..." : "Generate with AI"}
              </Button>
            </div>
          </div>
          <Textarea 
            id="scene-description" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happens in this scene..."
            className="min-h-[150px]"
          />
          {scene.imageUrl && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-2">AI will use this image as reference when generating descriptions:</p>
              <img src={scene.imageUrl} alt="Scene reference" className="max-h-40 rounded-md border" />
            </div>
          )}
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor="image-prompt">Image Prompt</Label>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSave('imagePrompt')} 
                disabled={isSaving || isProcessing}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => generateWithAI('imagePrompt')}
                disabled={isGenerating || isProcessing}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {isProcessing && activeAgent === 'image' ? "Generating..." : "Generate with AI"}
              </Button>
            </div>
          </div>
          <Textarea 
            id="image-prompt" 
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="Write an image prompt for AI image generation..."
            className="min-h-[150px]"
          />
        </div>
        
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              const chatUrl = `/multi-agent-chat?projectId=${scene.projectId}&sceneId=${scene.id}`;
              window.open(chatUrl, '_blank');
            }}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Open Full Multi-Agent Chat
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Use the multi-agent chat for more advanced scene creation, image prompts, and detailed directions.
          </p>
        </div>
      </div>
    </div>
  );
}
