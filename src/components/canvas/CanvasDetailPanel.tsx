
import { CanvasScene } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PanelRight, ChevronRight, Wand2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentSelector } from "./AgentSelector";

interface CanvasDetailPanelProps {
  scene: CanvasScene | null;
  updateScene: (sceneId: string, type: 'script' | 'imagePrompt' | 'image' | 'video', value: string) => Promise<void>;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function CanvasDetailPanel({
  scene,
  updateScene,
  collapsed,
  setCollapsed,
}: CanvasDetailPanelProps) {
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
                  value={scene.script || ""}
                  onChange={(e) => updateScene(scene.id, 'script', e.target.value)}
                  className="min-h-[120px]"
                  placeholder="Enter script for this scene..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scene-image-prompt">Image Prompt</Label>
                <Textarea
                  id="scene-image-prompt"
                  value={scene.imagePrompt || ""}
                  onChange={(e) => updateScene(scene.id, 'imagePrompt', e.target.value)}
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
        
        <TabsContent value="ai" className="flex-1 p-0">
          <ScrollArea className="flex-1 p-4 h-full">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>AI Agent</Label>
                <AgentSelector />
              </div>
              
              <div className="space-y-2">
                <Label>Generate</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="w-full">
                    <Wand2 className="h-4 w-4 mr-2" />
                    Script
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Wand2 className="h-4 w-4 mr-2" />
                    Image Prompt
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Wand2 className="h-4 w-4 mr-2" />
                    Scene Image
                  </Button>
                  <Button variant="outline" className="w-full">
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
                />
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
