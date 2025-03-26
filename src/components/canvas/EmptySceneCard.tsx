
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EmptySceneCardProps {
  title: string;
  type: "image" | "video";
  onGenerate: () => void;
  onUpload: (url: string) => Promise<void>;
}

export function EmptySceneCard({
  title,
  type,
  onGenerate,
  onUpload,
}: EmptySceneCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false);
      onGenerate();
      toast.info(`${title} generation requested`);
    }, 1500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    // Validate file type based on card type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    
    const validTypes = type === 'image' ? validImageTypes : validVideoTypes;
    
    if (!validTypes.includes(file.type)) {
      toast.error(`Invalid file type. Please upload a ${type} file.`);
      return;
    }
    
    setIsUploading(true);
    
    // Normally we would upload the file to storage here
    // For now, let's simulate it with a setTimeout
    setTimeout(async () => {
      try {
        // Just create a fake URL for now - in a real app you'd get this from your storage service
        const fakeUrl = `https://example.com/${type}/${file.name}`;
        await onUpload(fakeUrl);
        toast.success(`${title} uploaded successfully`);
      } catch (error) {
        toast.error(`Failed to upload ${title.toLowerCase()}`);
        console.error(error);
      } finally {
        setIsUploading(false);
      }
    }, 1500);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-md flex flex-col items-center justify-center p-6">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              {`No ${title.toLowerCase()} added yet. Generate one with AI or upload your own.`}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating || isUploading}
                className="w-full sm:w-auto"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate with AI
                  </>
                )}
              </Button>
              
              <div className="relative w-full sm:w-auto">
                <Input
                  type="file"
                  accept={type === 'image' ? 'image/*' : 'video/*'}
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={isGenerating || isUploading}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isGenerating || isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
