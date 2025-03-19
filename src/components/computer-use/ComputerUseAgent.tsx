
import { ManusComputerAgent } from "./ManusComputerAgent";
import { useEffect, useState, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function ComputerUseAgent() {
  const [browserInitialized, setBrowserInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Initialize browser state
    if (!browserInitialized) {
      setBrowserInitialized(true);
    }
  }, [browserInitialized]);
  
  return (
    <div className="relative">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </Alert>
      )}
      <ManusComputerAgent onError={(errorMessage) => setError(errorMessage)} />
    </div>
  );
}
