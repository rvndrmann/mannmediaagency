
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = React.useState<any>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  React.useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-6 md:mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="mr-4 text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl md:text-2xl font-bold text-white">Profile</h1>
        </div>
        
        <div className="text-white">
          {user ? (
            <div>
              <p>Email: {user.email}</p>
              <Button
                disabled={isSigningOut}
                onClick={() => {
                  setIsSigningOut(true);
                  setTimeout(() => supabase.auth.signOut(), 1500);
                }}
                className="mt-4 bg-red-500 hover:bg-red-600"
              >
                {isSigningOut ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          ) : (
            <p>Loading user information...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
