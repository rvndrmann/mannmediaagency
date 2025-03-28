
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  const [isOpen, setIsOpen] = useState(false);

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
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            Script Editor
          </CardTitle>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <span className="sr-only">{isOpen ? "Close" : "Open"} script editor</span>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent>
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Write your script here..."
              className="min-h-[150px] max-h-[300px] font-mono text-sm"
            />
          </CardContent>
          <CardFooter className="flex justify-end pt-0">
            <Button 
              onClick={handleSaveScript} 
              disabled={isSaving}
              size="sm"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Script'}
            </Button>
          </CardFooter>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
