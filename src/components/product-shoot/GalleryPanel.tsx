
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GeneratedImage {
  id: string;
  prompt: string;
  result_url: string;
}

interface GalleryPanelProps {
  isMobile: boolean;
  images: GeneratedImage[] | null;
  isLoading: boolean;
  onDownload: (url: string) => void;
}

export function GalleryPanel({
  isMobile,
  images,
  isLoading,
  onDownload,
}: GalleryPanelProps) {
  return (
    <div className={cn(
      "p-6",
      isMobile ? "w-full" : "flex-1"
    )}>
      <ScrollArea className={cn(
        isMobile ? "max-h-[calc(100vh-24rem)]" : "h-[calc(100vh-3rem)]"
      )}>
        <div className="grid grid-cols-1 gap-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : images?.length === 0 ? (
            <Card className="p-6 text-center bg-gray-900 border-gray-700">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">No images generated yet</p>
            </Card>
          ) : (
            images?.map((image) => (
              <Card 
                key={image.id}
                className="p-4 bg-gray-900 border-gray-700 animate-fade-in"
              >
                <div className="space-y-4">
                  <img
                    src={image.result_url}
                    alt={image.prompt}
                    className="w-full h-auto rounded-lg"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {image.prompt}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDownload(image.result_url)}
                      className="text-gray-400 hover:text-white hover:bg-gray-800"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
