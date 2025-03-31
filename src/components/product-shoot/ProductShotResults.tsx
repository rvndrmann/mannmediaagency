
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Share2, RefreshCw } from 'lucide-react';
import { ProductShotResult } from '@/types/product-shoot';

interface ProductShotResultsProps {
  results: ProductShotResult[];
  isGenerating: boolean;
  onRetry: () => void;
}

export function ProductShotResults({ results, isGenerating, onRetry }: ProductShotResultsProps) {
  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `product-shot-${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleShare = async (imageUrl: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this product shot',
          text: 'Generated with ProductShot AI',
          url: imageUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(imageUrl);
      alert('URL copied to clipboard!');
    }
  };
  
  return (
    <Card className="w-full h-full bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Results</CardTitle>
      </CardHeader>
      <CardContent>
        {isGenerating && results.length === 0 ? (
          <div className="space-y-6">
            <div className="text-center text-gray-400 py-4">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Generating your product shots...</p>
              <p className="text-xs mt-2">This may take up to 30 seconds</p>
            </div>
            <div className="space-y-4">
              <Skeleton className="w-full h-48 bg-gray-800" />
              <Skeleton className="w-full h-48 bg-gray-800" />
            </div>
          </div>
        ) : results.length > 0 ? (
          <Tabs defaultValue="results">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="results" className="flex-1">All Results</TabsTrigger>
              <TabsTrigger value="comparison" className="flex-1">Before/After</TabsTrigger>
            </TabsList>
            
            <TabsContent value="results">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {results.map((result, index) => (
                    <div key={index} className="space-y-2">
                      <div className="relative rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
                        <img 
                          src={result.resultUrl} 
                          alt={`Product shot ${index + 1}`}
                          className="w-full object-contain"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDownload(result.resultUrl, index)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleShare(result.resultUrl)}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        <p>Using {result.placementType} placement</p>
                        {result.metadata && (
                          <p className="mt-1">
                            Generated with {result.metadata.model} ({result.metadata.size})
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="comparison">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {results.map((result, index) => (
                    <div key={index} className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
                          <img 
                            src={result.inputUrl} 
                            alt="Original product"
                            className="w-full h-full object-contain"
                          />
                          <div className="bg-black/70 p-2 text-xs text-center">
                            Original
                          </div>
                        </div>
                        <div className="rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
                          <img 
                            src={result.resultUrl} 
                            alt="Generated product shot"
                            className="w-full h-full object-contain"
                          />
                          <div className="bg-black/70 p-2 text-xs text-center">
                            Generated
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p className="mb-4">No results yet</p>
            <p className="text-sm mb-4">Use the form on the left to generate product shots</p>
            
            {!isGenerating && (
              <Button 
                variant="outline" 
                onClick={onRetry} 
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Check for results
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
