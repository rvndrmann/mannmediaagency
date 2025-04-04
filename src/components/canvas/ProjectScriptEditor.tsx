
import { useState, useEffect, useRef } from "react"; // Import useRef
import { CanvasProject } from "@/types/canvas";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Import CardHeader, CardTitle, CardDescription
import { Save, Sparkles, Edit, Check, X, Upload, Trash2 } from "lucide-react"; // Import Upload, Trash2
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth"; // Import useAuth

interface ProjectScriptEditorProps {
  project: CanvasProject;
  saveFullScript: (script: string) => Promise<void>;
  divideScriptToScenes: (script: string) => Promise<void>; // Expect string input
  updateProjectTitle: (title: string) => Promise<void>;
  updateProject: (projectId: string, data: Partial<CanvasProject>) => Promise<void>;
  mainImageUrl?: string | null; // Add mainImageUrl prop
}

export function ProjectScriptEditor({
  project,
  saveFullScript,
  divideScriptToScenes,
  updateProjectTitle,
  updateProject,
  mainImageUrl // Destructure prop
}: ProjectScriptEditorProps) {
  const [script, setScript] = useState(project.fullScript || "");
  const [title, setTitle] = useState(project.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // Add state for main image upload
  const mainProjectImageInputRef = useRef<HTMLInputElement>(null); // Add ref for main image input
  const { isAdmin } = useAuth();
  
  // Update local state when project changes
  useEffect(() => {
    setScript(project.fullScript || "");
    setTitle(project.title);
  }, [project]); // Revert dependency change
  
  const handleSaveScript = async () => {
    setIsSaving(true);
    try {
      await saveFullScript(script);
    } catch (error) {
      console.error("Error saving script:", error);
      toast.error("Failed to save script");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDivideScript = async () => {
    if (!script.trim()) {
      toast.error("Please write a script first");
      return;
    }
    
    setIsProcessing(true);
    try {
      // Get the scene IDs
      const sceneIds = project.scenes.map(scene => scene.id);
      
      // Call the process-script function
      const toastId = toast.loading("Processing script...");
      
      const { data, error } = await supabase.functions.invoke('process-script', {
        body: { 
          script, 
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
      // Call the prop with the full script string directly
      await divideScriptToScenes(script);
      
      toast.success("Script divided into scenes");
      
      // Show message about image prompts
      if (data.imagePrompts) {
        const { processedScenes, successfulScenes } = data.imagePrompts;
        if (processedScenes > 0) {
          toast.success(`Generated image prompts for ${successfulScenes} out of ${processedScenes} scenes`);
        }
      }
    } catch (error) {
      console.error("Error dividing script:", error);
      toast.error(error.message || "Failed to process script");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleSaveTitle = async () => {
    try {
      await updateProjectTitle(title);
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("Failed to update title");
    }
  };

  // --- Handlers for Main Project Image ---
  const handleMainProjectImageUploadTrigger = () => {
    if (mainProjectImageInputRef.current) {
      mainProjectImageInputRef.current.click();
    }
  };

  const handleMainProjectImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('[ProjectScriptEditor] File selected:', file?.name);
    if (!file || !project) {
      console.log('[ProjectScriptEditor] No file or project, exiting.');
      return;
    }

    setIsUploading(true);
    console.log('[ProjectScriptEditor] Starting upload...');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${project.id}-${Date.now()}.${fileExt}`;
      const filePath = `public/main-project-images/${fileName}`;
      console.log(`[ProjectScriptEditor] Uploading to path: ${filePath}`);

      let { error: uploadError } = await supabase.storage
        .from('lovable-uploads') // Use your actual bucket name
        .upload(filePath, file);

      if (uploadError) {
        console.error('[ProjectScriptEditor] Supabase storage upload error:', uploadError);
        throw uploadError;
      }
      console.log('[ProjectScriptEditor] Supabase storage upload successful.');

      const { data: publicUrlData } = supabase.storage
        .from('lovable-uploads') // Use your actual bucket name
        .getPublicUrl(filePath);
        
      const publicUrl = publicUrlData?.publicUrl;
      console.log('[ProjectScriptEditor] Got public URL:', publicUrl);

      if (publicUrl) {
        console.log(`[ProjectScriptEditor] Calling updateProject for project ${project.id} with URL: ${publicUrl}`);
        await updateProject(project.id, { main_product_image_url: publicUrl }); // Use the prop
        console.log('[ProjectScriptEditor] updateProject call successful.');
        toast.success("Main project image updated successfully");
      } else {
        throw new Error("Failed to get public URL after upload.");
      }
    } catch (error) {
      console.error("[ProjectScriptEditor] Error during upload process:", error);
      toast.error(`Failed to upload main project image: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUploading(false);
      console.log('[ProjectScriptEditor] Upload process finished.');
      if (e.target) e.target.value = ''; // Clear file input
    }
  };

  const handleRemoveMainProjectImage = async () => {
    if (!project) return;
    // Optional: Add logic here to delete the image from Supabase storage if needed
    try {
      await updateProject(project.id, { main_product_image_url: '' }); // Use the prop
      toast.success("Main project image removed");
    } catch (error) {
      console.error("Error removing main project image:", error);
      toast.error("Failed to remove main project image");
    }
  };
  // --- End Handlers for Main Project Image ---
  
  // Safely access scenes length with proper null checking
  const scenesCount = project?.scenes?.length || 0;
  
  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-6">
        {isEditingTitle ? (
          <div className="flex items-center mb-2">
            <Input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-bold h-10 mr-2"
            />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSaveTitle}
            >
              <Check className="h-5 w-5 text-green-500" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                setTitle(project.title);
                setIsEditingTitle(false);
              }}
            >
              <X className="h-5 w-5 text-red-500" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center mb-2">
            <h1 className="text-2xl font-bold mr-2">{title}</h1>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsEditingTitle(true)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="text-muted-foreground">
          {scenesCount} {scenesCount === 1 ? 'scene' : 'scenes'}
        </div>
      {/* --- Main Project Image Section --- */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Main Project Image</CardTitle>
          <CardDescription>Set the primary image for the whole project. This will be applied to all scenes by default.</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            ref={mainProjectImageInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleMainProjectImageSelected}
          />
          {mainImageUrl ? ( // Use mainImageUrl prop for conditional rendering
            <div className="relative group">
              <img
                src={mainImageUrl} // Use mainImageUrl prop for src
                alt="Main Project"
                className="w-full h-[150px] object-contain border rounded mb-2" // Adjusted height
              />
              <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/30 rounded">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveMainProjectImage}
                  disabled={isUploading}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-[150px]" // Adjusted height
              onClick={handleMainProjectImageUploadTrigger}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload Main Image'}
            </Button>
          )}
        </CardContent>
      </Card>
      {/* --- End Main Project Image Section --- */}

      </div>
      
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground mb-4">
            <p>Write your full script here, then click "Divide into Scenes" to automatically split it into individual scenes.</p>
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <Label htmlFor="full-script">Full Script</Label>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSaveScript}
                disabled={isSaving}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save
              </Button>
              <Button 
                size="sm" 
                onClick={handleDivideScript}
                disabled={isProcessing || !isAdmin} // Disable if processing or not admin
                title={!isAdmin ? "Scene division is managed by the agent via chat." : "Automatically divide script into scenes"}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {isProcessing ? "Processing..." : "Divide into Scenes"}
              </Button>
            </div>
          </div>
          
          <Textarea 
            id="full-script" 
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Write your full script here..."
            className="min-h-[400px] font-mono"
          />
        </CardContent>
      </Card>
      
      <div className="text-sm text-muted-foreground">
        <p>Tips:</p>
        <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
          <li>Write your script with clear scene separations</li>
          <li>Use scene headings like "SCENE 1: Introduction" to help the AI identify scene boundaries</li>
          <li>The AI will automatically generate voice-over text and image prompts for each scene</li>
        </ul>
      </div>
    </div>
  );
}
