
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
  let parsedFields: FormField[] = [];
  
  try {
    if (typeof form.fields === 'string') {
      parsedFields = JSON.parse(form.fields);
    } else if (Array.isArray(form.fields)) {
      // Need to use double casting to avoid TypeScript errors
      parsedFields = (form.fields as unknown) as FormField[];
    }
  } catch (error) {
    console.error("Error parsing form fields:", error);
    parsedFields = [];
  }
  
  return {
    ...form,
    fields: parsedFields,
    description: form.description || null,
    access_code: form.access_code || null
  };
};

// Helper to convert FormField[] to JSON before sending to database
export const prepareFormForSave = (formData: Partial<CustomOrderForm>): Partial<DbCustomOrderForm> => {
  if (!formData.fields) {
    return formData as unknown as Partial<DbCustomOrderForm>;
  }
  
  const preparedData = {
    ...formData,
    fields: JSON.stringify(formData.fields)
  };
  
  return preparedData as unknown as Partial<DbCustomOrderForm>;
};

// Helper to prepare payment link for saving
export const preparePaymentLinkForSave = (paymentData: Partial<PaymentLink> & { amount: number; title: string }): Partial<DbPaymentLink> => {
  // Nothing to transform for payment links currently, just cast the type
  return paymentData as unknown as Partial<DbPaymentLink>;
};

// Parse an array of forms from the database
export const parseFormsList = (forms: DbCustomOrderForm[]): CustomOrderForm[] => {
  return forms.map(parseFormFields);
};

// Parse form submission data
export const parseFormSubmission = (submission: DbFormSubmissionData): FormSubmissionData => {
  let parsedData: any = submission.submission_data;
  
  try {
    if (typeof submission.submission_data === 'string') {
      parsedData = JSON.parse(submission.submission_data);
    }
  } catch (error) {
    console.error("Error parsing submission data:", error);
    parsedData = submission.submission_data;
  }
  
  return {
    ...submission,
    submission_data: parsedData
  };
};
