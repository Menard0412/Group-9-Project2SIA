-- LMS Mobile: accounts, roles, classes, announcements and discussion.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------- tables
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role text not null check (role in ('instructor', 'learner')),
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  join_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  class_id uuid not null references public.classes (id) on delete cascade,
  learner_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, learner_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists enrollments_learner_idx on public.enrollments (learner_id);
create index if not exists announcements_class_idx on public.announcements (class_id, created_at desc);
create index if not exists posts_class_idx on public.posts (class_id, created_at desc);
create index if not exists classes_instructor_idx on public.classes (instructor_id);

-- ------------------------------------------------- profile on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 80),
    case when new.raw_user_meta_data ->> 'role' = 'instructor' then 'instructor' else 'learner' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ------------------------------------------------------ helper functions
create or replace function public.is_class_member(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.classes c where c.id = target_class and c.instructor_id = (select auth.uid()))
      or exists (select 1 from public.enrollments e where e.class_id = target_class and e.learner_id = (select auth.uid()));
$$;

create or replace function public.is_class_instructor(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.classes c where c.id = target_class and c.instructor_id = (select auth.uid()));
$$;

create or replace function public.shares_class_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.classes c where c.instructor_id = other and public.is_class_member(c.id))
      or exists (select 1 from public.enrollments e where e.learner_id = other and public.is_class_member(e.class_id));
$$;

create or replace function public.join_class(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.classes;
  me uuid := (select auth.uid());
  my_role text;
begin
  if me is null then
    raise exception 'You need to be signed in.';
  end if;
  select role into my_role from public.profiles where id = me;
  if my_role is distinct from 'learner' then
    raise exception 'Only learners can join a class.';
  end if;
  select * into target from public.classes where join_code = upper(trim(code));
  if not found then
    raise exception 'No class matches that code.';
  end if;
  insert into public.enrollments (class_id, learner_id) values (target.id, me) on conflict do nothing;
  return target.id;
end;
$$;

revoke all on function public.is_class_member(uuid) from public, anon;
revoke all on function public.is_class_instructor(uuid) from public, anon;
revoke all on function public.shares_class_with(uuid) from public, anon;
revoke all on function public.join_class(text) from public, anon;
grant execute on function public.is_class_member(uuid) to authenticated;
grant execute on function public.is_class_instructor(uuid) to authenticated;
grant execute on function public.shares_class_with(uuid) to authenticated;
grant execute on function public.join_class(text) to authenticated;

-- ------------------------------------------- row level security + grants
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.announcements enable row level security;
alter table public.posts enable row level security;

-- Explicit grants (new Supabase projects no longer expose tables automatically).
grant select on public.profiles to authenticated;
grant select, delete on public.enrollments to authenticated;
grant select, delete on public.classes to authenticated;
grant insert (instructor_id, title, description) on public.classes to authenticated;
grant update (title, description) on public.classes to authenticated;
grant select, delete on public.announcements to authenticated;
grant insert (class_id, author_id, title, body) on public.announcements to authenticated;
grant select, delete on public.posts to authenticated;
grant insert (class_id, author_id, body) on public.posts to authenticated;

-- profiles: you can see yourself and people you share a class with
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_class_with(id));

-- classes
drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes for select to authenticated
  using (instructor_id = (select auth.uid()) or public.is_class_member(id));

drop policy if exists classes_insert on public.classes;
create policy classes_insert on public.classes for insert to authenticated
  with check (
    instructor_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'instructor')
  );

drop policy if exists classes_update on public.classes;
create policy classes_update on public.classes for update to authenticated
  using (instructor_id = (select auth.uid()))
  with check (instructor_id = (select auth.uid()));

drop policy if exists classes_delete on public.classes;
create policy classes_delete on public.classes for delete to authenticated
  using (instructor_id = (select auth.uid()));

-- enrollments (rows are created only through join_class)
drop policy if exists enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments for select to authenticated
  using (learner_id = (select auth.uid()) or public.is_class_instructor(class_id));

drop policy if exists enrollments_delete on public.enrollments;
create policy enrollments_delete on public.enrollments for delete to authenticated
  using (learner_id = (select auth.uid()) or public.is_class_instructor(class_id));

-- announcements: members read, the class instructor writes
drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements for select to authenticated
  using (public.is_class_member(class_id));

drop policy if exists announcements_insert on public.announcements;
create policy announcements_insert on public.announcements for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_class_instructor(class_id));

drop policy if exists announcements_delete on public.announcements;
create policy announcements_delete on public.announcements for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_class_instructor(class_id));

-- discussion posts: members read and write, authors or the instructor delete
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select to authenticated
  using (public.is_class_member(class_id));

drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_class_member(class_id));

drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_class_instructor(class_id));
