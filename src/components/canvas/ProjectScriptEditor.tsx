
import { useState, useEffect } from "react";
import { CanvasProject, CanvasScene } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Wand2, 
  Save, 
  SplitSquareVertical, 
  Edit,
  Check,
  X,
  Loader2,
  ImageIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProjectScriptEditorProps {
  project: CanvasProject;
  saveFullScript: (script: string) => Promise<void>;
  divideScriptToScenes: (script: string) => Promise<void>;
  updateProjectTitle: (title: string) => Promise<void>;
}

export function ProjectScriptEditor({ 
  project, 
  saveFullScript,
  divideScriptToScenes,
  updateProjectTitle
}: ProjectScriptEditorProps) {
  const [script, setScript] = useState(project.fullScript || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDividing, setIsDividing] = useState(false);
  const [isProcessingWithAI, setIsProcessingWithAI] = useState(false);
  const [isGeneratingImagePrompts, setIsGeneratingImagePrompts] = useState(false);
  const [projectTitle, setProjectTitle] = useState(project.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [suggestedTitle, setSuggestedTitle] = useState("");
  
  useEffect(() => {
    setScript(project.fullScript || "");
    setProjectTitle(project.title);
  }, [project]);
  
  const handleSaveScript = async () => {
    if (!script.trim()) {
      toast.error("Script cannot be empty");
      return;
    }
    
    setIsSaving(true);
    try {
      await saveFullScript(script);
      toast.success("Script saved successfully");
      
      if (!project.fullScript || project.fullScript.length < script.length * 0.5) {
        suggestTitleFromScript(script);
      }
      
      // Automatically process the script with AI after saving
      handleProcessWithAI();
    } catch (error) {
      console.error("Error saving script:", error);
      toast.error("Failed to save script");
    } finally {
      setIsSaving(false);
    }
  };
  
  const suggestTitleFromScript = async (scriptContent: string) => {
    if (!scriptContent || scriptContent.length < 20) return;
    
    try {
      const firstLines = scriptContent.split('\n').slice(0, 5).join(' ');
      
      const titleMatch = firstLines.match(/(?:title:|#)\s*([^\n]+)/i);
      
      if (titleMatch && titleMatch[1]) {
        const extracted = titleMatch[1].trim();
        if (extracted && extracted !== project.title) {
          setSuggestedTitle(extracted);
        }
      }
    } catch (err) {
      console.error("Error suggesting title:", err);
    }
  };
  
  const extractVoiceOverText = (content: string): string => {
    let voiceOverText = content.replace(/\[.*?\]/g, '');
    voiceOverText = voiceOverText.replace(/\(.*?\)/g, '');
    
    const lines = voiceOverText.split('\n').filter(line => {
      const trimmedLine = line.trim();
      return !trimmedLine.startsWith('SCENE') &&
             !trimmedLine.startsWith('CUT TO:') &&
             !trimmedLine.startsWith('FADE') &&
             !trimmedLine.startsWith('INT.') &&
             !trimmedLine.startsWith('EXT.') &&
             !trimmedLine.startsWith('TRANSITION');
    });
    
    return lines.join('\n').replace(/\s+/g, ' ').trim();
  };
  
  const splitAtSentenceBoundary = (text: string, maxLength: number): string[] => {
    if (text.length <= maxLength) return [text];
    
    let splitPoint = text.substring(0, maxLength).lastIndexOf('.');
    if (splitPoint === -1) splitPoint = text.substring(0, maxLength).lastIndexOf('!');
    if (splitPoint === -1) splitPoint = text.substring(0, maxLength).lastIndexOf('?');
    
    if (splitPoint === -1 || splitPoint < maxLength * 0.5) {
      splitPoint = text.substring(0, maxLength).lastIndexOf(' ');
    }
    
    if (splitPoint === -1) splitPoint = maxLength;
    
    const firstPart = text.substring(0, splitPoint + 1).trim();
    const restPart = text.substring(splitPoint + 1).trim();
    
    return [firstPart, ...splitAtSentenceBoundary(restPart, maxLength)];
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
  
  const handleProcessWithAI = async () => {
    if (!script.trim()) {
      toast.error("Script cannot be empty");
      return;
    }
    
    if (!project.scenes || project.scenes.length === 0) {
      toast.error("No scenes to divide script into");
      return;
    }
    
    setIsProcessingWithAI(true);
    try {
      // Call the edge function
      await divideScriptToScenes(script);
      toast.success("Script processed and divided with AI assistance");
    } catch (error) {
      console.error("Error processing script with AI:", error);
      toast.error("Failed to process script with AI, falling back to manual division");
      handleDivideScript();
    } finally {
      setIsProcessingWithAI(false);
    }
  };
  
  const handleDivideScript = async () => {
    if (!script.trim()) {
      toast.error("Script cannot be empty");
      return;
    }
    
    if (!project.scenes || project.scenes.length === 0) {
      toast.error("No scenes to divide script into");
      return;
    }
    
    setIsDividing(true);
    try {
      await divideScriptToScenes(script);
      toast.success("Script divided into scenes");
    } catch (error) {
      console.error("Error dividing script:", error);
      toast.error("Failed to divide script");
    } finally {
      setIsDividing(false);
    }
  };
  
  const handleUpdateTitle = async () => {
    if (!projectTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    
    try {
      await updateProjectTitle(projectTitle);
      setIsEditingTitle(false);
      toast.success("Project title updated");
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("Failed to update title");
    }
  };
  
  const handleApplySuggestedTitle = async () => {
    if (suggestedTitle) {
      setProjectTitle(suggestedTitle);
      try {
        await updateProjectTitle(suggestedTitle);
        toast.success("Project title updated based on script");
        setSuggestedTitle("");
      } catch (error) {
        console.error("Error updating title:", error);
        toast.error("Failed to update title");
      }
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        {isEditingTitle ? (
          <div className="flex items-center gap-2">
            <Input
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="w-64"
              autoFocus
            />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleUpdateTitle}
              className="text-green-600"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                setProjectTitle(project.title);
                setIsEditingTitle(false);
              }}
              className="text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center">
            <h2 className="text-2xl font-semibold mr-2">
              {project.title}
            </h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsEditingTitle(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleSaveScript}
            disabled={isSaving || isProcessingWithAI}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Script"}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleProcessWithAI}
            disabled={isDividing || isProcessingWithAI || !script.trim()}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            {isProcessingWithAI ? 
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing with AI...
              </> : 
              "Process with AI"
            }
          </Button>
          <Button 
            variant="outline"
            onClick={handleGenerateImagePrompts}
            disabled={isGeneratingImagePrompts}
            title="Generate image prompts for scenes with voice-over text"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            {isGeneratingImagePrompts ? 
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </> : 
              "Generate Image Prompts"
            }
          </Button>
          <Button 
            variant="default" 
            onClick={handleDivideScript}
            disabled={isDividing || isProcessingWithAI || !script.trim()}
          >
            <SplitSquareVertical className="h-4 w-4 mr-2" />
            {isDividing ? "Dividing..." : "Divide Manually"}
          </Button>
        </div>
      </div>
      
      {suggestedTitle && (
        <div className="bg-muted p-3 rounded-md mb-4 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">Suggested title based on script: </span>
            <span className="font-semibold">{suggestedTitle}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSuggestedTitle("")}>
              Ignore
            </Button>
            <Button size="sm" onClick={handleApplySuggestedTitle}>
              Use This Title
            </Button>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        <Label htmlFor="full-script">Full Script</Label>
        <Textarea 
          id="full-script" 
          value={script} 
          onChange={(e) => setScript(e.target.value)}
          placeholder="Write your complete video script here..."
          className="min-h-[60vh]"
        />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <div>
            Character count: {script.length}
          </div>
          <div>
            Scene count: {project.scenes.length}
          </div>
        </div>
      </div>
    </div>
  );
}
