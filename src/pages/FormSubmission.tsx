import { useState, useEffect, FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertTriangle, Lock } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import PhoneInput from "@/components/auth/phone/PhoneInput";
import VerificationInput from "@/components/auth/phone/VerificationInput";
import { FormData, FormField as FormFieldType } from "@/types/database";
import { customOrderFormsTable, createFormSubmission } from "@/utils/supabase-helpers";
import { parseFormFields } from "@/utils/supabase-helpers";

const FormSubmission = () => {
  const { formId } = useParams<{ formId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [accessCode, setAccessCode] = useState(searchParams.get('code') || "");
  const [accessRequired, setAccessRequired] = useState(false);
  const [accessVerified, setAccessVerified] = useState(false);
  const [phoneVerificationStep, setPhoneVerificationStep] = useState<'none' | 'input' | 'verify'>('none');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  useEffect(() => {
    if (!formId) return;
    
    fetchFormData();
  }, [formId]);

  const fetchFormData = async () => {
    setLoading(true);
    try {
      const { data, error } = await customOrderFormsTable()
        .select("*")
        .eq("id", formId)
        .single();

      if (error) throw error;
      
      if (!data) {
        throw new Error("Form not found");
      }
      
      // Parse form fields
      const parsedForm = parseFormFields(data);
      
      if (!parsedForm.is_active) {
        throw new Error("This form is no longer active");
      }
      
      setFormData(parsedForm);
      
      // Check if phone verification is required
      if (parsedForm.require_phone) {
        setPhoneVerificationStep('input');
      }
      
      // Check if access code is required
      if (parsedForm.access_code) {
        setAccessRequired(true);
        
        // Check if code from URL matches
        if (searchParams.get('code') === parsedForm.access_code) {
          setAccessVerified(true);
        }
      } else {
        setAccessVerified(true);
      }
    } catch (error: any) {
      console.error("Error fetching form:", error);
      toast.error(error.message || "Failed to load form");
      navigate("/");
    } finally {
      setLoading(false);
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

  const handleSendVerificationCode = async (phoneNum: string) => {
    setSendingCode(true);
    setPhoneNumber(phoneNum);
    
    try {
      // Call Supabase function to send the code
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNum,
      });

      if (error) throw error;
      
      toast.success("Verification code sent successfully!");
      setPhoneVerificationStep('verify');
    } catch (error: any) {
      console.error("Error sending verification code:", error);
      toast.error(error.message || "Failed to send verification code");
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    setVerifyingCode(true);
    
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: code,
        type: 'sms',
      });

      if (error) throw error;
      
      toast.success("Phone number verified successfully!");
      setPhoneVerified(true);
      
      // Clean up auth session since we don't need the user to be logged in
      await supabase.auth.signOut();
    } catch (error: any) {
      console.error("Error verifying code:", error);
      toast.error(error.message || "Invalid verification code");
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      if (error) throw error;
      
      toast.success("Verification code resent!");
    } catch (error: any) {
      console.error("Error resending code:", error);
      toast.error(error.message || "Failed to resend verification code");
    }
  };

  const handleValueChange = (fieldId: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    try {
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `form-submissions/${formId}/${fileName}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('public')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);
        
      // Add to uploaded images array
      setUploadedImages(prev => [...prev, publicUrl]);
      
      // Add to form values
      handleValueChange(fieldId, publicUrl);
      
      toast.success("Image uploaded successfully!");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData || !formId) return;
    
    // Validate all required fields
    const missingFields = formData.fields
      .filter(field => field.required && !formValues[field.id])
      .map(field => field.label);
      
    if (missingFields.length > 0) {
      toast.error(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Submit form data using our helper function
      const { data, error } = await createFormSubmission({
        formId,
        formData: formValues,
        phoneNumber: phoneVerified ? phoneNumber : null,
        imageUrls: uploadedImages
      });

      if (error) throw error;
      
      toast.success("Form submitted successfully!");
      
      // Redirect to success page
      navigate("/form-success");
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast.error(error.message || "Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormFieldType) => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            id={field.id}
            placeholder={field.placeholder}
            value={formValues[field.id] || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
          />
        );
      case 'textarea':
        return (
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            value={formValues[field.id] || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
          />
        );
      case 'number':
        return (
          <Input
            id={field.id}
            type="number"
            placeholder={field.placeholder}
            value={formValues[field.id] || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
          />
        );
      case 'checkbox':
        return (
          <Checkbox
            id={field.id}
            checked={formValues[field.id] || false}
            onCheckedChange={(checked) => handleValueChange(field.id, checked)}
          />
        );
      case 'select':
        return (
          <select
            id={field.id}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={formValues[field.id] || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
          >
            <option value="">Select an option</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      default:
        return null;
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
  
  if (phoneVerificationStep === 'input' && !phoneVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-4">
        <Card className="max-w-md w-full glass-card">
          <CardHeader>
            <CardTitle>{formData.title}</CardTitle>
            <CardDescription>Please verify your phone number to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <PhoneInput 
              onSubmit={handleSendVerificationCode}
              isLoading={sendingCode}
            />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (phoneVerificationStep === 'verify' && !phoneVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-4">
        <Card className="max-w-md w-full glass-card">
          <CardHeader>
            <CardTitle>{formData.title}</CardTitle>
            <CardDescription>Verify your phone number</CardDescription>
          </CardHeader>
          <CardContent>
            <VerificationInput
              onSubmit={handleVerifyCode}
              onResend={handleResendCode}
              isLoading={verifyingCode}
              phoneNumber={phoneNumber}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-4">
      <Card className="max-w-2xl w-full glass-card">
        <CardHeader>
          <CardTitle className="text-white">{formData.title}</CardTitle>
          {formData.description && (
            <CardDescription className="text-gray-400">
              {formData.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {formData.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <FormLabel htmlFor={field.id}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                {renderField(field)}
              </div>
            ))}
            
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>Submit</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FormSubmission;
