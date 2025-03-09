import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, X, Upload } from "lucide-react";
import { useUserCredits } from "@/hooks/use-user-credits";

interface CustomOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CustomOrderDialog = ({ 
  open, 
  onOpenChange 
}: CustomOrderDialogProps) => {
  const [remark, setRemark] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userCreditsQuery = useUserCredits();
  const availableCredits = userCreditsQuery.data?.credits_remaining || 0;

  const handleRemarkChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRemark(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      
      setSelectedImages(prev => [...prev, ...newFiles]);
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (selectedImages.length === 0) {
      toast.error("Please select at least one image");
      return;
    }

    if (availableCredits < 20) {
      toast.error("Insufficient credits. Custom orders require at least 20 credits.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: orderData, error: orderError } = await supabase.rpc(
        'create_custom_order',
        { remark_text: remark, credits_amount: 20 }
      );

      if (orderError) {
        console.error("Error creating custom order:", orderError);
        throw new Error(orderError.message || "Failed to create custom order");
      }

      const uploadPromises = selectedImages.map(async (file, index) => {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const filePath = `${orderData.id}/${fileName}`;
          
          const mediaType = file.type.startsWith('image/') ? 'image' : 
                            file.type.startsWith('video/') ? 'video' : 'image';

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('custom-order-media')
            .upload(filePath, file);

          if (uploadError) {
            console.error(`Error uploading media file ${index + 1}:`, uploadError);
            throw new Error(uploadError.message || `Failed to upload media file ${index + 1}`);
          }

          const { data: publicUrlData } = supabase.storage
            .from('custom-order-media')
            .getPublicUrl(filePath);

          const { error: mediaInsertError } = await supabase.rpc(
            'add_custom_order_media',
            { 
              order_id_param: orderData.id, 
              media_url_param: publicUrlData.publicUrl,
              media_type_param: mediaType,
              original_filename_param: file.name
            }
          );

          if (mediaInsertError) {
            console.error(`Error adding media ${index + 1} to order:`, mediaInsertError);
            throw new Error(mediaInsertError.message || `Failed to add media ${index + 1} to order`);
          }
          
          return true;
        } catch (fileError: any) {
          console.error(`Error processing file ${index + 1}:`, fileError);
          throw new Error(fileError.message || `Error processing file ${index + 1}`);
        }
      });

      await Promise.all(uploadPromises);

      userCreditsQuery.refetch();
      
      toast.success("Custom order submitted successfully!");
      
      setRemark("");
      setSelectedImages([]);
      setImagePreviews([]);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Custom order error details:", error);
      
      if (error.message && error.message.includes("policy")) {
        toast.error("Permission error: You don't have the required permissions to complete this action.");
      } else if (error.message && error.message.includes("storage")) {
        toast.error("Storage error: There was a problem uploading your files. Please try again.");
      } else {
        toast.error(error.message || "Failed to submit custom order. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Custom Order Request</DialogTitle>
          <DialogDescription>
            Upload your product images and provide details for a custom order.
            This will use 20 credits from your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Upload Images
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClickUpload}
              className="w-full h-20 border-dashed flex flex-col gap-2"
            >
              <Upload className="h-5 w-5" />
              <span>Click to select images or videos</span>
            </Button>
          </div>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index}`}
                    className="w-full h-24 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-black/50 rounded-full p-1
                              opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Special Requirements or Details
            </label>
            <Textarea
              placeholder="Describe what you'd like us to do with these images..."
              value={remark}
              onChange={handleRemarkChange}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex justify-between items-center">
              <span>Available credits:</span>
              <span className="font-medium">{availableCredits}</span>
            </div>
            <div className="flex justify-between items-center text-purple-400">
              <span>Order cost:</span>
              <span className="font-medium">20 credits</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || selectedImages.length === 0 || availableCredits < 20}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Order'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
