
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

  const handlePhoneSubmit = async () => {
    // Clean the phone number
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // Basic validation
    if (!cleanNumber || cleanNumber.length < 10) {
      setError("Please enter a valid phone number with country code (e.g. +1234567890)");
      return;
    }

    try {
      setStatus("loading");
      setError("");
      console.log("Sending verification code to:", cleanNumber);
      await phoneAuthService.sendVerificationCode(cleanNumber);
      setStep("code");
      toast.success("Verification code sent to your phone");
      setStatus("idle");
    } catch (err: any) {
      console.error("Phone verification error:", err);
      setError(err.message || "Failed to send verification code");
      setStatus("error");
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
      navigate("/");
    } catch (err: any) {
      console.error("Code verification error:", err);
      setError(err.message || "Failed to verify code");
      setStatus("error");
    }
  };

  const resetVerification = () => {
    setStep("phone");
    setVerificationCode("");
    setError("");
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
    resetVerification
  };
};
