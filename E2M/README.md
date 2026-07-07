# Mini AI Project Manager Assistant — Build Plan

Turn unstructured meeting notes → structured, filterable, editable tasks.

**Stack:** FastAPI (backend) · React + Vite (frontend) · **Neon (Postgres)** (DB) · **Groq API (OpenAI-compatible)** (extraction)

> Updated from the original plan: DB moved from SQLite → **Neon Postgres**, and LLM moved from OpenAI → **Groq** (`llama-3.3-70b-versatile`), since Groq offers a free API key. See Section 7 for updated setup.

---

## 1. Architecture

```
┌──────────────┐     paste notes      ┌──────────────┐    prompt+JSON    ┌─────────────┐
│ React (Vite) │ ───────────────────► │   FastAPI    │ ────────────────► │  Groq API   │
│   frontend   │ ◄─── tasks JSON ──── │   backend    │ ◄── tasks JSON ── │  (extract)  │
└──────────────┘                      └──────┬───────┘                   └─────────────┘
                                             │
                                       ┌─────▼──────┐
                                       │   Neon     │
                                       │ (Postgres) │
                                       └────────────┘
```

Flow: user pastes text → `POST /extract` → Groq returns structured tasks → saved to DB →
frontend lists them with filters → user edits/deletes → optional CSV export.

---

## 2. Project Structure

```
Mana/
├── README.md
├── backend/
│   ├── main.py            # FastAPI app + routes + CORS
│   ├── database.py        # Postgres (Neon) connection + init
│   ├── models.py          # SQLAlchemy Task model
│   ├── schemas.py         # Pydantic request/response models
│   ├── llm.py             # Groq extraction (prompt + JSON parse + normalize)
│   ├── requirements.txt
│   └── .env               # DATABASE_URL, GROQ_API_KEY, GROQ_MODEL (gitignored)
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js     # proxy /api → localhost:8000
    └── src/
        ├── main.jsx
        ├── App.jsx        # top-level state + layout
        ├── api.js         # fetch helpers
        └── components/
            ├── NotesInput.jsx    # textarea + "Extract" button
            ├── TaskList.jsx      # table of tasks
            ├── TaskRow.jsx       # one row, inline edit
            ├── Filters.jsx       # owner / status / priority
            └── ExportButton.jsx  # download CSV
```

---

## 3. Data Model — `Task`

| Field         | Type     | Notes                                      |
|---------------|----------|--------------------------------------------|
| `id`          | int      | primary key, auto                          |
| `description` | string   | the task text (required)                   |
| `owner`       | string   | inferred name, else `"Unassigned"`         |
| `due_date`    | string   | ISO `YYYY-MM-DD` — see default rule below  |
| `priority`    | enum     | `Low` / `Medium` / `High`                  |
| `status`      | enum     | `To Do` / `In Progress` / `Done`           |
| `created_at`  | datetime | auto timestamp                             |

New tasks default to `status = "To Do"`, `priority = "Medium"` if the LLM can't infer.

### Due date default rule 

The LLM is instructed to return `null` for `due_date` if no deadline is mentioned in the
notes — it must never guess a date itself. The backend then applies a fallback:

- **On extraction (`/extract`)**: if `due_date` comes back null, set it to **today + 7 days**,
  regardless of whether an `owner` was found. Unassigned tasks still get a due date, so
  nothing is left untracked.
- **On manual edit (`PATCH /tasks/{id}`)**: if a task currently has no `due_date` and the
  user assigns an `owner` (changing it away from `"Unassigned"`), the same **+7 days**
  default is applied automatically — so assigning someone to a task guarantees it has a
  deadline.
- **Re-unassigning a task does *not* clear its `due_date`.** Deadline and ownership are
  treated as independent — once a due date is set (auto or manual), removing the owner
  does not reset it. This avoids losing a deadline that was already committed to, and avoids
  recalculating a new (likely wrong) `+7 days` date if the task is reassigned later.

### Why this design (rationale)

Real PM tools (Jira, Asana, Trello) generally treat **ownership** and **deadline** as
independent fields rather than deriving one from the other. We follow the same principle
here: a due date represents *when the work should be done*, not *whether someone is
currently on it*. Deriving due_date only from assignment would mean an urgent-but-unassigned
task looks like it has no deadline at all — which is misleading for a PM scanning the list.

---

## 4. Backend (FastAPI)

**Endpoints**
| Method   | Path              | Purpose                                          |
|----------|-------------------|--------------------------------------------------|
| `POST`   | `/extract`        | Body `{notes: str}` → run LLM, save tasks, return them |
| `GET`    | `/tasks`          | List tasks; query filters `?owner=&status=&priority=` |
| `PATCH`  | `/tasks/{id}`     | Edit any field (applies due-date default rule, see §3) |
| `DELETE` | `/tasks/{id}`     | Remove a task                                    |
| `GET`    | `/tasks/export`   | Return CSV (StreamingResponse)                   |

**LLM extraction (`llm.py`)** — calls Groq's OpenAI-compatible endpoint with a strict system
prompt and `response_format={"type": "json_object"}` so it always returns parseable JSON:

> "You are a project manager assistant. Today's date is {today}. Extract every actionable
> task from the notes. For each task return: description, owner (name if mentioned, else
> null), due_date (resolve relative dates like 'next Friday' to YYYY-MM-DD using today's
> date; if no deadline is mentioned at all, return null — do NOT guess a date), priority
> (Low/Medium/High — infer from urgency words, default Medium).
> Return `{ "tasks": [...] }` only."

