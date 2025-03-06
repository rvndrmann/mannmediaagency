
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { VideoTemplate } from "@/types/custom-order";
import { Button } from "@/components/ui/button";
import { Loader2, Video, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VideoTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: VideoTemplate, imageUrl: string) => void;
  sourceImageUrl: string | null;
  userCredits: number;
}

export function VideoTemplatesDialog({
  open,
  onOpenChange,
  onSelectTemplate,
  sourceImageUrl,
  userCredits
}: VideoTemplatesDialogProps) {
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("video_templates")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTemplates(data || []);
      } catch (error) {
        console.error("Error fetching templates:", error);
        toast.error("Failed to load video templates");
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const handleSelectTemplate = (template: VideoTemplate) => {
    if (!sourceImageUrl) {
      toast.error("Please generate or upload an image first");
      return;
    }

    if (userCredits < template.credits_cost) {
      toast.error(`Insufficient credits. You need ${template.credits_cost} credits for this template.`);
      return;
    }

    setSelectedTemplate(template);
    onSelectTemplate(template, sourceImageUrl);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Video Templates</DialogTitle>
          <DialogDescription>
            Choose a template to create a video from your product image.
            Each template has different settings and costs.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <Tabs defaultValue="all" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Templates</TabsTrigger>
              <TabsTrigger value="portrait">Portrait</TabsTrigger>
              <TabsTrigger value="landscape">Landscape</TabsTrigger>
              <TabsTrigger value="square">Square</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent value="all" className="grid grid-cols-2 gap-4 mt-0">
                {templates.map((template) => (
                  <TemplateCard 
                    key={template.id} 
                    template={template} 
                    onSelect={handleSelectTemplate}
                    userCredits={userCredits}
                  />
                ))}
              </TabsContent>
              
              <TabsContent value="portrait" className="grid grid-cols-2 gap-4 mt-0">
                {templates
                  .filter(t => t.aspect_ratio === "9:16")
                  .map((template) => (
                    <TemplateCard 
                      key={template.id} 
                      template={template} 
                      onSelect={handleSelectTemplate}
                      userCredits={userCredits}
                    />
                  ))}
              </TabsContent>
              
              <TabsContent value="landscape" className="grid grid-cols-2 gap-4 mt-0">
                {templates
                  .filter(t => t.aspect_ratio === "16:9")
                  .map((template) => (
                    <TemplateCard 
                      key={template.id} 
                      template={template} 
                      onSelect={handleSelectTemplate}
                      userCredits={userCredits}
                    />
                  ))}
              </TabsContent>
              
              <TabsContent value="square" className="grid grid-cols-2 gap-4 mt-0">
                {templates
                  .filter(t => t.aspect_ratio === "1:1")
                  .map((template) => (
                    <TemplateCard 
                      key={template.id} 
                      template={template} 
                      onSelect={handleSelectTemplate}
                      userCredits={userCredits}
                    />
                  ))}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TemplateCardProps {
  template: VideoTemplate;
  onSelect: (template: VideoTemplate) => void;
  userCredits: number;
}

function TemplateCard({ template, onSelect, userCredits }: TemplateCardProps) {
  const hasEnoughCredits = userCredits >= template.credits_cost;
  
  return (
    <div className="rounded-lg overflow-hidden border border-gray-700 bg-black/30 flex flex-col">
      <div className="aspect-video relative overflow-hidden">
        <img 
          src={template.thumbnail_url} 
          alt={template.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {template.aspect_ratio}
        </div>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-white">{template.name}</h3>
        <p className="text-xs text-gray-400 mb-2 flex-1">{template.description}</p>
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center text-purple-400 text-sm">
            <CreditCard className="h-4 w-4 mr-1" />
            <span>{template.credits_cost} credits</span>
          </div>
          <Button 
            size="sm" 
            onClick={() => onSelect(template)}
            disabled={!hasEnoughCredits}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Video className="h-4 w-4 mr-1" />
            Use Template
          </Button>
        </div>
      </div>
    </div>
  );
}
