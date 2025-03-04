
import { Json } from "@supabase/supabase-js";

export interface CustomOrderForm {
  id: string;
  title: string;
  description: string | null;
  fields: any[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
  access_code: string | null;
  require_phone: boolean;
}

export interface PaymentLink {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  access_code: string | null;
  expiry_date: string | null;
}

export interface FormSubmissionData {
  id: string;
  form_id: string;
  submission_data: any;
  created_at: string;
  phone_number: string | null;
}

export interface FormData {
  id: string;
  title: string;
  description: string | null;
  fields: FormField[];
  is_active: boolean;
  access_code: string | null;
  require_phone: boolean;
}

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'checkbox' | 'select';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}
