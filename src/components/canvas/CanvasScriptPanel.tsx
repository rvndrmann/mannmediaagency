import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, Wand2, ImageIcon } from "lucide-react";
import { CanvasProject } from "@/types/canvas";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  
  // Helper function to extract clean voice-over text from script content
  const extractVoiceOverText = (content: string): string => {
    // Strip any bracketed direction text [like this]
    let voiceOverText = content.replace(/\[.*?\]/g, '');
    
    // Remove any narrator directions in parentheses (like this)
    voiceOverText = voiceOverText.replace(/\(.*?\)/g, '');
    
    // Remove any lines that start with common direction markers
    const lines = voiceOverText.split('\n').filter(line => {
      const trimmedLine = line.trim();
      return !trimmedLine.startsWith('SCENE') &&
             !trimmedLine.startsWith('CUT TO:') &&
             !trimmedLine.startsWith('FADE') &&
             !trimmedLine.startsWith('INT.') &&
             !trimmedLine.startsWith('EXT.') &&
             !trimmedLine.startsWith('TRANSITION');
    });
    
    // Clean up any double spaces or excess whitespace
    return lines.join('\n').replace(/\s+/g, ' ').trim();
  };
  
  // Helper function to split text at sentence boundaries
  const splitAtSentenceBoundary = (text: string, maxLength: number): string[] => {
    if (text.length <= maxLength) return [text];
    
    // Look for sentence endings (.!?) within the desired length
    let splitPoint = text.substring(0, maxLength).lastIndexOf('.');
    if (splitPoint === -1) splitPoint = text.substring(0, maxLength).lastIndexOf('!');
    if (splitPoint === -1) splitPoint = text.substring(0, maxLength).lastIndexOf('?');
    
    // If no sentence ending found, look for the last complete word
    if (splitPoint === -1 || splitPoint < maxLength * 0.5) {
      splitPoint = text.substring(0, maxLength).lastIndexOf(' ');
    }
    
    // If still no good split point, just split at max length
    if (splitPoint === -1) splitPoint = maxLength;
    
    // Split and continue with the remainder
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
    try {
      // Process script for division - split by paragraphs or clear scene indicators
      const paragraphs = fullScript.split(/\n\s*\n/).filter(p => p.trim());
      
      // Split by scene markers if they exist
      const sceneMarkers = paragraphs.join('\n\n').match(/SCENE\s+\d+|\bINT\.\s|\bEXT\.\s|\bFADE\s+IN:|\bCUT\s+TO:/g);
      
      let segments: string[] = [];
      
      if (sceneMarkers && sceneMarkers.length >= 2) {
        // Script has proper scene markers - split by those
        let text = paragraphs.join('\n\n');
        let positions: number[] = [];
        
        // Find positions of all scene markers
        let match;
        const regex = /SCENE\s+\d+|\bINT\.\s|\bEXT\.\s|\bFADE\s+IN:|\bCUT\s+TO:/g;
        while ((match = regex.exec(text)) !== null) {
          positions.push(match.index);
        }
        
        // Split text at scene marker positions
        for (let i = 0; i < positions.length; i++) {
          const start = positions[i];
          const end = i < positions.length - 1 ? positions[i + 1] : text.length;
          segments.push(text.substring(start, end).trim());
        }
      } else {
        // No clear scene markers - distribute content evenly
        const CHAR_LIMIT = 1500; // Higher limit for initial division
        
        // If we have few paragraphs, check if they need to be further split
        if (paragraphs.length <= project.scenes.length) {
          paragraphs.forEach(paragraph => {
            if (paragraph.length > CHAR_LIMIT) {
              // Split long paragraphs at sentence boundaries
              segments.push(...splitAtSentenceBoundary(paragraph, CHAR_LIMIT));
            } else {
              segments.push(paragraph);
            }
          });
        } else {
          segments = paragraphs;
        }
        
        // Group segments if we have too many compared to scenes
        if (segments.length > project.scenes.length * 2) {
          const groupedSegments: string[] = [];
          const segmentsPerScene = Math.ceil(segments.length / project.scenes.length);
          
          for (let i = 0; i < segments.length; i += segmentsPerScene) {
            const group = segments.slice(i, i + segmentsPerScene);
            groupedSegments.push(group.join('\n\n'));
          }
          
          segments = groupedSegments;
        }
      }
      
      // If we still have too few segments, duplicate the last one
      while (segments.length < project.scenes.length) {
        segments.push(segments[segments.length - 1] || "");
      }
      
      // If we have too many segments, combine extras into the last scene
      if (segments.length > project.scenes.length) {
        const extraSegments = segments.slice(project.scenes.length - 1);
        segments = segments.slice(0, project.scenes.length - 1);
        segments.push(extraSegments.join('\n\n'));
      }
      
      // Create the scene scripts with voice-over text extraction
      const sceneScripts = project.scenes.map((scene, index) => {
        const content = index < segments.length ? segments[index] : "";
        const voiceOverText = extractVoiceOverText(content);
        
        return {
          id: scene.id,
          content,
          voiceOverText
        };
      });
      
      await divideScriptToScenes(sceneScripts);
      toast.success("Script divided into scenes");
      
      // After division, offer to generate image prompts
      const hasVoiceOverText = sceneScripts.some(scene => scene.voiceOverText && scene.voiceOverText.trim() !== "");
      if (hasVoiceOverText) {
        toast("Voice-over text extracted", {
          description: "Do you want to generate image prompts based on the voice-over text?",
          action: {
            label: "Generate",
            onClick: () => handleGenerateImagePrompts()
          }
        });
      }
    } catch (error) {
      console.error("Error dividing script:", error);
      toast.error("Failed to divide script");
    } finally {
      setIsDividing(false);
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
            <Wand2 className="h-4 w-4 mr-1" />
            {isDividing ? "Dividing..." : "Divide to Scenes"}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateImagePrompts}
            disabled={isGeneratingImagePrompts}
            title="Generate image prompts for scenes with voice-over text"
          >
            <ImageIcon className="h-4 w-4 mr-1" />
            {isGeneratingImagePrompts ? "Generating..." : "Image Prompts"}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSaveScript}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-1" />
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
      
      <div className="flex-1 p-4">
        <Textarea
          value={fullScript}
          onChange={(e) => setFullScript(e.target.value)}
          placeholder="Enter your full script here. You can divide it into scenes using the 'Divide to Scenes' button."
          className="h-full min-h-[300px]"
        />
      </div>
    </div>
  );
}
