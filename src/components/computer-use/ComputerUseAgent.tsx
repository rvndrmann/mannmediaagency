
import { useState, useRef, useEffect } from "react";
import { BrowserAutomationAgent } from "./BrowserAutomationAgent";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useUser } from "@/hooks/use-user";

export function ComputerUseAgent() {
  const { user, isLoading } = useUser();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clear any errors when the component loads
  useEffect(() => {
    setErrorMessage(null);
  }, []);

  // Show a loading state while checking auth
  if (isLoading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <h1 className="text-2xl font-bold mb-4">Computer Use Agent</h1>
        
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription className="mt-2">
            <p>You need to be signed in to use the Computer Agent.</p>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/auth/login">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="relative">
      {errorMessage && (
        <Alert variant="destructive" className="mb-4 mx-auto max-w-4xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      <BrowserAutomationAgent />
    </div>
  );
}
