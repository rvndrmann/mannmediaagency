
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";
import PhoneLoginForm from "./PhoneLoginForm";
import { ThemeProvider } from "@/components/theme-provider";

const SignupForm = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignup = async () => {
    try {
      toast.info("For Google login, please use Chrome or Google browser. Login doesn't work in Instagram in-app browser.", {
        duration: 5000,
      });

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

  return (
    <ThemeProvider>
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <Card className="w-full max-w-md p-8 space-y-6 glass-card border border-gray-200 shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
            <p className="text-gray-500">Sign up to get started with MANNMEDIAAGENCY</p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleGoogleSignup}
              className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm"
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
              {isLoading ? "Connecting..." : "Sign up with Google"}
            </Button>

            <PhoneLoginForm isSignUp={true} />

            <div className="flex items-center gap-2 py-2 px-3 bg-gray-200 text-blue-900 rounded-md text-sm border border-blue-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p>For Google login, please use Chrome or Google browser.</p>
            </div>
          </div>

          <div className="text-center">
            <Button
              variant="link"
              className="text-purple-700 hover:text-purple-500"
              onClick={() => navigate("/auth/login")}
            >
              Already have an account? Sign in
            </Button>
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              className="text-gray-500 hover:text-gray-700"
              onClick={() => navigate("/")}
            >
              Back to home
            </Button>
          </div>
        </Card>
      </div>
    </ThemeProvider>
  );
};

export default SignupForm;
