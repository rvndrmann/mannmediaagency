
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // First check if we have a session directly from the URL
        const {
          data: { session },
          error: sessionError
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Failed to get session:", sessionError);
          throw sessionError;
        }

        if (!session) {
          // If no session, try to exchange the code for a session
          const params = new URLSearchParams(window.location.hash.substring(1));
          if (!params.get('access_token')) {
            console.error("No access token found in URL");
            throw new Error("Authentication failed. Please try again.");
          }
        }

        // At this point we should have a valid session
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log("Authentication successful for:", user.email);
          toast.success("Successfully logged in!");
          navigate("/", { replace: true });
        } else {
          throw new Error("No user found after authentication");
        }
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
