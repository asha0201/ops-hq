# Operations HQ → Personal Operations Management System
## Design Package (Phase 0)

This document is the foundation for evolving the current simple app into the full system described in your brief. It does **not** require any AI API. It is written so you — or a developer, or you working in Cursor/Claude Code — can implement it in stages without breaking what you use today.

---

## 1. Honest gap analysis

**What exists today (and works):**
- A single-file vanilla HTML/JS app (`index.html` + `app.js`), deployed on Netlify, data in browser `localStorage`.
- Projects, sprints (current/upcoming/backlog), a six-part daily plan, recurring tasks with due-now logic, per-task time tracking with project rollups, biggest-time-eaters ranking, repeating-pattern detection, project editing, Google Calendar push, JSON export/import, and an AI-review text export.

**What the brief asks for that today's app cannot do:**
- **Multi-device + durable storage** — `localStorage` is one-browser-only and can be cleared. → needs Supabase.
- **Rich task model** — status, progress %, estimated vs actual hours, due dates, category, owner, sprint links, and a full *update history per task* (the Task Timeline / Resume view). Today's tasks are a single line of text + done flag.
- **Meeting workspace** — start/stop meeting timer, structured notes, auto task creation. Not present.
- **Project knowledge base** — documents, files, roadmaps, journal entries per project. Not present (no file storage in a static app without a backend).
- **Health + neglect + continuity engines** — computable, but need the richer task/update data to be meaningful.
- **Plan import** — paste a ChatGPT/Claude plan and parse into milestones/sprints/tasks. Doable with structured parsing; needs the richer schema as a target.

**Conclusion:** the *concepts and logic* transfer directly; the *storage and data model* must move to Supabase to unlock the rest. This is the single highest-leverage step — everything else builds on it.

---

## 2. Supabase database schema (production-ready SQL)

Designed for a single user now, with `user_id` everywhere so multi-user and Row Level Security work later. Uses `uuid` keys, timestamps, and foreign keys with sensible cascades.

```sql
-- ============ USERS (handled by Supabase Auth; this mirrors profile data) ============
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now()
);

-- ============ PROJECTS ============
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  goal text,
  status text,
  priority text check (priority in ('Low','Medium','High','Critical')) default 'Medium',
  next_milestone text,
  risks text,
  health_score int,                 -- 0-100, computed by the health engine
  continuity_score int,             -- 0-100, computed
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ PROJECT DOCUMENTS (knowledge base text entries) ============
create table project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type text,                    -- overview | roadmap | strategy | ai_plan | notes
  title text,
  body text,
  created_at timestamptz default now()
);

-- ============ PROJECT FILES (Supabase Storage references) ============
create table project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,       -- path in the Supabase Storage bucket
  file_name text,
  mime_type text,
  uploaded_at timestamptz default now()
);

-- ============ MILESTONES ============
create table milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_date date,
  status text check (status in ('Open','Done')) default 'Open',
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ============ SPRINTS ============
create table sprints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bucket text check (bucket in ('current','upcoming','backlog')) default 'current',
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- ============ TASKS (V2) ============
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  sprint_id uuid references sprints(id) on delete set null,
  title text not null,
  status text check (status in ('Not Started','In Progress','Waiting','Blocked','Completed')) default 'Not Started',
  progress int check (progress between 0 and 100) default 0,
  priority text check (priority in ('Low','Medium','High','Critical')) default 'Medium',
  estimated_hours numeric,
  actual_hours numeric default 0,        -- rolled up from work_logs
  category text,                          -- e.g. SEO, Ads, Content, Admin
  owner text,                             -- 'me' or a person's name (delegation)
  next_action text,                       -- THE next concrete step
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ TASK UPDATES (the timeline / history) ============
create table task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  update_date date default current_date,
  hours_worked numeric,
  progress int check (progress between 0 and 100),
  remarks text,
  blockers text,
  next_action text,
  expected_next_date date,
  created_at timestamptz default now()
);

-- ============ RECURRING TASKS ============
create table recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  name text not null,
  frequency text,                    -- Daily | 2x/week | Weekly | Fortnightly | Monthly
  last_done date,
  created_at timestamptz default now()
);

-- ============ WORK LOGS (time tracking, the source of truth for hours) ============
create table work_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  log_date date default current_date,
  seconds int not null,
  note text,
  created_at timestamptz default now()
);

-- ============ DAILY JOURNAL ============
create table daily_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date default current_date,
  worked_on text,
  completed text,
  challenges text,
  learnings text,
  tomorrow_focus text,
  created_at timestamptz default now()
);

-- ============ MEETINGS ============
create table meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text,
  participants text,
  meeting_date date default current_date,
  start_time timestamptz,
  end_time timestamptz,
  duration_seconds int,
  discussion_notes text,
  decisions text,
  follow_ups text,
  risks text,
  blockers text,
  created_at timestamptz default now()
);

-- ============ MEETING TASKS (my tasks + delegated, created from a meeting) ============
create table meeting_tasks (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,   -- if promoted into tasks
  title text not null,
  is_delegated boolean default false,
  delegated_to text,
  due_date date,
  created_at timestamptz default now()
);

-- ============ WEEKLY REVIEWS ============
create table weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date,
  completed text,
  delayed text,
  wins text,
  risks text,
  projects_at_risk text,
  next_actions text,
  created_at timestamptz default now()
);
```

