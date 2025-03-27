
import { useState } from "react";
import { CanvasScene } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, Save, Edit, Play, Image, Video, Wand2 } from "lucide-react";
import { toast } from "sonner";

interface SceneTableProps {
  scenes: CanvasScene[];
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string) => void;
  updateScene: (sceneId: string, type: 'script' | 'imagePrompt' | 'image' | 'video', value: string) => Promise<void>;
}

export function SceneTable({
  scenes,
  selectedSceneId,
  setSelectedSceneId,
  updateScene
}: SceneTableProps) {
  const [editingField, setEditingField] = useState<{sceneId: string, field: 'script' | 'imagePrompt'} | null>(null);
  const [editedContent, setEditedContent] = useState("");
  
  const handleStartEditing = (sceneId: string, field: 'script' | 'imagePrompt', content: string = "") => {
    setEditingField({ sceneId, field });
    setEditedContent(content);
  };
  
  const handleSave = async () => {
    if (!editingField) return;
    
    await updateScene(editingField.sceneId, editingField.field, editedContent);
    setEditingField(null);
  };
  
  const handleCancel = () => {
    setEditingField(null);
  };
  
  const handleGenerateWithAI = (sceneId: string, field: 'script' | 'imagePrompt' | 'image' | 'video') => {
    toast.info(`Generating ${field} with AI...`);
    // This would be implemented with actual AI generation
  };
  
  const renderField = (scene: CanvasScene, field: 'script' | 'imagePrompt') => {
    const content = field === 'script' ? scene.script : scene.imagePrompt;
    
    if (editingField && editingField.sceneId === scene.id && editingField.field === field) {
      return (
        <div className="flex flex-col space-y-2">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[100px] text-sm"
            placeholder={`Enter ${field === 'script' ? 'script' : 'image prompt'}...`}
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
  
  const renderMedia = (scene: CanvasScene, type: 'image' | 'video') => {
    const url = type === 'image' ? scene.imageUrl : scene.videoUrl;
    
    if (!url) {
      return (
        <div className="flex flex-col items-center justify-center h-[100px] bg-slate-100 dark:bg-slate-800 rounded">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={() => handleGenerateWithAI(scene.id, type)}
          >
            <Wand2 className="h-4 w-4 mr-1" />
            Generate {type === 'image' ? 'Image' : 'Video'}
          </Button>
        </div>
      );
    }
    
    if (type === 'image') {
      return (
        <div className="relative group">
          <img src={url} alt={`Scene ${scene.title}`} className="h-[100px] object-cover rounded" />
          <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/30 rounded">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white">
              <Image className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="relative group">
        <video src={url} className="h-[100px] object-cover rounded" />
        <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/30 rounded">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white">
            <Play className="h-4 w-4" />
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
            <TableHead className="w-[180px]">Scene</TableHead>
            <TableHead className="w-[30%]">Script</TableHead>
            <TableHead className="w-[30%]">Image Prompt</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Video</TableHead>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
