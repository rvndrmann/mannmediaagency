
import { supabase } from '@/integrations/supabase/client';

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Forward the request to the Supabase edge function
    const { data, error } = await supabase.functions.invoke('execute-tool', {
      body: JSON.stringify(req.body),
    });

    if (error) {
      console.error('Error invoking execute-tool function:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('API route error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
