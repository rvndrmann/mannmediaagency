
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
      "bg-background w-full",
      isMobile ? "flex-1 min-h-0" : "flex-1"
    )}>
      <ScrollArea className={cn(
        "w-full",
        isMobile ? "h-[calc(100vh-16rem)]" : "h-[calc(100vh-3rem)]"
      )}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2">
          {isLoading ? (
            <div className="col-span-2 md:col-span-4 flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : !images || images.length === 0 ? (
            <Card className="col-span-2 md:col-span-4 p-4 text-center bg-gray-900 border-gray-700">
              <ImageIcon className="h-8 w-8 mx-auto text-gray-600 mb-2" />
              <p className="text-gray-400">No images generated yet</p>
            </Card>
          ) : (
            images.map((image) => (
              <Card 
                key={image.id}
                className="p-2 bg-gray-900 border-gray-700 animate-fade-in w-full"
              >
                <div className="space-y-2">
                  {image.status === 'processing' ? (
                    <div className="flex flex-col items-center justify-center h-32 bg-gray-800 rounded-lg">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600 mb-2" />
                      <p className="text-xs text-gray-400">Processing...</p>
                    </div>
                  ) : image.status === 'failed' ? (
                    <div className="flex flex-col items-center justify-center h-32 bg-gray-800 rounded-lg">
                      <ImageIcon className="h-6 w-6 text-red-500 mb-2" />
                      <p className="text-xs text-red-400">Failed</p>
                    </div>
                  ) : image.result_url ? (
                    <div className="relative group aspect-square">
                      <img
                        src={image.result_url}
                        alt={image.prompt}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDownload(image.result_url!)}
                          className="text-white hover:text-purple-400"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 bg-gray-800 rounded-lg">
                      <ImageIcon className="h-6 w-6 text-gray-600 mb-2" />
                      <p className="text-xs text-gray-400">Not available</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 line-clamp-1 px-1">
                    {image.prompt}
                  </p>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
