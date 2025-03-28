
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            if (event === 'SIGNED_IN' && newSession) {
              console.log("Auth state changed: User is signed in");
            }
          }
        );

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Failed to get session:", sessionError);
          throw sessionError;
        }

        // If we have a session, we're good to go
        if (session?.user) {
          console.log("Authentication successful for:", session.user.email);
          toast.success("Successfully logged in!");
          navigate("/", { replace: true });
          return;
        }

        // If no session, check for access token in URL
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get('access_token');
        
        if (!accessToken) {
          console.error("No access token found");
          throw new Error("Authentication failed. Please try again.");
        }

        // At this point, we should have either gotten a session or found an access token
        // If we get here without either, something went wrong
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
