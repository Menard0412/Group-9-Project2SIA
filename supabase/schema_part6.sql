-- LMS Mobile part 6: unread badges ("notifications") and editing published quizzes.
-- Run AFTER schema.sql, part3, part4 and part5.

-- --------------------------------------------------------------- unread tracking
create table if not exists public.class_reads (
  user_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  last_seen timestamptz not null default now(),
  primary key (user_id, class_id)
);
alter table public.class_reads enable row level security;  -- only reachable through the functions below

create or replace function public.mark_class_seen(p_class uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_class_member(p_class) then
    return;
  end if;
  insert into public.class_reads (user_id, class_id, last_seen)
  values ((select auth.uid()), p_class, now())
  on conflict (user_id, class_id) do update set last_seen = excluded.last_seen;
end;
$$;

-- For every class you belong to: how many things others added since you last opened it.
create or replace function public.class_unread_counts()
returns table (room_id uuid, unread_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select c.id as cid, c.created_at as since_default
    from public.classes c
    where c.instructor_id = (select auth.uid())
    union all
    select e.class_id as cid, e.joined_at as since_default
    from public.enrollments e
    where e.learner_id = (select auth.uid())
  ),
  seen as (
    select m.cid, coalesce(r.last_seen, m.since_default) as since
    from mine m
    left join public.class_reads r on r.class_id = m.cid and r.user_id = (select auth.uid())
  )
  select
    s.cid as room_id,
    (
      (select count(*) from public.announcements a
         where a.class_id = s.cid and a.created_at > s.since and a.author_id <> (select auth.uid()))
      + (select count(*) from public.posts p
         where p.class_id = s.cid and p.created_at > s.since and p.author_id <> (select auth.uid()))
      + (select count(*) from public.class_materials m2
         where m2.class_id = s.cid and m2.created_at > s.since and m2.uploader_id <> (select auth.uid()))
      + (select count(*) from public.class_quizzes q
         where q.class_id = s.cid and q.created_at > s.since and q.author_id <> (select auth.uid()))
    )::bigint as unread_count
  from seen s;
$$;

-- ------------------------------------------------------- editing published quizzes
-- Validates questions and splits them into public content and the answer key.
create or replace function public.quiz_parts(p_questions jsonb, out stored jsonb, out keys jsonb)
language plpgsql
as $$
declare
  q jsonb;
  option_count int;
  correct_index int;
begin
  stored := '[]'::jsonb;
  keys := '[]'::jsonb;
  if jsonb_typeof(p_questions) is distinct from 'array' or jsonb_array_length(p_questions) = 0 then
    raise exception 'A quiz needs at least one question.';
  end if;
  for q in select value from jsonb_array_elements(p_questions) loop
    if coalesce(trim(q ->> 'prompt'), '') = '' then
      raise exception 'Every question needs text.';
    end if;
    if jsonb_typeof(q -> 'options') is distinct from 'array' then
      raise exception 'Every question needs answer options.';
    end if;
    option_count := jsonb_array_length(q -> 'options');
    if option_count < 2 or option_count > 4 then
      raise exception 'Every question needs between 2 and 4 answer options.';
    end if;
    correct_index := (q ->> 'correctIndex')::int;
    if correct_index < 0 or correct_index >= option_count then
      raise exception 'A question has an invalid correct answer.';
    end if;
    stored := stored || jsonb_build_array(jsonb_build_object('prompt', trim(q ->> 'prompt'), 'options', q -> 'options'));
    keys := keys || to_jsonb(correct_index);
  end loop;
end;
$$;
revoke all on function public.quiz_parts(jsonb) from public, anon, authenticated;

create or replace function public.get_quiz_for_edit(p_quiz uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  qz public.class_quizzes;
  keys jsonb;
  merged jsonb := '[]'::jsonb;
  i int;
begin
  select * into qz from public.class_quizzes where id = p_quiz;
  if not found then
    raise exception 'Quiz not found.';
  end if;
  if not public.is_class_instructor(qz.class_id) then
    raise exception 'Only the class instructor can edit quizzes.';
  end if;
  select correct into keys from public.quiz_keys where quiz_id = p_quiz;
  for i in 0 .. jsonb_array_length(qz.questions) - 1 loop
    merged := merged || jsonb_build_array((qz.questions -> i) || jsonb_build_object('correctIndex', (keys ->> i)::int));
  end loop;
  return jsonb_build_object('title', qz.title, 'questions', merged);
end;
$$;

create or replace function public.update_class_quiz(p_quiz uuid, p_title text, p_questions jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  qz public.class_quizzes;
  parts record;
begin
  select * into qz from public.class_quizzes where id = p_quiz;
  if not found then
    raise exception 'Quiz not found.';
  end if;
  if not public.is_class_instructor(qz.class_id) then
    raise exception 'Only the class instructor can edit quizzes.';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'A quiz needs a title.';
  end if;
  select * into parts from public.quiz_parts(p_questions);
  update public.class_quizzes set title = trim(p_title), questions = parts.stored where id = p_quiz;
  update public.quiz_keys set correct = parts.keys where quiz_id = p_quiz;
end;
$$;

revoke all on function public.mark_class_seen(uuid) from public, anon;
revoke all on function public.class_unread_counts() from public, anon;
revoke all on function public.get_quiz_for_edit(uuid) from public, anon;
revoke all on function public.update_class_quiz(uuid, text, jsonb) from public, anon;
grant execute on function public.mark_class_seen(uuid) to authenticated;
grant execute on function public.class_unread_counts() to authenticated;
grant execute on function public.get_quiz_for_edit(uuid) to authenticated;
grant execute on function public.update_class_quiz(uuid, text, jsonb) to authenticated;
