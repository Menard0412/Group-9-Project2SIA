-- LMS Mobile part 5: let people delete their own account.
-- Run AFTER schema.sql, schema_part3.sql and schema_part4.sql.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  my_role text;
begin
  if me is null then
    raise exception 'You need to be signed in.';
  end if;
  select role into my_role from public.profiles where id = me;
  if my_role = 'admin' and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'You are the only administrator. Make another account an administrator before deleting this one.';
  end if;
  -- Deleting the login cascades to the profile and everything owned by it
  -- (classes you teach, your enrollments, posts, quiz attempts and progress).
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
