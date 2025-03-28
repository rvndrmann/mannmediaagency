
import { supabase } from "@/integrations/supabase/client";

export type AuthStatus = 'idle' | 'loading' | 'success' | 'error';
export type VerificationStep = 'phone' | 'code';

export interface PhoneAuthError {
  message: string;
  code?: string;
}

export const phoneAuthService = {
  async sendVerificationCode(phoneNumber: string): Promise<void> {
    // Ensure phone number is in E.164 format
    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    console.log('Sending verification code to formatted number:', formattedNumber);
    
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedNumber,
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
    // Ensure phone number is in E.164 format
    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    console.log('Verifying code for formatted number:', formattedNumber, 'token:', token);
    
    const { error } = await supabase.auth.verifyOtp({
      phone: formattedNumber,
      token,
      type: 'sms'
    });

    if (error) {
      console.error('Error verifying code:', error);
      throw this.normalizeError(error);
    }
  },

  formatPhoneNumber(phoneNumber: string): string {
    // Clean the number from any non-digit or + characters
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    console.log('Formatted phone number:', cleaned);
    return cleaned;
  },

  normalizeError(error: any): PhoneAuthError {
    console.error('Auth error:', error);

    if (typeof error.message === 'string') {
      if (error.message.includes('Invalid phone')) {
        return { 
          message: 'Please enter a valid phone number with country code (e.g. +1234567890)',
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

      if (error.message.includes('rate limit')) {
        return {
          message: 'Too many attempts. Please try again later.',
          code: 'rate_limit'
        };
      }
    }

    return { 
      message: 'An unexpected error occurred. Please try again.',
      code: 'unknown' 
    };
  }
};
