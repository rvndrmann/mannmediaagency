
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, RefreshCw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { ProductShotResult } from "@/types/product-shoot";

interface ProductShotResultsProps {
  results: ProductShotResult[];
  isGenerating: boolean;
  onRetry: (id: string) => void;
}

export function ProductShotResults({ results, isGenerating, onRetry }: ProductShotResultsProps) {
  const [activeTab, setActiveTab] = useState<string>("latest");
  const [isCopying, setIsCopying] = useState<boolean>(false);

  // Sort results to have latest first
  const sortedResults = [...results].sort((a, b) => {
    return new Date(b.metadata?.processingTime || 0).getTime() - 
           new Date(a.metadata?.processingTime || 0).getTime();
  });

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `product-shot-${new Date().getTime()}-${index}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Image downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download image");
    }
  };

  const handleShare = async (imageUrl: string) => {
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(imageUrl);
      toast.success("Image URL copied to clipboard");
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Failed to copy image URL");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Card className="p-6 bg-gray-900 border-gray-800">
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white">Generated Results</h2>
        
        {results.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {isGenerating ? 
              "Generating your product shot..." : 
              "No images generated yet. Upload a product image and generate your first shot!"}
          </div>
        ) : (
          <Tabs defaultValue="latest" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="latest">Latest</TabsTrigger>
              <TabsTrigger value="all">All Results ({results.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="latest" className="mt-4">
              {sortedResults.length > 0 && (
                <div className="relative group">
                  <img 
                    src={sortedResults[0].resultUrl} 
                    alt="Latest product shot" 
                    className="w-full rounded-lg object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center">
                    <div className="text-white text-sm">
                      {sortedResults[0].description && (
                        <p className="truncate max-w-[200px]">{sortedResults[0].description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDownload(sortedResults[0].resultUrl, 0)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleShare(sortedResults[0].resultUrl)}
                        disabled={isCopying}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="all" className="mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sortedResults.map((result, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={result.resultUrl} 
                      alt={`Product shot ${index}`} 
                      className="w-full rounded-lg object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center">
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDownload(result.resultUrl, index)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleShare(result.resultUrl)}
                          disabled={isCopying}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => onRetry(result.resultUrl.split('/').pop() || '')}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Card>
  );
}
