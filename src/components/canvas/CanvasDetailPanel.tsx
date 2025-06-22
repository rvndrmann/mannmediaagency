
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Pause, 
  Download, 
  Upload, 
  Wand2, 
  Image as ImageIcon, 
  Video, 
  Music, 
  FileText,
  Sparkles,
  Camera,
  Mic,
  Volume2,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CanvasScene } from "@/types/canvas";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CanvasDetailPanelProps {
  scene: CanvasScene | null;
  onSceneUpdate: (sceneId: string, updates: Partial<CanvasScene>) => void;
  isGenerating?: boolean;
}

export function CanvasDetailPanel({ scene, onSceneUpdate, isGenerating = false }: CanvasDetailPanelProps) {
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [description, setDescription] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [voiceOverText, setVoiceOverText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Update local state when scene changes
  useEffect(() => {
    if (scene) {
      setTitle(scene.title || "");
      setScript(scene.script || "");
      setDescription(scene.description || "");
      setImagePrompt(scene.image_prompt || "");
      setVoiceOverText(scene.voice_over_text || "");
    }
  }, [scene?.id]);

  if (!scene) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Scene Selected</h3>
          <p className="text-muted-foreground">
            Select a scene from the sidebar to view and edit its details.
          </p>
        </div>
      </div>
    );
  }

  const handleSave = async (field: keyof CanvasScene, value: string) => {
    try {
      const { error } = await supabase
        .from('canvas_scenes')
        .update({ [field]: value })
        .eq('id', scene.id);

      if (error) throw error;

      onSceneUpdate(scene.id, { [field]: value } as Partial<CanvasScene>);
      toast.success(`${field} updated successfully`);
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error(`Failed to update ${field}`);
    }
  };

  const handleFileUpload = async (file: File, type: 'image' | 'video' | 'audio') => {
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${scene.id}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `scenes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('canvas-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('canvas-assets')
        .getPublicUrl(filePath);

      let updateField: keyof CanvasScene;
      switch (type) {
        case 'image':
          if (scene.product_image_url && scene.image_prompt) {
            updateField = 'image_url';
          } else {
            updateField = 'product_image_url';
          }
          break;
        case 'video':
          updateField = 'video_url';
          break;
        case 'audio':
          updateField = 'voice_over_url';
          break;
      }

      const { error } = await supabase
        .from('canvas_scenes')
        .update({ [updateField]: publicUrl })
        .eq('id', scene.id);

      if (error) throw error;

      onSceneUpdate(scene.id, { [updateField]: publicUrl } as Partial<CanvasScene>);
      toast.success(`${type} uploaded successfully`);
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(`Failed to upload ${type}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async (type: 'image' | 'video' | 'voiceover') => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke(`generate-${type}`, {
        body: {
          sceneId: scene.id,
          productImageUrl: scene.product_image_url,
          imagePrompt: scene.image_prompt,
          script: scene.script,
          voiceOverText: scene.voice_over_text
        }
      });

      if (error) throw error;

      toast.success(`${type} generation started`);
    } catch (error) {
      console.error(`Error generating ${type}:`, error);
      toast.error(`Failed to generate ${type}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Scene Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{scene.title || `Scene ${scene.scene_order || 1}`}</h2>
          <p className="text-muted-foreground">Scene ID: {scene.id}</p>
        </div>
        <Badge variant={scene.video_url ? "default" : "secondary"}>
          {scene.video_url ? "Complete" : "In Progress"}
        </Badge>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Scene Title</Label>
            <div className="flex gap-2">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter scene title..."
              />
              <Button 
                onClick={() => handleSave('title', title)}
                disabled={title === scene.title}
                size="sm"
              >
                Save
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <div className="space-y-2">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happens in this scene..."
                className="min-h-[100px]"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleSave('description', description)}
                  disabled={description === scene.description}
                  size="sm"
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(description, 'description')}
                  disabled={!description}
                >
                  {copiedField === 'description' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Script Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Script & Voice Over
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="script">Script</Label>
            <div className="space-y-2">
              <Textarea
                id="script"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Enter the scene script..."
                className="min-h-[120px]"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleSave('script', script)}
                  disabled={script === scene.script}
                  size="sm"
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(script, 'script')}
                  disabled={!script}
                >
                  {copiedField === 'script' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="voiceOverText">Voice Over Text</Label>
            <div className="space-y-2">
              <Textarea
                id="voiceOverText"
                value={voiceOverText}
                onChange={(e) => setVoiceOverText(e.target.value)}
                placeholder="Enter voice over narration..."
                className="min-h-[100px]"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleSave('voice_over_text', voiceOverText)}
                  disabled={voiceOverText === scene.voice_over_text}
                  size="sm"
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerate('voiceover')}
                  disabled={isProcessing || !voiceOverText}
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                  Generate Audio
                </Button>
              </div>
            </div>
          </div>

          {scene.voice_over_url && (
            <div className="p-4 bg-muted rounded-lg">
              <Label>Generated Voice Over</Label>
              <audio controls className="w-full mt-2">
                <source src={scene.voice_over_url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Media Assets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Image */}
          <div>
            <Label>Product Image</Label>
            {scene.product_image_url ? (
              <div className="space-y-2">
                <img 
                  src={scene.product_image_url} 
                  alt="Product" 
                  className="w-full max-w-sm rounded-lg border"
                />
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'image');
                    }}
                    disabled={isUploading}
                  />
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'image');
                  }}
                  disabled={isUploading}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Image Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="imagePrompt">AI Image Prompt</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImagePrompt(!showImagePrompt)}
              >
                {showImagePrompt ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            
            {showImagePrompt && (
              <div className="space-y-2">
                <Textarea
                  id="imagePrompt"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Describe the image you want to generate..."
                  className="min-h-[100px]"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleSave('image_prompt', imagePrompt)}
                    disabled={imagePrompt === scene.image_prompt}
                    size="sm"
                  >
                    Save Prompt
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerate('image')}
                    disabled={isProcessing || !imagePrompt || !scene.product_image_url}
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    Generate Image
                  </Button>
                </div>
                
                {!scene.product_image_url && imagePrompt && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Upload a product image first to generate scene variations.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Generated Scene Image */}
          {scene.image_url && (
            <div>
              <Label>Generated Scene Image</Label>
              <div className="space-y-2">
                <img 
                  src={scene.image_url} 
                  alt="Generated scene" 
                  className="w-full max-w-sm rounded-lg border"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerate('video')}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                  Generate Video
                </Button>
              </div>
            </div>
          )}

          {/* Generated Video */}
          {scene.video_url && (
            <div>
              <Label>Generated Video</Label>
              <div className="space-y-2">
                <video 
                  src={scene.video_url} 
                  controls 
                  className="w-full max-w-sm rounded-lg border"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(scene.video_url, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Video
                </Button>
              </div>
            </div>
          )}

          {/* Background Music */}
          {scene.background_music_url && (
            <div>
              <Label>Background Music</Label>
              <audio controls className="w-full mt-2">
                <source src={scene.background_music_url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generation Status */}
      {isGenerating && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            AI is working on your scene. This may take a few minutes...
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
