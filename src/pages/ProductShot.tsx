
import React from 'react';
import { ProductShotGenerator } from '@/components/product-shoot/ProductShotGenerator';
import { useProductShoot } from '@/hooks/use-product-shoot';
import { adaptProductShootProps } from '@/components/product-shoot/ProductShootAdapter';

export default function ProductShot() {
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
  
  return <ProductShotGenerator {...adaptedProps} />;
}
