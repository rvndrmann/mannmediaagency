
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Save, Wand2, Copy, Check, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CanvasProject } from "@/types/canvas";

interface CanvasScriptPanelProps {
  project: CanvasProject;
  scenes: any[];
  onProjectUpdate: (projectId: string, updates: Partial<CanvasProject>) => void;
}

export function CanvasScriptPanel({ project, scenes, onProjectUpdate }: CanvasScriptPanelProps) {
  const [fullScript, setFullScript] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFullScript(project.full_script || "");
  }, [project.full_script]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('canvas_projects')
        .update({ full_script: fullScript })
        .eq('id', project.id);

      if (error) throw error;

      onProjectUpdate(project.id, { full_script: fullScript });
      toast.success("Script saved successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving script:", error);
      toast.error("Failed to save script");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Compile all scene scripts
      const sceneScripts = scenes?.map((scene, index) => 
        `Scene ${index + 1}: ${scene.title || `Scene ${index + 1}`}\n${scene.script || 'No script available'}`
      ).join('\n\n') || '';

      const { data, error } = await supabase.functions.invoke('generate-full-script', {
        body: {
          projectId: project.id,
          projectTitle: project.title,
          projectDescription: project.description,
          sceneScripts
        }
      });

      if (error) throw error;

      const generatedScript = data?.script || sceneScripts;
      setFullScript(generatedScript);
      
      // Auto-save the generated script
      const { error: saveError } = await supabase
        .from('canvas_projects')
        .update({ full_script: generatedScript })
        .eq('id', project.id);

      if (saveError) throw saveError;

      onProjectUpdate(project.id, { full_script: generatedScript });
      toast.success("Full script generated successfully");
    } catch (error) {
      console.error("Error generating script:", error);
      toast.error("Failed to generate script");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullScript);
      setCopied(true);
      toast.success("Script copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const downloadScript = () => {
    const blob = new Blob([fullScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title || 'script'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sceneCount = scenes?.length || 0;
  const completedScenes = scenes?.filter(scene => scene.script && scene.script.trim() !== '').length || 0;

  return (
    <div className="h-full p-6">
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Full Project Script</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {completedScenes}/{sceneCount} scenes
              </Badge>
              {!isEditing && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    disabled={!fullScript}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadScript}
                    disabled={!fullScript}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={isGenerating || sceneCount === 0}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    {isGenerating ? "Generating..." : "Generate"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-full pb-6">
          {isEditing ? (
            <div className="space-y-4 h-full">
              <Textarea
                value={fullScript}
                onChange={(e) => setFullScript(e.target.value)}
                placeholder="Enter your full project script here..."
                className="min-h-[400px] h-full resize-none"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || fullScript === project.full_script}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setFullScript(project.full_script || "");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full">
              {fullScript ? (
                <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg h-full overflow-y-auto">
                  {fullScript}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Full Script Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Generate a complete script from your scenes or write one manually.
                    </p>
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || sceneCount === 0}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      {isGenerating ? "Generating..." : "Generate Full Script"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
