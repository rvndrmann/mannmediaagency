
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PhoneInput from "./phone/PhoneInput";
import VerificationInput from "./phone/VerificationInput";

type AuthMethod = "google" | "phone";

const LoginForm = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("google");
  const [verificationStep, setVerificationStep] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      toast.error("Failed to connect to Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async (phone: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setPhoneNumber(phone);
      setVerificationStep(true);
      toast.success("Verification code sent!");
    } catch (error) {
      toast.error("Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async (code: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: code,
        type: 'sms',
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Successfully verified!");
      navigate("/");
    } catch (error) {
      toast.error("Failed to verify code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    await handlePhoneSubmit(phoneNumber);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-gray-800/50 backdrop-blur-xl border-gray-700">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400">Sign in to continue to MANNMEDIAAGENCY</p>
        </div>

        {!verificationStep && (
          <div className="flex gap-2 mb-6">
            <Button
              variant={authMethod === "google" ? "default" : "outline"}
              onClick={() => setAuthMethod("google")}
              className="flex-1"
            >
              Google
            </Button>
            <Button
              variant={authMethod === "phone" ? "default" : "outline"}
              onClick={() => setAuthMethod("phone")}
              className="flex-1"
            >
              Phone
            </Button>
          </div>
        )}

        <div className="space-y-6">
          {verificationStep ? (
            <VerificationInput
              onSubmit={handleVerificationSubmit}
              onResend={handleResendCode}
              isLoading={isLoading}
              phoneNumber={phoneNumber}
            />
          ) : authMethod === "google" ? (
            <Button
              onClick={handleGoogleLogin}
              className="w-full bg-white hover:bg-gray-100 text-gray-900"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="size-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <img 
                  src="https://www.google.com/favicon.ico"
                  alt=""
                  className="w-4 h-4 mr-2"
                />
              )}
              {isLoading ? "Connecting..." : "Continue with Google"}
            </Button>
          ) : (
            <PhoneInput onSubmit={handlePhoneSubmit} isLoading={isLoading} />
          )}
        </div>

        {!verificationStep && (
          <div className="text-center">
            <Button
              variant="link"
              className="text-purple-400 hover:text-purple-300"
              onClick={() => navigate("/auth/signup")}
            >
              Don't have an account? Sign up
            </Button>
          </div>
        )}
        
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

export default LoginForm;
