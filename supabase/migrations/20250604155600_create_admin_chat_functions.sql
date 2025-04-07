-- Migration: Create RPC functions for Admin Chat Feature

-- Function 1: Get users with chat history relevant to admin
-- Returns users who have sent messages or received messages from an admin.
-- Includes latest message snippet and timestamp for display.
create or replace function get_chat_users()
returns table (
    id uuid,
    name text,
    avatarUrl text,
    lastMessageSnippet text,
    lastMessageTimestamp timestamptz
)
language plpgsql
security definer -- Use definer security to check admin status internally
set search_path = public
as $$
begin
  -- Ensure the caller is an admin
  if not check_is_admin() then
    raise exception 'Permission denied: User is not an admin.';
  end if;

  return query
  with relevant_users as (
    -- Users who sent messages OR were targeted by an admin message
    select distinct user_id from public.chat_messages where user_id is not null
    union
    select distinct (metadata->>'target_user_id')::uuid from public.chat_messages where role = 'assistant' and metadata ? 'target_user_id' -- Assuming admin sends as 'assistant' and stores target in metadata
  ),
  latest_messages as (
    -- Get the latest message for each relevant user interaction
    select
      distinct on (coalesce(m.user_id, (m.metadata->>'target_user_id')::uuid))
      coalesce(m.user_id, (m.metadata->>'target_user_id')::uuid) as participant_id,
      m.message as last_message_content, -- Changed from content to message
      m.created_at as last_message_time
    from public.chat_messages m
    join relevant_users ru on coalesce(m.user_id,  (m.metadata->>'user_id')::uuid, (m.metadata->>'target_user_id')::uuid) = ru.id
    order by coalesce(m.user_id, (m.metadata->>'target_user_id')::uuid), m.created_at desc
  )
  select
    ru.id,
    ru.id::text as name, -- Use user ID as name for now
    null::text as avatarUrl, -- Set avatarUrl to null for now
    lm.last_message_content as lastMessageSnippet,
    lm.last_message_time as lastMessageTimestamp
  from relevant_users ru
  -- Removed join to non-existent profiles table
  -- left join profiles p on ru.id = p.id
  left join latest_messages lm on ru.id = lm.participant_id
  order by lm.last_message_time desc nulls last; -- Show most recent chats first

end;
$$;

-- Function 2: Get messages for a specific user conversation (user <-> admin)
create or replace function get_user_messages(p_user_id uuid)
returns table (
    id uuid,
    session_id uuid,
    sender text,
    message text,
    created_at timestamptz,
    user_id uuid,
    project_id uuid -- Add project_id to the result set
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ensure the caller is an admin
  if not check_is_admin() then
    raise exception 'Permission denied: User is not an admin.';
  end if;

  return query
  select
    m.id,
    m.session_id,
    m.sender,
    m.message,
    m.created_at,
    m.user_id,
    (m.metadata->>'project_id')::uuid as project_id -- Extract project_id from metadata
  from public.chat_messages m
  where
    -- Messages sent BY the user
    m.user_id = p_user_id
    or
    -- Messages sent TO the user by an admin (assuming role='assistant' and target in metadata)
    (m.role = 'assistant' and m.metadata->>'target_user_id' = p_user_id::text)
  order by m.created_at asc;

end;
$$;

-- Function 3: Get projects associated with a specific user
create or replace function get_user_projects(p_user_id uuid)
returns table (
    id uuid,
    name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  raise notice 'get_user_projects called with user_id: %', p_user_id;
  raise notice 'Checking if projects table exists';
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
    raise notice 'projects table does not exist!';
  ELSE
    raise notice 'projects table exists';
    raise notice 'Checking if projects table has any data';
    IF EXISTS (SELECT 1 FROM public.projects) THEN
      raise notice 'projects table has data';
    ELSE
      raise notice 'projects table is empty';
    END IF;
  END IF;
  -- Ensure the caller is an admin
  if not check_is_admin() then
    raise exception 'Permission denied: User is not an admin.';
  end if;

  return query
  select p.id, p.name
  from public.projects p
  where p.user_id = p_user_id
  order by p.name; -- Or order by creation date, etc.

end;
$$;


-- Function 4: Allow admin to send a message to a specific user
create or replace function admin_send_message(
    p_target_user_id uuid,
    p_message_content text,
    p_project_id uuid default null,
    p_attachments_data jsonb default null
)
returns public.chat_messages -- Return the newly created message row
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_user_id uuid := auth.uid();
  v_admin_name text := 'Admin'; -- Default or fetch from admin profile
  new_message public.chat_messages;
begin
  -- Ensure the caller is an admin
  if not check_is_admin() then
    raise exception 'Permission denied: User is not an admin.';
  end if;

  -- Optional: Fetch admin's name from profiles if needed
  -- select full_name into v_admin_name from public.profiles where id = v_admin_user_id;

  -- Insert the message sent by the admin, targeting the user
  insert into public.chat_messages (
      id,
      session_id, -- Assuming admin messages might not belong to a specific user session, or need a way to determine it. Using a placeholder/logic needed here.
      sender,    -- Role indicating it's from admin/system side
      message, -- Changed from content
      -- project_id, -- Removed if not in chat_messages
      -- attachments, -- Removed if not in chat_messages
      metadata, -- Store the target user ID here
      -- senderName, -- Removed if not in chat_messages
      created_at,
      user_id -- Added user_id for the sender (admin)
  ) values (
      gen_random_uuid(),
      -- Need logic to determine session_id, perhaps null or a dedicated admin session? Using NULL for now.
      NULL,
      'assistant', -- Or 'admin' if you prefer a distinct role
      p_message_content,
      jsonb_build_object('target_user_id', p_target_user_id, 'sender_name', v_admin_name, 'attachments', p_attachments_data), -- Merged senderName and attachments into metadata
      now(),
      v_admin_user_id -- Set user_id to admin's ID
  )
  returning * into new_message; -- Return the inserted row

  return new_message;

end;
$$;

grant execute on function get_chat_users() to authenticated;
grant execute on function get_user_messages(uuid) to authenticated;
grant execute on function get_user_projects(uuid) to authenticated;
grant execute on function admin_send_message(uuid, text, uuid, jsonb) to authenticated;

-- Note: RLS policies on the 'messages' and 'projects' tables must allow admins
-- (as determined by check_is_admin() or membership in an admin role)
-- to read/insert data as needed by these functions, especially when using SECURITY DEFINER.
-- Example RLS (adjust based on your actual policies):
-- alter table public.messages enable row level security;
-- create policy "Admins can manage messages" on public.messages for all
-- using (check_is_admin()) with check (check_is_admin());