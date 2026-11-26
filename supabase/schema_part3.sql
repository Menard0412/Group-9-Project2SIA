-- LMS Mobile part 3: class materials (file storage), shared quizzes with server-side grading, learner progress.
-- Run AFTER supabase/schema.sql: SQL Editor -> New query -> paste -> Run.

-- ---------------------------------------------------------------- tables
create table if not exists public.class_materials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  uploader_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  extension text not null default '',
  mime_type text not null default 'application/octet-stream',
  size bigint not null default 0,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.material_progress (
  material_id uuid not null references public.class_materials (id) on delete cascade,
  learner_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (material_id, learner_id)
);

create table if not exists public.class_quizzes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Answer keys live in their own table that no client can read directly.
create table if not exists public.quiz_keys (
  quiz_id uuid primary key references public.class_quizzes (id) on delete cascade,
  correct jsonb not null
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.class_quizzes (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  learner_id uuid not null references public.profiles (id) on delete cascade,
  score int not null check (score >= 0),
  total int not null check (total > 0),
  taken_at timestamptz not null default now()
);

create index if not exists class_materials_class_idx on public.class_materials (class_id, created_at);
create index if not exists material_progress_class_idx on public.material_progress (class_id, learner_id);
create index if not exists class_quizzes_class_idx on public.class_quizzes (class_id, created_at desc);
create index if not exists quiz_attempts_class_idx on public.quiz_attempts (class_id, taken_at desc);

-- --------------------------------------------------------- quiz functions
create or replace function public.create_class_quiz(p_class uuid, p_title text, p_questions jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  q jsonb;
  stored jsonb := '[]'::jsonb;
  keys jsonb := '[]'::jsonb;
  option_count int;
  correct_index int;
begin
  if not public.is_class_instructor(p_class) then
    raise exception 'Only the class instructor can create quizzes.';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'A quiz needs a title.';
  end if;
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

  insert into public.class_quizzes (class_id, author_id, title, questions)
  values (p_class, (select auth.uid()), trim(p_title), stored)
  returning id into new_id;
  insert into public.quiz_keys (quiz_id, correct) values (new_id, keys);
  return new_id;
end;
$$;

create or replace function public.submit_quiz_attempt(p_quiz uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  quiz public.class_quizzes;
  keys jsonb;
  n int;
  points int := 0;
  i int;
begin
  select * into quiz from public.class_quizzes where id = p_quiz;
  if not found then
    raise exception 'Quiz not found.';
  end if;
  if not exists (select 1 from public.enrollments e where e.class_id = quiz.class_id and e.learner_id = me) then
    raise exception 'Only enrolled learners can take this quiz.';
  end if;
  select correct into keys from public.quiz_keys where quiz_id = p_quiz;
  n := jsonb_array_length(keys);
  if jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers) <> n then
    raise exception 'Answer every question before submitting.';
  end if;
  for i in 0 .. n - 1 loop
    if (p_answers ->> i) = (keys ->> i) then
      points := points + 1;
    end if;
  end loop;
  insert into public.quiz_attempts (quiz_id, class_id, learner_id, score, total)
  values (p_quiz, quiz.class_id, me, points, n);
  return jsonb_build_object('score', points, 'total', n, 'correct', keys);
end;
$$;

revoke all on function public.create_class_quiz(uuid, text, jsonb) from public, anon;
revoke all on function public.submit_quiz_attempt(uuid, jsonb) from public, anon;
grant execute on function public.create_class_quiz(uuid, text, jsonb) to authenticated;
grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;

-- ------------------------------------------- row level security + grants
alter table public.class_materials enable row level security;
alter table public.material_progress enable row level security;
alter table public.class_quizzes enable row level security;
alter table public.quiz_keys enable row level security;   -- no policy and no grant: unreadable by clients
alter table public.quiz_attempts enable row level security;

grant select, delete on public.class_materials to authenticated;
grant insert (class_id, uploader_id, name, extension, mime_type, size, storage_path) on public.class_materials to authenticated;
grant select, delete on public.material_progress to authenticated;
grant insert (material_id, learner_id, class_id) on public.material_progress to authenticated;
grant select, delete on public.class_quizzes to authenticated;
grant select on public.quiz_attempts to authenticated;

drop policy if exists class_materials_select on public.class_materials;
create policy class_materials_select on public.class_materials for select to authenticated
  using (public.is_class_member(class_id));

drop policy if exists class_materials_insert on public.class_materials;
create policy class_materials_insert on public.class_materials for insert to authenticated
  with check (uploader_id = (select auth.uid()) and public.is_class_instructor(class_id));

drop policy if exists class_materials_delete on public.class_materials;
create policy class_materials_delete on public.class_materials for delete to authenticated
  using (public.is_class_instructor(class_id));

drop policy if exists material_progress_select on public.material_progress;
create policy material_progress_select on public.material_progress for select to authenticated
  using (learner_id = (select auth.uid()) or public.is_class_instructor(class_id));

drop policy if exists material_progress_insert on public.material_progress;
create policy material_progress_insert on public.material_progress for insert to authenticated
  with check (
    learner_id = (select auth.uid())
    and public.is_class_member(class_id)
    and exists (
      select 1 from public.class_materials m
      where m.id = material_progress.material_id and m.class_id = material_progress.class_id
    )
  );

drop policy if exists material_progress_delete on public.material_progress;
create policy material_progress_delete on public.material_progress for delete to authenticated
  using (learner_id = (select auth.uid()));

drop policy if exists class_quizzes_select on public.class_quizzes;
create policy class_quizzes_select on public.class_quizzes for select to authenticated
  using (public.is_class_member(class_id));

drop policy if exists class_quizzes_delete on public.class_quizzes;
create policy class_quizzes_delete on public.class_quizzes for delete to authenticated
  using (public.is_class_instructor(class_id));

drop policy if exists quiz_attempts_select on public.quiz_attempts;
create policy quiz_attempts_select on public.quiz_attempts for select to authenticated
  using (learner_id = (select auth.uid()) or public.is_class_instructor(class_id));

-- ---------------------------------------------------- file storage bucket
insert into storage.buckets (id, name, public, file_size_limit)
values ('class-materials', 'class-materials', false, 20971520)
on conflict (id) do nothing;

-- Object paths look like  <class id>/<file name>, so the first folder is the class.
drop policy if exists class_materials_read on storage.objects;
create policy class_materials_read on storage.objects for select to authenticated
  using (bucket_id = 'class-materials' and public.is_class_member(((storage.foldername(name))[1])::uuid));

drop policy if exists class_materials_upload on storage.objects;
create policy class_materials_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'class-materials' and public.is_class_instructor(((storage.foldername(name))[1])::uuid));

drop policy if exists class_materials_remove on storage.objects;
create policy class_materials_remove on storage.objects for delete to authenticated
  using (bucket_id = 'class-materials' and public.is_class_instructor(((storage.foldername(name))[1])::uuid));
