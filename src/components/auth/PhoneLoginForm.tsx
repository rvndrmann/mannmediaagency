
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { usePhoneAuth } from "@/hooks/usePhoneAuth";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface PhoneLoginFormProps {
  isSignUp?: boolean;
}

const PhoneLoginForm = ({ isSignUp = false }: PhoneLoginFormProps) => {
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const {
    phoneNumber,
    setPhoneNumber,
    verificationCode,
    setVerificationCode,
    status,
    step,
    error,
    handlePhoneSubmit,
    handleVerificationSubmit,
    resetVerification,
    resendCode
  } = usePhoneAuth(isSignUp);

  const togglePhoneForm = () => {
    setShowPhoneForm(!showPhoneForm);
    if (step !== "phone") {
      resetVerification();
    }
  };

  if (!showPhoneForm) {
    return (
      <Button
        type="button"
        onClick={togglePhoneForm}
        className="w-full bg-gray-700 hover:bg-gray-600 text-white mt-3"
      >
        Continue with Phone Number
      </Button>
    );
  }

  return (
    <div className="space-y-4 mt-4 bg-gray-800/50 p-4 rounded-md">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">
          {step === "phone" ? "Enter Phone Number" : "Enter Verification Code"}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePhoneForm}
          className="text-gray-400 hover:text-gray-300"
        >
          Cancel
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 py-2 px-3 bg-red-500/10 text-red-300 rounded-md text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {step === "phone" ? (
        <div className="space-y-3">
          <div>
            <Label htmlFor="phone" className="text-white">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 555-5555"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Include country code with + (e.g. +1 for US, +91 for India)
            </p>
          </div>
          <Button
            onClick={handlePhoneSubmit}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            disabled={status === "loading" || !phoneNumber.trim()}
          >
            {status === "loading" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {status === "loading" ? "Sending..." : "Send Verification Code"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor="code" className="text-white">Verification Code</Label>
            <div className="mt-2">
              <InputOTP
                maxLength={6}
                value={verificationCode} 
                onChange={(value) => setVerificationCode(value)}
                containerClassName="justify-center gap-2"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="bg-gray-900 border-gray-700 text-white" />
                  <InputOTPSlot index={1} className="bg-gray-900 border-gray-700 text-white" />
                  <InputOTPSlot index={2} className="bg-gray-900 border-gray-700 text-white" />
                  <InputOTPSlot index={3} className="bg-gray-900 border-gray-700 text-white" />
                  <InputOTPSlot index={4} className="bg-gray-900 border-gray-700 text-white" />
                  <InputOTPSlot index={5} className="bg-gray-900 border-gray-700 text-white" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              We sent a code to {phoneNumber}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleVerificationSubmit}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={status === "loading" || verificationCode.length < 6}
            >
              {status === "loading" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {status === "loading" ? "Verifying..." : "Verify Code"}
            </Button>
            <div className="flex justify-between mt-2">
              <Button
                onClick={resetVerification}
                variant="ghost"
                className="text-gray-400 hover:text-gray-300"
                type="button"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={resendCode}
                variant="ghost"
                className="text-purple-400 hover:text-purple-300"
                disabled={status === "loading"}
                type="button"
              >
                Resend Code
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneLoginForm;
