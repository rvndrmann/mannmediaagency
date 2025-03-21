
// SQL function to create the custom_agents table
const createCustomAgentsTableSQL = `
  CREATE OR REPLACE FUNCTION create_custom_agents_table()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
    -- Check if the table already exists
    IF NOT EXISTS (
      SELECT FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'custom_agents'
    ) THEN
      -- Create the table
      CREATE TABLE public.custom_agents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        instructions TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      -- Set up RLS
      ALTER TABLE public.custom_agents ENABLE ROW LEVEL SECURITY;
      
      -- Create policies
      CREATE POLICY "Users can view their own custom agents"
        ON public.custom_agents
        FOR SELECT
        USING (auth.uid() = user_id);
        
      CREATE POLICY "Users can create their own custom agents"
        ON public.custom_agents
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);
        
      CREATE POLICY "Users can update their own custom agents"
        ON public.custom_agents
        FOR UPDATE
        USING (auth.uid() = user_id);
        
      CREATE POLICY "Users can delete their own custom agents"
        ON public.custom_agents
        FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
  END;
  $$;
`;

// Execute the function
const executeSQLFunction = async (client, sql) => {
  await client.query(sql);
};

// Export the function for use in Supabase
export const createCustomAgentsTable = async (client) => {
  try {
    await executeSQLFunction(client, createCustomAgentsTableSQL);
    return { success: true };
  } catch (error) {
    console.error('Error creating custom_agents table:', error);
    return { success: false, error: error.message };
  }
};
