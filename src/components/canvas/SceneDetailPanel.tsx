
import { useState, useEffect } from 'react';
import { CanvasScene } from '@/types/canvas';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { uploadFileToBucket, deleteFileFromBucket } from '@/utils/supabase-helpers';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import {
  Image as ImageIcon,
  Video,
  Music,
  Mic,
  Trash2,
  Upload,
  Sparkles,
  FileText
} from 'lucide-react';
import clsx from 'clsx';

interface SceneDetailPanelProps {
  scene: CanvasScene | null;
  projectId: string;
  updateScene: (sceneId: string, type: 'imagePrompt' | 'description' | 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic' | 'sceneImageV1' | 'sceneImageV2' | 'voiceOverText' | 'script' | 'voiceoverAudioUrl', value: string) => Promise<void>;
}

export function SceneDetailPanel({
  scene,
  projectId,
  updateScene,
}: SceneDetailPanelProps) {
  const [imagePrompt, setImagePrompt] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingVoiceOver, setIsUploadingVoiceOver] = useState(false);
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);
  const [isUploadingSceneImageV1, setIsUploadingSceneImageV1] = useState(false);
  const [isUploadingSceneImageV2, setIsUploadingSceneImageV2] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (scene) {
      setImagePrompt(scene.image_prompt || '');
      setSceneDescription(scene.voice_over_text || scene.script || '');
    } else {
      setImagePrompt('');
      setSceneDescription('');
    }
  }, [scene]);

  if (!scene) {
    return null;
  }

  const handleSaveImagePrompt = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'imagePrompt', imagePrompt);
      toast.success('Image prompt saved');
    } catch (error) {
      console.error('Error saving image prompt:', error);
      toast.error('Failed to save image prompt');
    }
  };

  const handleSaveDescription = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'voiceOverText', sceneDescription);
      toast.success('Scene text saved');
    } catch (error) {
      console.error('Error saving scene text:', error);
      toast.error('Failed to save scene text');
    }
  };

  const handleFileUpload = async (
    file: File,
    uploadType: 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic' | 'sceneImageV1' | 'sceneImageV2',
    setUploading: (uploading: boolean) => void
  ) => {
    if (!scene) return;
    setUploading(true);
    try {
      const bucket = uploadType === 'voiceOver'
        ? 'voice-over'
        : uploadType === 'backgroundMusic'
          ? 'background-music'
          : uploadType === 'video'
            ? 'scene-videos'
            : 'canvas_assets';

      const publicUrl = await uploadFileToBucket(bucket, file);
      if (!publicUrl) throw new Error('Failed to get public URL');

      const updateField = uploadType === 'voiceOver' ? 'voiceOver' : uploadType;
      await updateScene(scene.id, updateField, publicUrl);
      toast.success(`${uploadType} uploaded successfully`);
    } catch (error) {
      console.error(`Error uploading ${uploadType}:`, error);
      toast.error(`Failed to upload ${uploadType}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (
    uploadType: 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic' | 'sceneImageV1' | 'sceneImageV2' | 'generatedVoiceOver'
  ) => {
    if (!scene) return;
    try {
      let currentUrl = '';
      let bucket = 'canvas_assets';
      let updateField: 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic' | 'sceneImageV1' | 'sceneImageV2' | 'voiceoverAudioUrl' = uploadType as any;

      switch (uploadType) {
        case 'image': 
          currentUrl = scene.image_url || ''; 
          bucket = 'canvas_assets'; 
          updateField = 'image'; 
          break;
        case 'productImage': 
          currentUrl = scene.product_image_url || ''; 
          bucket = 'canvas_assets'; 
          updateField = 'productImage'; 
          break;
        case 'video': 
          currentUrl = scene.video_url || ''; 
          bucket = 'scene-videos'; 
          updateField = 'video'; 
          break;
        case 'voiceOver': 
          currentUrl = scene.voice_over_url || ''; 
          bucket = 'voice-over'; 
          updateField = 'voiceOver'; 
          break;
        case 'generatedVoiceOver': 
          currentUrl = scene.voice_over_url || ''; 
          bucket = 'voice-over'; 
          updateField = 'voiceOver'; 
          break;
        case 'backgroundMusic': 
          currentUrl = scene.background_music_url || ''; 
          bucket = 'background-music'; 
          updateField = 'backgroundMusic'; 
          break;
        case 'sceneImageV1': 
          currentUrl = scene.scene_image_v1_url || ''; 
          bucket = 'canvas_assets'; 
          updateField = 'sceneImageV1'; 
          break;
        case 'sceneImageV2': 
          currentUrl = scene.scene_image_v2_url || ''; 
          bucket = 'canvas_assets'; 
          updateField = 'sceneImageV2'; 
          break;
      }

      if (!currentUrl) {
        toast.error(`No ${uploadType === 'generatedVoiceOver' ? 'generated voiceover' : uploadType} to delete`);
        return;
      }

      await deleteFileFromBucket(bucket, currentUrl);
      await updateScene(scene.id, updateField, '');
      toast.success(`${uploadType === 'generatedVoiceOver' ? 'Generated voiceover' : uploadType} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting ${uploadType}:`, error);
      toast.error(`Failed to delete ${uploadType === 'generatedVoiceOver' ? 'generated voiceover' : uploadType}`);
    }
  };

  const handleGenerateVoiceover = async () => {
    if (!supabase || !scene?.id) {
      toast.error("Initialization error or scene not selected.");
      return;
    }
    const dialogueText = sceneDescription;
    if (!dialogueText) {
      toast.error("Scene has no text content to generate voiceover from.");
      return;
    }
    const voices = [{ speaker: 1, voice_id: "jennifer" }, { speaker: 2, voice_id: "furiov2" }];
    setIsGenerating(true);
    toast.loading("Starting voiceover generation...", { id: `vo-${scene.id}` });
    try {
      const { data, error } = await supabase.functions.invoke('generate-voiceover', {
        body: { dialogueText, voices, sceneId: scene.id }
      });
      if (error) throw error;
      console.log("Voiceover generation requested:", data);
      toast.success("Voiceover generation started.", { id: `vo-${scene.id}` });
    } catch (error: any) {
      console.error("Error calling generate-voiceover function:", error);
      toast.error(`Failed to start voiceover generation: ${error.message || 'Unknown error'}`, { id: `vo-${scene.id}` });
    } finally {
      setIsGenerating(false);
    }
  };

  const FileUploadItem = ({
    title, icon: Icon, fileType, uploadType, isUploading, setUploading, currentUrl, acceptedTypes
  }: {
    title: string; 
    icon: React.ComponentType<{ className?: string }>; 
    fileType: string;
    uploadType: 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic' | 'sceneImageV1' | 'sceneImageV2';
    isUploading: boolean; 
    setUploading: (uploading: boolean) => void; 
    currentUrl: string; 
    acceptedTypes: string;
  }) => (
    <div className="border rounded-md p-3">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <Icon className="w-4 h-4 mr-2" />
          <span>{title}</span>
        </div>
        {currentUrl && (
          <Button variant="destructive" size="icon" className="h-6 w-6" onClick={() => handleDeleteFile(uploadType)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      {currentUrl ? (
        <div className="mb-2">
          {uploadType === 'image' || uploadType === 'productImage' || uploadType === 'sceneImageV1' || uploadType === 'sceneImageV2' ? (
            <div className={clsx('rounded-md bg-muted', { 'aspect-[9/16] overflow-hidden': ['productImage', 'sceneImageV1', 'sceneImageV2'].includes(uploadType), 'w-full': !['productImage', 'sceneImageV1', 'sceneImageV2'].includes(uploadType) })}>
              <img src={currentUrl} alt={title} className={clsx({ 'w-full h-full object-contain': ['productImage', 'sceneImageV1', 'sceneImageV2'].includes(uploadType), 'block max-w-full h-auto': !['productImage', 'sceneImageV1', 'sceneImageV2'].includes(uploadType) })} />
            </div>
          ) : uploadType === 'video' ? (
            <div className="aspect-video rounded-md overflow-hidden bg-muted">
              <video src={currentUrl} controls className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="rounded-md bg-muted p-2 text-xs overflow-hidden text-ellipsis">
              <audio src={currentUrl} controls className="w-full h-8" />
            </div>
          )}
        </div>
      ) : (
        <div className="relative flex flex-col items-center border-2 border-dashed border-muted-foreground/25 rounded-md p-4">
          <input
            type="file"
            accept={acceptedTypes}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, uploadType, setUploading);
            }}
            disabled={isUploading}
          />
          <Upload className="h-4 w-4 mb-1 text-muted-foreground" />
          <p className="text-xs text-center text-muted-foreground">
            {isUploading ? `Uploading ${fileType}...` : `Click to upload ${fileType}`}
          </p>
        </div>
      )}
    </div>
  );

  const generatedAudioUrl = scene?.voice_over_url;
  const manualAudioUrl = scene?.voice_over_url;

  const handleSceneUpdate = (field: string, value: string) => {
    if (scene) {
      updateScene(scene.id, field as any, value);
    }
  };

  const handleGenerateImagePrompt = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'imagePrompt', imagePrompt);
      toast.success('Image prompt generated');
    } catch (error) {
      console.error('Error generating image prompt:', error);
      toast.error('Failed to generate image prompt');
    }
  };

  const handleGenerateImage = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'image', imagePrompt);
      toast.success('Image generated');
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image');
    }
  };

  const handleGenerateVideo = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'video', imagePrompt);
      toast.success('Video generated');
    } catch (error) {
      console.error('Error generating video:', error);
      toast.error('Failed to generate video');
    }
  };

  const handleGenerateScript = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'script', sceneDescription);
      toast.success('Script generated');
    } catch (error) {
      console.error('Error generating script:', error);
      toast.error('Failed to generate script');
    }
  };

  return (
    <div className="p-4 overflow-y-auto flex-1 h-full flex flex-col">
      {/* --- Scene Text Section --- */}
      <div className="mb-4">
        <Label htmlFor="scene-description" className="mb-2 block">Script / Voiceover Text</Label>
        <Textarea
          id="scene-description"
          value={sceneDescription}
          onChange={(e) => setSceneDescription(e.target.value)}
          placeholder="Enter script or text for voiceover..."
          className="mb-2 h-24"
        />
        <Button onClick={handleSaveDescription} size="sm">Save Text</Button>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 ml-2"
          onClick={() => toast.info('AI generation for script not implemented yet')}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate with AI
        </Button>
      </div>

      {/* --- Image Prompt Section --- */}
      <div className="mb-4">
        <Label htmlFor="image-prompt" className="mb-2 block">Image Prompt</Label>
        <Textarea
          id="image-prompt"
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
          placeholder="Write a prompt for image generation..."
          className="mb-2"
        />
        <Button onClick={handleSaveImagePrompt} size="sm">Save Prompt</Button>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 ml-2"
          onClick={() => toast.info('AI generation for image prompt not implemented yet')}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate with AI
        </Button>
      </div>

      {/* --- File Uploads Section --- */}
      <div className="space-y-3 flex-1">
        <FileUploadItem
          title="Scene Image" icon={ImageIcon} fileType="image" uploadType="image"
          isUploading={isUploadingImage} setUploading={setIsUploadingImage}
          currentUrl={scene.image_url || ''} acceptedTypes="image/*"
        />
        <FileUploadItem
          title="Product Image" icon={ImageIcon} fileType="product image" uploadType="productImage"
          isUploading={isUploadingProductImage} setUploading={setIsUploadingProductImage}
          currentUrl={scene.product_image_url || ''} acceptedTypes="image/*"
        />
        <FileUploadItem
          title="Scene Image V1" icon={ImageIcon} fileType="scene image v1" uploadType="sceneImageV1"
          isUploading={isUploadingSceneImageV1} setUploading={setIsUploadingSceneImageV1}
          currentUrl={scene.scene_image_v1_url || ''} acceptedTypes="image/*"
        />
        <FileUploadItem
          title="Scene Image V2" icon={ImageIcon} fileType="scene image v2" uploadType="sceneImageV2"
          isUploading={isUploadingSceneImageV2} setUploading={setIsUploadingSceneImageV2}
          currentUrl={scene.scene_image_v2_url || ''} acceptedTypes="image/*"
        />
        <FileUploadItem
          title="Video Clip" icon={Video} fileType="video" uploadType="video"
          isUploading={isUploadingVideo} setUploading={setIsUploadingVideo}
          currentUrl={scene.video_url || ''} acceptedTypes="video/*"
        />

        {/* --- Combined Voice Over Section --- */}
        <div className="border rounded-md p-3">
          <Label className="mb-2 block font-medium">Voice Over</Label>
          {/* Manual Upload */}
          <div className="relative flex flex-col items-center border-2 border-dashed border-muted-foreground/25 rounded-md p-4 mb-3">
            <input type="file" accept="audio/mpeg,audio/wav" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, 'voiceOver', setIsUploadingVoiceOver);
              }}
              disabled={isUploadingVoiceOver}
            />
            <Upload className="h-4 w-4 mb-1 text-muted-foreground" />
            <p className="text-xs text-center text-muted-foreground">
              {isUploadingVoiceOver ? `Uploading audio...` : `Click to upload Voice Over (MP3/WAV)`}
            </p>
          </div>
          {manualAudioUrl && (
            <div className="mb-3">
              <Label className="mb-1 block text-xs">Uploaded Voiceover:</Label>
              <div className="flex items-center space-x-2">
                <audio controls src={manualAudioUrl} className="w-full h-8 flex-1" />
                <Button variant="destructive" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => handleDeleteFile('voiceOver')} title="Delete uploaded voiceover">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          {/* AI Generation */}
          <Button onClick={handleGenerateVoiceover} disabled={isGenerating || !sceneDescription} size="sm" className="w-full mb-3">
            {isGenerating ? 'Generating...' : 'Generate Voiceover from Text'}
          </Button>
          {generatedAudioUrl && (
            <div>
              <Label className="mb-1 block text-xs">Generated Voiceover:</Label>
              <div className="flex items-center space-x-2">
                <audio controls src={generatedAudioUrl} className="w-full h-8 flex-1" />
                <Button variant="destructive" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => handleDeleteFile('generatedVoiceOver')} title="Delete generated voiceover">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <FileUploadItem
          title="Background Music" icon={Music} fileType="music" uploadType="backgroundMusic"
          isUploading={isUploadingMusic} setUploading={setIsUploadingMusic}
          currentUrl={scene.background_music_url || ''} acceptedTypes="audio/*"
        />
      </div>

      {scene && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Scene Details</h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Scene {scene.scene_order || 1}
                </Badge>
                {(scene.image_prompt) && (
                  <Badge variant="secondary">Has Prompt</Badge>
                )}
              </div>
            </div>

            {/* Scene Content */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="scene-title" className="text-sm font-medium">
                  Scene Title
                </Label>
                <Input
                  id="scene-title"
                  value={scene.title || ""}
                  onChange={(e) => handleSceneUpdate("title", e.target.value)}
                  placeholder="Enter scene title..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="scene-description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="scene-description"
                  value={scene.description || ""}
                  onChange={(e) => handleSceneUpdate("description", e.target.value)}
                  placeholder="Describe what happens in this scene..."
                  className="mt-1 min-h-[100px]"
                />
              </div>

              <div>
                <Label htmlFor="scene-script" className="text-sm font-medium">
                  Script
                </Label>
                <Textarea
                  id="scene-script"
                  value={scene.script || ""}
                  onChange={(e) => handleSceneUpdate("script", e.target.value)}
                  placeholder="Enter the script for this scene..."
                  className="mt-1 min-h-[120px]"
                />
              </div>

              <div>
                <Label htmlFor="voice-over-text" className="text-sm font-medium">
                  Voice Over Text
                </Label>
                <Textarea
                  id="voice-over-text"
                  value={scene.voice_over_text || ""}
                  onChange={(e) => handleSceneUpdate("voiceOverText", e.target.value)}
                  placeholder="Enter voice over text..."
                  className="mt-1 min-h-[100px]"
                />
              </div>

              <div>
                <Label htmlFor="image-prompt" className="text-sm font-medium">
                  Image Generation Prompt
                </Label>
                <Textarea
                  id="image-prompt"
                  value={scene.image_prompt || ""}
                  onChange={(e) => handleSceneUpdate("imagePrompt", e.target.value)}
                  placeholder="Describe the visual style and content for this scene..."
                  className="mt-1 min-h-[100px]"
                />
              </div>
            </div>

            {/* Generated Assets */}
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Generated Assets</h3>
              
              {/* Product Image */}
              {scene.product_image_url && (
                <div>
                  <Label className="text-sm font-medium">Product Image</Label>
                  <div className="mt-2">
                    <img 
                      src={scene.product_image_url} 
                      alt="Product" 
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                </div>
              )}

              {/* Scene Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scene.scene_image_v1_url && (
                  <div>
                    <Label className="text-sm font-medium">Scene Image V1</Label>
                    <div className="mt-2">
                      <img 
                        src={scene.scene_image_v1_url} 
                        alt="Scene V1" 
                        className="w-full h-auto rounded-lg border"
                      />
                    </div>
                  </div>
                )}

                {scene.scene_image_v2_url && (
                  <div>
                    <Label className="text-sm font-medium">Scene Image V2</Label>
                    <div className="mt-2">
                      <img 
                        src={scene.scene_image_v2_url} 
                        alt="Scene V2" 
                        className="w-full h-auto rounded-lg border"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Generated Image */}
              {scene.image_url && (
                <div>
                  <Label className="text-sm font-medium">Generated Image</Label>
                  <div className="mt-2">
                    <img 
                      src={scene.image_url} 
                      alt="Generated scene" 
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                </div>
              )}

              {/* Generated Video */}
              {scene.video_url && (
                <div>
                  <Label className="text-sm font-medium">Generated Video</Label>
                  <div className="mt-2">
                    <video 
                      src={scene.video_url} 
                      controls 
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                </div>
              )}

              {/* Background Music */}
              {scene.background_music_url && (
                <div>
                  <Label className="text-sm font-medium">Background Music</Label>
                  <div className="mt-2">
                    <audio 
                      src={scene.background_music_url} 
                      controls 
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Generation Actions */}
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Generate Content</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => handleGenerateImagePrompt()}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate Image Prompt
                </Button>

                <Button
                  onClick={() => handleGenerateImage()}
                  disabled={isGenerating || !(scene.image_prompt)}
                  className="w-full"
                >
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                  Generate Image
                </Button>

                <Button
                  onClick={() => handleGenerateVideo()}
                  disabled={isGenerating || !(scene.image_url)}
                  className="w-full"
                >
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
                  Generate Video
                </Button>

                <Button
                  onClick={() => handleGenerateScript()}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  Generate Script
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
