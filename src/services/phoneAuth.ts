
import { supabase } from "@/integrations/supabase/client";

export type AuthStatus = 'idle' | 'loading' | 'success' | 'error';
export type VerificationStep = 'phone' | 'code';

export interface PhoneAuthError {
  message: string;
  code?: string;
}

export const phoneAuthService = {
  async sendVerificationCode(phoneNumber: string): Promise<void> {
    console.log('Sending verification code to:', phoneNumber);
    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
      options: {
        shouldCreateUser: true,
      }
    });
    
    if (error) {
      console.error('Error sending verification code:', error);
      throw this.normalizeError(error);
    }
  },

  async verifyCode(phoneNumber: string, token: string): Promise<void> {
    console.log('Verifying code for:', phoneNumber, 'token:', token);
    const { error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token,
      type: 'sms'
    });

    if (error) {
      console.error('Error verifying code:', error);
      throw this.normalizeError(error);
    }
  },

  normalizeError(error: any): PhoneAuthError {
    console.error('Auth error:', error);

    if (typeof error.message === 'string') {
      if (error.message.includes('Invalid phone')) {
        return { 
          message: 'Please enter a valid phone number',
          code: 'invalid_phone' 
        };
      }

      if (error.message.includes('Invalid OTP')) {
        return { 
          message: 'Invalid verification code. Please try again.',
          code: 'invalid_otp' 
        };
      }

      if (error.message.includes('User already registered')) {
        return {
          message: 'This phone number is already registered. Please sign in instead.',
          code: 'user_exists'
        };
      }
    }

    return { 
      message: 'An unexpected error occurred. Please try again.',
      code: 'unknown' 
    };
  }
};
