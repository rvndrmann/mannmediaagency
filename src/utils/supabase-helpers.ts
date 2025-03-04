
import { supabase } from "@/integrations/supabase/client";
import { 
  CustomOrderForm, 
  PaymentLink, 
  FormSubmissionData, 
  FormField,
  DbCustomOrderForm,
  DbPaymentLink,
  DbFormSubmissionData
} from "@/types/database";

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
export const parseFormFields = (form: DbCustomOrderForm): CustomOrderForm => {
  return {
    ...form,
    fields: typeof form.fields === 'string' 
      ? JSON.parse(form.fields) 
      : (Array.isArray(form.fields) ? form.fields : []),
    description: form.description || null,
    access_code: form.access_code || null
  };
};

// Helper to convert FormField[] to JSON before sending to database
export const prepareFormForSave = (formData: Partial<CustomOrderForm>): Partial<DbCustomOrderForm> => {
  if (!formData.fields) {
    return formData;
  }
  
  return {
    ...formData,
    fields: JSON.stringify(formData.fields)
  };
};

// Helper to prepare payment link for saving
export const preparePaymentLinkForSave = (paymentData: Partial<PaymentLink> & { amount: number; title: string }): Partial<DbPaymentLink> => {
  return {
    ...paymentData,
    title: paymentData.title,
    amount: paymentData.amount
  };
};

// Parse an array of forms from the database
export const parseFormsList = (forms: DbCustomOrderForm[]): CustomOrderForm[] => {
  return forms.map(parseFormFields);
};

// Parse form submission data
export const parseFormSubmission = (submission: DbFormSubmissionData): FormSubmissionData => {
  return {
    ...submission,
    submission_data: typeof submission.submission_data === 'string'
      ? JSON.parse(submission.submission_data)
      : submission.submission_data
  };
};