**Row Level Security (apply to every table):**
```sql
alter table projects enable row level security;
create policy "own rows" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- repeat the same policy pattern for every table with a user_id column
```

---

## 3. Key relationships (plain English)

- A **project** has many milestones, sprints, tasks, documents, files, meetings, recurring tasks, work logs.
- A **task** belongs to a project (and optionally a sprint), and has many **task_updates** — that update history is what powers the Timeline and the Resume view.
- A **work_log** belongs to a task and/or project — it's the single source of truth for hours; `tasks.actual_hours` and project time rollups are sums over it.
- A **meeting** belongs to a project and produces **meeting_tasks**, which can be promoted into real **tasks** on approval.
- **Health, neglect, continuity, and pattern detection** are all *queries* over the above — no AI needed.

---

## 4. How the engines work (no AI)

- **Project health (0-100):** weighted blend of recent activity (days since last work_log/update), overdue task count, completion rate, recurring-task adherence, blocked-task count. All SQL-computable.
- **Neglect detection:** projects with no work_log or task_update in N days; recurring_tasks past their frequency interval.
- **Continuity score:** share of in-progress tasks that have a `next_action` set and a recent update — low score means execution is breaking down (work started, no defined next step).
- **Repeating-pattern detection:** group work_logs by task title, count distinct days, measure average gap → cadence label. (Already prototyped and working in the current app.)
- **AI review export:** one query bundle → formatted text → paste into ChatGPT/Claude. (Already working in the current app.)

---

## 5. Implementation roadmap (incremental, non-breaking)

**Phase 1 — foundation**
1. Create Supabase project; run the schema above; enable RLS.
2. Add Supabase Auth (email magic-link is simplest).
3. Migrate current localStorage data → Supabase (one-time import using your JSON export).
4. Tasks V2 (status, progress, hours, due date, owner, category, next_action).
5. Task update system + timeline + resume view.
6. Meeting workspace + auto task creation.
7. Daily work log.

**Phase 2 — intelligence**
8. Daily journal. 9. Time analytics dashboards. 10. Health engine. 11. Neglect detection. 12. Continuity score. 13. Meeting analytics.

**Phase 3 — leverage**
14. AI review export (richer than today's). 15. Plan import + structured parsing. 16. Dashboard resume-work widget.

**Phase 4 — AI-ready (architecture only)**
17. Clean API boundary so a future AI layer can read the structured data and write suggestions — without changing the storage model.

---

## 6. Recommended build path for you specifically

Since you're keeping the simple app for now and aren't a developer: when you're ready to build the big version, the realistic route is **Cursor or VS Code with Claude Code**, pointed at this document and your Supabase project. This design package is written to be handed directly to that tool (or a freelance developer) as the spec. Until then, the simple app keeps collecting the data — projects, tasks, time, patterns — so when you migrate, you bring real history with you.
