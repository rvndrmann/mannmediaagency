
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Save, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ScriptInputPanelProps {
  projectId: string;
  scenes: Array<{ id: string; title: string }>;
  fullScript?: string;
  onScriptDivide: (scenes: Array<{ id: string; content: string }>) => Promise<void>;
  onSaveFullScript?: (script: string) => Promise<void>;
}

export function ScriptInputPanel({ 
  projectId, 
  scenes, 
  fullScript: initialScript = "", 
  onScriptDivide, 
  onSaveFullScript 
}: ScriptInputPanelProps) {
  const [fullScript, setFullScript] = useState(initialScript);
  const [isExpanded, setIsExpanded] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Count words in the script
    const words = fullScript.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [fullScript]);

  useEffect(() => {
    // Update the fullScript when initialScript changes
    if (initialScript) {
      setFullScript(initialScript);
    }
  }, [initialScript]);

  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFullScript(e.target.value);
  };

  const saveFullScript = async () => {
    if (!fullScript.trim() || !onSaveFullScript) return;
    
    setIsSaving(true);
    try {
      await onSaveFullScript(fullScript);
      toast.success("Full script saved successfully");
    } catch (error) {
      console.error("Error saving full script:", error);
      toast.error("Failed to save full script");
    } finally {
      setIsSaving(false);
    }
  };

  const divideScript = () => {
    if (!fullScript.trim()) {
      toast.error("Please enter a script to divide");
      return;
    }

    if (scenes.length === 0) {
      toast.error("No scenes available to divide script into");
      return;
    }

    setIsProcessing(true);

    try {
      // Split the script into sentences
      const sentences = fullScript.match(/[^.!?]+[.!?]+/g) || [];
      
      // If no sentences are found (e.g., incomplete sentences without punctuation),
      // fall back to treating the whole script as one sentence
      if (sentences.length === 0 && fullScript.trim()) {
        sentences.push(fullScript.trim());
      }
      
      // Initialize array to hold scripts for each scene
      const sceneScripts: Array<{ id: string; content: string }> = [];
      
      // Initialize variables to track current scene's content
      let currentSceneContent: string[] = [];
      let currentSceneWordCount = 0;
      let sceneIndex = 0;
      
      // Process each sentence
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        const sentenceWordCount = sentence.split(/\s+/).filter(Boolean).length;
        
        // If this sentence would exceed the max words per scene and we already have content,
        // move to the next scene
        if (currentSceneWordCount + sentenceWordCount > 70 && currentSceneWordCount > 0) {
          // Save the current scene content
          if (sceneIndex < scenes.length) {
            sceneScripts.push({
              id: scenes[sceneIndex].id,
              content: currentSceneContent.join(" ")
            });
            sceneIndex++;
          }
          
          // Reset for next scene
          currentSceneContent = [];
          currentSceneWordCount = 0;
        }
        
        // Handle case where a single sentence is longer than 70 words
        if (sentenceWordCount > 70) {
          // Split the sentence into chunks of max 70 words, trying to break at spaces
          const words = sentence.split(/\s+/);
          let chunk: string[] = [];
          let chunkWordCount = 0;
          
          for (const word of words) {
            if (chunkWordCount + 1 <= 70) {
              chunk.push(word);
              chunkWordCount++;
            } else {
              // Save current chunk to a scene
              if (sceneIndex < scenes.length) {
                sceneScripts.push({
                  id: scenes[sceneIndex].id,
                  content: chunk.join(" ")
                });
                sceneIndex++;
              }
              
              // Reset for next chunk
              chunk = [word];
              chunkWordCount = 1;
            }
          }
          
          // Add any remaining words from the long sentence
          if (chunk.length > 0 && sceneIndex < scenes.length) {
            currentSceneContent = chunk;
            currentSceneWordCount = chunkWordCount;
          }
        } else {
          // Add this sentence to the current scene
          currentSceneContent.push(sentence);
          currentSceneWordCount += sentenceWordCount;
        }
        
        // If we've filled all scenes, stop processing
        if (sceneIndex >= scenes.length) {
          break;
        }
      }
      
      // Add any remaining content to the last scene
      if (currentSceneContent.length > 0 && sceneIndex < scenes.length) {
        sceneScripts.push({
          id: scenes[sceneIndex].id,
          content: currentSceneContent.join(" ")
        });
        sceneIndex++;
      }
      
      // Assign empty content to any remaining scenes
      while (sceneIndex < scenes.length) {
        sceneScripts.push({
          id: scenes[sceneIndex].id,
          content: ""
        });
        sceneIndex++;
      }

      // Update scenes with their new scripts
      onScriptDivide(sceneScripts)
        .then(() => {
          toast.success("Script divided across scenes successfully");
          
          // After dividing, also save the full script if the function is available
          if (onSaveFullScript) {
            onSaveFullScript(fullScript).catch(error => {
              console.error("Error saving full script after division:", error);
            });
          }
          
          setIsProcessing(false);
        })
        .catch((error) => {
          console.error("Error dividing script:", error);
          toast.error("Failed to divide script");
          setIsProcessing(false);
        });
    } catch (error) {
      console.error("Error processing script:", error);
      toast.error("Error processing script");
      setIsProcessing(false);
    }
  };

  const handleGenerateWithAI = () => {
    toast.info("AI script generation is not implemented yet");
  };

  return (
    <div className="bg-white dark:bg-slate-950 border-b">
      <div 
        className="px-4 py-2 flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <h3 className="text-lg font-semibold">Full Script</h3>
          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
            {wordCount} words
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-slate-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-500" />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 border-t">
          <Textarea
            ref={textareaRef}
            value={fullScript}
            onChange={handleScriptChange}
            placeholder="Write your full script here. It will be divided into scenes at sentence boundaries (max 70 words per scene)."
            className="min-h-[120px] mb-4"
          />
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button 
                onClick={divideScript}
                disabled={isProcessing || !fullScript.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                Divide into Scenes
              </Button>
              {onSaveFullScript && (
                <Button 
                  variant="outline" 
                  onClick={saveFullScript}
                  disabled={isSaving || !fullScript.trim()}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Full Script
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={handleGenerateWithAI}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Generate with AI
              </Button>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Script will be divided into scenes at sentence boundaries with max 70 words each
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
