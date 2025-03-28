
import { supabase } from "@/integrations/supabase/client";

export type AuthStatus = 'idle' | 'loading' | 'success' | 'error';
export type VerificationStep = 'phone' | 'code';

export interface PhoneAuthError {
  message: string;
  code?: string;
}

export const phoneAuthService = {
  async sendVerificationCode(phoneNumber: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
      options: {
        shouldCreateUser: true,
      }
    });
    
    if (error) {
      throw this.normalizeError(error);
    }
  },

  async verifyCode(phoneNumber: string, token: string): Promise<void> {
    const { error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token,
      type: 'sms'
    });

    if (error) {
      throw this.normalizeError(error);
    }
  },

  normalizeError(error: any): PhoneAuthError {
    console.error('Auth error:', error);

    if (error.message?.includes('Invalid phone')) {
      return { 
        message: 'Please enter a valid phone number',
        code: 'invalid_phone' 
      };
    }

    if (error.message?.includes('Invalid OTP')) {
      return { 
        message: 'Invalid verification code. Please try again.',
        code: 'invalid_otp' 
      };
    }

    return { 
      message: 'An unexpected error occurred. Please try again.',
      code: 'unknown' 
    };
  }
};
