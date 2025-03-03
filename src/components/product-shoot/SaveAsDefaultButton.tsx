
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDefaultImages } from "@/hooks/use-default-images";

interface SaveAsDefaultButtonProps {
  imageUrl: string;
  onSaved?: () => void;
}

export function SaveAsDefaultButton({ imageUrl, onSaved }: SaveAsDefaultButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { uploadAndSaveDefaultImage, saveDefaultImage, isUploading } = useDefaultImages();

  const handleSave = async () => {
    if (!name.trim()) return;
    
    try {
      // If the URL is already a remote URL (not a blob/file), save it directly
      if (imageUrl.startsWith('http')) {
        await saveDefaultImage.mutateAsync({
          url: imageUrl,
          name: name.trim(),
          context: "product"
        });
      } else {
        // This handles File objects or Blob URLs that need to be uploaded
        // This implementation would need to be modified if you're working with a different format
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], "default-image.jpg", { type: blob.type });
        await uploadAndSaveDefaultImage(file, name.trim());
      }
      
      setOpen(false);
      setName("");
      if (onSaved) onSaved();
    } catch (error) {
      console.error("Error saving as default:", error);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="bg-black/50 hover:bg-black/70 backdrop-blur-sm text-yellow-400 hover:text-yellow-300"
        onClick={() => setOpen(true)}
      >
        <Star className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save as Default Image</DialogTitle>
            <DialogDescription>
              Give this image a name to save it as a default for future use.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Image Name</Label>
              <Input
                id="name"
                placeholder="e.g., White Sneakers Front View"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
              <img 
                src={imageUrl} 
                alt="Preview" 
                className="w-full h-full object-contain" 
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!name.trim() || isUploading}
            >
              {isUploading ? "Saving..." : "Save as Default"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
