import { useState, useEffect, useRef } from "react"; // Import useRef
import { CanvasProject, CanvasScene, ProjectAsset } from "@/types/canvas"; // Import ProjectAsset
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import { Textarea } from "@/components/ui/textarea"; // Keep Textarea import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Import CardHeader, CardTitle, CardDescription
import { Save, Sparkles, Edit, Check, X, Upload, Trash2, Maximize2 } from "lucide-react"; // Import Upload, Trash2, Maximize2
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth"; // Import useAuth

interface ProjectScriptEditorProps {
  project: CanvasProject;
  saveFullScript: (script: string) => Promise<void>;
  scenes: CanvasScene[]; // Add scenes prop
  divideScriptToScenes: (script: string) => Promise<void>; // Expect string input
  updateProjectTitle: (title: string) => Promise<void>;
  updateProject: (projectId: string, data: Partial<CanvasProject>) => Promise<void>; // Keep if needed for other updates, or remove if only title/image handled separately
  mainImageUrl?: string | null;
  updateMainImageUrl: (imageUrl: string) => Promise<void>; // Add this prop
  updateProjectAssets: (assets: ProjectAsset[]) => Promise<void>; // Add prop for updating assets
}

export function ProjectScriptEditor({
  project,
  saveFullScript,
  scenes, // Destructure scenes prop
  divideScriptToScenes,
  updateProjectTitle,
  updateProject,
  mainImageUrl, // Destructure prop
  updateMainImageUrl, // Destructure new prop
  updateProjectAssets, // Destructure new prop
}: ProjectScriptEditorProps) {
  const [script, setScript] = useState(project.full_script || ""); // Use full_script
  const [title, setTitle] = useState(project.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // Add state for main image upload
  const [isUploadingAssets, setIsUploadingAssets] = useState(false); // State for project assets upload
  const mainProjectImageInputRef = useRef<HTMLInputElement>(null); // Add ref for main image input
  const projectAssetsInputRef = useRef<HTMLInputElement>(null); // Ref for project assets input
  const { isAdmin } = useAuth();
  
  // Update local state when project changes
  useEffect(() => {
    setScript(project.full_script || ""); // Use full_script
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
      const sceneIds = scenes.map(scene => scene.id); // Use scenes prop
      
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
        await updateMainImageUrl(publicUrl); // Call the new prop function
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
      await updateMainImageUrl(''); // Call the new prop function to clear the URL
      toast.success("Main project image removed");
    } catch (error) {
      console.error("Error removing main project image:", error);
      toast.error("Failed to remove main project image");
    }
  };
  // --- End Handlers for Main Project Image ---

  // --- Handlers for Project Assets ---
  const handleProjectAssetsUploadTrigger = () => {
    projectAssetsInputRef.current?.click();
  };

  const handleProjectAssetsSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !project) {
      console.log('[ProjectScriptEditor] No files selected or no project.');
      return;
    }

    setIsUploadingAssets(true);
    console.log(`[ProjectScriptEditor] Uploading ${files.length} project assets...`);
    const uploadedAssets: ProjectAsset[] = [];
    const uploadPromises = [];

    for (const file of Array.from(files)) {
      uploadPromises.push(
        (async () => {
          try {
            const fileExt = file.name.split('.').pop();
            const uniqueFileName = `${uuidv4()}.${fileExt}`;
            const filePath = `public/project-assets/${project.id}/${uniqueFileName}`;
            console.log(`[ProjectScriptEditor] Uploading asset ${file.name} to ${filePath}`);

            const { error: uploadError } = await supabase.storage
              .from('lovable-uploads') // Use your actual bucket name
              .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
              .from('lovable-uploads')
              .getPublicUrl(filePath);

            if (!publicUrlData?.publicUrl) throw new Error("Failed to get public URL");

            const assetType = file.type.startsWith('image/') ? 'image' :
                              file.type.startsWith('video/') ? 'video' :
                              file.type.startsWith('audio/') ? 'audio' : 'image'; // Default to image if type unknown

            uploadedAssets.push({
              url: publicUrlData.publicUrl,
              type: assetType,
              name: file.name,
            });
            console.log(`[ProjectScriptEditor] Asset ${file.name} uploaded successfully.`);
          } catch (error) {
            console.error(`[ProjectScriptEditor] Failed to upload asset ${file.name}:`, error);
            toast.error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
          }
        })()
      );
    }

    await Promise.all(uploadPromises);

    if (uploadedAssets.length > 0) {
      const currentAssets = project.project_assets || [];
      const mergedAssets = [...currentAssets, ...uploadedAssets];
      await updateProjectAssets(mergedAssets); // Call the prop to update state/DB
      toast.success(`${uploadedAssets.length} asset(s) uploaded successfully.`);
    }

    setIsUploadingAssets(false);
    console.log('[ProjectScriptEditor] Asset upload process finished.');
    if (e.target) e.target.value = ''; // Clear file input
  };

  const handleRemoveProjectAsset = async (assetToRemove: ProjectAsset) => {
    if (!project) return;
    console.log(`[ProjectScriptEditor] Removing asset: ${assetToRemove.name}`);
    try {
      const currentAssets = project.project_assets || [];
      const filteredAssets = currentAssets.filter(asset => asset.url !== assetToRemove.url); // Filter by URL

      await updateProjectAssets(filteredAssets); // Update the project state/DB

      // Optional: Delete from storage
      try {
         // Extract path from URL - this is fragile and depends on your URL structure
         const urlParts = assetToRemove.url.split('/lovable-uploads/');
         if (urlParts.length > 1) {
            const storagePath = urlParts[1];
            console.log(`[ProjectScriptEditor] Attempting to delete asset from storage: ${storagePath}`);
            const { error: deleteError } = await supabase.storage
              .from('lovable-uploads')
              .remove([storagePath]);
            if (deleteError) {
               console.warn(`[ProjectScriptEditor] Failed to delete asset from storage (might be okay if permissions differ):`, deleteError);
               // Don't necessarily show error to user unless deletion is critical
            } else {
               console.log(`[ProjectScriptEditor] Asset deleted from storage successfully.`);
            }
         } else {
            console.warn(`[ProjectScriptEditor] Could not extract storage path from URL: ${assetToRemove.url}`);
         }
      } catch (storageError) {
         console.warn(`[ProjectScriptEditor] Error during storage deletion:`, storageError);
      }

      toast.success(`Asset "${assetToRemove.name}" removed.`);
    } catch (error) {
       console.error(`[ProjectScriptEditor] Failed to remove asset ${assetToRemove.name}:`, error);
       toast.error(`Failed to remove asset: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  // --- End Handlers for Project Assets ---
  
  // Safely access scenes length with proper null checking
  const scenesCount = scenes?.length || 0; // Use scenes prop
  
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

      {/* --- Project Assets Section --- */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Project Assets</CardTitle>
          <CardDescription>Upload additional images, videos, or audio files for the project.</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            ref={projectAssetsInputRef}
            accept="image/*,video/*,audio/*"
            multiple // Allow multiple files
            className="hidden"
            onChange={handleProjectAssetsSelected}
            disabled={isUploadingAssets}
          />
          <div className="mb-4">
            <Button
              variant="outline"
              onClick={handleProjectAssetsUploadTrigger}
              disabled={isUploadingAssets}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploadingAssets ? 'Uploading Assets...' : 'Upload Project Assets'}
            </Button>
          </div>

          {/* Display Uploaded Assets */}
          <div className="space-y-2">
            {(project.project_assets && project.project_assets.length > 0) ? (
              project.project_assets.map((asset, index) => {
                console.log("Asset URL:", asset.url, "Asset Type:", asset.type); // Keep logging
                let assetDisplay;
                if (asset.type === 'image') {
                  assetDisplay = <img key={asset.url} src={asset.url} alt={asset.name} className="w-32 h-32 object-contain border rounded" style={{ display: 'block' }} />;
                } else if (asset.type === 'video') {
                  assetDisplay = (
                    <video controls className="w-64 h-36 border rounded">
                      <source src={asset.url} type="video/mp4" /> {/* Adjust type as needed */}
                      Your browser does not support the video tag.
                    </video>
                  );
                } else if (asset.type === 'audio') {
                  assetDisplay = (
                    <audio controls className="w-64 border rounded">
                      <source src={asset.url} type="audio/mpeg" /> {/* Adjust type as needed */}
                      Your browser does not support the audio tag.
                    </audio>
                  );
                } else {
                  assetDisplay = <span>Unsupported asset type: {asset.type}</span>;
                }
                return (
                  // Wrap the display and the info/button in a flex container
                  <div key={index} className="flex items-start space-x-4 p-2 border rounded">
                    {/* Asset Preview */}
                    <div className="flex-shrink-0">
                      {assetDisplay}
                    </div>
                    {/* Asset Info and Action Buttons */}
                    <div className="flex-grow flex flex-col justify-between text-sm">
                      <span className="truncate mb-2" title={asset.name}>{asset.name} ({asset.type})</span>
                      <div className="flex space-x-2">
                        {/* Enlarge Button (only for images) */}
                        {asset.type === 'image' && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            title="Enlarge Image"
                            onClick={() => window.open(asset.url, '_blank')} // Open in new tab
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground"
                          title="Delete Asset"
                          onClick={() => handleRemoveProjectAsset(asset)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No project assets uploaded yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
      {/* --- End Project Assets Section --- */}

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
