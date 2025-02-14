
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GeneratedImage {
  id: string;
  prompt: string;
  result_url: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
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
      "bg-background",
      isMobile ? "flex-1 min-h-0" : "flex-1"
    )}>
      <ScrollArea className={cn(
        "h-full",
        isMobile ? "max-h-[calc(100vh-16rem)]" : "h-[calc(100vh-3rem)]"
      )}>
        <div className="grid grid-cols-1 gap-4 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : !images || images.length === 0 ? (
            <Card className="p-6 text-center bg-gray-900 border-gray-700">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">No images generated yet</p>
            </Card>
          ) : (
            images.map((image) => (
              <Card 
                key={image.id}
                className="p-3 bg-gray-900 border-gray-700 animate-fade-in"
              >
                <div className="space-y-3">
                  {image.status === 'processing' ? (
                    <div className="flex flex-col items-center justify-center h-40 bg-gray-800 rounded-lg">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-2" />
                      <p className="text-sm text-gray-400">Processing image...</p>
                    </div>
                  ) : image.status === 'failed' ? (
                    <div className="flex flex-col items-center justify-center h-40 bg-gray-800 rounded-lg">
                      <ImageIcon className="h-8 w-8 text-red-500 mb-2" />
                      <p className="text-sm text-red-400">Failed to generate image</p>
                    </div>
                  ) : image.result_url ? (
                    <img
                      src={image.result_url}
                      alt={image.prompt}
                      className="w-full h-auto rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 bg-gray-800 rounded-lg">
                      <ImageIcon className="h-8 w-8 text-gray-600 mb-2" />
                      <p className="text-sm text-gray-400">Image not available</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {image.prompt}
                    </p>
                    {image.result_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDownload(image.result_url!)}
                        className="text-gray-400 hover:text-white hover:bg-gray-800 ml-2 flex-shrink-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
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
