
import React from 'react';
import { ProductShootLayout } from '@/components/product-shoot-v2/ProductShootLayout';
import { useProductShoot } from '@/hooks/use-product-shoot';
import { adaptProductShootProps } from '@/components/product-shoot/ProductShootAdapter';

export default function ProductShootV2() {
  const productShootHook = useProductShoot();
  
  // Use the adapter to provide default implementations for missing methods
  const adaptedProps = adaptProductShootProps(productShootHook);
  
  return <ProductShootLayout {...adaptedProps} />;
}