Today's date is interpolated into the prompt so relative deadlines resolve correctly.
After the LLM responds: parse JSON → `_normalize()` each task (fills `owner` →
`"Unassigned"`, `due_date` → `today + 7 days`, validates `priority`) → insert rows.

### Error handling (recommended addition)

The current flow assumes Groq always returns valid JSON — worth hardening before treating
this as production-ready:

- **Malformed JSON from the LLM**: wrap `json.loads()` in try/except; on failure, return a
  `502` with a clear message ("Extraction failed, please retry") instead of a raw 500.
- **Groq API down / rate-limited**: catch the OpenAI client's exceptions in `extract_tasks()`
  and surface a friendly error to the frontend rather than letting the request hang or crash.
- **Empty notes**: if `notes` is blank/whitespace, skip the LLM call entirely and return
  `{"tasks": []}` — saves an API call and avoids a confusing empty-JSON round trip.
- **Frontend**: `NotesInput` should show an inline error banner (not just stop the spinner
  silently) if `/extract` fails, so the user knows to retry.

---

## 5. Frontend (React)

- **NotesInput** — textarea + "Extract Tasks" button → calls `/extract`, shows spinner.
- **Filters** — three dropdowns (owner, status, priority) → re-query `/tasks`.
- **TaskList / TaskRow** — table; each row editable inline (description, owner, due date,
  priority dropdown, status dropdown) → `PATCH` on blur/save; delete button.
- **ExportButton** — hits `/tasks/export`, triggers CSV download.
- Clean minimal styling (priority = colored badge, overdue due-dates highlighted red — *stretch goal, not yet implemented*).

---

## 6. Build Phases (suggested order)

1. **Backend skeleton** — FastAPI + Neon Postgres + Task model + `GET/PATCH/DELETE /tasks` with dummy data. Verify via `/docs`. ✅
2. **LLM wiring** — `llm.py` (Groq) + `POST /extract`. Test with sample notes. ✅
3. **Frontend skeleton** — Vite React app, list tasks from backend, filters working. ✅
4. **Extract UI** — notes textarea → extract → refresh list. ✅
5. **Edit + delete** — inline editing, incl. due-date default-on-assign logic. ✅
6. **CSV export** + styling polish. ✅ (export done; overdue-highlight styling pending)
7. **README** — run instructions. ✅

---

## 7. Setup & Run

```bash
# Backend
cd backend
python -m venv venv && venv\Scripts\activate     # Windows
pip install -r requirements.txt                   # fastapi uvicorn sqlalchemy psycopg openai python-dotenv

# .env contents:
#   DATABASE_URL=postgresql+psycopg://USER:PASSWORD@ep-xxxx.aws.neon.tech/dbname?sslmode=require
#   GROQ_API_KEY=gsk_your_key_here
#   GROQ_MODEL=llama-3.3-70b-versatile

uvicorn main:app --reload                          # http://localhost:8000/docs

# Frontend
cd frontend
npm install
npm run dev                                        # http://localhost:5173
```

**You'll need:**
- A free **Neon** Postgres database → https://neon.tech (connection string → `.env`)
- A free **Groq** API key → https://console.groq.com (→ `.env`)

`.env`, `venv/`, `node_modules/` go in `.gitignore`. Tables are created automatically on first backend start.

### `.env.example` (recommended addition)

Commit a template (without real secrets) so onboarding is copy-paste instead of guesswork:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@ep-xxxx.aws.neon.tech/dbname?sslmode=require
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
```

New contributor flow becomes: `cp .env.example .env` → fill in the two blanks → run.

---


# Mini AI Project Manager Assistant

Paste unstructured meeting notes → an LLM extracts structured tasks (description, owner,
due date, priority) → manage them in a filterable, editable list, and export to CSV.

**Stack:** FastAPI · Neon (Postgres) · React + Vite · Groq (free LLM API)

### Prerequisites

- Python 3.10+
- Node.js 18+
- A **Neon** Postgres database → https://neon.tech (free)
- A **Groq** API key → https://console.groq.com (free)

### 1. Backend

```bash
cd .\E2M\backend
python -m venv venv
venv\Scripts\activate           # Windows  (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
```

Edit `backend/.env` and fill in:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@ep-xxxx.aws.neon.tech/dbname?sslmode=require
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

> **Neon tip:** copy the connection string from the Neon dashboard and change the
> `postgresql://` prefix to `postgresql+psycopg://`.

Run:

```bash
uvicorn main:app --reload
```

- API: http://localhost:8000
- Interactive docs (test here): http://localhost:8000/docs

Tables are created automatically on first start.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

The Vite dev server proxies `/api/*` to the backend on port 8000.

### How it works

1. Paste notes → **Extract Tasks** → `POST /extract` sends text to Groq with a strict
   prompt that returns JSON tasks. If no deadline is mentioned, the LLM returns `null` and
   the backend fills it in with **today + 7 days** (see §3 for the full due-date rule).
2. Tasks are saved to Neon and shown in a table.
3. Filter by owner / status / priority, edit any field inline (auto-saves), delete tasks.
   Assigning an owner to a task that has no due date auto-sets one; un-assigning does not
   clear an existing due date.
4. **Export CSV** downloads all tasks.

### API

| Method | Path             | Purpose                          |
|--------|------------------|----------------------------------|
| POST   | `/extract`       | notes → extract + save tasks     |
| GET    | `/tasks`         | list (filters: owner/status/priority) |
| PATCH  | `/tasks/{id}`    | edit a task                      |
| DELETE | `/tasks/{id}`    | delete a task                    |
| GET    | `/tasks/export`  | download CSV                     |