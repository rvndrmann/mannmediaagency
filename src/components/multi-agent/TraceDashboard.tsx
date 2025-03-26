import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface TraceMetadata {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  status: string;
}

export function TraceDashboard({ userId }: { userId: string }) {
  const [traces, setTraces] = useState<any[]>([]);
  const [traceMetadata, setTraceMetadata] = useState<TraceMetadata | null>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [traceSpans, setTraceSpans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTraces();
  }, [userId]);

  const fetchTraces = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("traces")
        .select("*")
        .eq("user_id", userId)
        .order("timestamp", { ascending: false });

      if (error) {
        console.error("Error fetching traces:", error);
      } else {
        setTraces(data || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const viewTrace = async (traceId: string) => {
    setSelectedTraceId(traceId);
    try {
      const { data, error } = await supabase
        .from("traces")
        .select("*")
        .eq("trace_id", traceId)
        .single();

      if (error) {
        console.error("Error fetching trace:", error);
        return;
      }

      if (data && data.trace && data.trace.spans) {
        const rootSpan = data.trace.spans.find(span => !span.parent_id);
        if (rootSpan) {
          setTraceMetadata({
            id: data.trace.trace_id,
            name: rootSpan.name,
            startTime: rootSpan.start_time,
            endTime: rootSpan.end_time,
            status: rootSpan.status
          });
        }
      }

      setTraceSpans(data?.trace?.spans || []);
    } catch (error) {
      console.error("Error viewing trace:", error);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
      {/* Trace List */}
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Traces</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[80vh] pr-2">
              {isLoading ? (
                <div className="p-4">
                  <Skeleton className="h-10 w-full mb-2" />
                  <Skeleton className="h-10 w-full mb-2" />
                  <Skeleton className="h-10 w-full mb-2" />
                </div>
              ) : (
                traces.map((item, index) => (
                  item && (
                    <div className="p-4 border rounded-md mb-4 hover:border-blue-500 cursor-pointer" onClick={() => viewTrace(item.trace_id)}>
                      <h3 className="font-medium">{item.metadata?.name || 'Unnamed Trace'}</h3>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>ID: {item.trace_id}</span>
                        <span>{formatDate(item.timestamp)}</span>
                      </div>
                    </div>
                  )
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Trace Details */}
      <div className="md:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Trace Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTraceId ? (
              <>
                {traceMetadata && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium">{traceMetadata.name}</h3>
                    <div className="flex space-x-2 mb-2">
                      <Badge variant="secondary">ID: {traceMetadata.id}</Badge>
                      <Badge variant="secondary">Status: {traceMetadata.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      Start: {formatDate(traceMetadata.startTime)}
                    </p>
                    <p className="text-sm text-gray-500">
                      End: {formatDate(traceMetadata.endTime)}
                    </p>
                  </div>
                )}
                <ScrollArea className="h-[70vh] pr-2">
                  {traceSpans.map((item, index) => (
                    item && (
                      <div key={index} className="p-4 border rounded-md mb-4">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm">Duration: {item.duration_ms}ms</p>
                        <p className="text-sm text-gray-500">Started at: {formatDate(item.start_time)}</p>
                        <p className="text-sm">{item.details}</p>
                      </div>
                    )
                  ))}
                </ScrollArea>
              </>
            ) : (
              <p className="text-center text-gray-500">Select a trace to view details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
