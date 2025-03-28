import { useState, useRef } from "react";
import { CanvasScene } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { 
  Loader2, Save, Edit, Play, Image, Video, Wand2, Plus, 
  Trash, X, Music, Mic, PauseCircle, Upload 
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface SceneTableProps {
  scenes: CanvasScene[];
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string) => void;
  updateScene: (sceneId: string, type: 'script' | 'imagePrompt' | 'description' | 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic', value: string) => Promise<void>;
  deleteScene: (id: string) => Promise<void>;
}

export function SceneTable({
  scenes,
  selectedSceneId,
  setSelectedSceneId,
  updateScene,
  deleteScene
}: SceneTableProps) {
  const [editingField, setEditingField] = useState<{sceneId: string, field: 'script' | 'imagePrompt' | 'description'} | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState<{sceneId: string, type: 'image' | 'video' | 'productImage' | 'voiceOver' | 'backgroundMusic'} | null>(null);
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null);
  const [deletingScene, setDeletingScene] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{sceneId: string, type: 'voiceOver' | 'backgroundMusic'} | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const handleStartEditing = (sceneId: string, field: 'script' | 'imagePrompt' | 'description', content: string = "") => {
    setEditingField({ sceneId, field });
    setEditedContent(content);
  };
  
  const handleSave = async () => {
    if (!editingField) return;
    
    try {
      await updateScene(editingField.sceneId, editingField.field, editedContent);
      toast.success(`Scene ${editingField.field === 'script' ? 'script' : editingField.field === 'description' ? 'description' : 'image prompt'} updated`);
      setEditingField(null);
    } catch (error) {
      toast.error(`Failed to update: ${error}`);
    }
  };
  
  const handleCancel = () => {
    setEditingField(null);
  };
  
  const handleGenerateWithAI = (sceneId: string, field: 'script' | 'imagePrompt' | 'description' | 'image' | 'video') => {
    toast.info(`Generating ${field} with AI...`);
    // This would be implemented with actual AI generation
  };

  const handleAddMedia = async (sceneId: string, type: 'image' | 'video' | 'productImage' | 'voiceOver' | 'backgroundMusic') => {
    const input = document.createElement('input');
    input.type = 'file';
    
    if (type === 'image' || type === 'productImage') {
      input.accept = 'image/*';
    } else if (type === 'video') {
      input.accept = 'video/*';
    } else if (type === 'voiceOver' || type === 'backgroundMusic') {
      input.accept = 'audio/mp3,audio/*';
    }
    
    setFileInput(input);
    
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      
      if (!file) return;
      
      setUploadingMedia({ sceneId, type });
      
      try {
        if (type === 'voiceOver') {
          const bucketName = 'voice-over';
          const fileExt = file.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });
            
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);
          
          await updateScene(sceneId, type, publicUrl);
        } else if (type === 'backgroundMusic') {
          const bucketName = 'background-music';
          const fileExt = file.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });
            
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);
          
          await updateScene(sceneId, type, publicUrl);
        } else if (type === 'video') {
          const bucketName = 'scene-videos';
          const fileExt = file.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });
            
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);
          
          await updateScene(sceneId, type, publicUrl);
        } else {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            
            await updateScene(sceneId, type, dataUrl);
          };
          reader.readAsDataURL(file);
        }
        
        toast.success(`${type} added successfully`);
      } catch (error) {
        console.error(`Error adding ${type}:`, error);
        toast.error(`Failed to add ${type}`);
      } finally {
        setUploadingMedia(null);
      }
    };
    
    input.click();
  };

  const handleRemoveMedia = (sceneId: string, type: 'image' | 'video' | 'productImage' | 'voiceOver' | 'backgroundMusic') => {
    updateScene(sceneId, type, '')
      .then(() => {
        toast.success(`${type} removed`);
        if ((type === 'voiceOver' || type === 'backgroundMusic') && 
            playingAudio?.sceneId === sceneId && 
            playingAudio?.type === type) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          setPlayingAudio(null);
        }
        if (type === 'video' && playingVideo === sceneId) {
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current = null;
          }
          setPlayingVideo(null);
        }
      })
      .catch(error => toast.error(`Failed to remove ${type}: ${error}`));
  };
  
  const handlePlayAudio = (sceneId: string, type: 'voiceOver' | 'backgroundMusic', url: string) => {
    if (playingAudio?.sceneId === sceneId && playingAudio?.type === type) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingAudio(null);
      return;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const audio = new Audio(url);
    audio.onended = () => {
      setPlayingAudio(null);
      audioRef.current = null;
    };
    audio.play();
    audioRef.current = audio;
    setPlayingAudio({ sceneId, type });
  };
  
  const handlePlayVideo = (sceneId: string, url: string) => {
    if (playingVideo === sceneId) {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current = null;
      }
      setPlayingVideo(null);
      return;
    }
    
    if (videoRef.current) {
      videoRef.current.pause();
    }
    
    const video = document.createElement('video');
    video.src = url;
    video.onended = () => {
      setPlayingVideo(null);
      videoRef.current = null;
    };
    video.play();
    videoRef.current = video;
    setPlayingVideo(sceneId);
  };
  
  const handleDeleteScene = async (sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingScene(sceneId);
    
    try {
      await deleteScene(sceneId);
      toast.success("Scene deleted successfully");
    } catch (error) {
      toast.error(`Failed to delete scene: ${error}`);
    } finally {
      setDeletingScene(null);
    }
  };
  
  const renderField = (scene: CanvasScene, field: 'script' | 'imagePrompt' | 'description') => {
    const content = field === 'script' 
      ? scene.script 
      : field === 'description' 
        ? scene.description 
        : scene.imagePrompt;
    
    if (editingField && editingField.sceneId === scene.id && editingField.field === field) {
      return (
        <div className="flex flex-col space-y-2">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[100px] text-sm"
            placeholder={`Enter ${field === 'script' ? 'script' : field === 'description' ? 'description' : 'image prompt'}...`}
          />
          <div className="flex space-x-2">
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="group relative">
        <div className="max-h-[120px] overflow-y-auto text-sm whitespace-pre-wrap">
          {content || <span className="text-muted-foreground italic">No content yet</span>}
        </div>
        <div className="absolute top-0 right-0 hidden group-hover:flex space-x-1 bg-background/80 p-1 rounded">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={() => handleStartEditing(scene.id, field, content || "")}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={() => handleGenerateWithAI(scene.id, field)}
          >
            <Wand2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };
  
  const renderMedia = (scene: CanvasScene, type: 'image' | 'video' | 'productImage') => {
    let url;
    if (type === 'image') {
      url = scene.imageUrl;
    } else if (type === 'video') {
      url = scene.videoUrl;
    } else if (type === 'productImage') {
      url = scene.productImageUrl;
    }
    
    const isUploading = uploadingMedia && uploadingMedia.sceneId === scene.id && uploadingMedia.type === type;
    
    if (!url) {
      return (
        <div className="flex flex-col items-center justify-center h-[100px] bg-slate-100 dark:bg-slate-800 rounded">
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <div className="space-y-2 text-center">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => handleAddMedia(scene.id, type)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add {type === 'image' ? 'Image' : type === 'productImage' ? 'Product Image' : 'Video'}
              </Button>
              {type !== 'productImage' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => handleGenerateWithAI(scene.id, type === 'image' ? 'image' : 'video')}
                >
                  <Wand2 className="h-4 w-4 mr-1" />
                  Generate
                </Button>
              )}
            </div>
          )}
        </div>
      );
    }
    
    if (type === 'image' || type === 'productImage') {
      return (
        <div className="relative group">
          <img 
            src={url} 
            alt={`${type === 'productImage' ? 'Product' : 'Scene'} ${scene.title}`} 
            className="h-[100px] object-cover rounded" 
          />
          <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/30 rounded">
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" className="text-white bg-black/30 hover:bg-black/50">
                <Image className="h-4 w-4 mr-1" /> View
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white bg-black/30 hover:bg-black/50"
                onClick={() => handleRemoveMedia(scene.id, type)}
              >
                <Trash className="h-4 w-4 mr-1" /> Remove
              </Button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="relative group">
        <div className="h-[100px] bg-slate-800 flex items-center justify-center rounded">
          {url.startsWith('data:video') || url.includes('.mp4') || url.includes('mp4') ? (
            <video 
              src={url} 
              className="h-full w-full object-cover" 
              controls={false}
            />
          ) : (
            <Video className="h-8 w-8 text-slate-400" />
          )}
        </div>
        <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/30 rounded">
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white bg-black/30 hover:bg-black/50"
              onClick={() => handlePlayVideo(scene.id, url)}
            >
              {playingVideo === scene.id ? (
                <PauseCircle className="h-4 w-4 mr-1" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              {playingVideo === scene.id ? 'Stop' : 'Play'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white bg-black/30 hover:bg-black/50"
              onClick={() => handleRemoveMedia(scene.id, 'video')}
            >
              <Trash className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderAudio = (scene: CanvasScene, type: 'voiceOver' | 'backgroundMusic') => {
    const url = type === 'voiceOver' ? scene.voiceOverUrl : scene.backgroundMusicUrl;
    const icon = type === 'voiceOver' ? <Mic className="h-4 w-4 mr-1" /> : <Music className="h-4 w-4 mr-1" />;
    const title = type === 'voiceOver' ? 'Voice-Over' : 'Background Music';
    const isUploading = uploadingMedia && uploadingMedia.sceneId === scene.id && uploadingMedia.type === type;
    const isPlaying = playingAudio?.sceneId === scene.id && playingAudio?.type === type;
    
    if (!url) {
      return (
        <div className="flex flex-col items-center justify-center h-[50px]">
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs flex items-center"
              onClick={() => handleAddMedia(scene.id, type)}
            >
              <Upload className="h-4 w-4 mr-1" />
              Add {title}
            </Button>
          )}
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-center gap-2 h-[50px] group relative">
        <Button
          variant={isPlaying ? "default" : "outline"}
          size="sm"
          className="h-8 px-3"
          onClick={() => handlePlayAudio(scene.id, type, url)}
        >
          {isPlaying ? (
            <>
              <PauseCircle className="h-4 w-4 mr-1" />
              Stop
            </>
          ) : (
            <>
              {icon}
              Play {title}
            </>
          )}
        </Button>
        
        <div className="hidden group-hover:block absolute right-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={() => handleRemoveMedia(scene.id, type)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Scene</TableHead>
            <TableHead className="w-[20%]">Script</TableHead>
            <TableHead className="w-[20%]">Image Prompt</TableHead>
            <TableHead>Scene Image</TableHead>
            <TableHead>Video</TableHead>
            <TableHead>Product Image</TableHead>
            <TableHead>Voice-Over</TableHead>
            <TableHead>Music</TableHead>
            <TableHead className="w-[60px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scenes.map((scene) => (
            <TableRow 
              key={scene.id} 
              className={selectedSceneId === scene.id ? "bg-primary/10" : ""}
              onClick={() => setSelectedSceneId(scene.id)}
            >
              <TableCell className="font-medium">{scene.title}</TableCell>
              <TableCell>{renderField(scene, 'script')}</TableCell>
              <TableCell>{renderField(scene, 'imagePrompt')}</TableCell>
              <TableCell>{renderMedia(scene, 'image')}</TableCell>
              <TableCell>{renderMedia(scene, 'video')}</TableCell>
              <TableCell>{renderMedia(scene, 'productImage')}</TableCell>
              <TableCell>{renderAudio(scene, 'voiceOver')}</TableCell>
              <TableCell>{renderAudio(scene, 'backgroundMusic')}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={(e) => handleDeleteScene(scene.id, e)}
                  disabled={deletingScene === scene.id || scenes.length <= 1}
                >
                  {deletingScene === scene.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash className="h-4 w-4" />
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
