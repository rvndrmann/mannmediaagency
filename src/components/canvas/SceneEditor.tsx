
import { useState, useEffect } from "react";
import { CanvasScene } from "@/types/canvas";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface SceneEditorProps {
  scene: CanvasScene;
  onUpdate: (sceneId: string, type: 'script' | 'imagePrompt' | 'description' | 'voiceOverText', value: string) => Promise<void>;
}

export function SceneEditor({ scene, onUpdate }: SceneEditorProps) {
  const [title, setTitle] = useState(scene.title);
  const [script, setScript] = useState(scene.script);
  const [voiceOverText, setVoiceOverText] = useState(scene.voiceOverText);
  const [description, setDescription] = useState(scene.description);
  const [isSaving, setIsSaving] = useState(false);
  
  // Update local state when scene changes
  useEffect(() => {
    setTitle(scene.title);
    setScript(scene.script);
    setVoiceOverText(scene.voiceOverText);
    setDescription(scene.description);
  }, [scene]);
  
  const handleSave = async (field: 'script' | 'voiceOverText' | 'description') => {
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleSave('description')} 
              disabled={isSaving}
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save Description
            </Button>
          </div>
          <Textarea 
            id="scene-description" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happens in this scene..."
            className="min-h-[100px]"
          />
        </div>
      </div>
    </div>
  );
}
