
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Link, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const ResearchTab = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${(supabase.functions as any).url}/analyze-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ url }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to analyze URL');
      }

      toast({
        title: "Success",
        description: "URL analyzed successfully",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to analyze URL",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${(supabase.functions as any).url}/analyze-file`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to analyze file');
      }

      toast({
        title: "Success",
        description: "File analyzed successfully",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to analyze file",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Add Research Material</h3>
        <form onSubmit={handleUrlSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL to analyze..."
              type="url"
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              <Link className="h-4 w-4 mr-2" />
              Analyze
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Upload Files</h3>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="file"
              onChange={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx"
              className="flex-1"
            />
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
