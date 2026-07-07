"""Task extraction from unstructured text using Groq (OpenAI-compatible API)."""
import json
import os
from datetime import date, timedelta

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# Groq exposes an OpenAI-compatible endpoint, so we reuse the OpenAI client.
client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY or "missing",
)

VALID_PRIORITIES = {"Low", "Medium", "High"}


def _system_prompt() -> str:
    today = date.today().isoformat()
    return f"""You are a project manager assistant. Today's date is {today}.
Extract every actionable task from the user's meeting notes or task description.

For each task, produce:
- "description": a short, clear statement of the task.
- "owner": the person's name if mentioned, otherwise null.
- "due_date": resolve relative dates ("tomorrow", "next Friday", "in 2 days") to an
  absolute date in "YYYY-MM-DD" format using today's date. If no deadline is mentioned, null.
- "priority": one of "Low", "Medium", or "High". Infer from urgency words
  (e.g. "urgent", "ASAP", "critical" -> High). Default to "Medium" if unclear.

Return ONLY a JSON object of this exact shape:
{{ "tasks": [ {{ "description": "...", "owner": "...", "due_date": "...", "priority": "..." }} ] }}
If there are no tasks, return {{ "tasks": [] }}."""


def extract_tasks(notes: str) -> list[dict]:
    """Call the LLM and return a list of normalized task dicts."""
    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to backend/.env (get a free key at "
            "https://console.groq.com)."
        )

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": _system_prompt()},
            {"role": "user", "content": notes},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    content = response.choices[0].message.content or "{}"
    data = json.loads(content)
    raw_tasks = data.get("tasks", []) if isinstance(data, dict) else []

    return [_normalize(t) for t in raw_tasks if t.get("description")]


def _normalize(task: dict) -> dict:
    """Clean one task dict so it matches our DB model expectations."""
    priority = (task.get("priority") or "Medium").capitalize()
    if priority not in VALID_PRIORITIES:
        priority = "Medium"

    owner = task.get("owner")
    if not owner or str(owner).strip().lower() in ("null", "none", ""):
        owner = "Unassigned"

    due_date = task.get("due_date")
    if not due_date or str(due_date).strip().lower() in ("null", "none", ""):
        due_date = None if owner == "Unassigned" else (date.today() + timedelta(days=7)).isoformat()
        
    return {
        "description": str(task["description"]).strip(),
        "owner": str(owner).strip(),
        "due_date": due_date,
        "priority": priority,
        "status": "To Do",
    }
