import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { AlertCircle } from "lucide-react";
import PhoneLoginForm from "./PhoneLoginForm";
import { useAuth } from "@/hooks/use-auth";

const LoginForm = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { error } = useAuth();

  // Debug function to check session state
  const checkAuthState = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session check:', {
        hasSession: !!sessionData?.session,
        sessionError: sessionError ? sessionError.message : null
      });

      const { data, error } = await supabase.auth.getUser();
      console.log('Current user check:', {
        hasUser: !!data?.user,
        error: error ? error.message : null
      });
    } catch (err) {
      console.error('Error checking auth state:', err);
    }
  };

  // Check auth state on component mount
  useEffect(() => {
    checkAuthState();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      toast.info("For Google login, please use Chrome or Google browser. Login doesn't work in Instagram in-app browser.", {
        duration: 5000,
      });
      
      setIsLoading(true);
      console.log('Starting Google OAuth login flow...');
      
      // Clear any existing session before login
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      console.log('OAuth sign-in result:', { success: !!data, error: error?.message });
      
      if (error) {
        console.error('Google login error:', error);
        toast.error(error.message);
      } else {
        console.log('OAuth flow started successfully');
      }
    } catch (error) {
      toast.error("Failed to connect to Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        navigate("/"); // Navigate to dashboard on successful login
      }
    } catch (error) {
      toast.error("Failed to sign in with email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="flex items-center bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded mb-4" role="alert">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="block">{error.message || "Authentication error. Please try again later."}</span>
        </div>
      )}
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-card text-card-foreground border-border">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h2>
          <p className="text-muted-foreground">Sign in to continue to MANNMEDIAAGENCY</p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="size-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <img
                src="https://www.google.com/favicon.ico"
                alt=""
                className="w-4 h-4 mr-2"
              />
            )}
            {isLoading ? "Connecting..." : "Continue with Google"}
          </Button>

          {/* Phone Login Removed */}
          {/* Email Login Form Removed */}

          <div className="flex items-center gap-2 py-2 px-3 bg-primary/10 text-primary rounded-md text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>For Google login, please use Chrome or Google browser.</p>
          </div>
        </div>

        <div className="text-center">
          <Button
            variant="link"
            className="text-primary hover:text-primary/80"
            onClick={() => navigate("/auth/signup")}
          >
            Don't have an account? Sign up
          </Button>
        </div>
        
        <div className="text-center">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/")}
          >
            Back to home
          </Button>
        </div>
      </Card>
    </div>
    </>
  );
};

export default LoginForm;
