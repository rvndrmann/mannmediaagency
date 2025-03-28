
import { CanvasScene } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PanelRight, ChevronRight, Wand2, Upload, Trash2, MessageSquare } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentSelector } from "./AgentSelector";
import { AudioUploader } from "./AudioUploader";
import { VideoUploader } from "./VideoUploader";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCanvasAgent } from "@/hooks/use-canvas-agent";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChatMessage } from "@/components/chat/ChatMessage";

interface CanvasDetailPanelProps {
  scene: CanvasScene | null;
  projectId: string;
  updateScene: (sceneId: string, type: 'script' | 'imagePrompt' | 'description' | 'image' | 'productImage' | 'video' | 'voiceOver' | 'backgroundMusic', value: string) => Promise<void>;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function CanvasDetailPanel({
  scene,
  projectId,
  updateScene,
  collapsed,
  setCollapsed,
}: CanvasDetailPanelProps) {
  const [selectedAgent, setSelectedAgent] = useState("script");
  const [aiInstructions, setAiInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    isProcessing, 
    agentMessages, 
    activeAgent,
    generateSceneScript,
    generateImagePrompt,
    generateSceneDescription
  } = useCanvasAgent({
    projectId,
    sceneId: scene?.id,
    updateScene
  });
  
  useEffect(() => {
    setIsGenerating(isProcessing);
  }, [isProcessing]);
  
  const handleGenerateContent = async (contentType: 'script' | 'imagePrompt' | 'description' | 'image' | 'video') => {
    if (!scene) return;
    
    setIsGenerating(true);
    setShowAgentDialog(true);
    
    try {
      const contextData: Record<string, string> = {};
      
      if (scene.script && contentType !== 'script') {
        contextData.script = scene.script;
      }
      
      if (scene.description && contentType !== 'description') {
        contextData.description = scene.description;
      }
      
      if (scene.imagePrompt && contentType !== 'imagePrompt') {
        contextData.imagePrompt = scene.imagePrompt;
      }
      
      const contextString = Object.entries(contextData)
        .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
        .join('\n\n');
      
      const additionalContext = aiInstructions 
        ? `\n\nAdditional instructions: ${aiInstructions}`
        : '';
      
      const fullContext = contextData ? `\n\nHere is the existing information about the scene:\n${contextString}${additionalContext}` : additionalContext;
      
      switch (contentType) {
        case 'script':
          await generateSceneScript(scene.id, fullContext);
          break;
        case 'description':
          await generateSceneDescription(scene.id, fullContext);
          break;
        case 'imagePrompt':
          await generateImagePrompt(scene.id, fullContext);
          break;
        case 'image':
          await generateImagePrompt(scene.id, fullContext + "\nMake this very detailed and suitable for AI image generation.");
          toast.info("Image prompt generated. Use the prompt to generate an actual image.");
          break;
        case 'video':
          toast.info("Video generation coming soon. For now, use the generated script and image prompt to create your video.");
          break;
      }
    } catch (error) {
      console.error(`Error generating ${contentType}:`, error);
      toast.error(`Failed to generate ${contentType}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProductImageUpload = () => {
    if (!scene) return;
    if (productImageInputRef.current) {
      productImageInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!scene) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          await updateScene(scene.id, 'productImage', dataUrl);
          toast.success("Product image uploaded successfully");
        } else {
          toast.error("Failed to read the image file");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading product image:", error);
      toast.error("Failed to upload product image");
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveProductImage = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'productImage', '');
      toast.success("Product image removed");
    } catch (error) {
      console.error("Error removing product image:", error);
      toast.error("Failed to remove product image");
    }
  };

  const handleVoiceOverUploaded = async (url: string) => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'voiceOver', url);
    } catch (error) {
      console.error("Error saving voice-over URL:", error);
      throw error;
    }
  };

  const handleRemoveVoiceOver = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'voiceOver', '');
    } catch (error) {
      console.error("Error removing voice-over:", error);
      throw error;
    }
  };

  const handleBackgroundMusicUploaded = async (url: string) => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'backgroundMusic', url);
    } catch (error) {
      console.error("Error saving background music URL:", error);
      throw error;
    }
  };

  const handleRemoveBackgroundMusic = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'backgroundMusic', '');
    } catch (error) {
      console.error("Error removing background music:", error);
      throw error;
    }
  };

  const handleVideoUploaded = async (url: string) => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'video', url);
    } catch (error) {
      console.error("Error saving video URL:", error);
      throw error;
    }
  };

  const handleRemoveVideo = async () => {
    if (!scene) return;
    try {
      await updateScene(scene.id, 'video', '');
    } catch (error) {
      console.error("Error removing video:", error);
      throw error;
    }
  };

  if (collapsed) {
    return (
      <div className="w-10 border-l flex flex-col items-center py-4 bg-slate-50 dark:bg-slate-900">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(false)}
          className="mb-4"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  if (!scene) {
    return (
      <div className="w-80 border-l bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <p className="text-muted-foreground">Select a scene to see details</p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(true)}
          className="absolute right-2 top-2"
        >
          <PanelRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-80 border-l bg-slate-50 dark:bg-slate-900 flex flex-col relative">
        <div className="p-4 border-b bg-background flex justify-between items-center">
          <h3 className="font-medium">Scene Details</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
          >
            <PanelRight className="h-5 w-5" />
          </Button>
        </div>
        
        <Tabs defaultValue="edit" className="flex-1 flex flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="edit" className="flex-1">Edit</TabsTrigger>
            <TabsTrigger value="media" className="flex-1">Media</TabsTrigger>
            <TabsTrigger value="ai" className="flex-1">AI</TabsTrigger>
          </TabsList>
          
          <TabsContent value="edit" className="flex-1 p-0">
            <ScrollArea className="flex-1 p-4 h-full">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="scene-title">Scene Title</Label>
                  <Input
                    id="scene-title"
                    value={scene.title}
                    onChange={() => {}}
                    placeholder="Scene title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="scene-script">Script</Label>
                  <Textarea
                    id="scene-script"
                    value={scene?.script || ""}
                    onChange={(e) => updateScene(scene!.id, 'script', e.target.value)}
                    className="min-h-[120px]"
                    placeholder="Enter script for this scene..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scene-description">Scene Description</Label>
                  <Textarea
                    id="scene-description"
                    value={scene?.description || ""}
                    onChange={(e) => updateScene(scene!.id, 'description', e.target.value)}
                    className="min-h-[120px]"
                    placeholder="Enter description for this scene..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="scene-image-prompt">Image Prompt</Label>
                  <Textarea
                    id="scene-image-prompt"
                    value={scene?.imagePrompt || ""}
                    onChange={(e) => updateScene(scene!.id, 'imagePrompt', e.target.value)}
                    className="min-h-[120px]"
                    placeholder="Enter image prompt for this scene..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Scene Duration</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={scene.duration || 5}
                      onChange={() => {}}
                    />
                    <span className="text-muted-foreground">seconds</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="media" className="flex-1 p-0">
            <ScrollArea className="flex-1 p-4 h-full">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <input
                    type="file"
                    ref={productImageInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelected}
                  />

                  {scene?.productImageUrl ? (
                    <div className="relative group">
                      <img 
                        src={scene.productImageUrl} 
                        alt="Product" 
                        className="w-full h-[120px] object-contain border rounded"
                      />
                      <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/30 rounded">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleRemoveProductImage}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-[120px]"
                      onClick={handleProductImageUpload}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Product Image
                    </Button>
                  )}
                </div>

                <VideoUploader 
                  label="Scene Video"
                  videoUrl={scene?.videoUrl}
                  onVideoUploaded={handleVideoUploaded}
                  onRemoveVideo={handleRemoveVideo}
                  bucketName="scene-videos"
                />
                
                <AudioUploader 
                  label="Voice-Over"
                  audioUrl={scene?.voiceOverUrl}
                  onAudioUploaded={handleVoiceOverUploaded}
                  onRemoveAudio={handleRemoveVoiceOver}
                  bucketName="voice-over"
                />
                
                <AudioUploader 
                  label="Background Music"
                  audioUrl={scene?.backgroundMusicUrl}
                  onAudioUploaded={handleBackgroundMusicUploaded}
                  onRemoveAudio={handleRemoveBackgroundMusic}
                  bucketName="background-music"
                />
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="ai" className="flex-1 p-0">
            <ScrollArea className="flex-1 p-4 h-full">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>AI Agent</Label>
                  <AgentSelector 
                    onChange={setSelectedAgent}
                    defaultValue={selectedAgent}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Generate</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleGenerateContent('script')}
                      disabled={isGenerating}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Script
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleGenerateContent('description')}
                      disabled={isGenerating}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Description
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleGenerateContent('imagePrompt')}
                      disabled={isGenerating}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Image Prompt
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleGenerateContent('image')}
                      disabled={isGenerating}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Scene Image
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleGenerateContent('video')}
                      disabled={isGenerating}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Scene Video
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>AI Instructions</Label>
                  <Textarea
                    placeholder="Enter custom instructions for the AI..."
                    className="min-h-[120px]"
                    value={aiInstructions}
                    onChange={(e) => setAiInstructions(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Agent Chat</Label>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAgentDialog(true)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Open Agent Chat
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
      
      <Dialog open={showAgentDialog} onOpenChange={setShowAgentDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Canvas AI Agent</DialogTitle>
            <DialogDescription>
              Agent: {activeAgent ? activeAgent.charAt(0).toUpperCase() + activeAgent.slice(1) : "Assistant"}
              {isGenerating && " (Processing...)"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto my-4 space-y-4 max-h-[60vh]">
            {agentMessages.map((message, index) => (
              <ChatMessage 
                key={index} 
                message={message}
                showAgentName={message.role === "assistant" && message.agentType !== undefined}
              />
            ))}
            
            {agentMessages.length === 0 && (
              <div className="text-center text-muted-foreground p-4">
                No messages yet. Generate content to start a conversation with the AI agent.
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAgentDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
