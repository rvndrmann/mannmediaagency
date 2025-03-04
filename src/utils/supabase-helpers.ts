
import { supabase } from "@/integrations/supabase/client";
import { CustomOrderForm, PaymentLink, FormSubmissionData } from "@/types/database";

// Helper for custom_order_forms table
export const customOrderFormsTable = () => {
  return supabase.from('custom_order_forms');
};

// Helper for payment_links table
export const paymentLinksTable = () => {
  return supabase.from('payment_links');
};

// Helper for form_submissions table
export const formSubmissionsTable = () => {
  return supabase.from('form_submissions');
};

// Edge function helper for form submissions
export const createFormSubmission = async (formData: {
  formId: string;
  formData: any;
  phoneNumber: string | null;
  imageUrls?: string[];
}) => {
  return supabase.functions.invoke('create-form-submission', {
    body: formData
  });
};
