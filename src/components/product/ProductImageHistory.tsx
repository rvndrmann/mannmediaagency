import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ImageGenerationJob {
  id: string;
  prompt: string;
  result_url: string;
  created_at: string;
  product_image_metadata: {
    seo_title: string;
    instagram_hashtags: string;
  };
}

const ProductImageHistory = () => {
  const [images, setImages] = useState<ImageGenerationJob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchImages = async () => {
      // Fix the type conversion issue by correctly mapping the data
      // Update where you access the product_image_metadata
      const { data, error } = await supabase
        .from("image_generation_jobs")
        .select(`
          id,
          prompt,
          result_url,
          created_at,
          product_image_metadata (
            seo_title,
            instagram_hashtags
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Instead of direct assignment, map the data to the expected type
      const mappedData = data ? data.map(item => {
        return {
          id: item.id,
          prompt: item.prompt,
          result_url: item.result_url,
          created_at: item.created_at,
          product_image_metadata: item.product_image_metadata && item.product_image_metadata.length > 0 
            ? {
                seo_title: item.product_image_metadata[0].seo_title,
                instagram_hashtags: item.product_image_metadata[0].instagram_hashtags
              }
            : {
                seo_title: '',
                instagram_hashtags: ''
              }
        };
      }) : [];

      setImages(mappedData as ImageGenerationJob[]);
    };

    fetchImages();
  }, []);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${type} copied to clipboard`,
    });
  };

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {images.map((image) => (
        <Card key={image.id} className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">{image.prompt}</CardTitle>
            <CardDescription className="text-gray-400">
              Created at {new Date(image.created_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <img
                src={image.result_url}
                alt={image.prompt}
                className="w-full rounded-md aspect-square object-cover"
              />
            </div>
            <div className="mt-4 space-y-2">
              <div>
                <h4 className="text-sm font-bold text-gray-300">SEO Title</h4>
                <div className="flex items-center justify-between">
                  <p className="text-gray-400">{image.product_image_metadata.seo_title || 'N/A'}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(image.product_image_metadata.seo_title, 'SEO Title')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-300">Instagram Hashtags</h4>
                <div className="flex items-center justify-between">
                  <p className="text-gray-400">{image.product_image_metadata.instagram_hashtags || 'N/A'}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(image.product_image_metadata.instagram_hashtags, 'Hashtags')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProductImageHistory;
