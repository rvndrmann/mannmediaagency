
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("Auth callback started");
        
        // Handle the URL hash fragment for OAuth providers
        if (window.location.hash) {
          console.log("Processing hash fragment");
          const params = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
          if (accessToken) {
            console.log("Found access token in URL");
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
          }
        }
        
        // If no hash parameters or session setting failed, try to get the current session
        console.log("Checking for existing session");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Failed to get session:", sessionError);
          throw sessionError;
        }

        // If we have a session, we're good to go
        if (session?.user) {
          console.log("Found existing session for:", session.user.email);
          toast.success("Successfully logged in!");
          navigate("/", { replace: true });
          return;
        }

        // Set up auth state listener for future changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            console.log("Auth state changed:", event);
            if (event === 'SIGNED_IN' && newSession) {
              console.log("User signed in:", newSession.user?.email);
              toast.success("Successfully logged in!");
              navigate("/", { replace: true });
            }
          }
        );

        // If we got here without a session, something went wrong
        console.error("No session found and no tokens in URL");
        throw new Error("Authentication failed. Please try again.");
      } catch (error: any) {
        console.error("Auth callback error:", error);
        toast.error(error.message || "Authentication failed");
        navigate("/auth/login", { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="size-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg">Completing login...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
