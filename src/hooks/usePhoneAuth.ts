
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
    if (!phoneNumber.trim()) {
      setError("Phone number is required");
      return;
    }

    try {
      setStatus("loading");
      setError("");
      await phoneAuthService.sendVerificationCode(phoneNumber);
      setStep("code");
      toast.success("Verification code sent to your phone");
      setStatus("idle");
    } catch (err: any) {
      const error = phoneAuthService.normalizeError(err);
      setError(error.message);
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
      await phoneAuthService.verifyCode(phoneNumber, verificationCode);
      toast.success(isSignUp ? "Account created successfully!" : "Logged in successfully!");
      setStatus("success");
      navigate("/");
    } catch (err: any) {
      const error = phoneAuthService.normalizeError(err);
      setError(error.message);
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
    setVerificationCode,
    status,
    step,
    error,
    handlePhoneSubmit,
    handleVerificationSubmit,
    resetVerification
  };
};
