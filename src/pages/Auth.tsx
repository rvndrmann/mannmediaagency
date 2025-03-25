
import { useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import { VideoShowcase } from "@/components/auth/VideoShowcase";
import { Alert } from "@/components/ui/alert";

interface AuthProps {
  mode?: "login" | "signup";
}

const Auth = ({ mode }: AuthProps) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(mode || "login");
  
  // Extract redirect error message if present in URL params
  const params = new URLSearchParams(location.search);
  const errorMessage = params.get('error');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      {errorMessage && (
        <Alert variant="destructive" className="max-w-md mx-auto mt-4">
          {errorMessage}
        </Alert>
      )}
      
      {activeTab === "login" ? (
        <LoginForm />
      ) : (
        <SignupForm />
      )}
      
      <div className="fixed bottom-0 left-0 right-0 z-20 p-4 text-center text-white/70 text-xs">
        &copy; {new Date().getFullYear()} MannVFX. All rights reserved.
      </div>
    </div>
  );
};

export default Auth;
