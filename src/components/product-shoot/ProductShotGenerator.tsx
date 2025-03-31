
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export function ProductShotGenerator() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImageUrl, setProductImageUrl] = useState<string>('');
  const [productDescription, setProductDescription] = useState<string>('');
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [placementType, setPlacementType] = useState<string>('automatic');
  const [backgroundType, setBackgroundType] = useState<string>('studio');
  const [backgroundDescription, setBackgroundDescription] = useState<string>('');
  const [enhanceQuality, setEnhanceQuality] = useState<boolean>(true);
  const [customStyle, setCustomStyle] = useState<string>('');
  
  const handleProductImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setProductImage(file);
      setProductImageUrl(URL.createObjectURL(file));
    }
  };
  
  const handleReferenceImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      const newReferenceImages = [...referenceImages, ...filesArray];
      setReferenceImages(newReferenceImages);
      
      const newUrls = filesArray.map(file => URL.createObjectURL(file));
      setReferenceImageUrls([...referenceImageUrls, ...newUrls]);
    }
  };
  
  const removeReferenceImage = (index: number) => {
    const newReferenceImages = [...referenceImages];
    newReferenceImages.splice(index, 1);
    setReferenceImages(newReferenceImages);
    
    const newUrls = [...referenceImageUrls];
    URL.revokeObjectURL(newUrls[index]);
    newUrls.splice(index, 1);
    setReferenceImageUrls(newUrls);
  };
  
  const uploadImageToStorage = async (file: File, prefix: string = 'product'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${prefix}_${uuidv4()}.${fileExt}`;
    const filePath = `${prefix}/${fileName}`;
    
    const { error } = await supabase.storage
      .from('product_photos')
      .upload(filePath, file);
      
    if (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Error uploading file: ${error.message}`);
    }
    
    const { data } = supabase.storage
      .from('product_photos')
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  };
  
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productImage && !productDescription) {
      toast({
        title: "Missing information",
        description: "Please upload a product image or provide a description",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // First upload the product image if available
      let productImageUploadedUrl = '';
      if (productImage) {
        setIsUploading(true);
        productImageUploadedUrl = await uploadImageToStorage(productImage);
        setIsUploading(false);
      }
      
      // Upload any reference images
      const referenceImageUrls: string[] = [];
      if (referenceImages.length > 0) {
        setIsUploading(true);
        for (const refImage of referenceImages) {
          const refUrl = await uploadImageToStorage(refImage, 'reference');
          referenceImageUrls.push(refUrl);
        }
        setIsUploading(false);
      }
      
      // Create the request payload
      const requestId = uuidv4();
      const requestPayload = {
        requestId,
        source: 'bria',
        productImageUrl: productImageUploadedUrl,
        productDescription,
        referenceImageUrls,
        placementType,
        backgroundType,
        backgroundDescription,
        enhanceQuality,
        customStyle
      };
      
      // Call the serverless function to start generation
      const { error } = await supabase.functions.invoke('generate-product-shot', {
        body: requestPayload
      });
      
      if (error) {
        throw new Error(`Error generating product shot: ${error.message}`);
      }
      
      toast({
        title: "Generation started",
        description: "Your product shot is being generated. It will appear in the results panel soon."
      });
      
    } catch (error) {
      console.error('Error in handleGenerate:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
      setIsGenerating(false);
    }
  };
  
  return (
    <Card className="w-full bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Product Shot Generator</CardTitle>
        <CardDescription className="text-gray-400">
          Upload your product image or provide a description to generate professional product shots
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleGenerate} className="space-y-6">
          <Tabs defaultValue="upload">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="upload" className="flex-1">Upload Image</TabsTrigger>
              <TabsTrigger value="description" className="flex-1">Describe Product</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
              <div className="flex flex-col items-center justify-center p-6 border border-dashed border-gray-700 rounded-lg bg-gray-800/50">
                {productImageUrl ? (
                  <div className="relative w-full h-52">
                    <img 
                      src={productImageUrl} 
                      className="w-full h-full object-contain" 
                      alt="Product" 
                    />
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm" 
                      className="absolute top-2 right-2"
                      onClick={() => {
                        URL.revokeObjectURL(productImageUrl);
                        setProductImage(null);
                        setProductImageUrl('');
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="h-12 w-12 text-gray-600 mb-2" />
                    <Label 
                      htmlFor="product-image-upload"
                      className="text-sm text-white font-medium cursor-pointer hover:text-blue-400 transition-colors"
                    >
                      Click to select your product image
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, or WebP. Max 5MB.</p>
                  </>
                )}
                <Input 
                  id="product-image-upload" 
                  type="file" 
                  accept="image/png,image/jpeg,image/webp" 
                  className="hidden" 
                  onChange={handleProductImageUpload}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="description" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product-description">Product Description</Label>
                <Textarea 
                  id="product-description" 
                  placeholder="Describe your product in detail..."
                  className="h-32 bg-gray-800 border-gray-700"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="placement-type">Placement Type</Label>
                <Select 
                  defaultValue={placementType}
                  onValueChange={setPlacementType}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Select placement type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">Automatic</SelectItem>
                    <SelectItem value="centered">Centered</SelectItem>
                    <SelectItem value="floating">Floating</SelectItem>
                    <SelectItem value="angled">Angled View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="background-type">Background Type</Label>
                <Select 
                  defaultValue={backgroundType}
                  onValueChange={setBackgroundType}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Select background type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="environmental">Environmental</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {backgroundType === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="background-description">Background Description</Label>
                <Textarea 
                  id="background-description" 
                  placeholder="Describe the custom background..."
                  className="h-20 bg-gray-800 border-gray-700"
                  value={backgroundDescription}
                  onChange={(e) => setBackgroundDescription(e.target.value)}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="reference-images">Reference Images (Optional)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {referenceImageUrls.map((url, index) => (
                  <div key={index} className="relative w-16 h-16">
                    <img 
                      src={url} 
                      className="w-full h-full object-cover rounded" 
                      alt={`Reference ${index + 1}`} 
                    />
                    <Button
                      type="button" 
                      variant="destructive" 
                      size="icon" 
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                      onClick={() => removeReferenceImage(index)}
                    >
                      &times;
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => document.getElementById('reference-image-upload')?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Add References
                </Button>
                <Input 
                  id="reference-image-upload" 
                  type="file" 
                  accept="image/png,image/jpeg,image/webp" 
                  multiple
                  className="hidden" 
                  onChange={handleReferenceImageUpload}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="enhance-quality" className="text-sm font-medium">
                  Enhance Quality
                </Label>
                <span className="text-xs text-gray-400">
                  Improve lighting and details
                </span>
              </div>
              <Switch
                id="enhance-quality"
                checked={enhanceQuality}
                onCheckedChange={setEnhanceQuality}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="custom-style">Custom Style (Optional)</Label>
              <Textarea 
                id="custom-style" 
                placeholder="Describe any specific styling requirements..."
                className="h-20 bg-gray-800 border-gray-700"
                value={customStyle}
                onChange={(e) => setCustomStyle(e.target.value)}
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full gap-2" 
          onClick={handleGenerate}
          disabled={isGenerating || isUploading || (!productImage && !productDescription)}
        >
          <Sparkles className="h-4 w-4" />
          {isGenerating ? 'Generating...' : 'Generate Product Shot'}
        </Button>
      </CardFooter>
    </Card>
  );
}
