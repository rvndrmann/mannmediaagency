
import { ManusComputerAgent } from "./ManusComputerAgent";
import { useEffect, useState, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function ComputerUseAgent() {
  const [browserInitialized, setBrowserInitialized] = useState<boolean>(false);
  
  useEffect(() => {
    // Initialize browser state
    if (!browserInitialized) {
      setBrowserInitialized(true);
    }
  }, [browserInitialized]);
  
  return (
    <div className="relative">
      <ManusComputerAgent />
    </div>
  );
}
