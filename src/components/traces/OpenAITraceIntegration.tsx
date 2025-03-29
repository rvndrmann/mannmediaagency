
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function OpenAITraceIntegration() {
  const [status, setStatus] = useState<'not-configured' | 'configured' | 'error'>('not-configured');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  useEffect(() => {
    const tracesEnabled = import.meta.env.VITE_OPENAI_TRACES_ENABLED === 'true';
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (tracesEnabled && apiKey) {
      // Verify the API key has traces permissions
      fetch('https://api.openai.com/v1/traces/health', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        if (response.ok) {
          setStatus('configured');
        } else {
          setStatus('error');
          setErrorMessage('API key does not have traces permission');
        }
      })
      .catch(err => {
        setStatus('error');
        setErrorMessage(err.message || 'Failed to verify API key');
      });
    } else {
      setStatus('not-configured');
    }
  }, []);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          OpenAI Traces Integration
          {status === 'configured' ? (
            <Badge variant="outline" className="ml-2 bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" /> Configured
            </Badge>
          ) : status === 'error' ? (
            <Badge variant="outline" className="ml-2 bg-red-100 text-red-800">
              <AlertCircle className="h-3 w-3 mr-1" /> Error
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800">
              Not Configured
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Send trace data to OpenAI to view detailed analytics in their dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'configured' ? (
          <p className="text-sm text-muted-foreground mb-4">
            Your multi-agent chat is configured to send trace data to the OpenAI dashboard.
            You can view your traces in the OpenAI dashboard to analyze conversation flows and agent behavior.
          </p>
        ) : status === 'error' ? (
          <div className="bg-red-50 p-4 rounded-md text-sm text-red-800">
            <h4 className="font-medium mb-2">Error with OpenAI Traces Configuration:</h4>
            <p>{errorMessage || 'There was an error configuring OpenAI traces.'}</p>
            <p className="mt-2">Please check your API key has the required permissions for tracing.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Your multi-agent chat is currently storing trace data only in your Supabase database. 
              To view traces in the OpenAI dashboard, you need to configure the OpenAI Traces integration.
            </p>
            <div className="bg-slate-50 p-4 rounded-md text-sm">
              <h4 className="font-medium mb-2">Configuration Steps:</h4>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Get an OpenAI API key with traces permission from your OpenAI dashboard</li>
                <li>Add the API key to your environment variables as <code className="bg-slate-100 px-1 py-0.5 rounded">VITE_OPENAI_API_KEY</code></li>
                <li>Set <code className="bg-slate-100 px-1 py-0.5 rounded">VITE_OPENAI_TRACES_ENABLED=true</code> in your environment</li>
                <li>Restart your application</li>
              </ol>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="gap-2" onClick={() => window.open('https://platform.openai.com/docs/guides/tracing', '_blank')}>
          OpenAI Tracing Documentation
          <ExternalLink className="h-4 w-4" />
        </Button>
        {status === 'configured' && (
          <Button className="ml-2 gap-2" onClick={() => window.open('https://platform.openai.com/traces', '_blank')}>
            View Your Traces
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
