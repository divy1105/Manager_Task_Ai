"""FastAPI app: extract tasks from text, store in Neon, list/edit/delete, export CSV."""
import csv
import io

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import models
from database import Base, engine, get_db
from llm import extract_tasks
from schemas import ExtractRequest, TaskOut, TaskUpdate
from datetime import date, timedelta


# Create tables on startup (Neon).
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Mini AI Project Manager Assistant")

# Allow the React dev server to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "docs": "/docs"}


@app.post("/extract", response_model=list[TaskOut])
def extract(req: ExtractRequest, db: Session = Depends(get_db)):
    """Turn unstructured notes into tasks, save them, and return the new tasks."""
    if not req.notes.strip():
        raise HTTPException(status_code=400, detail="Notes are empty.")

    try:
        extracted = extract_tasks(req.notes)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM extraction failed: {e}")

    created = []
    for t in extracted:
        task = models.Task(**t)
        db.add(task)
        created.append(task)
    db.commit()
    for task in created:
        db.refresh(task)
    return created


@app.get("/tasks", response_model=list[TaskOut])
def list_tasks(
    owner: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    db: Session = Depends(get_db),
):
    """List tasks with optional filters."""
    query = db.query(models.Task)
    if owner:
        query = query.filter(models.Task.owner == owner)
    if status:
        query = query.filter(models.Task.status == status)
    if priority:
        query = query.filter(models.Task.priority == priority)
    return query.order_by(models.Task.id.desc()).all()


@app.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: int, update: TaskUpdate, db: Session = Depends(get_db)):
    """Edit any fields of a task."""
    task = db.query(models.Task).get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    update_data = update.model_dump(exclude_unset=True)

    if update_data.get("owner") and update_data["owner"] != "Unassigned" and not task.due_date:
        update_data["due_date"] = (date.today() + timedelta(days=7)).isoformat()

    for field, value in update_data.items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    db.delete(task)
    db.commit()
    return {"deleted": task_id}


@app.get("/tasks/export")
def export_csv(db: Session = Depends(get_db)):
    """Download all tasks as a CSV file."""
    tasks = db.query(models.Task).order_by(models.Task.id).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["id", "description", "owner", "due_date", "priority", "status"])
    for t in tasks:
        writer.writerow([t.id, t.description, t.owner, t.due_date, t.priority, t.status])

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tasks.csv"},
    )
