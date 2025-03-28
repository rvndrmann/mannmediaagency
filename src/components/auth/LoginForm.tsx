
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { AlertCircle } from "lucide-react";
import PhoneLoginForm from "./PhoneLoginForm";
import EmailLoginForm from "./EmailLoginForm";

const LoginForm = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone" | null>("email");

  const handleGoogleLogin = async () => {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-gray-800/50 backdrop-blur-xl border-gray-700">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400">Sign in to continue to MANNMEDIAAGENCY</p>
        </div>

        <div className="space-y-4">
          {loginMethod === "email" && <EmailLoginForm isSignUp={false} />}

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => setLoginMethod("email")}
              variant={loginMethod === "email" ? "default" : "outline"}
              className={loginMethod === "email" 
                ? "bg-purple-600 hover:bg-purple-700 text-white" 
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"}
            >
              Email Login
            </Button>
            <Button
              onClick={() => setLoginMethod("phone")}
              variant={loginMethod === "phone" ? "default" : "outline"}
              className={loginMethod === "phone" 
                ? "bg-purple-600 hover:bg-purple-700 text-white" 
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"}
            >
              Phone Login
            </Button>
          </div>

          {loginMethod === "phone" && <PhoneLoginForm isSignUp={false} />}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-800 px-2 text-gray-400">Or continue with</span>
            </div>
          </div>

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

          <div className="flex items-center gap-2 py-2 px-3 bg-blue-500/10 text-blue-300 rounded-md text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>For Google login, please use Chrome or Google browser.</p>
          </div>
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
