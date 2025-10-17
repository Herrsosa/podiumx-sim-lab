create or replace function public.get_dm_conversations(
  p_user uuid default auth.uid(),
  p_limit integer default 20,
  p_offset integer default 0
)
returns table(
  conversation_id uuid,
  updated_at timestamptz,
  other_user_id uuid,
  other_display_name text,
  other_avatar_url text,
  unread_count integer,
  last_message text,
  last_message_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $function$
begin
  return query
  with base as (
    select cp.conversation_id, cp.last_read_at
    from public.conversation_participants cp
    where cp.user_id = p_user
  ),
  counterparts as (
    select cp.conversation_id, cp.user_id, pr.display_name, pr.avatar_url
    from public.conversation_participants cp
    join base b on b.conversation_id = cp.conversation_id
    left join public.profiles pr on pr.id = cp.user_id
    where cp.user_id <> p_user
  ),
  latest as (
    select dm.conversation_id,
           max(dm.created_at) as last_message_at,
           (array_agg(dm.content order by dm.created_at desc))[1] as last_message
    from public.dm_messages dm
    join base b on b.conversation_id = dm.conversation_id
    group by dm.conversation_id
  ),
  unread as (
    select dm.conversation_id,
           count(*) as unread_count
    from public.dm_messages dm
    join base b on b.conversation_id = dm.conversation_id
    where b.last_read_at is null or dm.created_at > b.last_read_at
    group by dm.conversation_id
  )
  select
    c.id as conversation_id,
    coalesce(l.last_message_at, c.updated_at) as updated_at,
    co.user_id as other_user_id,
    co.display_name as other_display_name,
    co.avatar_url as other_avatar_url,
    coalesce(u.unread_count, 0)::int as unread_count,
    l.last_message,
    l.last_message_at
  from public.conversations c
  join base b on b.conversation_id = c.id
  left join counterparts co on co.conversation_id = c.id
  left join latest l on l.conversation_id = c.id
  left join unread u on u.conversation_id = c.id
  order by updated_at desc nulls last
  limit greatest(coalesce(p_limit, 20), 0)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;
