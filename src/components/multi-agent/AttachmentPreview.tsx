
import { Attachment } from "@/types/message";
import { Button } from "@/components/ui/button";
import { X, FileText, FileImage } from "lucide-react";
import { formatFileSize } from "@/lib/utils";

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove?: (id: string) => void;
  isRemovable: boolean;
}

export const AttachmentPreview = ({ 
  attachments, 
  onRemove, 
  isRemovable 
}: AttachmentPreviewProps) => {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <div 
          key={attachment.id} 
          className="relative group flex-shrink-0"
        >
          {attachment.type === "image" ? (
            <div className="relative overflow-hidden rounded-md border border-white/20">
              <img 
                src={attachment.url} 
                alt={attachment.name}
                className="w-32 h-32 object-cover rounded-md" 
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 text-[8px] text-white truncate">
                {attachment.name}
                {attachment.size && (
                  <span className="ml-1 opacity-70">
                    ({formatFileSize(attachment.size)})
                  </span>
                )}
              </div>
              {isRemovable && onRemove && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemove(attachment.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ) : (
            <div className="relative flex flex-col items-center justify-center w-32 h-32 bg-gray-800 rounded-md border border-white/20 overflow-hidden">
              {getFileIcon(attachment)}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 text-[8px] text-white truncate">
                {attachment.name}
                {attachment.size && (
                  <span className="ml-1 opacity-70">
                    ({formatFileSize(attachment.size || 0)})
                  </span>
                )}
              </div>
              {isRemovable && onRemove && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemove(attachment.id)}
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
};

// Helper function to determine appropriate file icon
const getFileIcon = (attachment: Attachment) => {
  const contentType = attachment.contentType || '';
  
  if (contentType.startsWith('image/')) {
    return <FileImage className="h-10 w-10 text-blue-400" />;
  }
  
  if (contentType.includes('pdf')) {
    return (
      <div className="flex flex-col items-center">
        <FileText className="h-10 w-10 text-red-400" />
        <span className="text-xs text-white/70 mt-1">PDF</span>
      </div>
    );
  }
  
  if (contentType.includes('word') || contentType.includes('document')) {
    return (
      <div className="flex flex-col items-center">
        <FileText className="h-10 w-10 text-blue-400" />
        <span className="text-xs text-white/70 mt-1">DOC</span>
      </div>
    );
  }
  
  if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
    return (
      <div className="flex flex-col items-center">
        <FileText className="h-10 w-10 text-green-400" />
        <span className="text-xs text-white/70 mt-1">XLS</span>
      </div>
    );
  }
  
  // Default file icon
  return (
    <div className="flex flex-col items-center">
      <FileText className="h-10 w-10 text-gray-400" />
      <span className="text-xs text-white/70 mt-1">File</span>
    </div>
  );
};
