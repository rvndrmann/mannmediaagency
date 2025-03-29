
import { Attachment } from "@/types/message";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove?: (id: string) => void;
}

export function AttachmentPreview({ attachments, onRemove }: AttachmentPreviewProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="relative border rounded-lg overflow-hidden bg-muted"
        >
          {attachment.type.startsWith("image/") ? (
            <div className="relative w-20 h-20">
              <img
                src={attachment.url}
                alt={attachment.name}
                className="object-cover w-full h-full"
              />
              {onRemove && (
                <button
                  onClick={() => onRemove(attachment.id)}
                  className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 hover:bg-black/70"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              )}
            </div>
          ) : (
            <div className="p-2 flex items-center gap-2">
              <div className="text-xs truncate max-w-[100px]">
                {attachment.name}
              </div>
              {onRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(attachment.id)}
                  className="p-0 h-auto"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
