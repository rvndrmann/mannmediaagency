
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

// Parse fields from database JSON to FormField[] type
export const parseFormFields = (form: any): CustomOrderForm => {
  return {
    ...form,
    fields: Array.isArray(form.fields) ? form.fields : [],
    description: form.description || null,
    access_code: form.access_code || null
  };
};

// Helper to convert FormField[] to JSON before sending to database
export const prepareFormForSave = (formData: Partial<CustomOrderForm>) => {
  return {
    ...formData,
    fields: formData.fields ? JSON.stringify(formData.fields) : undefined
  };
};

// Helper to prepare payment link for saving
export const preparePaymentLinkForSave = (paymentData: Partial<PaymentLink> & { amount: number; title: string }) => {
  return {
    ...paymentData,
    title: paymentData.title,
    amount: paymentData.amount
  };
};
