-- Function to automatically update 'updated_at' columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Comment on the function
COMMENT ON FUNCTION public.update_updated_at_column()
IS 'Trigger function to automatically set updated_at to the current timestamp on row update';