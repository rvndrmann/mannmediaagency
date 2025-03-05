
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Upload, X, ArrowLeft } from "lucide-react";

interface OrderLinkData {
  id: string;
  title: string;
  description: string | null;
  custom_rate: number;
  credits_amount: number;
  require_phone: boolean;
  is_active: boolean;
}

const CustomOrderForm = () => {
  const { accessCode } = useParams<{ accessCode: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkData, setLinkData] = useState<OrderLinkData | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    remark: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setIsAuthenticated(true);
        setUserId(data.session.user.id);
      }
    };

    checkAuth();
    if (accessCode) {
      fetchOrderLink();
    } else {
      setIsLoading(false);
      toast.error("Invalid order link");
      navigate("/");
    }
  }, [accessCode]);

  const fetchOrderLink = async () => {
    try {
      setIsLoading(true);
      
      // Use direct query instead of RPC
      const { data, error } = await supabase
        .from("custom_order_links")
        .select("*")
        .eq("access_code", accessCode)
        .eq("is_active", true)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("The link is invalid or has expired");
      }

      setLinkData(data as OrderLinkData);
    } catch (error: any) {
      toast.error(error.message || "Failed to load order form");
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Create previews for the new images
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      
      setSelectedImages(prev => [...prev, ...newFiles]);
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const removeImage = (index: number) => {
    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(imagePreviews[index]);
    
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      if (!linkData) return;

      // Validate form data
      if (linkData.require_phone && !formData.phone) {
        toast.error("Phone number is required");
        return;
      }

      if (!formData.name || !formData.email) {
        toast.error("Name and email are required");
        return;
      }

      if (selectedImages.length === 0) {
        toast.error("Please select at least one image");
        return;
      }

      setIsSubmitting(true);

      let orderId: string;

      if (isAuthenticated && userId) {
        // Authenticated user flow - Use direct query
        const { data: orderData, error: orderError } = await supabase
          .from("custom_orders")
          .insert({
            user_id: userId,
            remark: formData.remark,
            credits_used: linkData.credits_amount,
            order_link_id: linkData.id
          })
          .select()
          .single();

        if (orderError) {
          throw new Error(orderError.message);
        }

        orderId = orderData.id;
      } else {
        // Guest user flow - Create guest record first
        const { data: guestData, error: guestError } = await supabase
          .from("custom_order_guests")
          .insert({
            name: formData.name,
            email: formData.email,
            phone_number: formData.phone
          })
          .select()
          .single();
        
        if (guestError) {
          throw new Error(guestError.message);
        }
        
        // Now create the order with guest reference
        const { data: orderData, error: orderError } = await supabase
          .from("custom_orders")
          .insert({
            guest_id: guestData.id,
            remark: formData.remark,
            credits_used: linkData.credits_amount,
            order_link_id: linkData.id,
            status: linkData.custom_rate > 0 ? 'payment_pending' : 'pending',
            // For guest orders, we use a static user_id that represents the system
            user_id: userId || "00000000-0000-0000-0000-000000000000"
          })
          .select()
          .single();

        if (orderError) {
          throw new Error(orderError.message);
        }

        orderId = orderData.id;
      }

      // Upload media files for the order
      const uploadPromises = selectedImages.map(async (file, index) => {
        try {
          // Generate a unique file name
          const fileExt = file.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const filePath = `${orderId}/${fileName}`;
          
          // Determine if this is an image or video file
          const mediaType = file.type.startsWith('image/') ? 'image' : 
                            file.type.startsWith('video/') ? 'video' : 'image';

          // Upload the file to storage
          const { error: uploadError } = await supabase.storage
            .from('custom-order-media')
            .upload(filePath, file);

          if (uploadError) {
            throw new Error(uploadError.message);
          }

          // Get the public URL
          const { data: publicUrlData } = supabase.storage
            .from('custom-order-media')
            .getPublicUrl(filePath);

          // Insert media record
          const { error: mediaInsertError } = await supabase
            .from("custom_order_media")
            .insert({
              order_id: orderId,
              media_url: publicUrlData.publicUrl,
              media_type: mediaType,
              original_filename: file.name
            });

          if (mediaInsertError) {
            throw new Error(mediaInsertError.message);
          }
          
          return true;
        } catch (fileError: any) {
          console.error(`Error processing file ${index + 1}:`, fileError);
          throw new Error(fileError.message);
        }
      });

      await Promise.all(uploadPromises);

      // Initialize payment if there's a custom rate
      if (linkData.custom_rate > 0) {
        // Redirect to payment page with order details
        navigate("/payment", {
          state: {
            planName: `${linkData.title} Order`,
            amount: linkData.custom_rate,
            orderId: orderId
          }
        });
      } else {
        // If no payment required, show success message
        toast.success("Order submitted successfully!");
        navigate("/");
      }
    } catch (error: any) {
      console.error("Order submission error:", error);
      toast.error(error.message || "Failed to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!linkData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This order link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/")} className="w-full">
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="mr-4 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span>Home</span>
            </Button>
          </div>
          <CardTitle>{linkData.title}</CardTitle>
          {linkData.description && (
            <CardDescription>{linkData.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {!isAuthenticated && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                />
              </div>

              {linkData.require_phone && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                  />
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="images">Upload Images/Videos</Label>
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

          <div className="space-y-2">
            <Label htmlFor="remark">Special Requirements</Label>
            <Textarea
              id="remark"
              name="remark"
              value={formData.remark}
              onChange={handleInputChange}
              placeholder="Describe what you'd like us to do with these images..."
              rows={4}
            />
          </div>

          {linkData.custom_rate > 0 && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="flex justify-between items-center text-purple-500 font-medium">
                <span>Order cost:</span>
                <span>₹{linkData.custom_rate}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                You will be redirected to the payment page after submission.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full"
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
        </CardFooter>
      </Card>
    </div>
  );
};

export default CustomOrderForm;
