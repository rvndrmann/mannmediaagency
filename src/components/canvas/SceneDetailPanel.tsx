
import { useState } from 'react';
import { CanvasScene } from '@/types/canvas';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { uploadFileToBucket, deleteFileFromBucket } from '@/utils/supabase-helpers';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Mic, 
  Trash2,
  LucideProps,
  Upload
} from 'lucide-react';

interface SceneDetailPanelProps {
  scene: CanvasScene | null;
  projectId: string;
  updateScene: (sceneId: string, type: 'imagePrompt' | 'description' | 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic', value: string) => Promise<void>;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function SceneDetailPanel({
  scene,
  projectId,
  updateScene,
  collapsed,
  setCollapsed
}: SceneDetailPanelProps) {
  const [imagePrompt, setImagePrompt] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingVoiceOver, setIsUploadingVoiceOver] = useState(false);
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);
  
  // Update local state when scene changes
  if (scene && scene.imagePrompt !== imagePrompt) {
    setImagePrompt(scene.imagePrompt);
  }
  
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
  
  const handleFileUpload = async (
    file: File, 
    uploadType: 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic',
    setUploading: (uploading: boolean) => void
  ) => {
    if (!scene) return;
    
    setUploading(true);
    try {
      // Get bucket name based on upload type
      const bucket = uploadType === 'voiceOver' 
        ? 'voice-over' 
        : uploadType === 'backgroundMusic' 
          ? 'background-music' 
          : uploadType === 'video'
            ? 'scene-videos'
            : 'canvas_assets';
      
      // Upload file to Supabase storage
      const publicUrl = await uploadFileToBucket(bucket, file);
      
      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
      
      // Update scene with the new URL
      await updateScene(scene.id, uploadType, publicUrl);
      
      toast.success(`${uploadType} uploaded successfully`);
    } catch (error) {
      console.error(`Error uploading ${uploadType}:`, error);
      toast.error(`Failed to upload ${uploadType}`);
    } finally {
      setUploading(false);
    }
  };
  
  const handleDeleteFile = async (
    uploadType: 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic'
  ) => {
    if (!scene) return;
    
    try {
      // Get the current URL based on upload type
      let currentUrl = '';
      switch (uploadType) {
        case 'image':
          currentUrl = scene.imageUrl;
          break;
        case 'productImage':
          currentUrl = scene.productImageUrl;
          break;
        case 'video':
          currentUrl = scene.videoUrl;
          break;
        case 'voiceOver':
          currentUrl = scene.voiceOverUrl;
          break;
        case 'backgroundMusic':
          currentUrl = scene.backgroundMusicUrl;
          break;
      }
      
      if (!currentUrl) {
        toast.error(`No ${uploadType} to delete`);
        return;
      }
      
      // Get bucket name based on upload type
      const bucket = uploadType === 'voiceOver' 
        ? 'voice-over' 
        : uploadType === 'backgroundMusic' 
          ? 'background-music' 
          : uploadType === 'video'
            ? 'scene-videos'
            : 'canvas_assets';
      
      // Delete file from Supabase storage
      await deleteFileFromBucket(bucket, currentUrl);
      
      // Update scene to remove the URL
      await updateScene(scene.id, uploadType, '');
      
      toast.success(`${uploadType} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting ${uploadType}:`, error);
      toast.error(`Failed to delete ${uploadType}`);
    }
  };
  
  const FileUploadItem = ({ 
    title, 
    icon: Icon, 
    fileType, 
    uploadType, 
    isUploading, 
    setUploading, 
    currentUrl,
    acceptedTypes
  }: { 
    title: string;
    icon: React.ComponentType<LucideProps>;
    fileType: string;
    uploadType: 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic';
    isUploading: boolean;
    setUploading: (uploading: boolean) => void;
    currentUrl: string;
    acceptedTypes: string;
  }) => (
    <div className="border rounded-md p-3 mb-3">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <Icon className="w-4 h-4 mr-2" />
          <span>{title}</span>
        </div>
        {currentUrl && (
          <Button 
            variant="destructive" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => handleDeleteFile(uploadType)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {currentUrl ? (
        <div className="mb-2">
          {uploadType === 'image' || uploadType === 'productImage' ? (
            <div className="aspect-video rounded-md overflow-hidden bg-muted">
              <img 
                src={currentUrl} 
                alt={title} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : uploadType === 'video' ? (
            <div className="aspect-video rounded-md overflow-hidden bg-muted">
              <video 
                src={currentUrl} 
                controls 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="rounded-md bg-muted p-2 text-xs overflow-hidden text-ellipsis">
              <audio src={currentUrl} controls className="w-full" />
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
              if (file) {
                handleFileUpload(file, uploadType, setUploading);
              }
            }}
            disabled={isUploading}
          />
          <Upload className="h-4 w-4 mb-1 text-muted-foreground" />
          <p className="text-xs text-center text-muted-foreground">
            {isUploading 
              ? `Uploading ${fileType}...` 
              : `Click to upload ${fileType}`
            }
          </p>
        </div>
      )}
    </div>
  );
  
  return (
    <div className={`border-l bg-background flex flex-col transition-all ${
      collapsed ? 'w-10' : 'w-80'
    }`}>
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className={`font-medium ${collapsed ? 'hidden' : 'block'}`}>Scene Assets</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
      
      {!collapsed && (
        <div className="p-4 overflow-y-auto">
          <div className="mb-4">
            <Label htmlFor="image-prompt" className="mb-2 block">Image Prompt</Label>
            <Textarea 
              id="image-prompt"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Write a prompt for image generation..."
              className="mb-2"
            />
            <Button 
              onClick={handleSaveImagePrompt} 
              size="sm"
            >
              Save Prompt
            </Button>
          </div>
          
          <div className="space-y-1">
            <FileUploadItem
              title="Scene Image"
              icon={ImageIcon}
              fileType="image"
              uploadType="image"
              isUploading={isUploadingImage}
              setUploading={setIsUploadingImage}
              currentUrl={scene.imageUrl}
              acceptedTypes="image/*"
            />
            
            <FileUploadItem
              title="Product Image"
              icon={ImageIcon}
              fileType="product image"
              uploadType="productImage"
              isUploading={isUploadingProductImage}
              setUploading={setIsUploadingProductImage}
              currentUrl={scene.productImageUrl}
              acceptedTypes="image/*"
            />
            
            <FileUploadItem
              title="Video Clip"
              icon={Video}
              fileType="video"
              uploadType="video"
              isUploading={isUploadingVideo}
              setUploading={setIsUploadingVideo}
              currentUrl={scene.videoUrl}
              acceptedTypes="video/*"
            />
            
            <FileUploadItem
              title="Voice Over"
              icon={Mic}
              fileType="audio"
              uploadType="voiceOver"
              isUploading={isUploadingVoiceOver}
              setUploading={setIsUploadingVoiceOver}
              currentUrl={scene.voiceOverUrl}
              acceptedTypes="audio/*"
            />
            
            <FileUploadItem
              title="Background Music"
              icon={Music}
              fileType="music"
              uploadType="backgroundMusic"
              isUploading={isUploadingMusic}
              setUploading={setIsUploadingMusic}
              currentUrl={scene.backgroundMusicUrl}
              acceptedTypes="audio/*"
            />
          </div>
        </div>
      )}
    </div>
  );
}
