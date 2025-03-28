
import { useState } from "react";
import { phoneAuthService, AuthStatus, VerificationStep } from "@/services/phoneAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const usePhoneAuth = (isSignUp: boolean = true) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [step, setStep] = useState<VerificationStep>("phone");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const validatePhoneNumber = (num: string): boolean => {
    // Check if the phone number has a + and at least 8 digits
    const cleaned = num.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
      setError("Phone number must include country code starting with + (e.g. +1 for US)");
      return false;
    }
    
    if (cleaned.length < 8) {
      setError("Phone number is too short. Please enter a valid phone number.");
      return false;
    }
    
    return true;
  };

  const handlePhoneSubmit = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      return;
    }

    try {
      setStatus("loading");
      setError("");
      console.log("Sending verification code to:", phoneNumber);
      await phoneAuthService.sendVerificationCode(phoneNumber);
      setStep("code");
      toast.success("Verification code sent to your phone");
      setStatus("idle");
    } catch (err: any) {
      console.error("Phone verification error:", err);
      setError(err.message || "Failed to send verification code");
      setStatus("error");
      toast.error(err.message || "Failed to send verification code");
    }
  };

  const handleVerificationSubmit = async () => {
    if (!verificationCode.trim()) {
      setError("Verification code is required");
      return;
    }

    try {
      setStatus("loading");
      setError("");
      console.log("Verifying code:", verificationCode, "for phone:", phoneNumber);
      await phoneAuthService.verifyCode(phoneNumber, verificationCode);
      toast.success(isSignUp ? "Account created successfully!" : "Logged in successfully!");
      setStatus("success");
      navigate("/auth/callback"); // Redirect to callback to handle session
    } catch (err: any) {
      console.error("Code verification error:", err);
      setError(err.message || "Failed to verify code");
      setStatus("error");
      toast.error(err.message || "Failed to verify code");
    }
  };

  const resetVerification = () => {
    setStep("phone");
    setVerificationCode("");
    setError("");
  };

  const resendCode = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      return;
    }
    
    try {
      setStatus("loading");
      setError("");
      await phoneAuthService.sendVerificationCode(phoneNumber);
      toast.success("Verification code resent to your phone");
      setStatus("idle");
    } catch (err: any) {
      console.error("Failed to resend code:", err);
      setError(err.message || "Failed to resend verification code");
      setStatus("error");
      toast.error(err.message || "Failed to resend verification code");
    }
  };

  return {
    phoneNumber,
    setPhoneNumber: (value: string) => {
      setPhoneNumber(value);
      setError(""); // Clear error when user types
    },
    verificationCode,
    setVerificationCode: (value: string) => {
      setVerificationCode(value);
      setError(""); // Clear error when user types
    },
    status,
    step,
    error,
    handlePhoneSubmit,
    handleVerificationSubmit,
    resetVerification,
    resendCode
  };
};
