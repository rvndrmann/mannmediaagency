
# SQL Functions for Admin Dashboard

These SQL files contain RPC (Remote Procedure Call) functions that need to be executed in the Supabase SQL Editor to enable the Admin Dashboard functionality.

## Instructions

1. Go to the Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the content of each SQL file in this directory
4. Execute the SQL commands to create the functions

## Files

- `admin_check_rpc.sql` - Function to check if a user is an admin
- `admin_user_rpc.sql` - Functions to manage admin users
- `custom_order_rpc.sql` - Functions for custom order management
- `rpc_functions.sql` - General utility functions for the admin dashboard

## Important

After executing these SQL functions, you need to add at least one admin user to the `admin_users` table. You can do this manually in the Supabase Table Editor or via SQL:

```sql
INSERT INTO admin_users (user_id)
VALUES ('your-user-id-here');
```

Replace 'your-user-id-here' with the actual user ID from your profiles table.
