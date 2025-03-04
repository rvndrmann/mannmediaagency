
import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, Plus, Check, Lock, AlertTriangle } from "lucide-react";
import { PhoneInput } from "@/components/auth/phone/PhoneInput";
import { VerificationInput } from "@/components/auth/phone/VerificationInput";
import { phoneAuthService } from "@/services/phoneAuth";

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'checkbox' | 'select';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface FormData {
  id: string;
  title: string;
  description: string | null;
  fields: FormField[];
  is_active: boolean;
  access_code: string | null;
  require_phone: boolean;
}

const FormSubmission = () => {
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [accessCode, setAccessCode] = useState(searchParams.get('code') || "");
  const [accessRequired, setAccessRequired] = useState(false);
  const [accessVerified, setAccessVerified] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [phoneVerificationStep, setPhoneVerificationStep] = useState<'phone' | 'code' | 'verified'>('phone');
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [phoneRequired, setPhoneRequired] = useState(false);

  useEffect(() => {
    if (!formId) return;
    
    fetchFormData();
  }, [formId]);

  const fetchFormData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("custom_order_forms")
        .select("*")
        .eq("id", formId)
        .single();

      if (error) throw error;
      
      if (!data) {
        throw new Error("Form not found");
      }

      if (!data.is_active) {
        throw new Error("This form is no longer active");
      }

      setFormData(data as FormData);
      setPhoneRequired(data.require_phone);
      
      // Initialize form values
      const initialValues: Record<string, any> = {};
      (data.fields as FormField[]).forEach(field => {
        initialValues[field.id] = field.type === 'checkbox' ? false : '';
      });
      setFormValues(initialValues);
      
      // Check if access code is required
      if (data.access_code) {
        setAccessRequired(true);
        
        // Check if code from URL matches
        if (searchParams.get('code') === data.access_code) {
          setAccessVerified(true);
        }
      } else {
        setAccessVerified(true);
      }
    } catch (error: any) {
      console.error("Error fetching form:", error);
      toast.error(error.message || "Failed to load form");
      // Navigate back on error
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const validateForm = () => {
    if (!formData) return false;
    
    for (const field of formData.fields) {
      if (field.required) {
        const value = formValues[field.id];
        if (value === undefined || value === "" || (field.type === 'checkbox' && !value)) {
          toast.error(`${field.label} is required`);
          return false;
        }
      }
    }
    
    if (phoneRequired && phoneVerificationStep !== 'verified') {
      toast.error("Phone verification is required");
      return false;
    }
    
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files);
    
    // Validate file types
    for (const file of newFiles) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error(`File type ${file.type} is not supported`);
        return;
      }
    }
    
    setImages(prev => [...prev, ...newFiles]);
  };

  const uploadImages = async () => {
    if (images.length === 0) return [];
    
    setImageUploading(true);
    const uploadedImageUrls: string[] = [];
    
    try {
      for (const image of images) {
        const fileName = `${crypto.randomUUID()}-${image.name.replace(/[^\x00-\x7F]/g, '')}`;
        
        const { data, error } = await supabase.storage
          .from('custom_order_images')
          .upload(fileName, image);
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('custom_order_images')
          .getPublicUrl(fileName);
        
        uploadedImageUrls.push(publicUrl);
      }
      
      setUploadedUrls(uploadedImageUrls);
      return uploadedImageUrls;
    } catch (error: any) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images");
      return [];
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      // Upload images first
      const imageUrls = await uploadImages();
      
      // Submit form data
      const { data, error } = await supabase.rpc('create_form_submission', {
        form_id_param: formId,
        submission_data_param: formValues,
        phone_number_param: phoneNumber,
        image_urls: imageUrls
      });
      
      if (error) throw error;
      
      toast.success("Form submitted successfully");
      
      // Reset form and redirect
      setFormValues({});
      setImages([]);
      setUploadedUrls([]);
      
      // Show success message then navigate back
      setTimeout(() => {
        navigate("/form-success");
      }, 2000);
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast.error(error.message || "Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyAccessCode = () => {
    if (!formData) return;
    
    if (accessCode === formData.access_code) {
      setAccessVerified(true);
    } else {
      toast.error("Invalid access code");
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const sendVerificationCode = async () => {
    if (!phoneNumber.trim()) {
      setPhoneError("Phone number is required");
      return;
    }

    setPhoneVerifying(true);
    setPhoneError("");
    
    try {
      await phoneAuthService.sendVerificationCode(phoneNumber);
      setPhoneVerificationStep('code');
      toast.success("Verification code sent to your phone");
    } catch (err: any) {
      const error = phoneAuthService.normalizeError(err);
      setPhoneError(error.message);
    } finally {
      setPhoneVerifying(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode.trim()) {
      setPhoneError("Verification code is required");
      return;
    }

    setPhoneVerifying(true);
    setPhoneError("");
    
    try {
      await phoneAuthService.verifyCode(phoneNumber, verificationCode);
      setPhoneVerificationStep('verified');
      toast.success("Phone verified successfully");
    } catch (err: any) {
      const error = phoneAuthService.normalizeError(err);
      setPhoneError(error.message);
    } finally {
      setPhoneVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading form...</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
          <h2 className="text-2xl font-bold mb-2">Form Not Found</h2>
          <p className="mb-4">The form you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/")}>Return Home</Button>
        </div>
      </div>
    );
  }

  if (accessRequired && !accessVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-4">
        <Card className="max-w-md w-full glass-card">
          <CardHeader>
            <CardTitle>Access Required</CardTitle>
            <CardDescription>Please enter the access code to view this form</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Input 
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter access code"
                type="password"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={verifyAccessCode} className="w-full">
              <Lock className="h-4 w-4 mr-2" />
              Verify Access
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-4 md:p-8">
      <Card className="max-w-4xl mx-auto glass-card">
        <CardHeader>
          <CardTitle>{formData.title}</CardTitle>
          {formData.description && (
            <CardDescription>{formData.description}</CardDescription>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Form Fields */}
          <div className="space-y-6">
            {formData.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id} className="text-base">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                
                {field.type === 'text' && (
                  <Input
                    id={field.id}
                    placeholder={field.placeholder}
                    value={formValues[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                  />
                )}
                
                {field.type === 'textarea' && (
                  <Textarea
                    id={field.id}
                    placeholder={field.placeholder}
                    value={formValues[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    rows={4}
                  />
                )}
                
                {field.type === 'number' && (
                  <Input
                    id={field.id}
                    type="number"
                    placeholder={field.placeholder}
                    value={formValues[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                  />
                )}
                
                {field.type === 'checkbox' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={!!formValues[field.id]}
                      onCheckedChange={(checked) => handleInputChange(field.id, checked)}
                    />
                    <label
                      htmlFor={field.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {field.placeholder || 'Yes'}
                    </label>
                  </div>
                )}
                
                {field.type === 'select' && field.options && (
                  <select
                    id={field.id}
                    value={formValues[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select an option</option>
                    {field.options.map((option, i) => (
                      <option key={i} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
          
          {/* File Upload Section */}
          <div className="space-y-2">
            <Label className="text-base">
              Attach Images <span className="text-sm text-muted-foreground">(optional)</span>
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
              {images.map((file, index) => (
                <div 
                  key={index} 
                  className="relative border rounded-md overflow-hidden aspect-square group"
                >
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt={`Upload preview ${index}`}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                  >
                    &times;
                  </Button>
                </div>
              ))}
              
              <label 
                className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center h-full aspect-square cursor-pointer hover:bg-background/10 transition-colors"
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <Plus className="h-6 w-6 mb-2" />
                <span className="text-xs text-center">Add Image</span>
              </label>
            </div>
          </div>
          
          {/* Phone Verification Section */}
          {phoneRequired && (
            <div className="space-y-4 border rounded-md p-4">
              <h3 className="font-medium text-lg">Phone Verification</h3>
              
              {phoneVerificationStep === 'phone' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <PhoneInput
                      value={phoneNumber}
                      onChange={setPhoneNumber}
                      placeholder="Enter your phone number"
                    />
                    {phoneError && (
                      <p className="text-sm text-destructive">{phoneError}</p>
                    )}
                  </div>
                  <Button
                    onClick={sendVerificationCode}
                    disabled={phoneVerifying || !phoneNumber.trim()}
                    className="w-full"
                  >
                    {phoneVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Verification Code"
                    )}
                  </Button>
                </div>
              )}
              
              {phoneVerificationStep === 'code' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Verification Code</Label>
                    <div className="space-y-2">
                      <VerificationInput
                        value={verificationCode}
                        onChange={setVerificationCode}
                      />
                      {phoneError && (
                        <p className="text-sm text-destructive">{phoneError}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Sent to {phoneNumber}{" "}
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() => setPhoneVerificationStep('phone')}
                        >
                          Change
                        </Button>
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={verifyCode}
                    disabled={phoneVerifying || verificationCode.length < 6}
                    className="w-full"
                  >
                    {phoneVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Code"
                    )}
                  </Button>
                </div>
              )}
              
              {phoneVerificationStep === 'verified' && (
                <div className="flex items-center space-x-2 text-green-500">
                  <Check className="h-5 w-5" />
                  <span>Phone verified: {phoneNumber}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter>
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleSubmit}
            disabled={submitting || imageUploading}
          >
            {submitting || imageUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {imageUploading ? 'Uploading Images...' : 'Submitting...'}
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default FormSubmission;
