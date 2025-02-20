
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface ExploreImageData {
  id: string;
  prompt: string;
  result_url: string | null;
  settings?: {
    guidanceScale: number;
    numInferenceSteps: number;
  };
}

interface ImageGridProps {
  items: ExploreImageData[];
  onCopyPrompt: (id: string, prompt: string) => void;
  onCopyValue: (id: string, value: number, field: string) => void;
  onDownload: (url: string, filename: string) => void;
  copiedField: string | null;
  copiedPrompts: Record<string, boolean>;
  isMobile: boolean;
}

export const ImageGrid = ({ 
  items,
  onCopyPrompt,
  onCopyValue,
  onDownload,
  copiedField,
  copiedPrompts,
  isMobile
}: ImageGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
      {items.map((image) => (
        <Card key={image.id} className="overflow-hidden bg-gray-900 border-gray-800">
          <div className="relative aspect-square">
            {image.result_url && (
              <>
                <img
                  src={image.result_url}
                  alt={image.prompt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDownload(image.result_url!, `image-${image.id}.png`)}
                    className="text-white hover:text-purple-400"
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                </div>
              </>
            )}
          </div>
          <div className="p-3 md:p-4">
            {image.settings && !isMobile && (
              <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <span>Guidance: {image.settings.guidanceScale}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onCopyValue(image.id, image.settings!.guidanceScale, 'guidance')}
                          className="h-6 w-6"
                        >
                          {copiedField === `${image.id}-guidance` ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {image.settings.guidanceScale !== 3.5 && (
                      <TooltipContent>
                        <p>Default guidance scale is 3.5, don't forget to adjust for this image</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <span>Steps: {image.settings.numInferenceSteps}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onCopyValue(image.id, image.settings!.numInferenceSteps, 'steps')}
                          className="h-6 w-6"
                        >
                          {copiedField === `${image.id}-steps` ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {image.settings.numInferenceSteps !== 8 && (
                      <TooltipContent>
                        <p>Default steps value is 8, don't forget to adjust for this image</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-300 flex-1 line-clamp-2">{image.prompt}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCopyPrompt(image.id, image.prompt)}
                className="shrink-0"
              >
                {copiedPrompts[image.id] ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ImageGrid;
