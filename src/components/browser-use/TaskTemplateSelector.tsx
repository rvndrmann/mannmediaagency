
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Save, Trash2, Copy, FileText, LayoutGrid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BrowserConfig } from "@/hooks/browser-use/types";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  task_input: string;
  browser_config: BrowserConfig | null;
  created_at: string;
}

interface TaskTemplateSelectorProps {
  onSelectTemplate: (template: TaskTemplate) => void;
  currentTaskInput: string;
  currentBrowserConfig: BrowserConfig;
  displayMode?: "standard" | "compact" | "grid";
}

export function TaskTemplateSelector({
  onSelectTemplate,
  currentTaskInput,
  currentBrowserConfig,
  displayMode = "standard"
}: TaskTemplateSelectorProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showTemplatesGrid, setShowTemplatesGrid] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('browser_task_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Convert the JSON data to match our TaskTemplate interface
      const formattedTemplates = data?.map(template => ({
        ...template,
        browser_config: template.browser_config as unknown as BrowserConfig | null
      })) || [];
      
      setTemplates(formattedTemplates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load task templates");
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!newTemplate.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    try {
      setIsLoading(true);
      
      // Get user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to save templates");
        return;
      }
      
      const { data, error } = await supabase
        .from('browser_task_templates')
        .insert({
          name: newTemplate.name,
          description: newTemplate.description || null,
          task_input: currentTaskInput,
          browser_config: currentBrowserConfig as any,
          user_id: session.user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Convert the returned data to match our TaskTemplate interface
      const formattedTemplate = {
        ...data,
        browser_config: data.browser_config as unknown as BrowserConfig | null
      };
      
      toast.success("Template saved successfully");
      setTemplates([formattedTemplate, ...templates]);
      setShowSaveDialog(false);
      setNewTemplate({ name: '', description: '' });
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card click from firing
    
    if (!confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('browser_task_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setTemplates(templates.filter(t => t.id !== id));
      toast.success("Template deleted");
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleTemplateSelection = (template: TaskTemplate) => {
    // Fix: Pass the entire template object to the onSelectTemplate callback
    onSelectTemplate(template);
    setShowTemplatesGrid(false);
    
    // Add a toast notification to improve user feedback
    toast.success(`Template "${template.name}" loaded`);
  };

  // Render a grid of templates directly in the component
  const renderTemplateGrid = () => {
    if (templates.length === 0) {
      return (
        <div className="text-center py-6 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No templates saved yet</p>
          <p className="text-sm">Save your current task configuration as a template for future use</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
        {templates.map((template) => (
          <Card 
            key={template.id} 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleTemplateSelection(template)}
          >
            <CardContent className="p-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{template.name}</h4>
                  {template.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{template.task_input}</p>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 rounded-full"
                    onClick={(e) => deleteTemplate(template.id, e)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // For compact mode (used in Create Task tab)
  if (displayMode === "compact") {
    return (
      <div className="space-y-2">
        {templates.length === 0 ? (
          <div className="flex gap-4 items-center justify-center py-3 text-gray-500 border border-dashed rounded-lg">
            <FileText className="h-8 w-8 opacity-30" />
            <div>
              <p>No templates saved yet</p>
              <Button 
                variant="link" 
                className="h-auto p-0 text-primary"
                onClick={() => setShowSaveDialog(true)}
              >
                Create your first template
              </Button>
            </div>
          </div>
        ) : (
          <>
            {renderTemplateGrid()}
            <div className="flex justify-end mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center gap-1"
              >
                <Save className="h-4 w-4" />
                Save Current as Template
              </Button>
            </div>
          </>
        )}

        {/* Save Template Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save as Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input 
                  id="template-name"
                  placeholder="Enter a name for this template"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">Description (Optional)</Label>
                <Textarea 
                  id="template-description"
                  placeholder="Add a description to help you remember what this template does"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
              <Button onClick={saveTemplate} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Standard mode with browse button (used elsewhere)
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Task Templates</h3>
          {templates.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTemplatesGrid(true)}
              className="flex items-center gap-1"
            >
              <LayoutGrid className="h-4 w-4" />
              Browse Templates
            </Button>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowSaveDialog(true)}
          className="flex items-center gap-1"
          disabled={!currentTaskInput.trim()}
        >
          <Save className="h-4 w-4" />
          Save as Template
        </Button>
      </div>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplatesGrid} onOpenChange={setShowTemplatesGrid}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select a Template</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4 mt-4">
            {templates.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No templates saved yet</p>
                <p className="text-sm">Save your current task configuration as a template for future use</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleTemplateSelection(template)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          {template.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-2 line-clamp-2">{template.task_input}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 rounded-full"
                            onClick={(e) => deleteTemplate(template.id, e)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplatesGrid(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input 
                id="template-name"
                placeholder="Enter a name for this template"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Textarea 
                id="template-description"
                placeholder="Add a description to help you remember what this template does"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={saveTemplate} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
