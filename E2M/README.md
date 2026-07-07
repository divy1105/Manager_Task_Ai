# Mini AI Project Manager Assistant

Paste unstructured meeting notes → an LLM extracts structured tasks (description, owner,
due date, priority) → manage them in a filterable, editable list, and export to CSV.

**Stack:** FastAPI · Neon (Postgres) · React + Vite · Groq (free LLM API)

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- A **Neon** Postgres database → https://neon.tech (free)
- A **Groq** API key → https://console.groq.com (free)

---

## 1. Backend

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

---

## 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

The Vite dev server proxies `/api/*` to the backend on port 8000.

---

## How it works

1. Paste notes → **Extract Tasks** → `POST /extract` sends text to Groq with a strict
   prompt that returns JSON tasks.
2. Tasks are saved to Neon and shown in a table.
3. Filter by owner / status / priority, edit any field inline (auto-saves), delete tasks.
4. **Export CSV** downloads all tasks.

## API

| Method | Path             | Purpose                          |
|--------|------------------|----------------------------------|
| POST   | `/extract`       | notes → extract + save tasks     |
| GET    | `/tasks`         | list (filters: owner/status/priority) |
| PATCH  | `/tasks/{id}`    | edit a task                      |
| DELETE | `/tasks/{id}`    | delete a task                    |
| GET    | `/tasks/export`  | download CSV                     |
