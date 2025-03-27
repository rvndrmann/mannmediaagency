
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ScriptInputPanelProps {
  className?: string;
  fullScript?: string;
  scenes?: Array<{ id: string; title: string }>;
  onScriptDivide?: (sceneScripts: Array<{ id: string; content: string }>) => Promise<void>;
  onSaveFullScript?: (script: string) => Promise<void>;
}

export function ScriptInputPanel({ 
  className,
  fullScript = '',
  scenes = [],
  onScriptDivide,
  onSaveFullScript
}: ScriptInputPanelProps) {
  const { toast } = useToast();
  const [script, setScript] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize script from props
  useEffect(() => {
    if (fullScript) {
      setScript(fullScript);
    } else {
      setScript('');
    }
  }, [fullScript]);

  const handleSaveScript = async () => {
    if (!onSaveFullScript) {
      toast({
        title: "Cannot save script",
        description: "Save functionality is not available",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSaveFullScript(script);
      
      toast({
        title: "Script saved",
        description: "Your script has been saved successfully",
      });
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
          disabled={isSaving}
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Script'}
        </Button>
      </CardFooter>
    </Card>
  );
}
