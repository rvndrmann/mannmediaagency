import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Placeholder component for trace data
// In the future, this should be wired up to a real traces table
interface TraceDashboardProps {
  runId?: string;
}

interface TraceData {
  id: string;
  name: string;
  created_at: string;
  spans?: any[];
}

export function TraceDashboard({ runId }: TraceDashboardProps) {
  const [traces, setTraces] = useState<TraceData[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<TraceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // In the real implementation, fetch traces data from a proper table
    // For now just set placeholder to prevent build errors
    setTraces([{
      id: '1',
      name: 'Placeholder Trace',
      created_at: new Date().toISOString(),
      spans: []
    }]);
  }, [runId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Traces</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : traces.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {traces.map((trace) => (
                  <Button
                    key={trace.id}
                    variant={selectedTrace?.id === trace.id ? "default" : "outline"}
                    className="w-full justify-start text-left"
                    onClick={() => setSelectedTrace(trace)}
                  >
                    <div className="flex flex-col">
                      <span>{trace.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(trace.created_at).toLocaleString()}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex justify-center items-center h-[300px] text-center text-muted-foreground">
              <div>
                <p>No traces available for this run</p>
                <p className="text-sm">Tracing feature coming soon</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Trace Details</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedTrace ? (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-medium">{selectedTrace.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(selectedTrace.created_at).toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                {/* Placeholder for span data */}
                <p className="text-muted-foreground">Trace details will be displayed here.</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-[400px] text-center text-muted-foreground">
              <p>Select a trace to view details</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
