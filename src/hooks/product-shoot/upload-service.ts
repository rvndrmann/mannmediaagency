
import { supabase } from "@/integrations/supabase/client";

export async function uploadSourceImage(file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('source_images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('source_images')
    .getPublicUrl(fileName);

  return publicUrl;
}

export async function uploadReferenceImage(file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `ref_${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('source_images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Failed to upload reference image: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('source_images')
    .getPublicUrl(fileName);

  return publicUrl;
}

export async function uploadProductImage(file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `product_${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('product_images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Failed to upload product image: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('product_images')
    .getPublicUrl(fileName);

  return publicUrl;
}
