
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useCanvasStore } from '@/hooks/use-canvas';

interface ScriptInputPanelProps {
  className?: string;
}

export function ScriptInputPanel({ className }: ScriptInputPanelProps) {
  const { toast } = useToast();
  const { currentProject, updateProject } = useCanvasStore();
  const [script, setScript] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize script from current project
  useEffect(() => {
    if (currentProject && currentProject.full_script) {
      setScript(currentProject.full_script);
    } else {
      setScript('');
    }
  }, [currentProject]);

  const handleSaveScript = async () => {
    if (!currentProject) {
      toast({
        title: "No active project",
        description: "Please create or select a project first",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Only update if the script has changed
      if (script !== currentProject.full_script) {
        await updateProject({
          ...currentProject,
          full_script: script
        });
        
        toast({
          title: "Script saved",
          description: "Your script has been saved successfully",
        });
      }
    } catch (error) {
      console.error("Error saving script:", error);
      toast({
        title: "Failed to save",
        description: "There was an error saving your script",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Script Editor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Write your script here..."
          className="min-h-[300px] font-mono text-sm"
        />
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          onClick={handleSaveScript} 
          disabled={isSaving || !currentProject}
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Script'}
        </Button>
      </CardFooter>
    </Card>
  );
}
