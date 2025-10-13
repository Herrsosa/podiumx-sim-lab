do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'onboarding_completed'
  ) then
    alter table public.profiles
      add column onboarding_completed boolean not null default false;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    alter table public.profiles
      add column role text;
  end if;

  begin
    comment on column public.profiles.onboarding_completed is 'Marks whether the user finished onboarding';
  exception when others then
    null;
  end;

  begin
    comment on column public.profiles.role is 'fan or athlete';
  exception when others then
    null;
  end;
end
$$;
