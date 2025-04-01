
import React from 'react';
import { ProductShootLayout } from '@/components/product-shoot-v2/ProductShootLayout';
import { useProductShoot } from '@/hooks/use-product-shoot';
import { adaptProductShootProps } from '@/components/product-shoot/ProductShootAdapter';

export default function ProductShootV2() {
  const productShootHook = useProductShoot();
  
  // Fix the retryStatusCheck to return a boolean instead of void
  const hookWithFixedRetry = {
    ...productShootHook,
    retryStatusCheck: async (imageId: string): Promise<boolean> => {
      try {
        await productShootHook.retryStatusCheck(imageId);
        return true;
      } catch (error) {
        console.error("Error retrying status check:", error);
        return false;
      }
    }
  };
  
  // Use the adapter to provide default implementations for missing methods
  const adaptedProps = adaptProductShootProps(hookWithFixedRetry);
  
  return <ProductShootLayout {...adaptedProps} />;
}
