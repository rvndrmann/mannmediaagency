
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("Auth callback started");
        console.log("SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);
        console.log("ANON_KEY exists:", !!import.meta.env.VITE_SUPABASE_ANON_KEY);
        
        // Check if we're coming back from OAuth with a fragment
        if (window.location.hash) {
          console.log("Processing hash fragment");
          const params = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
          if (accessToken) {
            console.log("Found access token in URL");
            try {
              // Use the token to set the session
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || "",
              });
              
              if (error) {
                console.error("Error setting session:", error);
                throw error;
              }
              
              if (data.session) {
                console.log("Session set successfully");
                toast.success("Successfully logged in!");
                navigate("/", { replace: true });
                return;
              }
            } catch (sessionError) {
              console.error("Session setup error:", sessionError);
              // Continue to the next auth check instead of failing completely
            }
          }
        }
        
        // If we're here, we're either:
        // 1. Coming from email/password login
        // 2. Coming from phone verification
        // 3. Coming from a botched OAuth flow
        
        console.log("Checking for existing session");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Failed to get session:", sessionError);
          throw sessionError;
        }

        // If we have a session, we're good to go
        if (session?.user) {
          console.log("Found existing session for:", session.user.email || session.user.phone);
          toast.success("Successfully logged in!");
          navigate("/", { replace: true });
          return;
        }

        // At this point, we don't have a session yet
        console.log("No session found yet, setting up auth state listener");
        
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            console.log("Auth state changed:", event);
            
            if (event === 'SIGNED_IN' && newSession) {
              console.log("User signed in:", newSession.user?.email || newSession.user?.phone);
              toast.success("Successfully logged in!");
              navigate("/", { replace: true });
            } else if (event === 'SIGNED_OUT') {
              console.log("User signed out");
              navigate("/auth/login", { replace: true });
            }
          }
        );

        // If we got here without a session, give the user feedback
        setTimeout(() => {
          // If we're still on this page after 5 seconds with no session, something's wrong
          console.log("No auth events received after timeout");
          setErrorMessage("Authentication is taking longer than expected. Please try again or contact support.");
          setIsProcessing(false);
        }, 5000);

        return () => {
          subscription.unsubscribe();
        };
      } catch (error: any) {
        console.error("Auth callback error:", error);
        setErrorMessage(error.message || "Authentication failed");
        setIsProcessing(false);
        toast.error(error.message || "Authentication failed");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 flex items-center justify-center">
      <div className="text-white text-center p-8 rounded-lg bg-gray-800/50 backdrop-blur-sm border border-gray-700 max-w-md w-full">
        {isProcessing ? (
          <>
            <div className="size-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg mb-2">Completing login...</p>
            <p className="text-sm text-gray-400">Please wait while we authenticate your account</p>
          </>
        ) : (
          <>
            <div className="text-red-400 mb-4 text-4xl">!</div>
            <h2 className="text-xl font-bold mb-4">Authentication Issue</h2>
            <p className="mb-4">{errorMessage}</p>
            <button 
              onClick={() => navigate("/auth/login")}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white"
            >
              Return to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
