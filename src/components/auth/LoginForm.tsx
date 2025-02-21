
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const LoginForm = () => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const getRedirectUrl = () => {
    const baseUrl = window.location.origin;
    // Ensure we're using https for production and handle local development
    const secureUrl = baseUrl.replace(/^http:/, 'https:');
    return `${secureUrl}/auth/callback`;
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const redirectTo = getRedirectUrl();
      console.log('Starting Google sign-in with redirect:', redirectTo);
      
      // Clear any existing sessions first
      await supabase.auth.signOut();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: false, // Ensure redirect happens properly on mobile
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        if (error.message.includes('popup_closed_by_user')) {
          toast.error('Login cancelled. Please try again.');
        } else if (isMobileDevice()) {
          toast.error('Mobile login failed. Please ensure pop-ups are allowed.');
        } else {
          toast.error(error.message);
        }
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast.error(isMobileDevice() 
        ? 'Mobile login failed. Please try again.' 
        : 'Failed to login with Google'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-gray-800/50 backdrop-blur-xl border-gray-700">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

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
