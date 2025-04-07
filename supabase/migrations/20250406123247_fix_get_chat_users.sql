-- Fix get_chat_users function

create or replace function get_chat_users()
returns table (
    id uuid,
    name text,
    avatarUrl text,
    lastMessageSnippet text,
    lastMessageTimestamp timestamptz
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
  with relevant_users as (
    -- Users who sent messages OR were targeted by an admin message
    select distinct coalesce(user_id, (metadata->>'target_user_id')::uuid) as user_id from public.chat_messages 
  ),
  latest_messages as (
    -- Get the latest message for each relevant user interaction
    select
      distinct on (coalesce(m.user_id, (m.metadata->>'target_user_id')::uuid))
      coalesce(m.user_id, (m.metadata->>'target_user_id')::uuid) as participant_id,
      m.message as last_message_content,
      m.created_at as last_message_time
    from public.chat_messages m
    join relevant_users ru on coalesce(m.user_id, (m.metadata->>'target_user_id')::uuid) = ru.id
    order by coalesce(m.user_id, (m.metadata->>'target_user_id')::uuid), m.created_at desc
  )
  select
    ru.id,
    ru.id::text as name,
    null::text as avatarUrl,
    lm.last_message_content as lastMessageSnippet,
    lm.last_message_time as lastMessageTimestamp
  from relevant_users ru
  left join latest_messages lm on ru.id = lm.participant_id
  order by lm.last_message_time desc nulls last;

end;
$$;