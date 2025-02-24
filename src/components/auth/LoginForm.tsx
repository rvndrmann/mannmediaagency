
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Phone } from "lucide-react";
import { Label } from "@/components/ui/label";

const LoginForm = () => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const navigate = useNavigate();

  const handlePhoneSignIn = async () => {
    if (!phoneNumber) {
      toast.error("Please enter your phone number");
      return;
    }

    setIsPhoneLoading(true);
    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          shouldCreateUser: true, // This will create a new user if one doesn't exist
        }
      });

      if (error) throw error;

      setShowVerification(true);
      toast.success("Verification code sent to your phone");
    } catch (error: any) {
      console.error('Phone sign-in error:', error);
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setIsPhoneLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      toast.error("Please enter the verification code");
      return;
    }

    setIsPhoneLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
        token: verificationCode,
        type: 'sms'
      });

      if (error) throw error;

      toast.success("Successfully logged in!");
      navigate("/");
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message || 'Failed to verify code');
    } finally {
      setIsPhoneLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const hostname = window.location.hostname;
      const isProd = hostname === 'mannmediaagency.com' || hostname === 'www.mannmediaagency.com';
      
      const redirectTo = isProd 
        ? 'https://mannmediaagency.com/auth/callback'
        : `${window.location.origin}/auth/callback`;

      console.log('Using redirect URL:', redirectTo);
      
      await supabase.auth.signOut();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        if (error.message.includes('redirect_uri_mismatch')) {
          toast.error('Authentication configuration error. Please contact support.');
        } else if (error.message.includes('popup_closed_by_user')) {
          toast.error('Login cancelled. Please try again.');
        } else {
          toast.error(error.message);
        }
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast.error('Failed to login with Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const renderPhoneAuth = () => (
    <div className="space-y-4">
      {!showVerification ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-white">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>
          <Button
            onClick={handlePhoneSignIn}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            disabled={isPhoneLoading}
          >
            {isPhoneLoading ? (
              <span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Phone className="w-5 h-5 mr-2" />
            )}
            {isPhoneLoading ? "Sending code..." : "Continue with Phone"}
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="code" className="text-white">Verification Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="Enter verification code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>
          <Button
            onClick={handleVerifyCode}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            disabled={isPhoneLoading}
          >
            {isPhoneLoading ? (
              <span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : null}
            {isPhoneLoading ? "Verifying..." : "Verify Code"}
          </Button>
          <Button
            variant="link"
            className="w-full text-purple-400 hover:text-purple-300"
            onClick={() => {
              setShowVerification(false);
              setVerificationCode("");
            }}
          >
            Back to phone number
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-gray-800/50 backdrop-blur-xl border-gray-700">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            className="w-full bg-white hover:bg-gray-100 text-gray-900 flex items-center justify-center gap-2 relative"
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <>
                <span className="absolute left-4 size-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                Connecting to Google...
              </>
            ) : (
              <>
                <img
                  src="https://www.google.com/favicon.ico"
                  alt="Google"
                  className="w-5 h-5"
                />
                Continue with Google
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-800/50 px-2 text-gray-400">Or</span>
            </div>
          </div>

          {renderPhoneAuth()}
        </div>

        <div className="text-center">
          <Button
            variant="link"
            className="text-purple-400 hover:text-purple-300"
            onClick={() => navigate("/auth/signup")}
          >
            Don't have an account? Sign up
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

export default LoginForm;
