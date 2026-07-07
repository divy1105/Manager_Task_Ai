# Mini AI Project Manager Assistant — Build Plan

Turn unstructured meeting notes → structured, filterable, editable tasks.

**Stack:** FastAPI (backend) · React + Vite (frontend) · SQLite (DB) · OpenAI API (extraction)

---

## 1. Architecture

```
┌──────────────┐     paste notes      ┌──────────────┐    prompt+JSON    ┌─────────────┐
│ React (Vite) │ ───────────────────► │   FastAPI    │ ────────────────► │  OpenAI API │
│   frontend   │ ◄─── tasks JSON ──── │   backend    │ ◄── tasks JSON ── │  (extract)  │
└──────────────┘                      └──────┬───────┘                   └─────────────┘
                                             │
                                       ┌─────▼──────┐
                                       │  SQLite    │
                                       │ tasks.db   │
                                       └────────────┘
```

Flow: user pastes text → `POST /extract` → OpenAI returns structured tasks → saved to DB →
frontend lists them with filters → user edits/deletes → optional CSV export.

---

## 2. Project Structure

```
Mana/
├── PLAN.md
├── backend/
│   ├── main.py            # FastAPI app + routes + CORS
│   ├── database.py        # SQLite connection + init
│   ├── models.py          # SQLAlchemy Task model
│   ├── schemas.py         # Pydantic request/response models
│   ├── llm.py             # OpenAI extraction (prompt + JSON parse)
│   ├── requirements.txt
│   └── .env               # OPENAI_API_KEY (gitignored)
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
| `owner`       | string   | inferred or null → "Unassigned"            |
| `due_date`    | string   | ISO `YYYY-MM-DD` or null                   |
| `priority`    | enum     | `Low` / `Medium` / `High`                  |
| `status`      | enum     | `To Do` / `In Progress` / `Done`           |
| `created_at`  | datetime | auto timestamp                             |

New tasks default to `status = "To Do"`, `priority = "Medium"` if the LLM can't infer.

---

## 4. Backend (FastAPI)

**Endpoints**
| Method   | Path              | Purpose                                          |
|----------|-------------------|--------------------------------------------------|
| `POST`   | `/extract`        | Body `{notes: str}` → run LLM, save tasks, return them |
| `GET`    | `/tasks`          | List tasks; query filters `?owner=&status=&priority=` |
| `PATCH`  | `/tasks/{id}`     | Edit any field                                   |
| `DELETE` | `/tasks/{id}`     | Remove a task                                    |
| `GET`    | `/tasks/export`   | Return CSV (StreamingResponse)                   |

**LLM extraction (`llm.py`)** — call OpenAI with a strict system prompt and
`response_format={"type": "json_object"}` so it always returns parseable JSON:

> "You are a project manager assistant. Extract every actionable task from the notes.
> For each task return: description, owner (name if mentioned, else null), due_date
> (resolve relative dates like 'next Friday' to YYYY-MM-DD using today's date, else null),
> priority (Low/Medium/High — infer from urgency words, default Medium).
> Return `{ \"tasks\": [ ... ] }` only."

Pass today's date into the prompt so relative deadlines resolve correctly.
Parse JSON → validate with Pydantic → insert rows.

---

## 5. Frontend (React)

- **NotesInput** — textarea + "Extract Tasks" button → calls `/extract`, shows spinner.
- **Filters** — three dropdowns (owner, status, priority) → re-query `/tasks`.
- **TaskList / TaskRow** — table; each row editable inline (description, owner, due date,
  priority dropdown, status dropdown) → `PATCH` on blur/save; delete button.
- **ExportButton** — hits `/tasks/export`, triggers CSV download.
- Clean minimal styling (priority = colored badge, overdue due-dates highlighted red).

---

## 6. Build Phases (suggested order)

1. **Backend skeleton** — FastAPI + SQLite + Task model + `GET/PATCH/DELETE /tasks` with dummy data. Verify via `/docs`.
2. **LLM wiring** — `llm.py` + `POST /extract`. Test with sample notes.
3. **Frontend skeleton** — Vite React app, list tasks from backend, filters working.
4. **Extract UI** — notes textarea → extract → refresh list.
5. **Edit + delete** — inline editing.
6. **CSV export** + styling polish.
7. **README** — run instructions.

---

## 7. Setup & Run

```bash
# Backend
cd backend
python -m venv venv && venv\Scripts\activate     # Windows
pip install -r requirements.txt                   # fastapi uvicorn sqlalchemy openai python-dotenv
echo OPENAI_API_KEY=sk-... > .env
uvicorn main:app --reload                          # http://localhost:8000/docs

# Frontend
cd frontend
npm install
npm run dev                                        # http://localhost:5173
```

**You'll need:** an OpenAI API key in `backend/.env`. `.env` and `venv/`, `node_modules/` go in `.gitignore`.

---

## 8. Optional stretch goals
- Sort by due date / priority.
- "Overdue" filter.
- Bulk status update.
- Deploy (backend → Render, frontend → Vercel).
```
