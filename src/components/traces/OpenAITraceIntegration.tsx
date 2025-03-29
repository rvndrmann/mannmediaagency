
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

export function OpenAITraceIntegration() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          OpenAI Traces Integration
          <div className="ml-2 text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">Not Configured</div>
        </CardTitle>
        <CardDescription>
          Send trace data to OpenAI to view detailed analytics in their dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Your multi-agent chat is currently storing trace data only in your Supabase database. 
          To view traces in the OpenAI dashboard, you need to configure the OpenAI Traces integration.
        </p>
        <div className="bg-slate-50 p-4 rounded-md text-sm">
          <h4 className="font-medium mb-2">Configuration Steps:</h4>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Get an OpenAI API key with traces permission from your OpenAI dashboard</li>
            <li>Add the API key to your environment variables</li>
            <li>Set <code className="bg-slate-100 px-1 py-0.5 rounded">NEXT_PUBLIC_OPENAI_TRACES_ENABLED=true</code> in your environment</li>
            <li>Restart your application</li>
          </ol>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="gap-2" onClick={() => window.open('https://platform.openai.com/docs/guides/tracing', '_blank')}>
          OpenAI Tracing Documentation
          <ExternalLink className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
