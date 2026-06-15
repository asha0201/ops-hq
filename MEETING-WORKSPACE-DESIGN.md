# Meeting Workspace — lightweight design (no Supabase)

This is a **design**, not an implementation. It's scoped to fit the current single-file localStorage app with low complexity, and to map cleanly onto the future Supabase `meetings` / `meeting_tasks` tables so nothing is wasted.

## Verdict on complexity
A **capture-and-summarise** Meeting tab is genuinely low-complexity — it reuses the existing card UI, the add-row pattern, and localStorage. **Recommended: add it after the 1–2 week validation**, because meetings are where a lot of your work originates and capturing them feeds better data into the AI export.

The one part to keep simple for now: "auto-create tasks from a meeting" should, in this localStorage version, just **push the meeting's My-Tasks into the daily plan** (Follow-ups or Quick wins) on save — not a full task-promotion engine. That keeps it trivial. The full promotion (with status, due dates, delegation records) waits for Tasks V2 + Supabase.

## Data shape (fits current DB, maps to Supabase later)
Add one array to the existing DB object:
```
meetings: [
  {
    id: "<generated>",
    title: "",
    project: "",          // dropdown from project list
    date: "YYYY-MM-DD",
    startedAt: <ms>,       // optional timer
    endedAt: <ms>,
    notes: "",             // discussion notes
    decisions: "",
    myTasks: [ "..." ],    // strings now; become real tasks later
    delegated: [ { text:"", to:"", due:"" } ],
    followUps: [ "..." ],
    createdAt: "<iso>"
  }
]
```
This maps directly to the future `meetings` table, and `delegated[]` maps to `meeting_tasks` with `is_delegated=true`.

## UI (one new tab: "Meetings")
A simple two-state tab:

**List state** — past meetings as cards: title, project tag, date, duration, and counts (e.g. "3 tasks, 2 follow-ups"). Tap to expand.

**New-meeting state** (a "＋ New meeting" button) — a single form with:
- Title (text)
- Project (dropdown, reuses `projectSelect`)
- Date (defaults today)
- Optional **Start / End** buttons for duration (reuses the timer pattern)
- Discussion notes (textarea)
- Decisions (textarea)
- My tasks (add-row list, like daily tasks)
- Delegated tasks (add-row list with text + "to whom" + due date)
- Follow-ups (add-row list)
- **Review before save**: a "Save meeting" button — nothing persists until tapped (matches your brief's "require approval").

**On save:** the meeting is stored, and its My-Tasks are optionally pushed into today's Follow-ups so they don't get lost. Delegated items stay in the meeting record (and later become tracked delegated tasks).

## What it deliberately does NOT do yet (keeps it light)
- No meeting analytics dashboards (count/duration trends) — that needs accumulated data; add in Phase 2.
- No full task-promotion with status/progress — waits for Tasks V2.
- No participant management as entities — participants are just a text field for now.

## Why wait until after validation
Adding this now competes with your goal of collecting clean daily/time data on the three projects. Once you've validated that the daily loop and time tracking actually stick for two weeks, the Meeting tab is a natural, low-risk addition that slots in beside the existing tabs with no rework.
