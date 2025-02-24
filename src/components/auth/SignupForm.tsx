
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone } from "lucide-react";
import { PhoneInput } from "./PhoneInput";
import { VerificationInput } from "./VerificationInput";
import { usePhoneAuth } from "@/hooks/usePhoneAuth";

const SignupForm = () => {
  const navigate = useNavigate();
  const [isPhoneValid, setIsPhoneValid] = useState(false);
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
    resetVerification
  } = usePhoneAuth(true);

  const handleSubmit = async () => {
    if (step === 'phone') {
      await handlePhoneSubmit();
    } else {
      await handleVerificationSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-gray-800/50 backdrop-blur-xl border-gray-700">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-gray-400">Sign up using your phone number</p>
        </div>

        <div className="space-y-6">
          {step === 'phone' ? (
            <PhoneInput
              value={phoneNumber}
              onChange={setPhoneNumber}
              error={error}
              onValidityChange={setIsPhoneValid}
            />
          ) : (
            <VerificationInput
              value={verificationCode}
              onChange={setVerificationCode}
              error={error}
            />
          )}

          <Button
            onClick={handleSubmit}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            disabled={status === 'loading' || (step === 'phone' && !isPhoneValid)}
          >
            {status === 'loading' ? (
              <span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Phone className="w-5 h-5 mr-2" />
            )}
            {step === 'phone' 
              ? (status === 'loading' ? "Sending code..." : "Sign up with Phone")
              : (status === 'loading' ? "Verifying..." : "Create Account")
            }
          </Button>

          {step === 'code' && (
            <Button
              variant="link"
              className="w-full text-purple-400 hover:text-purple-300"
              onClick={resetVerification}
            >
              Change phone number
            </Button>
          )}
        </div>

        <div className="text-center">
          <Button
            variant="link"
            className="text-purple-400 hover:text-purple-300"
            onClick={() => navigate("/auth/login")}
          >
            Already have an account? Sign in
          </Button>
        </div>
        
        <div className="text-center">
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-gray-300"
            onClick={() => navigate("/")}
          >
            Back to home
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SignupForm;
