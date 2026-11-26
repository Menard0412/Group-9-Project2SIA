-- LMS Mobile part 4: administrator role, instructor approval, live updates.
-- Run AFTER schema.sql and schema_part3.sql: SQL Editor -> New query -> paste -> Run.

-- ----------------------------------------------- roles and instructor status
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'instructor', 'learner'));

alter table public.profiles add column if not exists instructor_status text not null default 'none';
alter table public.profiles drop constraint if exists profiles_instructor_status_check;
alter table public.profiles
  add constraint profiles_instructor_status_check
  check (instructor_status in ('none', 'pending', 'approved', 'rejected'));

-- Instructors who signed up before this script keep working.
update public.profiles set instructor_status = 'approved' where role = 'instructor' and instructor_status = 'none';

-- New instructor sign-ups wait for approval. Nobody can sign up as an admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wants_instructor boolean := (new.raw_user_meta_data ->> 'role') = 'instructor';
begin
  insert into public.profiles (id, display_name, role, instructor_status)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 80),
    case when wants_instructor then 'instructor' else 'learner' end,
    case when wants_instructor then 'pending' else 'none' end
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ------------------------------------------------------------- admin helpers
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin');
$$;

create or replace function public.review_instructor(p_user uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can review instructors.';
  end if;
  if p_approve then
    update public.profiles set instructor_status = 'approved'
    where id = p_user and role = 'instructor';
  else
    update public.profiles set role = 'learner', instructor_status = 'rejected'
    where id = p_user and role = 'instructor' and instructor_status = 'pending';
  end if;
  if not found then
    raise exception 'No matching instructor request.';
  end if;
end;
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.review_instructor(uuid, boolean) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.review_instructor(uuid, boolean) to authenticated;

-- ------------------------------------------------------------------ policies
-- Admins can see every profile; everyone else sees themselves and people they share a class with.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_class_with(id) or public.is_admin());

-- Only approved instructors can create classes.
drop policy if exists classes_insert on public.classes;
create policy classes_insert on public.classes for insert to authenticated
  with check (
    instructor_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'instructor' and p.instructor_status = 'approved'
    )
  );

-- ------------------------------------------------------------- live updates
do $$
declare
  t text;
begin
  foreach t in array array['announcements', 'posts', 'class_materials', 'class_quizzes'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;

-- ----------------------------------------------------- make yourself an admin
-- 1. Sign up in the app with the account you want to be the administrator.
-- 2. Run this once, with your own email address:
--
--   update public.profiles
--   set role = 'admin', instructor_status = 'none'
--   where id = (select id from auth.users where email = 'you@example.com');
