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
    <div className="h-full bg-[#1A1F2C]">
      <ScrollArea className="h-full">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {isLoading ? (
            <div className="col-span-2 lg:col-span-3 flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : !images || images.length === 0 ? (
            <Card className="col-span-2 lg:col-span-3 p-8 text-center bg-[#2A2A2A] border-[#3A3A3A]">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">No images generated yet</p>
              <p className="text-gray-500 mt-2">Upload an image and add a prompt to get started</p>
            </Card>
          ) : (
            images.map((image) => (
              <Card 
                key={image.id}
                className="overflow-hidden bg-[#2A2A2A] border-[#3A3A3A] animate-fade-in"
              >
                <div className="space-y-2 p-2">
                  {image.status === 'processing' ? (
                    <div className="flex flex-col items-center justify-center h-40 bg-[#222222] rounded-lg">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-2" />
                      <p className="text-sm text-gray-400">Processing...</p>
                    </div>
                  ) : image.status === 'failed' ? (
                    <div className="flex flex-col items-center justify-center h-40 bg-[#222222] rounded-lg">
                      <ImageIcon className="h-8 w-8 text-red-500 mb-2" />
                      <p className="text-sm text-red-400">Generation failed</p>
                    </div>
                  ) : image.result_url ? (
                    <div className="relative group">
                      <img
                        src={image.result_url}
                        alt={image.prompt}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDownload(image.result_url!)}
                          className="text-white hover:text-purple-400 hover:bg-white/10"
                        >
                          <Download className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 bg-[#222222] rounded-lg">
                      <ImageIcon className="h-8 w-8 text-gray-600 mb-2" />
                      <p className="text-sm text-gray-400">Image not available</p>
                    </div>
                  )}
                  <p className="text-sm text-gray-400 line-clamp-2 px-1">
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
