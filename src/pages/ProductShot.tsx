
import React from 'react';
import { ProductShotGenerator } from '@/components/product-shoot/ProductShotGenerator';
import { useProductShoot } from '@/hooks/use-product-shoot';
import { adaptProductShootProps } from '@/components/product-shoot/ProductShootAdapter';

export default function ProductShot() {
  const productShootHook = useProductShoot();
  
  // Use the adapter to provide default implementations for missing methods
  const adaptedProps = adaptProductShootProps(productShootHook);
  
  return <ProductShotGenerator {...adaptedProps} />;
}
