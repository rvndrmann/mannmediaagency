
import { useState } from "react";
import { X, ExternalLink, Download, File, FileText, Image as ImageIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Attachment } from "@/types/message";
import { cn } from "@/lib/utils";

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove?: (id: string) => void;
  isRemovable?: boolean;
}

export function AttachmentPreview({ attachments, onRemove, isRemovable = true }: AttachmentPreviewProps) {
  if (!attachments || attachments.length === 0) return null;
  
  return (
    <div className="space-y-2 mt-2">
      {attachments.map(attachment => (
        <AttachmentItem 
          key={attachment.id} 
          attachment={attachment} 
          onRemove={onRemove} 
          isRemovable={isRemovable} 
        />
      ))}
    </div>
  );
}

interface AttachmentItemProps {
  attachment: Attachment;
  onRemove?: (id: string) => void;
  isRemovable: boolean;
}

function AttachmentItem({ attachment, onRemove, isRemovable }: AttachmentItemProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const isImage = attachment.type === 'image';
  
  const getFileIcon = () => {
    if (isImage) return <ImageIcon className="h-4 w-4" />;
    
    const contentType = attachment.contentType || '';
    
    if (contentType.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };
  
  const handleDownload = () => {
    window.open(attachment.url, '_blank');
  };
  
  const handleImageLoad = () => {
    setImageLoaded(true);
  };
  
  const handleImageError = () => {
    setImageError(true);
  };
  
  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border border-white/10",
        isImage ? "bg-white/5" : "bg-white/5"
      )}
    >
      {isImage && !imageError ? (
        <div className="relative flex-shrink-0 overflow-hidden rounded-md w-16 h-16 bg-black/20">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-white/40 animate-pulse" />
            </div>
          )}
          <img 
            src={attachment.url} 
            alt={attachment.name}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={cn(
              "object-cover w-full h-full transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        </div>
      ) : (
        <div className="flex-shrink-0 rounded-md w-10 h-10 flex items-center justify-center bg-white/10">
          {imageError ? (
            <AlertCircle className="h-5 w-5 text-red-400" />
          ) : (
            getFileIcon()
          )}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium text-white/90">
          {attachment.name}
        </div>
        <div className="text-xs text-white/60 mt-1">
          {imageError ? (
            <span className="text-red-400">Failed to load image</span>
          ) : (
            <>
              {isImage ? "Image" : "File"} • {formatFileSize(attachment.size || 0)}
            </>
          )}
        </div>
      </div>
      
      <div className="flex gap-1 items-start">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10" 
          onClick={handleDownload}
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        
        {isRemovable && onRemove && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-900/20" 
            onClick={() => onRemove(attachment.id)}
            title="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
