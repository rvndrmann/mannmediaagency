import React, { ChangeEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AspectRatio, ProductShotFormData } from '@/types/product-shoot';
import { ProductShotFormProps } from './types';

export function ProductShotForm({ 
  onSubmit, 
  isSubmitting, 
  availableCredits, 
  isLoading = false, 
  formData = {
    sourceFile: null as unknown as File,
    sceneDescription: '',
    generationType: 'description' as const,
    placementType: 'automatic' as const,
    manualPlacement: '',
    optimizeDescription: true,
    fastMode: false,
    originalQuality: true,
    aspectRatio: '1:1' as AspectRatio
  }, 
  onCancel = () => {} 
}: ProductShotFormProps) {
  const [form, setForm] = useState<ProductShotFormData>(formData);
  const [sourceFilePreview, setSourceFilePreview] = useState<string | null>(null);
  const [referenceFilePreview, setReferenceFilePreview] = useState<string | null>(null);

  const handleChange = (name: keyof ProductShotFormData, value: any) => {
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const handleSourceFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      handleChange('sourceFile', file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setSourceFilePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReferenceFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      handleChange('referenceFile', file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setReferenceFilePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}>
          <div className="space-y-6">
            <div>
              <Label htmlFor="sourceFile">Product Image</Label>
              <div className="mt-2">
                <Input
                  id="sourceFile"
                  type="file"
                  accept="image/*"
                  onChange={handleSourceFileChange}
                  disabled={isLoading}
                />
              </div>
              {sourceFilePreview && (
                <div className="mt-2 relative aspect-video w-full max-w-[200px] overflow-hidden rounded-md border">
                  <img
                    src={sourceFilePreview}
                    alt="Product preview"
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Generation Type</Label>
              <RadioGroup 
                value={form.generationType} 
                onValueChange={(value) => handleChange('generationType', value)}
                className="flex flex-col space-y-3 mt-2"
                disabled={isLoading}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="description" id="description" />
                  <Label htmlFor="description" className="cursor-pointer">Use description</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reference" id="reference" />
                  <Label htmlFor="reference" className="cursor-pointer">Use reference image</Label>
                </div>
              </RadioGroup>
            </div>

            {form.generationType === 'description' ? (
              <div>
                <Label htmlFor="sceneDescription">Scene Description</Label>
                <Textarea
                  id="sceneDescription"
                  placeholder="Describe the scene where your product should be placed..."
                  value={form.sceneDescription}
                  onChange={(e) => handleChange('sceneDescription', e.target.value)}
                  className="mt-2"
                  rows={4}
                  disabled={isLoading}
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="referenceFile">Reference Image</Label>
                <div className="mt-2">
                  <Input
                    id="referenceFile"
                    type="file"
                    accept="image/*"
                    onChange={handleReferenceFileChange}
                    disabled={isLoading}
                  />
                </div>
                {referenceFilePreview && (
                  <div className="mt-2 relative aspect-video w-full max-w-[200px] overflow-hidden rounded-md border">
                    <img
                      src={referenceFilePreview}
                      alt="Reference preview"
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>Placement Type</Label>
              <RadioGroup 
                value={form.placementType} 
                onValueChange={(value) => handleChange('placementType', value)}
                className="flex flex-col space-y-3 mt-2"
                disabled={isLoading}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="original" id="original" />
                  <Label htmlFor="original" className="cursor-pointer">Keep original background</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="automatic" id="automatic" />
                  <Label htmlFor="automatic" className="cursor-pointer">Automatic placement</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual_placement" id="manual_placement" />
                  <Label htmlFor="manual_placement" className="cursor-pointer">Manual placement</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual_padding" id="manual_padding" />
                  <Label htmlFor="manual_padding" className="cursor-pointer">Manual padding</Label>
                </div>
              </RadioGroup>
            </div>

            {(form.placementType === 'manual_placement' || form.placementType === 'manual_padding') && (
              <div>
                <Label htmlFor="manualPlacement">Position Instructions</Label>
                <Textarea
                  id="manualPlacement"
                  placeholder="Describe how the product should be positioned..."
                  value={form.manualPlacement}
                  onChange={(e) => handleChange('manualPlacement', e.target.value)}
                  className="mt-2"
                  rows={2}
                  disabled={isLoading}
                />
              </div>
            )}

            <div>
              <Label>Aspect Ratio</Label>
              <Tabs 
                defaultValue={form.aspectRatio} 
                className="mt-2"
                onValueChange={(value) => handleChange('aspectRatio', value as AspectRatio)}
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="1:1">Square (1:1)</TabsTrigger>
                  <TabsTrigger value="16:9">Landscape (16:9)</TabsTrigger>
                  <TabsTrigger value="9:16">Portrait (9:16)</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="optimizeDescription" 
                  checked={form.optimizeDescription}
                  onCheckedChange={(checked) => handleChange('optimizeDescription', checked)}
                  disabled={isLoading}
                />
                <Label htmlFor="optimizeDescription">Optimize description with AI</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="fastMode" 
                  checked={form.fastMode}
                  onCheckedChange={(checked) => handleChange('fastMode', checked)}
                  disabled={isLoading}
                />
                <Label htmlFor="fastMode">Fast mode (lower quality)</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="originalQuality" 
                  checked={form.originalQuality}
                  onCheckedChange={(checked) => handleChange('originalQuality', checked)}
                  disabled={isLoading}
                />
                <Label htmlFor="originalQuality">Original quality</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={onCancel} disabled={isLoading || isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || isSubmitting || !form.sourceFile}>
                {isLoading || isSubmitting ? 'Generating...' : 'Generate Product Shot'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
